// Clones or updates every repository in api-sources.json into .sources/ at its pinned ref.
// Used by CI and by `npm run local`. A source with an SF_*_DIR override is left untouched,
// and an SF_*_REF override swaps the ref for this run (branch, tag or commit).
import fs from 'node:fs';
import path from 'node:path';
import {describeSource, recordFetchedRef, run, source, sourceNames} from './lib.mjs';

for (const name of sourceNames()) {
  const s = source(name);

  if (!s.managed) {
    console.log(`\n[${name}] using local checkout ${s.dir} (${s.env}_DIR), not fetching`);
    if (!fs.existsSync(s.dir)) {
      throw new Error(`[${name}] override directory does not exist: ${s.dir}`);
    }
    continue;
  }

  const refNote = s.refOverridden ? ` (${s.env}_REF override)` : '';
  if (fs.existsSync(path.join(s.dir, '.git'))) {
    console.log(`\n[${name}] updating ${path.relative(process.cwd(), s.dir)} to ${s.ref}${refNote}`);
    // Fetching the ref by name works for branches, tags and (on GitHub) commit hashes.
    run('git', ['-C', s.dir, 'fetch', '--depth', '1', 'origin', s.ref], {quiet: true});
    run('git', ['-C', s.dir, 'checkout', '--quiet', '--force', '--detach', 'FETCH_HEAD'], {quiet: true});
  } else {
    console.log(`\n[${name}] cloning ${s.repo} at ${s.ref}${refNote}`);
    fs.mkdirSync(path.dirname(s.dir), {recursive: true});
    // --branch accepts branches and tags. A bare commit needs an init + fetch instead.
    const cloned = run('git', ['clone', '--quiet', '--depth', '1', '--branch', s.ref, s.repo, s.dir], {
      quiet: true,
      allowFailure: true,
    });
    if (cloned.status !== 0) {
      fs.rmSync(s.dir, {recursive: true, force: true});
      fs.mkdirSync(s.dir, {recursive: true});
      run('git', ['-C', s.dir, 'init', '--quiet'], {quiet: true});
      run('git', ['-C', s.dir, 'remote', 'add', 'origin', s.repo], {quiet: true});
      run('git', ['-C', s.dir, 'fetch', '--depth', '1', 'origin', s.ref], {quiet: true});
      run('git', ['-C', s.dir, 'checkout', '--quiet', '--force', '--detach', 'FETCH_HEAD'], {quiet: true});
    }
  }
  recordFetchedRef(s.dir, s.ref);
  console.log(`[${name}] ${describeSource(name)}`);
}

// Sources that declare an install step need their dependencies before generation
// (TypeDoc resolves three, React and Babylon types through the TypeScript workspace).
for (const name of sourceNames()) {
  const s = source(name);
  if (s.install !== 'npm') {
    continue;
  }
  if (!s.managed && fs.existsSync(path.join(s.dir, 'node_modules'))) {
    console.log(`\n[${name}] node_modules present in local checkout, skipping install`);
    continue;
  }
  const hasLock = fs.existsSync(path.join(s.dir, 'package-lock.json'));
  run('npm', [hasLock ? 'ci' : 'install', '--no-audit', '--no-fund', '--ignore-scripts'], {
    cwd: s.dir,
    label: `[${name}] npm ${hasLock ? 'ci' : 'install'}`,
  });
}
