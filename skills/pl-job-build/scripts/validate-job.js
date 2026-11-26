#!/usr/bin/env node
'use strict';

/*
 * Offline validator for a Data Factory job package (job.json plus assets).
 *
 * Two layers:
 *   1. a zero-dependency JSON Schema (draft-07 subset) validation against
 *      job.schema.json, shipped next to this script;
 *   2. lint rules (E-* errors, W-* warnings) that the schema cannot express:
 *      reference order, loop scope, assets on disk, catalog knowledge, etc.
 *
 * Usage:
 *   node validate-job.js <job-folder | job.json> [--json] [--strict]
 *                        [--schema <path>] [--catalog <path>]
 *
 *   <job-folder>  validates <folder>/job.json and the package around it
 *                 (assets on disk, .jobignore, README.md, CHANGELOG.md).
 *   <job.json>    validates the definition alone (file-system checks skipped).
 *   --json        prints {"errors": [...], "warnings": [...]} instead of text.
 *   --strict      warnings count as errors for the exit code.
 *
 * Exit codes: 0 valid, 1 errors found (or warnings with --strict) or failure,
 * 2 usage error. Node >= 18, no dependency. Also usable as a module:
 * require('./validate-job.js').validate(target, options).
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SCHEMA = path.join(__dirname, 'job.schema.json');
const DEFAULT_CATALOG = path.join(__dirname, 'tasks-catalog.json');

// The job format is closed: any other root key is reported as E-UNKNOWN-ROOT,
// with the list of these allowed keys.
const ROOT_KEYS = ['schema', 'key', 'title', 'icon', 'titleLocal', 'description', 'descriptionLocal', 'userInputs', 'tasks', 'outputParameters', 'version'];
const ROOT_REQUIRED = ['schema', 'key', 'title', 'tasks'];
const TASK_KEYS = ['name', 'taskReferenceName', 'description', 'optional', 'type', 'inputParameters', 'evaluatorType', 'expression', 'decisionCases', 'defaultCase', 'caseValueParam', 'loopCondition', 'loopOver'];
const TERMINATE_INPUTS = ['terminationStatus', 'outputParameters', 'skipReportGeneration', 'logLevel'];
const TASK_TYPES = ['SUB_WORKFLOW', 'SWITCH', 'DO_WHILE', 'TERMINATE', 'SET_VARIABLE', 'WAIT', 'DECISION'];
const WORKFLOW_NAMESPACES = ['input', 'globalVariables', 'variables', 'variable'];
const USER_INPUT_TYPES = ['TEXT', 'TEXTAREA', 'SELECT', 'FILE', 'DATE', 'FIELD', 'SCREEN'];
const NEW_INPUT_TYPES = ['TEXTAREA', 'DATE', 'FIELD', 'SCREEN'];
const USER_INPUT_PROPERTIES = ['key', 'title', 'titleLocal', 'description', 'descriptionLocal', 'required', 'type', 'multiple', 'default', 'mode', 'options'];
const REF_NAME = /^(?!workflow$)[\w-]+$/;
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;
const EXPRESSION = /\$\{([\w-]+)((?:\[\d+\])*(?:\.[\w-]+(?:\[\d+\])*)*)\}/g;
const WHOLE_REFERENCE = /^\$\{[\w-]+(?:\[\d+\])*(?:\.[\w-]+(?:\[\d+\])*)*\}$/;
const NO_GLOBAL_VARIABLE = { DO_WHILE: 'loop', SET_VARIABLE: 'set-variable', WAIT: 'wait' };
const TOP_LEVEL_LIMIT = 20; // convention of these skills, not a platform limit
// Descriptions are read by end users; details go to the README (convention of these skills).
const DESCRIPTION_LIMITS = { job: 400, task: 160 };
// The task pages state that these tasks provide no report output.
const NO_REPORT_OUTPUT = new Set(['file-transformation-xslt', 'table-export-schema']);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJsonFile(file, label) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new Error('cannot read ' + label + ' ' + file + ': ' + err.message);
  }
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (err) {
    throw new Error(label + ' ' + file + ' is not valid JSON: ' + err.message);
  }
}

function lineColumn(text, position) {
  const before = text.slice(0, position);
  const line = before.split('\n').length;
  const column = position - before.lastIndexOf('\n');
  return { line: line, column: column };
}

function parseJob(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    const match = /position (\d+)/.exec(err.message);
    let where = '';
    if (match) {
      const lc = lineColumn(text, Number(match[1]));
      where = ' (line ' + lc.line + ', column ' + lc.column + ')';
    }
    const error = new Error(err.message.replace(/ in JSON at position.*$/, '') + where);
    error.jsonParse = true;
    throw error;
  }
}

function joinPath(base, key) {
  if (typeof key === 'number') return base + '[' + key + ']';
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return base ? base + '.' + key : key;
  return base + '["' + key.replace(/"/g, '\\"') + '"]';
}

function describeValue(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// ---------------------------------------------------------------------------
// JSON Schema (draft-07 subset) validator
// ---------------------------------------------------------------------------

const regexCache = new Map();
function compilePattern(source) {
  if (!regexCache.has(source)) regexCache.set(source, new RegExp(source));
  return regexCache.get(source);
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error('unsupported $ref ' + ref);
  let target = root;
  for (const part of ref.slice(2).split('/')) {
    target = target[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    if (target === undefined) throw new Error('unresolved $ref ' + ref);
  }
  return target;
}

function typeMatches(type, value) {
  switch (type) {
    case 'object': return isObject(value);
    case 'array': return Array.isArray(value);
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'integer': return Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    case 'null': return value === null;
    default: return true;
  }
}

function schemaErrors(root, schema, value, at, inInputs) {
  const errors = [];
  if (schema === true || schema === undefined) return errors;
  if (schema === false) return [{ path: at, keyword: 'false', message: 'no value is allowed here' }];
  if (schema.$ref) return schemaErrors(root, resolveRef(root, schema.$ref), value, at, inInputs);
  // A whole-value "${...}" reference inside inputParameters or outputParameters
  // is resolved by the platform at run time and can stand for any typed value.
  if (inInputs && typeof value === 'string' && WHOLE_REFERENCE.test(value)) return errors;

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(t, value))) {
      errors.push({ path: at, keyword: 'type', message: 'expected ' + types.join(' or ') + ', got ' + describeValue(value) });
      return errors;
    }
  }
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push({ path: at, keyword: 'const', message: 'must be ' + JSON.stringify(schema.const) + ', got ' + JSON.stringify(value) });
  }
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    const list = schema.enum.length > 12 ? 'one of the ' + schema.enum.length + ' documented values' : 'one of ' + schema.enum.map((e) => JSON.stringify(e)).join(', ');
    errors.push({ path: at, keyword: 'enum', message: 'must be ' + list + ', got ' + JSON.stringify(value) });
  }
  if (typeof value === 'string') {
    if (schema.pattern !== undefined && !compilePattern(schema.pattern).test(value)) {
      errors.push({ path: at, keyword: 'pattern', message: 'must match the pattern ' + schema.pattern + ', got ' + JSON.stringify(value) });
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({ path: at, keyword: 'minLength', message: 'must be at least ' + schema.minLength + ' character(s) long' });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({ path: at, keyword: 'maxLength', message: 'must be at most ' + schema.maxLength + ' character(s) long' });
    }
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push({ path: at, keyword: 'minimum', message: 'must be >= ' + schema.minimum });
    if (schema.maximum !== undefined && value > schema.maximum) errors.push({ path: at, keyword: 'maximum', message: 'must be <= ' + schema.maximum });
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ path: at, keyword: 'minItems', message: 'must hold at least ' + schema.minItems + ' element(s)' });
    }
    if (schema.items !== undefined && isObject(schema.items)) {
      value.forEach((item, index) => errors.push(...schemaErrors(root, schema.items, item, joinPath(at, index), inInputs)));
    }
  }
  if (isObject(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in value)) errors.push({ path: at, keyword: 'required', missing: key, message: 'missing required property "' + key + '"' });
      }
    }
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        if (key in value) {
          const childInputs = inInputs || key === 'inputParameters' || (!at && key === 'outputParameters');
          errors.push(...schemaErrors(root, schema.properties[key], value[key], joinPath(at, key), childInputs));
        }
      }
    }
    if (schema.patternProperties) {
      for (const source of Object.keys(schema.patternProperties)) {
        const regex = compilePattern(source);
        for (const key of Object.keys(value)) {
          if (regex.test(key)) errors.push(...schemaErrors(root, schema.patternProperties[source], value[key], joinPath(at, key), inInputs));
        }
      }
    }
  }
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) errors.push(...schemaErrors(root, sub, value, at, inInputs));
  }
  if (Array.isArray(schema.anyOf)) {
    const attempts = schema.anyOf.map((sub) => ({ schema: sub, errors: schemaErrors(root, sub, value, at, inInputs) }));
    if (!attempts.some((a) => a.errors.length === 0)) errors.push(...collapseAnyOf(root, attempts, value, at));
  }
  if (schema.if !== undefined) {
    const holds = schemaErrors(root, schema.if, value, at, inInputs).length === 0;
    if (holds && schema.then !== undefined) errors.push(...schemaErrors(root, schema.then, value, at, inInputs));
    if (!holds && schema.else !== undefined) errors.push(...schemaErrors(root, schema.else, value, at, inInputs));
  }
  return errors;
}

// When every anyOf branch fails, report the branch that matched the "name"
// const of the value, else the branch whose type matches the value, else the
// branch with the fewest errors.
function collapseAnyOf(root, attempts, value, at) {
  const resolved = attempts.map((a) => Object.assign({}, a, { schema: a.schema.$ref ? resolveRef(root, a.schema.$ref) : a.schema }));
  if (isObject(value) && typeof value.name === 'string') {
    const named = resolved.find((a) => a.schema.properties && a.schema.properties.name && a.schema.properties.name.const === value.name);
    if (named) return named.errors;
  }
  const typed = resolved.filter((a) => {
    const types = a.schema.type === undefined ? [] : [].concat(a.schema.type);
    return types.some((t) => typeMatches(t, value));
  });
  if (typed.length === 1) return typed[0].errors;
  const pool = typed.length ? typed : resolved;
  pool.sort((a, b) => a.errors.length - b.errors.length);
  const best = pool[0].errors;
  if (best.length === 1 && best[0].path === at) {
    const shapes = resolved.map((a) => (a.schema.type ? [].concat(a.schema.type).join('/') : 'other')).join(' or ');
    return [{ path: at, keyword: best[0].keyword, message: best[0].message + ' (allowed shapes: ' + shapes + ')' }];
  }
  return best;
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

function makeReporter() {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  function add(list, id, at, message, fix) {
    const key = id + '|' + at + '|' + message;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ id: id, path: at || '(root)', message: message, fix: fix || '' });
  }
  return {
    errors: errors,
    warnings: warnings,
    error: (id, at, message, fix) => add(errors, id, at, message, fix),
    warn: (id, at, message, fix) => add(warnings, id, at, message, fix),
    hasErrorAt: (at) => errors.some((e) => e.path === (at || '(root)')),
  };
}

// ---------------------------------------------------------------------------
// Task walk (document order, branch awareness)
// ---------------------------------------------------------------------------

function walkTasks(job, report) {
  const nodes = [];
  const byRef = new Map();
  let order = 0;

  function visitList(list, at, ancestors, depth) {
    if (!Array.isArray(list)) {
      report.error('E-STRUCTURAL', at, 'must be an array of task objects, got ' + describeValue(list), 'write a real task list here, never a placeholder string');
      return;
    }
    list.forEach((task, index) => {
      const taskPath = joinPath(at, index);
      if (!isObject(task)) {
        report.error('E-STRUCTURAL', taskPath, 'every task must be an object, got ' + describeValue(task), 'replace it with a task object');
        return;
      }
      const node = { task: task, path: taskPath, order: order++, depth: depth, ancestors: ancestors, children: [] };
      nodes.push(node);
      const ref = task.taskReferenceName;
      if (typeof ref === 'string') {
        if (byRef.has(ref)) {
          report.error('E-DUP-REF', joinPath(taskPath, 'taskReferenceName'), 'taskReferenceName "' + ref + '" is already used by ' + byRef.get(ref).path, 'make every taskReferenceName unique across the whole job, nested branches included');
        } else {
          byRef.set(ref, node);
        }
      }
      if ('loopOver' in task) visitList(task.loopOver, joinPath(taskPath, 'loopOver'), ancestors.concat([{ parent: node, key: 'loopOver' }]), depth + 1);
      if ('decisionCases' in task) {
        const cases = task.decisionCases;
        if (!isObject(cases)) {
          report.error('E-STRUCTURAL', joinPath(taskPath, 'decisionCases'), 'decisionCases must be an object mapping case values to task lists, got ' + describeValue(cases), 'write {"<value>": [tasks...]}');
        } else {
          for (const key of Object.keys(cases)) {
            visitList(cases[key], joinPath(joinPath(taskPath, 'decisionCases'), key), ancestors.concat([{ parent: node, key: 'decisionCases.' + key }]), depth + 1);
          }
        }
      }
      if ('defaultCase' in task) visitList(task.defaultCase, joinPath(taskPath, 'defaultCase'), ancestors.concat([{ parent: node, key: 'defaultCase' }]), depth + 1);
    });
  }

  if ('tasks' in job) visitList(job.tasks, 'tasks', [], 0);
  return { nodes: nodes, byRef: byRef };
}

function isDescendantOf(node, ancestor) {
  return node.ancestors.some((a) => a.parent === ancestor);
}

// Returns 'sibling' when the two nodes sit in different branches of the same
// SWITCH/DECISION, 'inside' when target is inside a branch that does not
// contain node, null otherwise.
function branchRelation(node, target) {
  const a = node.ancestors;
  const b = target.ancestors;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].parent !== b[i].parent) break;
    if (a[i].key !== b[i].key) return a[i].key === 'loopOver' || b[i].key === 'loopOver' ? null : 'sibling';
  }
  for (let i = a.length; i < b.length; i++) {
    if (b[i].key !== 'loopOver') return 'inside';
  }
  return null;
}

function collectStrings(value, at, out) {
  if (typeof value === 'string') out.push({ value: value, path: at });
  else if (Array.isArray(value)) value.forEach((item, index) => collectStrings(item, joinPath(at, index), out));
  else if (isObject(value)) for (const key of Object.keys(value)) collectStrings(value[key], joinPath(at, key), out);
}

function taskStrings(task, at) {
  const out = [];
  for (const key of Object.keys(task)) {
    if (key === 'loopOver' || key === 'decisionCases' || key === 'defaultCase') continue;
    collectStrings(task[key], joinPath(at, key), out);
  }
  return out;
}

// ---------------------------------------------------------------------------
// .jobignore (gitignore-like subset shared with package-job.js)
// ---------------------------------------------------------------------------

const DEFAULT_IGNORE = ['*.job.zip', '.jobignore'];
const ALWAYS_IGNORE = ['node_modules/', '.git/', '.product-live-downloads/', '*.run.json', '*.df-test.json', '*.test.js', 'TESTS/', '__tests__/', '__fixtures__/'];

function compileIgnore(lines) {
  const rules = [];
  for (const raw of lines) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    let negate = false;
    if (line.startsWith('!')) { negate = true; line = line.slice(1); }
    let dirOnly = false;
    if (line.endsWith('/')) { dirOnly = true; line = line.slice(0, -1); }
    const anchored = line.includes('/');
    if (line.startsWith('/')) line = line.slice(1);
    let source = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '*') {
        if (line[i + 1] === '*') { source += '.*'; i++; } else source += '[^/]*';
      } else if (c === '?') source += '[^/]';
      else source += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    rules.push({ regex: new RegExp((anchored ? '^' : '(^|/)') + source + '$'), dirOnly: dirOnly, negate: negate });
  }
  return rules;
}

// relPath uses forward slashes; isDir tells whether it names a directory.
function isIgnored(relPath, isDir, rules) {
  const segments = relPath.split('/');
  for (let i = 1; i <= segments.length; i++) {
    const candidate = segments.slice(0, i).join('/');
    const candidateIsDir = i < segments.length || isDir;
    let ignored = false;
    for (const rule of rules) {
      if (rule.dirOnly && !candidateIsDir) continue;
      if (rule.regex.test(candidate)) ignored = !rule.negate;
    }
    if (ignored) return true;
  }
  return false;
}

function loadIgnoreRules(folder) {
  const file = path.join(folder, '.jobignore');
  let lines = DEFAULT_IGNORE.slice();
  let present = false;
  if (fs.existsSync(file)) {
    present = true;
    lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  }
  return { present: present, rules: compileIgnore(ALWAYS_IGNORE.concat(lines)) };
}

// ---------------------------------------------------------------------------
// Lint rules
// ---------------------------------------------------------------------------

function lintRoot(ctx) {
  const { job, report } = ctx;
  for (const key of ROOT_REQUIRED) {
    if (!(key in job)) report.error('E-ROOT-REQUIRED', '', 'missing required root property "' + key + '"', 'add "' + key + '" (schema "1.0", key, title and tasks are mandatory)');
  }
  if ('schema' in job && job.schema !== '1.0') {
    report.error('E-SCHEMA', 'schema', 'schema must be the string "1.0", got ' + JSON.stringify(job.schema), 'write "schema": "1.0"');
  }
  for (const key of Object.keys(job)) {
    if (!ROOT_KEYS.includes(key)) {
      report.error('E-UNKNOWN-ROOT', key, 'unknown root property "' + key + '": the job format is closed', 'remove it; allowed: ' + ROOT_KEYS.join(', '));
    } else if (key === 'version' && typeof job.version !== 'string') {
      report.error('E-ROOT-FORBIDDEN', 'version', '"version" must be a string, got ' + describeValue(job.version), 'write a free-text string such as "1.0.0", or remove it; document the changes in CHANGELOG.md');
    }
  }
  if (typeof job.description === 'string' && job.description.length > DESCRIPTION_LIMITS.job) {
    report.warn('W-LONG-DESCRIPTION', 'description', 'the job description has ' + job.description.length + ' characters (more than ' + DESCRIPTION_LIMITS.job + ')', 'say in one or two short sentences what the job does for the user; move the technical details to README.md');
  }
  if ('outputParameters' in job) {
    if (!isObject(job.outputParameters)) {
      report.error('E-OUTPUTPARAMS', 'outputParameters', 'outputParameters must be an object mapping labels to values, got ' + describeValue(job.outputParameters), 'write {"label": "${<ref>.output.<name>}"}');
    } else {
      for (const key of Object.keys(job.outputParameters)) {
        if (typeof job.outputParameters[key] !== 'string') {
          report.warn('W-OUTPUT-VALUE', joinPath('outputParameters', key), 'output values are normally strings such as "${<ref>.output.<name>}", got ' + describeValue(job.outputParameters[key]), 'reference a task output or a user input');
        }
      }
    }
  }
  if ('userInputs' in job && !isObject(job.userInputs) && !Array.isArray(job.userInputs)) {
    report.error('E-STRUCTURAL', 'userInputs', 'userInputs must be an array', 'write "userInputs": [ ... ]');
  }
  if (Array.isArray(job.tasks) && job.tasks.length > TOP_LEVEL_LIMIT) {
    report.warn('W-TOO-MANY-TASKS', 'tasks', job.tasks.length + ' top-level tasks (these skills recommend at most ' + TOP_LEVEL_LIMIT + '; no platform limit is documented)', 'split the job into chained jobs or batch entries (task-batch-execute)');
  }
}

function lintUserInputs(ctx) {
  const { job, report } = ctx;
  if (!Array.isArray(job.userInputs)) return;
  const keys = new Map();
  const newTypes = new Set();
  job.userInputs.forEach((input, index) => {
    const at = joinPath('userInputs', index);
    if (!isObject(input)) {
      report.error('E-USERINPUT-KEY', at, 'every user input must be an object', 'write {"key", "title", "type", "required"}');
      return;
    }
    for (const prop of ['key', 'title', 'type', 'required']) {
      if (!(prop in input)) report.error('E-USERINPUT-KEY', at, 'user input is missing the required property "' + prop + '"', 'every user input declares key, title, type and required');
    }
    if (typeof input.key === 'string') {
      if (input.key === 'context') report.error('E-USERINPUT-KEY', joinPath(at, 'key'), 'user input key "context": ${workflow.input.context} is documented as the job context, so this validator refuses the key', 'rename the input');
      if (keys.has(input.key)) report.error('E-USERINPUT-KEY', joinPath(at, 'key'), 'user input key "' + input.key + '" is already used by ' + keys.get(input.key), 'make every user input key unique');
      else keys.set(input.key, at);
      if (!REF_NAME.test(input.key)) report.error('E-USERINPUT-KEY', joinPath(at, 'key'), 'user input key "' + input.key + '" must match ' + REF_NAME.source, 'use letters, digits, _ and -');
    }
    if ('defaultValue' in input) report.error('E-DEFAULTVALUE', joinPath(at, 'defaultValue'), '"defaultValue" is not a user input property', 'rename it to "default"');
    for (const prop of Object.keys(input)) {
      if (prop === 'defaultValue' || USER_INPUT_PROPERTIES.includes(prop)) continue;
      report.warn('W-UNKNOWN-USERINPUT-PROPERTY', joinPath(at, prop), 'user input property "' + prop + '" is not documented', 'remove it; documented: ' + USER_INPUT_PROPERTIES.join(', '));
    }
    if (typeof input.type === 'string') {
      if (!USER_INPUT_TYPES.includes(input.type)) {
        report.error('E-ENUM', joinPath(at, 'type'), 'unknown user input type ' + JSON.stringify(input.type), 'use one of ' + USER_INPUT_TYPES.join(', '));
      }
      if (NEW_INPUT_TYPES.includes(input.type)) newTypes.add(input.type);
      if (input.type === 'SELECT') {
        if (!Array.isArray(input.options) || input.options.length === 0) {
          report.error('E-USERINPUT-KEY', joinPath(at, 'options'), 'a SELECT input needs a non-empty "options" array', 'add options: [{"key": "...", "title": "..."}]');
        } else {
          input.options.forEach((option, i) => {
            if (!isObject(option) || typeof option.key !== 'string' || typeof option.title !== 'string') {
              report.error('E-USERINPUT-KEY', joinPath(joinPath(at, 'options'), i), 'every SELECT option needs a string "key" and a string "title"', 'fix the option');
            }
          });
        }
      }
      if (input.type === 'FIELD' && 'options' in input && !isObject(input.options)) {
        report.error('E-USERINPUT-KEY', joinPath(at, 'options'), 'FIELD options must be an object such as {"filters": [...]}', 'see the user inputs reference');
      }
    }
  });
  if (newTypes.size) {
    report.warn('W-NEW-INPUT-TYPES', 'userInputs', 'user input type(s) ' + Array.from(newTypes).join(', ') + ' are listed by the job structure reference, not by the user inputs tutorial (TEXT, SELECT, FILE)', 'if an import rejects them, fall back to TEXT (for TEXTAREA and DATE) or a TEXT holding a field or screen key (for FIELD and SCREEN)');
  }
  ctx.inputKeys = keys;
}

function lintTasks(ctx) {
  const { report, nodes, catalog } = ctx;
  const customTasks = [];
  const nameOfTasks = new Set();

  for (const node of nodes) {
    const task = node.task;
    const at = node.path;
    const ref = task.taskReferenceName;
    if (typeof ref !== 'string') {
      report.error('E-REF-NAME', joinPath(at, 'taskReferenceName'), 'taskReferenceName is required and must be a string', 'add a snake_case taskReferenceName');
    } else if (!REF_NAME.test(ref)) {
      report.error('E-REF-NAME', joinPath(at, 'taskReferenceName'), 'taskReferenceName "' + ref + '" must match ' + REF_NAME.source, 'use letters, digits, _ or - and never "workflow"');
    } else if (!SNAKE_CASE.test(ref)) {
      report.warn('W-REF-STYLE', joinPath(at, 'taskReferenceName'), 'taskReferenceName "' + ref + '" is not snake_case', 'prefer lower case words separated by underscores, for example export_items');
    }
    for (const key of Object.keys(task)) {
      if (TASK_KEYS.includes(key)) continue;
      report.error('E-TASK-FORBIDDEN', joinPath(at, key), 'task property "' + key + '" is not part of the documented task format', 'remove it, or move it under inputParameters when the task reference documents it; allowed: ' + TASK_KEYS.join(', '));
    }
    if (!('description' in task)) report.warn('W-MISSING-DESCRIPTION', at, 'task has no "description"', 'say in one short sentence what the step does for the user');
    else if (typeof task.description === 'string' && task.description.length > DESCRIPTION_LIMITS.task) {
      report.warn('W-LONG-DESCRIPTION', joinPath(at, 'description'), 'the task description has ' + task.description.length + ' characters (more than ' + DESCRIPTION_LIMITS.task + ')', 'say in one short sentence what the step does for the user; move the reasons and technical details to the README implementation notes');
    }
    if (!('optional' in task)) report.warn('W-MISSING-OPTIONAL', at, 'task has no "optional" property (the documentation lists it as required)', 'add "optional": false (stop on error) or true (continue)');

    const type = task.type;
    if (typeof type !== 'string' || !TASK_TYPES.includes(type)) {
      report.error('E-TASK-TYPE', joinPath(at, 'type'), 'task type ' + JSON.stringify(type) + ' is not a Data Factory task type', 'catalog tasks use "SUB_WORKFLOW"; flow control uses SWITCH, DO_WHILE, TERMINATE, SET_VARIABLE or WAIT');
      continue;
    }
    if (type === 'DECISION') report.warn('W-DEPRECATED', joinPath(at, 'type'), 'DECISION is deprecated', 'use a SWITCH task with evaluatorType "value-param"');
    const name = task.name;
    const entry = typeof name === 'string' ? catalog.get(name) : undefined;
    if (type === 'SUB_WORKFLOW') {
      if (typeof name !== 'string' || !name) {
        report.error('E-UNKNOWN-TASK', joinPath(at, 'name'), 'a SUB_WORKFLOW task needs the catalog task name in "name"', 'see tasks-catalog.json');
      } else if (entry && entry.type !== 'SUB_WORKFLOW') {
        report.error('E-TASK-TYPE', joinPath(at, 'type'), '"' + name + '" is a flow-control keyword: it belongs in "type" (' + entry.type + '), with free text in "name"', 'write "type": "' + entry.type + '"');
      } else if (!entry) {
        if (name.includes('/')) {
          customTasks.push(name);
          report.warn('W-CUSTOM-TASK', joinPath(at, 'name'), '"' + name + '" is not a catalog task; it is treated as a custom task of an account (<account>/<key>)', 'confirm that the account owns this custom task');
        } else {
          report.error('E-UNKNOWN-TASK', joinPath(at, 'name'), '"' + name + '" is not a catalog task' + suggest(name, Array.from(catalog.keys())), 'use a name from tasks-catalog.json');
        }
      }
      if (!isObject(task.inputParameters)) {
        report.error('E-STRUCTURAL', joinPath(at, 'inputParameters'), 'a SUB_WORKFLOW task needs an "inputParameters" object', 'add "inputParameters": { ... } (never "input")');
      }
    } else if (entry && entry.type !== type && entry.type !== 'SUB_WORKFLOW') {
      report.error('E-TASK-TYPE', joinPath(at, 'type'), 'task name "' + name + '" implies type ' + entry.type + ', got ' + type, 'align name and type');
    } else if (entry && entry.type === 'SUB_WORKFLOW') {
      report.error('E-TASK-TYPE', joinPath(at, 'type'), 'catalog task "' + name + '" must use "type": "SUB_WORKFLOW"', 'write "type": "SUB_WORKFLOW"');
    }
    if (entry) {
      if (entry.status === 'deprecated') report.warn('W-DEPRECATED', joinPath(at, 'name'), '"' + entry.name + '" is deprecated', entry.replacedBy ? 'use "' + entry.replacedBy + '"' : 'see the documentation');
      if (type === 'SUB_WORKFLOW' && isObject(task.inputParameters)) lintCatalogInputs(ctx, node, entry);
    }
    if (typeof name === 'string') nameOfTasks.add(name);
    lintFlowControl(ctx, node);
    if (isObject(task.inputParameters)) {
      const family = NO_GLOBAL_VARIABLE[type] || (name === 'json-transform-jq' ? name : null);
      if (family) {
        for (const s of taskStrings({ inputParameters: task.inputParameters }, at)) {
          if (s.value.includes('${workflow.globalVariables.')) {
            report.warn('W-GLOBALVAR-UNSUPPORTED', s.path, 'global variables are not supported in the inputs of ' + family, 'pass the value through a code-execute-javascript "data" object or a user input');
          }
        }
      }
    }
  }
}

function suggest(name, candidates) {
  let best = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const score = similarity(name, candidate);
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best && bestScore >= 0.6 ? '; did you mean "' + best + '"?' : '';
}

function similarity(a, b) {
  const grams = (s) => { const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); return g; };
  const ga = grams(a.toLowerCase());
  const gb = grams(b.toLowerCase());
  let common = 0;
  for (const g of ga) if (gb.has(g)) common++;
  return ga.size + gb.size ? (2 * common) / (ga.size + gb.size) : 0;
}

function lintCatalogInputs(ctx, node, entry) {
  const { report } = ctx;
  const params = node.task.inputParameters;
  const at = joinPath(node.path, 'inputParameters');
  if (entry.name === 'data-item-find' && params.findMode === 'USER_SELECTION' && isObject(params.request) && params.request.json !== undefined) {
    report.warn('W-IGNORED-SELECTION-REQUEST', joinPath(at, 'request.json'), 'USER_SELECTION builds its request from the launch context and ignores request.json, including its options', 'use REQUEST with the launch partition, screen level and query to apply includedFieldKeys or limit');
  }
  if (entry.name === 'ai-prompt-execute' && params.provider === 'openai' && params.responseFormat === 'json_object' && Array.isArray(params.tools) && params.tools.some((tool) => isObject(tool) && tool.type === 'web-search')) {
    report.warn('W-AI-WEB-JSON-COMPATIBILITY', joinPath(at, 'responseFormat'), 'OpenAI may reject web-search combined with responseFormat "json_object"; model compatibility is not checked by this validator', 'omit responseFormat, request JSON in the prompt and parse the response; see the ai-prompt-execute reference');
  }
  const known = new Map(entry.inputs.map((input) => [input.name, input]));
  for (const input of entry.inputs) {
    if (input.required && !(input.name in params)) {
      report.error('E-REQUIRED-INPUT', at, '"' + entry.name + '" requires the input "' + input.name + '"', 'add "' + input.name + '" (see ' + entry.docUrl + ')');
    }
  }
  for (const key of Object.keys(params)) {
    const input = known.get(key);
    if (!input) {
      if (entry.inputs.length) report.warn('W-UNKNOWN-INPUT', joinPath(at, key), '"' + key + '" is not a documented input of "' + entry.name + '"', 'check the spelling against ' + entry.docUrl + ' (recent inputs may be missing from the catalog)');
      continue;
    }
    const value = params[key];
    if (typeof value === 'string' && WHOLE_REFERENCE.test(value)) continue;
    if (input.enum && !input.enum.includes(value)) {
      report.error('E-ENUM', joinPath(at, key), '"' + key + '" must be one of ' + input.enum.join(', ') + ', got ' + JSON.stringify(value), 'use an exact enum value or a ${...} reference');
    }
    if (key === 'request' && input.methods && isObject(value) && 'method' in value && !(typeof value.method === 'string' && WHOLE_REFERENCE.test(value.method)) && !input.methods.includes(value.method)) {
      report.error('E-ENUM', joinPath(joinPath(at, key), 'method'), 'request.method must be one of ' + input.methods.join(', ') + ', got ' + JSON.stringify(value.method), 'use an exact enum value');
    }
  }
}

function lintFlowControl(ctx, node) {
  const { report, byRef } = ctx;
  const task = node.task;
  const at = node.path;
  const type = task.type;
  if (type === 'SWITCH' || type === 'DECISION') {
    if (!('decisionCases' in task)) report.error('E-SWITCH', at, type + ' needs a "decisionCases" object', 'add "decisionCases": {"<value>": [tasks...]}');
    if (!('defaultCase' in task)) report.warn('W-MISSING-DEFAULTCASE', at, type + ' has no "defaultCase" (the documentation shows both forms; prefer declaring it)', 'add "defaultCase": []');
    else if (!Array.isArray(task.defaultCase)) report.error('E-STRUCTURAL', joinPath(at, 'defaultCase'), 'defaultCase must be an array of tasks', 'write "defaultCase": []');
  }
  if (type === 'SWITCH') {
    if ('evaluatorType' in task) {
      if (task.evaluatorType !== 'value-param' && task.evaluatorType !== 'javascript') {
        report.error('E-SWITCH', joinPath(at, 'evaluatorType'), 'evaluatorType must be "value-param" or "javascript", got ' + JSON.stringify(task.evaluatorType), 'fix the evaluatorType');
      }
    } else {
      report.warn('W-SWITCH-EVALUATOR', at, 'SWITCH has no "evaluatorType" (the documentation gives "javascript" as the default; declaring it makes the choice explicit)', 'add "evaluatorType": "value-param" or "javascript"');
    }
    if (typeof task.expression !== 'string' || !task.expression) {
      report.error('E-SWITCH', at, 'SWITCH needs a non-empty "expression"', 'with value-param, the name of the inputParameters key to evaluate; with javascript, the expression');
    } else if (task.evaluatorType === 'value-param') {
      if (!isObject(task.inputParameters) || !(task.expression in task.inputParameters)) {
        report.error('E-SWITCH', joinPath(at, 'expression'), 'with evaluatorType "value-param", expression "' + task.expression + '" must be a key of inputParameters', 'add "' + task.expression + '" to inputParameters or fix the expression');
      }
    }
    if (isObject(task.inputParameters)) {
      for (const key of Object.keys(task.inputParameters)) {
        const value = task.inputParameters[key];
        const literal = typeof value === 'string' && /^([\w-]+)\.(status|output(\.[\w-]+)*)$/.exec(value);
        if (literal && byRef.has(literal[1])) {
          report.warn('W-STATUS-LITERAL', joinPath(joinPath(at, 'inputParameters'), key), '"' + value + '" is written without ${...}: the documentation page on failures shows this form, every other documented reference is written "${...}"', 'write "${' + value + '}" (prefer the braced form)');
        }
      }
    }
    if (isObject(task.decisionCases) && task.evaluatorType === 'value-param' && task.expression && isObject(task.inputParameters)) {
      const source = task.inputParameters[task.expression];
      const keys = Object.keys(task.decisionCases);
      if (keys.some((k) => ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'].includes(k)) && !(typeof source === 'string' && /^\$\{[\w-]+\.status\}$/.test(source))) {
        report.warn('W-STATUS-LITERAL', joinPath(at, 'decisionCases'), 'the cases look like task statuses but the evaluated value is not a "${<ref>.status}" reference', 'wire "${<ref>.status}" of an optional task');
      }
    }
  }
  if (type === 'DECISION' && typeof task.caseValueParam !== 'string') {
    report.error('E-SWITCH', at, 'DECISION needs a "caseValueParam" string', 'name the inputParameters key to evaluate, or migrate to SWITCH');
  }
  if (type === 'DO_WHILE') {
    if (typeof task.loopCondition !== 'string' || !task.loopCondition) report.error('E-STRUCTURAL', at, 'DO_WHILE needs a "loopCondition" JavaScript expression', 'add "loopCondition"');
    if (!('loopOver' in task)) report.error('E-STRUCTURAL', at, 'DO_WHILE needs a "loopOver" task list', 'add "loopOver": [tasks...]');
    if (node.ancestors.some((a) => a.key === 'loopOver')) {
      report.warn('W-NESTED-LOOP', at, 'nesting loops is not documented: use task-batch-execute or a triggered job for the inner level', 'move the inner loop to a task-batch-execute task, or to a job triggered with data-job-execution-create');
    }
  }
  if (type === 'TERMINATE') {
    const params = task.inputParameters;
    if (!isObject(params)) {
      report.error('E-TERMINATE', at, 'TERMINATE needs "inputParameters" with a "terminationStatus"', 'add "inputParameters": {"terminationStatus": "COMPLETED"}');
    } else {
      if (params.terminationStatus !== 'COMPLETED' && params.terminationStatus !== 'FAILED') {
        report.error('E-TERMINATE', joinPath(joinPath(at, 'inputParameters'), 'terminationStatus'), 'terminationStatus must be "COMPLETED" or "FAILED", got ' + JSON.stringify(params.terminationStatus), 'COMPLETED ends the job in success, FAILED in error');
      }
      for (const key of Object.keys(params)) {
        if (!TERMINATE_INPUTS.includes(key)) report.error('E-TERMINATE', joinPath(joinPath(at, 'inputParameters'), key), '"' + key + '" is not a documented TERMINATE input', 'use "terminationStatus" and expose values with "outputParameters": {...}; allowed: ' + TERMINATE_INPUTS.join(', '));
      }
      if ('outputParameters' in params && !isObject(params.outputParameters)) report.error('E-TERMINATE', joinPath(joinPath(at, 'inputParameters'), 'outputParameters'), 'TERMINATE outputParameters must be an object', 'write {"label": "value"}');
    }
  }
  if (type === 'WAIT' && isObject(task.inputParameters)) {
    const has = ['duration', 'until'].filter((k) => k in task.inputParameters);
    if (has.length !== 1) report.error('E-STRUCTURAL', joinPath(at, 'inputParameters'), 'WAIT needs exactly one of "duration" or "until" (got ' + (has.length ? has.join(' and ') : 'neither') + ')', 'a WAIT without either waits indefinitely');
  }
}

function lintExpressions(ctx) {
  const { job, report, nodes, byRef, inputKeys } = ctx;
  const setVariables = [];
  for (const node of nodes) {
    if (node.task.type === 'SET_VARIABLE' && isObject(node.task.inputParameters)) {
      setVariables.push({ order: node.order, keys: Object.keys(node.task.inputParameters) });
    }
  }
  const strings = [];
  for (const node of nodes) for (const s of taskStrings(node.task, node.path)) strings.push({ node: node, value: s.value, path: s.path });
  if (isObject(job.outputParameters)) for (const s of taskStrings({ outputParameters: job.outputParameters }, '')) strings.push({ node: null, value: s.value, path: s.path });

  for (const s of strings) {
    let cursor = 0;
    const text = s.value;
    while (true) {
      const start = text.indexOf('${', cursor);
      if (start < 0) break;
      EXPRESSION.lastIndex = start;
      const match = EXPRESSION.exec(text);
      if (!match || match.index !== start) {
        const snippet = text.slice(start, Math.min(text.length, start + 40));
        report.error('E-UNRESOLVED', s.path, 'literal "${" that is not a well-formed ${...} expression: ' + JSON.stringify(snippet), 'write ${<root>.<path>} with letters, digits, _, - and [n] only, or remove it');
        cursor = start + 2;
        continue;
      }
      cursor = start + match[0].length;
      checkExpression(ctx, s, match[1], match[2], setVariables);
    }
  }

  function checkExpression(context, s, root, rest, setVars) {
    const segments = rest.replace(/\[\d+\]/g, '').split('.').filter(Boolean);
    const order = s.node ? s.node.order : Number.MAX_SAFE_INTEGER;
    const expr = '${' + root + rest + '}';
    if (root === 'workflow') {
      const ns = segments[0];
      if (!WORKFLOW_NAMESPACES.includes(ns)) {
        report.error('E-EXPR-ROOT', s.path, expr + ': "workflow.' + (ns || '') + '" is not a documented namespace', 'use ${workflow.input.<key>}, ${workflow.input.context.<prop>}, ${workflow.globalVariables.<key>} or ${workflow.variables.<key>}');
        return;
      }
      if (ns === 'input' && segments.length > 1 && segments[1] !== 'context' && !inputKeys.has(segments[1])) {
        report.warn('W-UNDECLARED-INPUT', s.path, expr + ': user input "' + segments[1] + '" is not declared in userInputs', 'declare it, or state in README.md that a calling job supplies it');
      }
      if (ns === 'variable') report.warn('W-LEGACY-VARIABLE', s.path, expr + ' uses the legacy "variable" namespace', 'write ${workflow.globalVariables.' + (segments[1] || '<key>') + '}');
      if (ns === 'variables' && segments[1] && !setVars.some((v) => v.order < order && v.keys.includes(segments[1]))) {
        report.warn('W-VARIABLE-UNSET', s.path, expr + ': no earlier SET_VARIABLE task sets "' + segments[1] + '"', 'add a SET_VARIABLE task before this one, or use ${workflow.globalVariables.<key>} for an account variable');
      }
      return;
    }
    const target = byRef.get(root);
    if (!target) {
      report.error('E-REF-ORDER', s.path, expr + ': "' + root + '" is not a taskReferenceName of this job' + suggest(root, Array.from(byRef.keys())), 'reference an existing task, or ${workflow.input.<key>} for a user input');
      return;
    }
    const kind = segments[0];
    if (!['output', 'status', 'input'].includes(kind) || (kind === 'status' && segments.length > 1)) {
      report.error('E-EXPR-ROOT', s.path, expr + ': only ${<ref>.output.<path>}, ${<ref>.status} and (inside a loop) ${<ref>.input.<key>} are documented after a task reference', 'fix the reference');
      return;
    }
    const isLoop = target.task.type === 'DO_WHILE';
    const loopScoped = isLoop && (kind === 'input' || (kind === 'output' && segments[1] === 'iteration'));
    if (loopScoped) {
      if (!s.node || !isDescendantOf(s.node, target)) {
        report.error('E-LOOP-SCOPE', s.path, expr + ' is only available to the tasks inside the loopOver of "' + root + '"', 'move the consumer inside the loop, or read the loop output map after the loop');
      }
      return;
    }
    if (kind === 'input') {
      report.warn('W-REF-INPUT', s.path, expr + ': reading the inputs of another task is only documented for loops (${<loopRef>.input.<key>})', 'reference the original value instead');
      return;
    }
    if (kind === 'output' && segments[1] === 'report' && target.task.type === 'SUB_WORKFLOW' && NO_REPORT_OUTPUT.has(target.task.name)) {
      report.error('E-NO-REPORT-OUTPUT', s.path, expr + ': "' + target.task.name + '" provides no report output', target.task.name === 'file-transformation-xslt'
        ? 'test allFilesTransformed and give the user an explicit message instead'
        : 'use the task status and the file output instead');
    }
    if (!s.node) return;
    if (target.order === s.node.order) {
      report.error('E-REF-ORDER', s.path, expr + ' references the task itself', 'reference an earlier task');
      return;
    }
    if (target.order > s.node.order) {
      report.error('E-REF-ORDER', s.path, expr + ' references "' + root + '" (' + target.path + '), which is declared after this task', 'move the referenced task before this one, or fix the reference');
      return;
    }
    const relation = branchRelation(s.node, target);
    if (relation === 'sibling') report.warn('W-SIBLING-BRANCH', s.path, expr + ' references a task in another branch of the same SWITCH: it never runs together with this one', 'read the value from a task that runs before the SWITCH, or a TERMINATE output');
    else if (relation === 'inside') report.warn('W-BRANCH-OUTPUT', s.path, expr + ' references a task inside a SWITCH branch that may not run (the value may be null)', 'expose a flag or use the TERMINATE outputParameters of that branch');
  }
}

function lintAssets(ctx) {
  const { report, nodes, folder, job } = ctx;
  const strings = [];
  for (const node of nodes) for (const s of taskStrings(node.task, node.path)) strings.push(s);
  if (isObject(job.outputParameters)) strings.push(...taskStrings({ outputParameters: job.outputParameters }, ''));
  const objects = [];
  for (const node of nodes) collectUrlObjects(node.task.inputParameters, joinPath(node.path, 'inputParameters'), objects);
  for (const o of objects) report.error('E-ASSET-OBJECT', o.path, '{"url": "' + o.url + '"} is not a runtime form of an asset reference', 'write the bare string "' + o.url + '" instead of an object');

  let ignore = null;
  if (folder) ignore = loadIgnoreRules(folder);
  for (const s of strings) {
    if (!s.value.startsWith('file://')) continue;
    const rel = s.value.slice('file://'.length).replace(/\\/g, '/');
    if (!rel.startsWith('assets/')) report.warn('W-ASSET-PATH', s.path, '"' + s.value + '" does not point inside the assets folder', 'ship files under assets/ and reference them as file://assets/<path>');
    if (rel.includes('${')) continue;
    if (!folder) continue;
    const abs = path.join(folder, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      report.error('E-ASSET-MISSING', s.path, 'missing file "' + s.value + '" in the job folder', 'add the file at ' + rel + ' or fix the reference');
    } else if (isIgnored(rel, false, ignore.rules)) {
      report.error('E-ASSET-MISSING', s.path, '"' + s.value + '" exists but is excluded from the package by .jobignore', 'remove the matching line from .jobignore or move the file');
    }
  }
}

function collectUrlObjects(value, at, out) {
  if (Array.isArray(value)) value.forEach((item, i) => collectUrlObjects(item, joinPath(at, i), out));
  else if (isObject(value)) {
    if (typeof value.url === 'string' && value.url.startsWith('file://')) out.push({ path: at, url: value.url });
    for (const key of Object.keys(value)) collectUrlObjects(value[key], joinPath(at, key), out);
  }
}

function lintPackage(ctx) {
  const { report, folder } = ctx;
  if (!folder) return;
  if (!fs.existsSync(path.join(folder, '.jobignore'))) report.warn('W-JOBIGNORE-MISSING', '.jobignore', 'no .jobignore in the job folder (defaults: *.job.zip, .jobignore)', 'add one that also excludes assets/TESTS/* and tests/*');
  if (!fs.existsSync(path.join(folder, 'README.md'))) report.warn('W-README-MISSING', 'README.md', 'no README.md in the job folder', 'document purpose, user inputs, variables, pipeline, periodicity and import steps');
  if (!fs.existsSync(path.join(folder, 'CHANGELOG.md'))) report.warn('W-CHANGELOG-MISSING', 'CHANGELOG.md', 'no CHANGELOG.md in the job folder', 'add one entry per version');
}

// Map schema violations onto finding ids, skipping paths already covered by lint.
function applySchemaErrors(ctx, violations) {
  const { report } = ctx;
  let count = 0;
  for (const v of violations) {
    if (report.hasErrorAt(v.path)) continue;
    // A task whose name and type disagree is reported once by the lint rules.
    const sibling = /\.(name|type)$/.exec(v.path);
    if (sibling && report.hasErrorAt(v.path.replace(/\.(name|type)$/, sibling[1] === 'name' ? '.type' : '.name'))) continue;
    if (++count > 100) break;
    const under = v.path.includes('inputParameters');
    if (v.keyword === 'required') {
      if (under) report.error('E-REQUIRED-INPUT', v.path, v.message, 'add the missing input');
      else if (/^tasks/.test(v.path)) report.error('E-STRUCTURAL', v.path, v.message, 'complete the task');
      else if (/^userInputs/.test(v.path)) report.error('E-USERINPUT-KEY', v.path, v.message, 'complete the user input');
      else report.error('E-ROOT-REQUIRED', v.path, v.message, 'add the property');
    } else if (v.keyword === 'enum' || v.keyword === 'const') {
      report.error('E-ENUM', v.path, v.message, 'use an exact value');
    } else {
      report.error('E-SHAPE', v.path, v.message, 'fix the value type or format');
    }
  }
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function validate(target, options) {
  options = options || {};
  const report = makeReporter();
  const result = { target: target, mode: 'file', errors: report.errors, warnings: report.warnings };
  let resolved;
  try {
    resolved = fs.realpathSync(path.resolve(target));
  } catch (err) {
    throw new Error('cannot find ' + target);
  }
  let folder = null;
  let jobFile = resolved;
  if (fs.statSync(resolved).isDirectory()) {
    folder = resolved;
    jobFile = path.join(folder, 'job.json');
    result.mode = 'package';
    if (!fs.existsSync(jobFile)) {
      report.error('E-JSON', 'job.json', 'no job.json in ' + folder, 'the job definition must be named job.json at the root of the job folder');
      return result;
    }
  }
  result.jobFile = jobFile;
  result.folder = folder;

  const text = fs.readFileSync(jobFile, 'utf8');
  let job;
  try {
    job = parseJob(text.replace(/^\uFEFF/, ''));
  } catch (err) {
    report.error('E-JSON', 'job.json', 'invalid JSON: ' + err.message, 'remove comments and trailing commas; keep UTF-8 without BOM');
    return result;
  }
  if (text.charCodeAt(0) === 0xfeff) report.warn('W-JSON-BOM', 'job.json', 'the file starts with a UTF-8 byte order mark', 'save the file as UTF-8 without BOM');
  if (!isObject(job)) {
    report.error('E-JSON', 'job.json', 'the job definition must be a JSON object', 'see the job format reference');
    return result;
  }
  result.job = job;

  const schema = readJsonFile(options.schema || DEFAULT_SCHEMA, 'schema');
  const catalogList = readJsonFile(options.catalog || DEFAULT_CATALOG, 'catalog');
  const catalog = new Map(catalogList.map((entry) => [entry.name, entry]));

  const walk = walkTasks(job, report);
  const ctx = { job: job, folder: folder, report: report, catalog: catalog, nodes: walk.nodes, byRef: walk.byRef, inputKeys: new Map() };
  lintRoot(ctx);
  lintUserInputs(ctx);
  lintTasks(ctx);
  lintExpressions(ctx);
  lintAssets(ctx);
  lintPackage(ctx);
  applySchemaErrors(ctx, schemaErrors(schema, schema, job, '', false));
  return result;
}

function printHuman(result, strict) {
  const lines = [];
  lines.push('Validating ' + result.target + ' (' + result.mode + ' mode)');
  const groups = [['ERRORS', result.errors], ['WARNINGS', result.warnings]];
  for (const [label, findings] of groups) {
    if (!findings.length) continue;
    lines.push('');
    lines.push(label + ' (' + findings.length + ')');
    for (const f of findings) {
      lines.push('  ' + f.id + '  ' + f.path);
      lines.push('    ' + f.message);
      if (f.fix) lines.push('    fix: ' + f.fix);
    }
  }
  lines.push('');
  lines.push('Result: ' + result.errors.length + ' error(s), ' + result.warnings.length + ' warning(s)' + (strict && result.warnings.length ? ' (strict: warnings fail)' : ''));
  return lines.join('\n');
}

function usage(code) {
  const text = [
    'Usage: node validate-job.js <job-folder | job.json> [--json] [--strict] [--schema <path>] [--catalog <path>]',
    '',
    '  <job-folder>   validate <folder>/job.json and the package (assets, .jobignore, README, CHANGELOG)',
    '  <job.json>     validate the definition alone (file-system checks skipped)',
    '  --json         machine-readable output {"errors": [...], "warnings": [...]}',
    '  --strict       warnings fail the run (exit 1)',
    '  --schema       alternative job.schema.json (default: next to this script)',
    '  --catalog      alternative tasks-catalog.json (default: next to this script)',
    '',
    'Finding ids: E-* errors block the package; W-* warnings must be explained.',
    'Exit codes: 0 valid, 1 errors (or warnings with --strict) or failure, 2 usage.',
  ].join('\n');
  (code === 0 ? console.log : console.error)(text);
  process.exit(code);
}

function main(argv) {
  const options = { json: false, strict: false };
  let target = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--schema' || arg === '--catalog') {
      if (!argv[i + 1]) { console.error('Error: ' + arg + ' needs a path'); usage(2); }
      options[arg.slice(2)] = path.resolve(argv[++i]);
    } else if (arg.startsWith('-')) { console.error('Error: unknown option ' + arg); usage(2); }
    else if (target) { console.error('Error: only one target is accepted'); usage(2); }
    else target = arg;
  }
  if (!target) { console.error('Error: missing <job-folder | job.json>'); usage(2); }

  let result;
  try {
    result = validate(target, options);
  } catch (err) {
    if (options.json) console.log(JSON.stringify({ errors: [{ id: 'E-FAILURE', path: '(root)', message: err.message, fix: '' }], warnings: [] }, null, 2));
    else console.error('Error: ' + err.message);
    process.exit(1);
  }
  if (options.json) console.log(JSON.stringify({ errors: result.errors, warnings: result.warnings }, null, 2));
  else console.log(printHuman(result, options.strict));
  const failed = result.errors.length > 0 || (options.strict && result.warnings.length > 0);
  process.exit(failed ? 1 : 0);
}

module.exports = { validate: validate, compileIgnore: compileIgnore, isIgnored: isIgnored, DEFAULT_IGNORE: DEFAULT_IGNORE, ALWAYS_IGNORE: ALWAYS_IGNORE };

if (require.main === module) main(process.argv.slice(2));
