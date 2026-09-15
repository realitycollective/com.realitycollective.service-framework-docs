// Shared helpers for the API generation scripts.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const apiDocsDir = path.join(rootDir, 'api-docs');

const sourcesFile = path.join(rootDir, 'api-sources.json');

export function readSources() {
  const json = JSON.parse(fs.readFileSync(sourcesFile, 'utf8'));
  return Object.fromEntries(Object.entries(json).filter(([k]) => !k.startsWith('$')));
}

// Resolves one entry of api-sources.json with its environment overrides applied:
//   SF_<ENV>_REF  use this branch, tag or commit instead of the pinned ref
//   SF_<ENV>_DIR  use this local checkout as-is (no clone, no fetch, no ref switch)
export function source(name) {
  const entry = readSources()[name];
  if (!entry) {
    throw new Error(`Unknown source "${name}" (see api-sources.json)`);
  }
  const dirOverride = process.env[`${entry.env}_DIR`];
  const refOverride = process.env[`${entry.env}_REF`];
  return {
    name,
    repo: entry.repo,
    ref: refOverride || entry.ref,
    refOverridden: Boolean(refOverride),
    dir: dirOverride ? path.resolve(dirOverride) : path.join(rootDir, entry.dir),
    managed: !dirOverride,
    install: entry.install ?? null,
    env: entry.env,
  };
}

export function sourceNames() {
  return Object.keys(readSources());
}

// Short commit hash of a checkout, or null when it is not a git repository.
export function headSha(dir) {
  const r = spawnSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], {encoding: 'utf8'});
  return r.status === 0 ? r.stdout.trim() : null;
}

// fetch-sources.mjs records the ref it checked out, so reports describe what is actually on disk
// even when a later step runs without the same SF_*_REF override.
const refMarker = (dir) => path.join(dir, '.sf-ref');

export function recordFetchedRef(dir, ref) {
  fs.writeFileSync(refMarker(dir), `${ref}\n`);
}

// Human readable "ref @ sha" for reports.
export function describeSource(name) {
  const s = source(name);
  const sha = headSha(s.dir);
  const recorded = fs.existsSync(refMarker(s.dir)) ? fs.readFileSync(refMarker(s.dir), 'utf8').trim() : null;
  const ref = recorded ?? s.ref;
  const where = s.managed ? ref : `local ${path.basename(s.dir)}`;
  const note = s.managed && ref !== readSources()[name].ref ? ' (override)' : '';
  return sha ? `${where}${note} @ ${sha}` : `${where}${note}`;
}

// Commands that are .cmd shims on Windows and therefore need a shell to launch.
const shimmedOnWindows = new Set(['npm', 'npx']);

export function run(cmd, args, opts = {}) {
  const label = opts.label ?? [cmd, ...args].join(' ');
  if (!opts.quiet) {
    console.log(`\n> ${label}`);
  }
  const useShell = process.platform === 'win32' && shimmedOnWindows.has(cmd);
  const quote = (a) => (useShell && /\s/.test(a) ? `"${a}"` : a);
  const {label: _l, quiet: _q, allowFailure, ...spawnOpts} = opts;
  const result = spawnSync(cmd, args.map(quote), {
    stdio: 'inherit',
    shell: useShell,
    ...spawnOpts,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${label} exited with code ${result.status}`);
  }
  return result;
}

export function which(cmd) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [cmd], {stdio: 'ignore', shell: process.platform === 'win32'}).status === 0;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

export function emptyDir(dir) {
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
}

// Walks a directory and returns every file path matching the predicate.
export function walk(dir, predicate = () => true) {
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

export function posix(p) {
  return p.split(path.sep).join('/');
}
