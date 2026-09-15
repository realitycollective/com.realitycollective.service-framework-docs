// One-shot local verification: install, fetch the framework repos, generate both API references,
// build the site and serve it. Everything lives inside this folder (node_modules, .sources, api-docs,
// build), so nothing is installed globally and the result matches what CI publishes.
//
//   npm run local                    full run, then serves ./build on http://localhost:3000
//   npm run local -- --dev           full run, then starts the hot-reloading dev server instead
//   npm run local -- --no-serve      full run, no server (CI-style check)
//   npm run local -- --skip-install  reuse the existing node_modules
//   npm run local -- --skip-fetch    reuse the existing .sources checkouts as they are
//   npm run local -- --skip-cs       skip the C# reference (no dotnet needed)
//   npm run local -- --skip-ts       skip the TypeScript reference
//
// Choosing what to document (branch, tag or commit; defaults come from api-sources.json):
//   npm run local -- --cs-ref=feature/x --ts-ref=v1.1.0 --utilities-ref=main
//   npm run local -- --cs-dir=../com.realitycollective.service-framework   (local checkout, no fetch)
//   npm run local -- --ts-dir=../com.realitycollective.service-framework.ts
//   npm run local -- --unity-dir="E:/Unity/Editors/6000.0.77f1"            (or none)
//
// The same settings are read from SF_CS_REF, SF_TS_REF, SF_CS_UTILITIES_REF, SF_CS_DIR, SF_TS_DIR,
// SF_CS_UTILITIES_DIR and SF_UNITY_DIR, which is what CI uses.
import fs from 'node:fs';
import path from 'node:path';
import {rootDir, run, which} from './lib.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => !a.includes('=')));
const values = Object.fromEntries(args.filter((a) => a.includes('=')).map((a) => a.replace(/^--/, '').split(/=(.*)/s).slice(0, 2)));
const flag = (name) => flags.has(`--${name}`);

const envFromArg = {
  'cs-ref': 'SF_CS_REF',
  'ts-ref': 'SF_TS_REF',
  'utilities-ref': 'SF_CS_UTILITIES_REF',
  'cs-dir': 'SF_CS_DIR',
  'ts-dir': 'SF_TS_DIR',
  'utilities-dir': 'SF_CS_UTILITIES_DIR',
  'unity-dir': 'SF_UNITY_DIR',
};
for (const [arg, env] of Object.entries(envFromArg)) {
  if (values[arg] !== undefined) {
    process.env[env] = values[arg];
  }
}
const unknown = Object.keys(values).filter((k) => !(k in envFromArg));
if (unknown.length > 0) {
  throw new Error(`Unknown option(s): ${unknown.map((k) => '--' + k).join(', ')}`);
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 20) {
  throw new Error(`Node 20 or newer is required, found ${process.versions.node}`);
}
if (!which('git')) {
  throw new Error('git is required on PATH');
}
if (!flag('skip-cs') && !which('dotnet')) {
  throw new Error('dotnet SDK (8 or newer) is required for the C# reference. Install it or pass --skip-cs.');
}

const step = (title) => console.log(`\n=== ${title} ===`);
const script = (name) => path.join(rootDir, 'scripts', name);
const overrides = Object.values(envFromArg).filter((e) => process.env[e]).map((e) => `${e}=${process.env[e]}`);
if (overrides.length > 0) {
  console.log(`Overrides: ${overrides.join('  ')}`);
}

step('Install site dependencies');
if (flag('skip-install') && fs.existsSync(path.join(rootDir, 'node_modules'))) {
  console.log('skipped');
} else {
  run('npm', ['ci', '--no-audit', '--no-fund'], {cwd: rootDir});
}

step('Fetch framework sources');
if (flag('skip-fetch')) {
  console.log('skipped');
} else {
  run(process.execPath, [script('fetch-sources.mjs')]);
}

step('Generate TypeScript API reference');
if (flag('skip-ts')) {
  console.log('skipped');
} else {
  run(process.execPath, [script('generate-api-ts.mjs')]);
}

step('Generate C# API reference');
if (flag('skip-cs')) {
  console.log('skipped');
} else {
  run(process.execPath, [script('generate-api-cs.mjs')]);
}

step('Write API index');
run(process.execPath, [script('generate-api-index.mjs')]);

step('Typecheck');
run('npm', ['run', 'typecheck'], {cwd: rootDir});

if (flag('dev')) {
  step('Dev server (Ctrl+C to stop)');
  run('npm', ['start'], {cwd: rootDir});
} else {
  step('Build');
  run('npm', ['run', 'build'], {cwd: rootDir});
  if (flag('no-serve')) {
    console.log('\nBuild complete: ./build');
  } else {
    step('Serve (Ctrl+C to stop)');
    run('npm', ['run', 'serve'], {cwd: rootDir});
  }
}
