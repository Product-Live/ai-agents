'use strict';

/*
 * Helpers for lint-script.js: argument parsing, error exit, text file
 * reading, the script wrapper used for the syntax check and the jq builtin
 * lint. Static analysis only: nothing here executes a script, starts a
 * process or opens a network connection.
 *
 * Zero dependencies, Node >= 18, CommonJS, cross-platform.
 */

const fs = require('fs');
const path = require('path');

/*
 * Minimal argument parser. spec = { name: 'boolean' | 'string' | 'list' }.
 * Returns { values, positionals }. Exits 2 on an unknown or incomplete option.
 */
function parseArgs(argv, spec, usage) {
  const values = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log(usage);
      process.exit(0);
    }
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    const name = (eq === -1 ? arg : arg.slice(0, eq)).slice(2);
    const kind = spec[name];
    if (!kind) fail('unknown option --' + name + '\n\n' + usage, 2);
    if (kind === 'boolean') {
      values[name] = true;
      continue;
    }
    let value;
    if (eq !== -1) {
      value = arg.slice(eq + 1);
    } else {
      if (i + 1 >= argv.length) fail('option --' + name + ' needs a value', 2);
      value = argv[i + 1];
      i += 1;
    }
    if (kind === 'list') {
      if (!values[name]) values[name] = [];
      values[name].push(value);
    } else {
      values[name] = value;
    }
  }
  return { values: values, positionals: positionals };
}

function fail(message, code) {
  console.error('Error: ' + message);
  process.exit(code === undefined ? 1 : code);
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function readTextFile(file, encoding) {
  const enc = normaliseEncoding(encoding);
  let text;
  try {
    text = fs.readFileSync(file, enc);
  } catch (err) {
    throw new Error('cannot read ' + file + ': ' + err.message);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

function normaliseEncoding(encoding) {
  const e = String(encoding || 'utf-8').toLowerCase().replace(/[^a-z0-9]/g, '');
  const known = { utf8: 'utf8', latin1: 'latin1', iso88591: 'latin1', ascii: 'ascii', utf16le: 'utf16le', ucs2: 'ucs2', base64: 'base64', hex: 'hex', binary: 'latin1' };
  if (!known[e]) throw new Error('unsupported resource encoding "' + encoding + '" (use utf-8, latin1, ascii, utf16le, base64 or hex)');
  return known[e];
}

/*
 * Wraps a code-execute-javascript script as the body of a strict-mode
 * function, the local choice of lint-script (whether the
 * platform applies strict mode is not documented). The code starts on the
 * first line, so line numbers in error messages match the script file; the
 * closing line keeps a trailing // comment from swallowing the end.
 */
function wrapFunctionBody(code) {
  return '(function () {"use strict";' + code + '\n}());';
}

// The public task page: the whole "Dates" section of the jq manual is unsupported.
const JQ_DATE_BUILTINS = ['now', 'today', 'todate', 'fromdate', 'strftime', 'strflocaltime', 'strptime', 'mktime', 'gmtime',
  'localtime', 'date', 'dateadd', 'datesub', 'todateiso8601', 'fromdateiso8601', 'dateiso8601'];

// The task page links the jq 1.5 manual. Builtins newer than that manual, or bound to the environment
// (input, debug, env...), are not documented as supported: verify them before relying on them.
const JQ_UNVERIFIED_BUILTINS = ['input', 'inputs', 'input_filename', 'input_line_number', 'debug', 'stderr', 'halt', 'halt_error',
  'env', 'builtins', 'walk', 'pick', 'abs', 'toarray', 'trim', 'ltrim', 'rtrim', 'have_literal_numbers',
  'have_decnum', 'significand', 'INDEX', 'IN', 'GROUP_BY', 'UNIQUE_BY', 'ANY', 'ALL', '$__loc__', '$ENV', '@base32d'];

/* Replaces jq string literals and # comments by spaces (keeps line structure). */
function maskJqStrings(expression) {
  return expression
    .replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/#[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/* Returns [{ line, severity, message }]. Errors: date builtins. Warnings: unverified builtins, ${...} placeholders. */
function lintJq(expression) {
  const findings = [];
  const masked = maskJqStrings(expression);
  function lineOf(index) {
    return masked.slice(0, index).split('\n').length;
  }
  const pattern = /(?<![.$\w@])(\$__loc__|\$ENV|@base32d|[A-Za-z_][A-Za-z0-9_]*)\b(?!\s*:)/g;
  let m;
  while ((m = pattern.exec(masked)) !== null) {
    const name = m[1];
    if (JQ_DATE_BUILTINS.includes(name)) {
      findings.push({ line: lineOf(m.index), severity: 'error', message: 'jq builtin "' + name + '" belongs to the Dates section, which the platform does not support: compute dates in a code-execute-javascript task and pass them through data' });
    } else if (JQ_UNVERIFIED_BUILTINS.includes(name)) {
      findings.push({ line: lineOf(m.index), severity: 'warning', message: 'jq builtin "' + name + '" is newer than the jq 1.5 manual linked by the task page, or bound to the environment: verify on the platform before relying on it' });
    }
  }
  const placeholder = /\$\{[^}]*\}/g;
  while ((m = placeholder.exec(expression)) !== null) {
    findings.push({ line: lineOf(m.index), severity: 'warning', message: 'job expression ' + m[0] + ' is resolved by the platform before the task runs; locally it is passed as literal text' });
  }
  return findings;
}

module.exports = {
  JQ_DATE_BUILTINS, JQ_UNVERIFIED_BUILTINS,
  parseArgs, fail, toPosix, readTextFile, normaliseEncoding, wrapFunctionBody, maskJqStrings, lintJq,
};
