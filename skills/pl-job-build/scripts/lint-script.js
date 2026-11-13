#!/usr/bin/env node
'use strict';

/*
 * Static checks, without execution, for the scripts and expressions of a
 * Data Factory job:
 *   --kind js      code-execute-javascript script: modules, network, process,
 *                  timers, console, eval, non-standard globals, missing return,
 *                  job expressions inside the code, the length of an inline
 *                  script (a readability convention of these skills), syntax.
 *   --kind switch  SWITCH expression (evaluatorType "javascript"): ES5-only
 *                  syntax and builtins, no return, no log(), syntax.
 *   --kind loop    DO_WHILE loopCondition: same as switch, boolean result.
 *   --kind jq      json-transform-jq expression: date builtins, and builtins
 *                  newer than the jq 1.5 manual or bound to the environment.
 *
 * The documentation states no language version for SWITCH expressions and
 * loop conditions: the lint keeps them to ES5 syntax, the safe common subset.
 * Scripts run in the platform's JavaScript sandbox (standard ECMAScript, no
 * network, no modules, 10 minutes per task).
 *
 * Output: <path>:<line>: <severity>: <message>. Exit 1 when an error is
 * found (warnings too with --strict), 0 otherwise, 2 on usage errors.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const helpers = require('./lint-helpers');

const USAGE = [
  'Usage: node lint-script.js --kind js|switch|loop|jq <file-or-expression> [--strict]',
  '',
  'Static checks (no execution) for a code-execute-javascript script, a SWITCH javascript expression,',
  'a loop condition or a jq expression. The argument is a file path when such a file exists,',
  'otherwise it is read as an inline expression.',
  '',
  'Options:',
  '  --kind <js|switch|loop|jq>   what the text is (required)',
  '  --strict                     exit 1 on warnings too',
  '  --help                       this message',
  '',
  'Output lines: <path>:<line>: <error|warning>: <message>. Exit codes: 0 clean, 1 findings, 2 usage.',
].join('\n');

// Readability convention of these skills, not a platform figure: an inline
// script (given as text, not as a file) longer than this many lines is easier
// to review and to test as an expressionFile asset.
const INLINE_MAX_LINES = 30;

// ---------------------------------------------------------------- masking

/*
 * Replaces comments, string literals, template literals and regex literals
 * by spaces so that the pattern checks do not fire inside them. Line
 * structure is preserved. The regex-literal heuristic looks at the previous
 * significant character.
 */
function maskJs(source) {
  const out = source.split('');
  const n = source.length;
  let i = 0;
  let lastSignificant = '';
  function blank(from, to) {
    for (let k = from; k < to; k += 1) if (out[k] !== '\n') out[k] = ' ';
  }
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      let j = source.indexOf('\n', i);
      if (j === -1) j = n;
      blank(i, j);
      i = j;
      continue;
    }
    if (c === '/' && next === '*') {
      let j = source.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      blank(i, j);
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && source[j] !== c) {
        if (source[j] === '\\') j += 1;
        if (c !== '`' && source[j] === '\n') break;
        j += 1;
      }
      blank(i + 1, Math.min(j, n));
      i = Math.min(j + 1, n);
      lastSignificant = c;
      continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$/.test(lastSignificant) ) {
      let j = i + 1;
      let inClass = false;
      while (j < n && source[j] !== '\n') {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        else if (source[j] === '/' && !inClass) break;
        j += 1;
      }
      if (j < n && source[j] === '/') {
        blank(i + 1, j);
        i = j + 1;
        lastSignificant = '/';
        continue;
      }
    }
    if (!/\s/.test(c)) lastSignificant = c;
    i += 1;
  }
  return out.join('');
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function scan(masked, rules, findings) {
  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
    let m;
    while ((m = re.exec(masked)) !== null) {
      findings.push({ line: lineOf(masked, m.index), severity: rule.severity, message: rule.message.replace('%s', m[0].trim()) });
      if (rule.once) break;
    }
  }
}

function syntaxCheck(code, options) {
  try {
    new vm.Script(code, { filename: options.filename }); // eslint-disable-line no-new
    return null;
  } catch (err) {
    const first = (err.stack || '').split('\n')[0] || '';
    const m = /:(\d+)$/.exec(first.trim());
    return { line: m ? Number(m[1]) : 1, message: err.message };
  }
}

// ------------------------------------------------------------- JS scripts

const JS_RULES = [
  { pattern: /\brequire\s*\(/, severity: 'error', message: 'require() is not available: the script runs with no access to modules' },
  { pattern: /(^|[;\s])import\s*[\w{*(]/, severity: 'error', message: 'import is not available: the script runs with no access to modules' },
  { pattern: /(^|[;\s])export\s+/, severity: 'error', message: 'export is not available: return the result instead' },
  { pattern: /\bfetch\s*\(/, severity: 'error', message: 'fetch() is not available: the script has no network access (fetch data with a protocol-http-perform task and pass it through data)' },
  { pattern: /\bXMLHttpRequest\b|\bWebSocket\b/, severity: 'error', message: '%s is not available: no network access' },
  { pattern: /\bprocess\s*\./, severity: 'error', message: 'process is not one of the documented globals ($.data, $.resources, log()): no environment, arguments or exit' },
  { pattern: /\b(setTimeout|setInterval|setImmediate|queueMicrotask|clearTimeout|clearInterval)\s*\(/, severity: 'error', message: '%s is not one of the documented globals ($.data, $.resources, log()): do not rely on timers' },
  { pattern: /\bconsole\s*\./, severity: 'error', message: 'console is not one of the documented globals: use log(...) to write to the task logs' },
  { pattern: /\b(Buffer|TextEncoder|TextDecoder|URL|URLSearchParams|crypto|__dirname|__filename|module|exports)\b/, severity: 'warning', message: '%s is a host global, not one of the documented globals; rely on standard ECMAScript objects only' },
  { pattern: /\bnew\s+Function\s*\(|\bFunction\s*\(/, severity: 'warning', message: 'Function() constructor: not documented as allowed (eval() is forbidden); avoid dynamic code' },
  { pattern: /\$\{\s*workflow\./, severity: 'error', message: 'job expression inside the code: ${workflow...} is never resolved in a script, pass the value through the data input and read $.data.<key>' },
];

function lintJs(source, label, findings, inline) {
  if (source.indexOf('eval(') !== -1) {
    findings.push({ line: lineOf(source, source.indexOf('eval(')), severity: 'error', message: 'eval( is forbidden by the documentation (the task fails); this lint flags every occurrence, comments and strings included' });
  }
  const masked = maskJs(source);
  scan(masked, JS_RULES, findings);
  if (!/\breturn\b/.test(masked)) {
    findings.push({ line: 1, severity: 'warning', message: 'no return statement: the documentation requires the script to return a value, which becomes the result output' });
  }
  if (/^\s*await\b/m.test(masked)) {
    findings.push({ line: lineOf(masked, masked.search(/^\s*await\b/m)), severity: 'error', message: 'top-level await: whether a returned promise is awaited is not documented; return a plain value' });
  }
  const lines = source.split('\n').length;
  if (inline && lines > INLINE_MAX_LINES) {
    findings.push({ line: 1, severity: 'warning', message: 'inline script of ' + lines + ' lines: ship it as an expressionFile asset (file://assets/<name>.js), easier to review and to test (a readability convention of these skills, above ' + INLINE_MAX_LINES + ' lines)' });
  }
  const syntax = syntaxCheck(helpers.wrapFunctionBody(source), { filename: label });
  if (syntax) findings.push({ line: syntax.line, severity: 'error', message: 'syntax error (strict mode function body): ' + syntax.message });
}

// --------------------------------------------------- switch / loop (ES5)

const ES5_CONTEXT = ' (ES5 syntax only in SWITCH expressions and loop conditions, a conservative convention of these skills: var, function, no ES2015+ syntax; the documentation states no language version)';

const ES5_RULES = [
  { pattern: /\b(let|const)\s+/, severity: 'error', message: '"%s" declaration is not ES5: use var' },
  { pattern: /=>/, severity: 'error', message: 'arrow function is not ES5: use function () { ... }' },
  { pattern: /\bclass\s+[A-Za-z_$]/, severity: 'error', message: 'class is not ES5' },
  { pattern: /\.\.\./, severity: 'error', message: 'spread / rest (...) is not ES5' },
  { pattern: /\b(var|let|const)\s*[[{]/, severity: 'error', message: 'destructuring is not ES5' },
  { pattern: /\b(async|await)\b/, severity: 'error', message: '%s is not ES5 (and there is nothing to await)' },
  { pattern: /\?\.(?!\d)/, severity: 'error', message: 'optional chaining (?.) is not ES5: test each level explicitly' },
  { pattern: /\?\?/, severity: 'error', message: 'nullish coalescing (??) is not ES5: use a ternary or ||' },
  { pattern: /\bfor\s*\(\s*(?:var\s+)?[A-Za-z_$][\w$]*\s+of\s/, severity: 'error', message: 'for...of is not ES5: use a classic for loop' },
  { pattern: /\bfunction\s*\*|\byield\b/, severity: 'error', message: 'generators are not ES5' },
  { pattern: /\*\*/, severity: 'error', message: 'exponent operator (**) is not ES5: use Math.pow' },
  { pattern: /\b0[bBoO][0-9a-fA-F]+/, severity: 'error', message: 'binary / octal literal is not ES5' },
  { pattern: /\b\d+_\d/, severity: 'error', message: 'numeric separator is not ES5' },
  { pattern: /\bfunction\s*[A-Za-z_$]*\s*\([^)]*=/, severity: 'error', message: 'default parameter value is not ES5' },
  { pattern: /(?<!Object)\.(includes|find|findIndex|findLast|findLastIndex|flat|flatMap|fill|at|entries|keys|values|copyWithin|toSorted|toReversed|toSpliced|with)\s*\(/, severity: 'error', message: '"%s" is an Array method newer than ES5: use indexOf, a for loop or filter()[0]' },
  { pattern: /\bObject\s*\.\s*(entries|values|assign|fromEntries|is|getOwnPropertySymbols|setPrototypeOf|hasOwn)\b/, severity: 'error', message: '%s is newer than ES5: use Object.keys with a loop' },
  { pattern: /\.(startsWith|endsWith|padStart|padEnd|repeat|trimStart|trimEnd|replaceAll|codePointAt|normalize|matchAll)\s*\(/, severity: 'error', message: '"%s" is a String method newer than ES5: use indexOf, slice or a regular expression' },
  { pattern: /\b(Array\s*\.\s*(from|of)|Number\s*\.\s*(isInteger|isFinite|isNaN|isSafeInteger|parseFloat|parseInt|EPSILON)|Math\s*\.\s*(trunc|sign|cbrt|log2|log10|hypot|fround|clz32|imul|expm1|log1p))\b/, severity: 'error', message: '%s is newer than ES5' },
  { pattern: /\b(Map|Set|WeakMap|WeakSet|Promise|Symbol|Proxy|Reflect|BigInt)\b/, severity: 'error', message: '%s is not ES5: use plain objects and arrays' },
  { pattern: /\blog\s*\(/, severity: 'error', message: 'log() is documented only for code-execute-javascript scripts, not for SWITCH or loop expressions: do not rely on it here' },
  { pattern: /\b(console|require|fetch|process)\s*[.(]/, severity: 'error', message: '%s is not documented for an expression: rely only on $ (the task inputs) and standard ES5 objects' },
  { pattern: /\$\{\s*workflow\./, severity: 'error', message: 'job expression ${workflow...} inside the expression: wire the value into the task inputParameters and read it as $.<key>' },
  { pattern: /\$\s*\.\s*data\b/, severity: 'warning', message: '$.data: in SWITCH and loop expressions $ holds the task inputParameters directly ($.<key>); $.data only exists if an input named "data" is declared' },
];

function lintEs5(source, label, kind, findings) {
  const raw = source;
  if (raw.indexOf('`') !== -1) {
    findings.push({ line: lineOf(raw, raw.indexOf('`')), severity: 'error', message: 'template literal is not ES5: concatenate with +' });
  }
  const masked = maskJs(source);
  scan(masked, ES5_RULES, findings);
  if (/\breturn\b/.test(masked) && !/\bfunction\b/.test(masked)) {
    findings.push({ line: lineOf(masked, masked.search(/\breturn\b/)), severity: 'error', message: 'return at top level: the documented examples give their value as the last statement, not with return (wrap in (function () { ... })(); if you need return)' });
  }
  const syntax = syntaxCheck(source, { filename: label });
  if (syntax) findings.push({ line: syntax.line, severity: 'error', message: 'syntax error (classic script): ' + syntax.message });
  if (kind === 'loop' && /^\s*['"]/.test(source.trim().split('\n').pop() || '')) {
    findings.push({ line: 1, severity: 'warning', message: 'the loop condition must yield an explicit boolean (true or false); other result types are not documented' });
  }
  findings.forEach((f) => { if (f.severity === 'error' && /not ES5/.test(f.message) && !f.message.endsWith(')')) f.message += ES5_CONTEXT; });
}

// -------------------------------------------------------------------- main

function main() {
  const parsed = helpers.parseArgs(process.argv.slice(2), { kind: 'string', strict: 'boolean' }, USAGE);
  const kind = (parsed.values.kind || '').toLowerCase();
  if (!['js', 'switch', 'loop', 'jq'].includes(kind)) helpers.fail('--kind must be js, switch, loop or jq\n\n' + USAGE, 2);
  if (parsed.positionals.length !== 1) helpers.fail('expected one file path or one inline expression\n\n' + USAGE, 2);

  const arg = parsed.positionals[0];
  let source;
  let label;
  let inline = false;
  if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
    source = helpers.readTextFile(arg, 'utf8');
    label = helpers.toPosix(path.relative(process.cwd(), path.resolve(arg)) || arg);
  } else {
    source = arg;
    label = '<' + kind + '>';
    inline = true;
  }
  if (source.trim() === '') helpers.fail('the ' + kind + ' text is empty', 2);

  const findings = [];
  if (kind === 'js') lintJs(source, label, findings, inline);
  else if (kind === 'jq') findings.push.apply(findings, helpers.lintJq(source));
  else lintEs5(source, label, kind, findings);

  findings.sort((a, b) => a.line - b.line || (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  for (const f of findings) console.log(label + ':' + f.line + ': ' + f.severity + ': ' + f.message);
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  console.log(label + ': ' + errors + ' error(s), ' + warnings + ' warning(s)' + (findings.length ? '' : '. Clean: no construct the platform is documented to reject.'));
  process.exit(errors > 0 || (warnings > 0 && parsed.values.strict) ? 1 : 0);
}

main();
