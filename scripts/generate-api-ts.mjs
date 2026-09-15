// Generates the TypeScript API reference into api-docs/typescript with TypeDoc.
// Requires the TypeScript checkout (npm run api:fetch, or SF_TS_DIR) with its node_modules installed.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {apiDocsDir, rootDir, run, source, walk} from './lib.mjs';

const {dir, repo: repoUrl} = source('typescript');
const packagesDir = path.join(dir, 'packages');
if (!fs.existsSync(packagesDir)) {
  throw new Error(`TypeScript sources not found at ${packagesDir}. Run "npm run api:fetch" first.`);
}
if (!fs.existsSync(path.join(dir, 'node_modules'))) {
  throw new Error(`TypeScript checkout has no node_modules. Run "npm run api:fetch" (or npm ci inside ${dir}).`);
}

const outDir = path.join(apiDocsDir, 'typescript');
const packages = fs
  .readdirSync(packagesDir, {withFileTypes: true})
  .filter((e) => e.isDirectory())
  .map((e) => path.join(packagesDir, e.name).split(path.sep).join('/')); // TypeDoc treats entry points as globs and rejects backslashes

const typedocBin = path.join(rootDir, 'node_modules', 'typedoc', 'bin', 'typedoc');
run(process.execPath, [
  typedocBin,
  '--options', path.join(rootDir, 'typedoc.json'),
  '--out', outDir,
  '--entryPoints', ...packages,
], {label: `typedoc (${packages.length} packages) -> ${path.relative(rootDir, outDir)}`});

const sidebar = path.join(outDir, 'typedoc-sidebar.cjs');
if (!fs.existsSync(sidebar)) {
  throw new Error(`Expected ${sidebar} to be generated`);
}

// Generated pages are parsed as CommonMark rather than MDX (front matter "mdx.format: md"), so braces or
// angle brackets in TSDoc prose cannot break the site build. The title comes from the page's H1.
const pages = walk(outDir, (f) => f.endsWith('.md'));
const repoBase = repoUrl.replace(/\.git$/, '');
const sha = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).stdout?.trim() || 'HEAD';
for (const file of pages) {
  let src = fs.readFileSync(file, 'utf8');
  if (src.startsWith('---')) {
    continue;
  }
  // Package READMEs link to files next to them (./LICENSE, ./Examples/...). Point those at GitHub.
  const pkgMatch = file.split(path.sep).join('/').match(/\/@realitycollective\/([^/]+)\/index\.md$/);
  if (pkgMatch) {
    src = src.replace(/\]\(\.\/([^)#]+)\)/g, (m, rel) =>
      fs.existsSync(path.join(path.dirname(file), rel)) ? m : `](${repoBase}/blob/${sha}/packages/${pkgMatch[1]}/${rel})`,
    );
  }
  const h1 = src.match(/^#\s+(.+)$/m);
  const title = h1 ? h1[1].replace(/\\([<>|])/g, '$1').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') : path.basename(file, '.md');
  const frontMatter = ['---', `title: "${title.replace(/"/g, '\\"')}"`, 'mdx:', '  format: md', 'custom_edit_url: null', '---', ''].join('\n');
  fs.writeFileSync(file, frontMatter + src);
}
console.log(`\nTypeScript API written to ${path.relative(rootDir, outDir)} (${pages.length} pages)`);
