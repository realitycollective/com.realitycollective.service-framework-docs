// Generates the C# API reference into api-docs/csharp with DocFX, then rewrites the DocFX-flavoured
// markdown into MDX-safe Docusaurus pages and builds a sidebar from DocFX's toc.yml.
//
// Requires the dotnet SDK (8 or newer) and the C# checkouts (npm run api:fetch, or SF_CS_DIR /
// SF_CS_UTILITIES_DIR). DocFX is restored as a local tool from .config/dotnet-tools.json.
//
// Compilation inputs:
//   - the framework Runtime and Editor sources (documented)
//   - RealityCollective.Utilities sources (compiled so its types resolve, excluded from output)
//   - UnityEngine / UnityEditor assemblies and the ugui EventSystem sources from a local Unity
//     editor when one is found (see unity.mjs); otherwise Unity types stay unresolved and DocFX
//     runs with allowCompilationErrors, which is the case on CI.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {apiDocsDir, emptyDir, describeSource, posix, rootDir, run, source, walk, which} from './lib.mjs';
import {findUnity} from './unity.mjs';

if (!which('dotnet')) {
  throw new Error('dotnet SDK not found on PATH. Install .NET 8 or newer to generate the C# API reference.');
}

const framework = source('csharp');
if (!fs.existsSync(path.join(framework.dir, 'Runtime'))) {
  throw new Error(`C# sources not found at ${framework.dir}. Run "npm run api:fetch" first.`);
}
const utilities = source('csharpUtilities');
const hasUtilities = fs.existsSync(path.join(utilities.dir, 'Runtime'));

const requiredUnity = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(framework.dir, 'package.json'), 'utf8')).unity ?? null;
  } catch {
    return null;
  }
})();
const unity = findUnity(requiredUnity);

const workDir = path.join(apiDocsDir, '.docfx');
const rawDir = path.join(workDir, 'out');
const outDir = path.join(apiDocsDir, 'csharp');
const logFile = path.join(apiDocsDir, 'docfx.log');

console.log(`\n[csharp] framework: ${describeSource('csharp')}`);
console.log(`[csharp] utilities: ${hasUtilities ? describeSource('csharpUtilities') : 'not available (types will be unresolved)'}`);
console.log(`[csharp] unity:     ${unity ? `${unity.version} (${unity.references.length} assemblies, ${unity.extraSources.length} package source sets)` : 'no editor found (Unity types will be unresolved; set SF_UNITY_DIR)'}`);

// 1. DocFX metadata -> raw markdown
emptyDir(workDir);
const src = [
  {
    src: posix(framework.dir),
    files: ['Runtime/**/*.cs', 'Editor/**/*.cs'],
    exclude: ['**/Templates~/**', '**/obj/**', '**/AssemblyInfo.cs'],
  },
];
if (hasUtilities) {
  src.push({
    src: posix(utilities.dir),
    files: ['Runtime/**/*.cs', 'Editor/**/*.cs'],
    exclude: ['**/Templates~/**', '**/obj/**', '**/AssemblyInfo.cs', '**/Tests/**'],
  });
}
for (const extra of unity?.extraSources ?? []) {
  src.push({src: posix(extra.src), files: extra.files, exclude: extra.exclude ?? []});
}

// Only the framework's own namespaces are documented; everything compiled for resolution is filtered out.
fs.writeFileSync(
  path.join(workDir, 'filter.yml'),
  ['apiRules:', '- include:', '    uidRegex: ^RealityCollective\\.ServiceFramework', '- exclude:', '    uidRegex: .*', ''].join('\n'),
);

const docfxConfig = {
  metadata: [
    {
      src,
      dest: 'out',
      outputFormat: 'markdown',
      filter: 'filter.yml',
      includePrivateMembers: false,
      allowCompilationErrors: true,
      disableGitFeatures: false,
      // File mapping form: DocFX resolves globs relative to a "src" base, so absolute paths must be split.
      references: unity
        ? [{src: posix(unity.managedDir), files: unity.references.map((r) => posix(path.relative(unity.managedDir, r)))}]
        : [],
      properties: {
        TargetFramework: 'netstandard2.1',
        // Roslyn honours DefineConstants for loose source files, so Unity's #if blocks resolve correctly.
        DefineConstants: (unity ? unity.defines : ['UNITY_EDITOR', 'UNITY_5_3_OR_NEWER', 'UNITY_2021_1_OR_NEWER', 'UNITY_6000_0_OR_NEWER']).join(';'),
      },
    },
  ],
};
fs.writeFileSync(path.join(workDir, 'docfx.json'), JSON.stringify(docfxConfig, null, 2));

run('dotnet', ['tool', 'restore'], {cwd: rootDir, quiet: true});
console.log(`\n> dotnet docfx metadata (full log: ${path.relative(rootDir, logFile)})`);
const docfx = spawnSync('dotnet', ['docfx', 'metadata', path.join(workDir, 'docfx.json'), '--logLevel', 'warning'], {
  cwd: rootDir,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const docfxLog = (docfx.stdout ?? '') + (docfx.stderr ?? '');
fs.writeFileSync(logFile, docfxLog.replace(/\x1b\[[0-9;]*m/g, ''));
if (docfx.status !== 0) {
  console.error(docfxLog.split('\n').slice(-30).join('\n'));
  throw new Error(`dotnet docfx metadata exited with code ${docfx.status}`);
}
summariseDocfxLog(docfxLog);

// 2. Rewrite into MDX-safe pages
const rawPages = walk(rawDir, (f) => f.endsWith('.md'));
if (rawPages.length === 0) {
  throw new Error('DocFX produced no markdown pages');
}
const knownUids = new Set(rawPages.map((f) => path.basename(f, '.md')));
// Anchors DocFX emitted per page, so cross-references only carry a fragment that exists.
const knownAnchors = new Set();
for (const file of rawPages) {
  const page = path.basename(file, '.md');
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/<a id="([^"]+)"><\/a>/g)) {
    knownAnchors.add(page + '#' + m[1]);
  }
}

emptyDir(outDir);
for (const file of rawPages) {
  const name = path.basename(file, '.md');
  const converted = convertPage(fs.readFileSync(file, 'utf8'), name);
  fs.writeFileSync(path.join(outDir, `${name}.md`), converted);
}

// 3. Sidebar from toc.yml
const toc = fs.readFileSync(path.join(rawDir, 'toc.yml'), 'utf8');
fs.writeFileSync(path.join(outDir, 'docfx-sidebar.cjs'), buildSidebar(toc));

fs.rmSync(workDir, {recursive: true, force: true});
console.log(`\nC# API written to ${path.relative(rootDir, outDir)} (${rawPages.length} pages)`);

// Condenses Roslyn's per-symbol errors into a short table of what could not be resolved.
function summariseDocfxLog(log) {
  const clean = log.replace(/\x1b\[[0-9;]*m/g, '');
  const lines = clean.split(/\r?\n/);
  const compileErrors = lines.filter((l) => /error CS\d+:/.test(l));
  const other = lines.filter((l) => /(warning|error)/i.test(l) && !/error CS\d+:/.test(l) && !/^\s*\d+ (warning|error)\(s\)/.test(l));

  if (compileErrors.length === 0) {
    console.log('[csharp] compilation: all references resolved');
  } else {
    const bySymbol = new Map();
    for (const l of compileErrors) {
      const m = l.match(/name '([A-Za-z0-9_.]+)'/) || l.match(/error (CS\d+)/);
      const key = m ? m[1] : 'other';
      bySymbol.set(key, (bySymbol.get(key) ?? 0) + 1);
    }
    const top = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    console.log(`[csharp] compilation: ${compileErrors.length} unresolved references (signatures still generated, those types render as text)`);
    for (const [name, n] of top) {
      console.log(`           ${String(n).padStart(4)}  ${name}`);
    }
    if (bySymbol.size > top.length) {
      console.log(`           ...and ${bySymbol.size - top.length} more, see ${path.relative(rootDir, logFile)}`);
    }
  }
  // XML doc problems in the framework source (bad <see cref>, malformed comments). Fix these upstream.
  const docIssues = new Map();
  for (const l of other) {
    const msg = l.replace(/^.*?warning: /, '').replace(/ defined in .*$/, '').replace(/^.*Build succeeded.*$/, '').trim();
    if (msg) {
      docIssues.set(msg, (docIssues.get(msg) ?? 0) + 1);
    }
  }
  if (docIssues.size > 0) {
    console.log(`[csharp] ${docIssues.size} distinct XML doc comment issue(s) in the framework source (fix in the C# repo):`);
    for (const [msg, n] of [...docIssues.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`           ${String(n).padStart(4)}  ${msg.slice(0, 150)}`);
    }
  }
}

// ---------------------------------------------------------------------------

function convertPage(src, name) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let inFence = false;
  let title = name;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    // <pre><code class="lang-x">...</code></pre> blocks become fenced code.
    if (line.startsWith('<pre><code')) {
      const lang = (line.match(/class="lang-([a-z]+)"/) || [])[1] ?? '';
      const body = [line.replace(/^<pre><code[^>]*>/, '')];
      while (i < lines.length && !lines[i].includes('</code></pre>')) {
        i++;
        body.push(lines[i]);
      }
      body[body.length - 1] = body[body.length - 1].replace(/<\/code><\/pre>.*$/, '');
      out.push('```' + lang, ...body.map(decodeEntities), '```');
      continue;
    }

    // Headings: "# <a id="X"></a> Title" -> "# Title {#X}" so DocFX's intra-page links keep working.
    const heading = line.match(/^(#+)\s*<a id="([^"]+)"><\/a>\s*(.*)$/);
    if (heading) {
      const text = escapeProse(convertInline(heading[3]));
      if (heading[1] === '#') {
        title = plainText(heading[3]);
        out.push(`${heading[1]} ${text}`);
      } else {
        out.push(`${heading[1]} ${text} {#${heading[2]}}`);
      }
      continue;
    }

    out.push(escapeProse(convertInline(line)));
  }

  const frontMatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `sidebar_label: "${shortLabel(title).replace(/"/g, '\\"')}"`,
    'mdx:',
    '  format: md',
    'custom_edit_url: null',
    '---',
    '',
  ];
  return frontMatter.join('\n') + out.join('\n') + '\n';
}

// Resolves DocFX <xref> tags and drops the HTML wrappers MDX does not want.
function convertInline(line) {
  return line
    .replace(/<xref href="([^"]+)"[^>]*><\/xref>/g, (_, uid) => xrefLink(uid))
    .replace(/<code class="paramref">([^<]*)<\/code>/g, '`$1`')
    .replace(/<code>([^<]*)<\/code>/g, '`$1`')
    .replace(/<a href="([^"]+)">([^<]*)<\/a>/g, '[$2]($1)')
    .replace(/<\/?p>/g, '')
    .replace(/<a id="[^"]+"><\/a>\s*/g, '');
}

function xrefLink(uid) {
  // Type UID: page exists. Generic arity "`1" is encoded as "-1" in file names.
  const fileUid = uid.replace(/`(\d+)/g, '-$1');
  if (knownUids.has(fileUid)) {
    return `[${shortLabel(uid)}](${fileUid}.md)`;
  }
  // Member UID: "Namespace.Type.Member" -> type page plus DocFX's anchor convention.
  const lastDot = fileUid.lastIndexOf('.');
  if (lastDot > 0) {
    const typeUid = fileUid.slice(0, lastDot);
    if (knownUids.has(typeUid)) {
      const anchor = fileUid.replace(/[.`-]/g, '_');
      const fragment = knownAnchors.has(typeUid + '#' + anchor) ? '#' + anchor : '';
      return `[${shortLabel(uid)}](${typeUid}.md${fragment})`;
    }
  }
  return '`' + shortLabel(uid) + '`';
}

// Escapes "<" that would otherwise start JSX, outside inline code. DocFX already emits "\>".
function escapeProse(line) {
  return line
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/(^|[^\\])<(?![a-z]+[\s>/]|\/[a-z]+>)/g, '$1\\<')))
    .join('');
}

// Heading text without DocFX markup or markdown escapes, for front matter titles.
function plainText(s) {
  return s
    .replace(/<a id="[^"]+"><\/a>/g, '')
    .replace(/<xref href="([^"]+)"[^>]*><\/xref>/g, (_, uid) => shortLabel(uid))
    .replace(/\\([<>()[\]_#-])/g, '$1')
    .trim();
}

function shortLabel(s) {
  const noPrefix = s.replace(/^(Class|Interface|Struct|Enum|Delegate|Namespace)\s+/, '');
  const generic = noPrefix.match(/^([^<]*)(<.*)?$/);
  const base = generic ? generic[1] : noPrefix;
  const last = base.split('.').pop();
  return last + (generic && generic[2] ? generic[2] : '');
}

function decodeEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

// DocFX toc.yml is a flat list per namespace with "- name: Classes" style group markers (no href)
// followed by the items in that group. Turn each group into a nested category.
function buildSidebar(tocYaml) {
  const lines = tocYaml.split(/\r?\n/);
  const namespaces = [];
  let ns = null;
  let group = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? '';
    let m;
    if ((m = line.match(/^- name: (.+)$/))) {
      ns = {label: m[1], id: null, groups: []};
      namespaces.push(ns);
      group = null;
    } else if (ns && (m = line.match(/^  href: (.+)\.md$/))) {
      ns.id = m[1];
    } else if (ns && (m = line.match(/^  - name: (.+)$/))) {
      const href = next.match(/^    href: (.+)\.md$/);
      if (href) {
        if (!group) {
          group = {label: 'Types', items: []};
          ns.groups.push(group);
        }
        group.items.push({label: m[1], id: href[1]});
        i++;
      } else {
        group = {label: m[1], items: []};
        ns.groups.push(group);
      }
    }
  }

  const items = namespaces.map((n) => ({
    type: 'category',
    label: n.label,
    ...(n.id ? {link: {type: 'doc', id: `csharp/${n.id}`}} : {}),
    items: n.groups.map((g) => ({
      type: 'category',
      label: g.label,
      items: g.items.map((it) => ({type: 'doc', id: `csharp/${it.id}`, label: it.label})),
    })),
  }));

  return (
    '// Generated by scripts/generate-api-cs.mjs from DocFX toc.yml. Do not edit.\n' +
    '/** @type {import("@docusaurus/plugin-content-docs").SidebarsConfig} */\n' +
    `module.exports = ${JSON.stringify(items, null, 2)};\n`
  );
}
