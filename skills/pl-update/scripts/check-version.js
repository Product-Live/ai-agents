#!/usr/bin/env node
'use strict';

/**
 * Compares the installed version of the Product-Live Data Factory skills with
 * the version on the main branch of the public repository. Run only when the
 * user asks for it.
 *
 * The installed version is read from the VERSION file of this skill (shipped
 * with the skill, never read from the project). The latest version is the
 * VERSION file of the main branch of https://github.com/Product-Live/ai-agents.
 * Both values must match ^\d+\.\d+\.\d+$ (a leading "v" is accepted);
 * anything else is reported as "unknown". No remote text is printed.
 *
 * Output: one line, "installed X.Y.Z, latest X.Y.Z".
 * Exit codes: 0 both versions known, 1 a version is unknown, 2 usage error.
 *
 * Usage: node check-version.js [--help]
 * Requires Node.js 18 or later. No dependencies.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO = 'Product-Live/ai-agents';
const VERSION_FILE = path.join(__dirname, '..', 'VERSION');
const SEMVER = /^\d+\.\d+\.\d+$/;
const TIMEOUT_MS = 5000;

const USAGE = [
  'Usage: node check-version.js [--help]',
  '',
  'Prints "installed X.Y.Z, latest X.Y.Z": the version recorded in the VERSION file of the',
  'pl-update skill and the VERSION file of the main branch of https://github.com/' + REPO + '.',
  'A value that is missing or not of the form X.Y.Z is printed as "unknown".',
  'Exit codes: 0 both versions known, 1 a version is unknown, 2 usage error.',
].join('\n');

function normalise(value) {
  const text = String(value || '').trim().replace(/^v/, '');
  return SEMVER.test(text) ? text : null;
}

function installedVersion() {
  try {
    return normalise(fs.readFileSync(VERSION_FILE, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)[0]);
  } catch (err) {
    return null;
  }
}

function latestVersion() {
  return new Promise((resolve) => {
    const request = https.get({
      hostname: 'raw.githubusercontent.com',
      path: '/' + REPO + '/main/VERSION',
      headers: { 'User-Agent': 'product-live-ai-agents-check-version' },
      timeout: TIMEOUT_MS,
    }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        resolve(null);
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) request.destroy();
      });
      response.on('end', () => {
        resolve(normalise(body.replace(/^\uFEFF/, '').split(/\r?\n/)[0]));
      });
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(null));
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    process.exit(0);
  }
  if (args.length > 0) {
    console.error('Error: unknown argument ' + JSON.stringify(args[0]).slice(0, 40) + '\n\n' + USAGE);
    process.exit(2);
  }
  const installed = installedVersion();
  const latest = await latestVersion();
  console.log('installed ' + (installed || 'unknown') + ', latest ' + (latest || 'unknown'));
  process.exit(installed && latest ? 0 : 1);
}

main();
