#!/usr/bin/env node
'use strict';

/*
 * Packages a Data Factory job folder into a <key>.job.zip archive.
 *
 * Steps:
 *   1. run validate-job.js on the folder (abort on errors unless --force);
 *   2. collect the files of the folder, honouring .jobignore (gitignore-like:
 *      "*" and "**" wildcards, "?" single character, trailing "/" for
 *      directories, leading "!" to re-include, "#" comments). When the file
 *      is absent the defaults "*.job.zip" and ".jobignore" apply. Always
 *      excluded: node_modules/, .git/, *.run.json, *.df-test.json, *.test.js,
 *      TESTS/, __tests__/, __fixtures__/, other job*.json files. README.md
 *      and CHANGELOG.md are always kept;
 *   3. write the ZIP with a minimal writer (local headers, central directory,
 *      end record; deflate through zlib, store for tiny files; CRC-32 inline;
 *      forward-slash entry names flagged UTF-8). job.json sits at the root.
 *
 * Usage:
 *   node package-job.js <job-folder> [--out <file>] [--force] [--name key|key-date|key-timestamp]
 *
 * Default output: <key>.job.zip next to the job folder.
 * Exit codes: 0 packaged, 1 validation errors or failure, 2 usage error.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DEFAULT_IGNORE = ['*.job.zip', '.jobignore'];
const ALWAYS_IGNORE = ['node_modules/', '.git/', '.product-live-downloads/', '*.run.json', '*.df-test.json', '*.test.js', 'TESTS/', '__tests__/', '__fixtures__/'];
const ALWAYS_KEEP = ['README.md', 'CHANGELOG.md'];
const STORE_BELOW = 64;

// ---------------------------------------------------------------------------
// .jobignore matcher (same semantics as validate-job.js)
// ---------------------------------------------------------------------------

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
  if (fs.existsSync(file)) lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  return compileIgnore(ALWAYS_IGNORE.concat(lines));
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

function collectFiles(folder, rules) {
  const files = [];
  const skipped = [];
  function walk(dir, rel) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const relPath = rel ? rel + '/' + entry.name : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (isIgnored(relPath, true, rules)) { skipped.push(relPath + '/'); continue; }
        walk(abs, relPath);
      } else if (entry.isFile()) {
        if (relPath === 'job.json') continue; // always added first, at the root
        const keep = ALWAYS_KEEP.includes(relPath);
        const otherJobFile = !rel && /^job[^/]*\.json$/.test(entry.name);
        if (otherJobFile || (!keep && isIgnored(relPath, false, rules))) { skipped.push(relPath); continue; }
        files.push({ name: relPath, abs: abs });
      }
    }
  }
  walk(folder, '');
  return { files: files, skipped: skipped };
}

// ---------------------------------------------------------------------------
// Minimal ZIP writer
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function dosDateTime(date) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  const year = Math.min(Math.max(d.getFullYear(), 1980), 2107);
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const day = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time: time, date: day };
}

function writeZip(entries, outFile) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const data = entry.data;
    const crc = crc32(data);
    let method = 0;
    let stored = data;
    if (data.length >= STORE_BELOW) {
      const deflated = zlib.deflateRawSync(data, { level: 9 });
      if (deflated.length < data.length) { method = 8; stored = deflated; }
    }
    const name = Buffer.from(entry.name, 'utf8');
    const dt = dosDateTime(entry.mtime);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dt.time, 10);
    local.writeUInt16LE(dt.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(stored.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, stored);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4); // version made by
    header.writeUInt16LE(20, 6); // version needed
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(dt.time, 12);
    header.writeUInt16LE(dt.date, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(stored.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt16LE(0, 30); // extra
    header.writeUInt16LE(0, 32); // comment
    header.writeUInt16LE(0, 34); // disk
    header.writeUInt16LE(0, 36); // internal attributes
    header.writeUInt32LE(0, 38); // external attributes
    header.writeUInt32LE(offset, 42);
    central.push(header, name);
    offset += local.length + name.length + stored.length;
    entry.compressed = stored.length;
    entry.size = data.length;
    entry.method = method;
  }
  const centralSize = central.reduce((sum, b) => sum + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  const archive = Buffer.concat(parts.concat(central, [end]));
  fs.writeFileSync(outFile, archive);
  return archive.length;
}

// ---------------------------------------------------------------------------
// Packaging
// ---------------------------------------------------------------------------

function toKey(value) {
  const key = String(value || 'job').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '');
  return key || 'job';
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function outputName(key, naming) {
  const now = new Date();
  const date = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  if (naming === 'key-date') return key + '-' + date + '.job.zip';
  if (naming === 'key-timestamp') return key + '-' + date.replace(/-/g, '_') + 'T' + pad(now.getHours()) + '_' + pad(now.getMinutes()) + '_' + pad(now.getSeconds()) + '.job.zip';
  return key + '.job.zip';
}

function packageJob(folder, options) {
  options = options || {};
  const absFolder = path.resolve(folder);
  if (!fs.existsSync(absFolder) || !fs.statSync(absFolder).isDirectory()) throw new Error(folder + ' is not a directory');
  const jobFile = path.join(absFolder, 'job.json');
  if (!fs.existsSync(jobFile)) throw new Error('no job.json in ' + absFolder);

  let validation = null;
  const validatorPath = path.join(__dirname, 'validate-job.js');
  if (fs.existsSync(validatorPath)) {
    validation = require(validatorPath).validate(absFolder, {});
  } else if (!options.force) {
    throw new Error('validate-job.js is missing next to package-job.js; use --force to package without validation');
  }
  if (validation && validation.errors.length && !options.force) {
    return { ok: false, validation: validation };
  }

  let job;
  try {
    job = JSON.parse(fs.readFileSync(jobFile, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    throw new Error('job.json is not valid JSON: ' + err.message);
  }
  const key = toKey(job && job.key);
  const outFile = options.out ? path.resolve(options.out) : path.join(path.dirname(absFolder), outputName(key, options.naming));

  const rules = loadIgnoreRules(absFolder);
  const collected = collectFiles(absFolder, rules);
  const entries = [{ name: 'job.json', data: fs.readFileSync(jobFile), mtime: fs.statSync(jobFile).mtime }];
  for (const file of collected.files) {
    if (path.resolve(file.abs) === outFile) continue;
    entries.push({ name: file.name, data: fs.readFileSync(file.abs), mtime: fs.statSync(file.abs).mtime });
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const size = writeZip(entries, outFile);
  return { ok: true, validation: validation, outFile: outFile, entries: entries, skipped: collected.skipped, size: size };
}

function usage(code) {
  const text = [
    'Usage: node package-job.js <job-folder> [--out <file>] [--force] [--name key|key-date|key-timestamp]',
    '',
    '  --out <file>   destination archive (default: <key>.job.zip next to the folder)',
    '  --force        package even when the validator reports errors',
    '  --name <mode>  file naming: key (default), key-date, key-timestamp',
    '',
    'Exit codes: 0 packaged, 1 validation errors or failure, 2 usage.',
  ].join('\n');
  (code === 0 ? console.log : console.error)(text);
  process.exit(code);
}

function main(argv) {
  const options = { force: false, naming: 'key', out: null };
  let folder = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--force') options.force = true;
    else if (arg === '--out') {
      if (!argv[i + 1]) { console.error('Error: --out needs a file path'); usage(2); }
      options.out = argv[++i];
    } else if (arg === '--name') {
      const mode = argv[++i];
      if (!['key', 'key-date', 'key-timestamp'].includes(mode)) { console.error('Error: --name expects key, key-date or key-timestamp'); usage(2); }
      options.naming = mode;
    } else if (arg.startsWith('-')) { console.error('Error: unknown option ' + arg); usage(2); }
    else if (folder) { console.error('Error: only one job folder is accepted'); usage(2); }
    else folder = arg;
  }
  if (!folder) { console.error('Error: missing <job-folder>'); usage(2); }

  let result;
  try {
    result = packageJob(folder, options);
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }
  const validation = result.validation;
  if (validation) {
    for (const f of validation.errors) console.error('ERROR    ' + f.id + '  ' + f.path + ': ' + f.message + (f.fix ? ' (fix: ' + f.fix + ')' : ''));
    for (const f of validation.warnings) console.error('WARNING  ' + f.id + '  ' + f.path + ': ' + f.message);
  }
  if (!result.ok) {
    console.error('Not packaged: ' + validation.errors.length + ' validation error(s). Fix them or use --force.');
    process.exit(1);
  }
  if (validation && validation.errors.length) console.error('Packaged despite ' + validation.errors.length + ' validation error(s) (--force).');
  console.log('Archive: ' + result.outFile + ' (' + result.size + ' bytes, ' + result.entries.length + ' entries)');
  for (const entry of result.entries) {
    console.log('  ' + entry.name + '  ' + entry.size + ' bytes' + (entry.method === 8 ? ' (deflated to ' + entry.compressed + ')' : ' (stored)'));
  }
  if (result.skipped.length) console.log('Excluded: ' + result.skipped.join(', '));
  process.exit(0);
}

module.exports = { packageJob: packageJob, compileIgnore: compileIgnore, isIgnored: isIgnored, crc32: crc32 };

if (require.main === module) main(process.argv.slice(2));
