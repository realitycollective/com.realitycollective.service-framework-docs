// Writes api-docs/index.md, the landing page for the API reference section.
// Records which framework refs the generated pages came from.
import fs from 'node:fs';
import path from 'node:path';
import {apiDocsDir, describeSource, ensureDir} from './lib.mjs';

const hasCs = fs.existsSync(path.join(apiDocsDir, 'csharp', 'docfx-sidebar.cjs'));
const hasTs = fs.existsSync(path.join(apiDocsDir, 'typescript', 'typedoc-sidebar.cjs'));

const lines = [
  '---',
  'title: API Reference',
  'sidebar_label: Overview',
  'sidebar_position: 0',
  'custom_edit_url: null',
  '---',
  '',
  '# API Reference',
  '',
  'Generated reference for both implementations of the Service Framework. The pages are produced from the framework source at build time; edit the source XML docs or TSDoc comments, not these pages.',
  '',
  '| Implementation | Package | Source |',
  '| --- | --- | --- |',
];

if (hasCs) {
  lines.push(
    '| [C# (Unity)](./csharp/RealityCollective.ServiceFramework.md) | `com.realitycollective.service-framework` | ' + describeSource('csharp') + ' |',
    '| C# dependency (compiled for type resolution, not documented) | `com.realitycollective.utilities` | ' + describeSource('csharpUtilities') + ' |',
  );
}
if (hasTs) {
  lines.push(
    '| [TypeScript (web)](./typescript/index.md) | `@realitycollective/service-framework` and host packages | ' + describeSource('typescript') + ' |',
  );
}

lines.push('');
if (hasCs) {
  lines.push(
    ':::note C# reference',
    'The Unity sources reference `UnityEngine` and `UnityEditor`. When the pages are generated on a machine with a Unity editor those assemblies are compiled against; otherwise (for example on CI) Unity types appear as plain text rather than links.',
    ':::',
    '',
  );
}

ensureDir(apiDocsDir);
fs.writeFileSync(path.join(apiDocsDir, 'index.md'), lines.join('\n'));
console.log(`API index written (csharp: ${hasCs}, typescript: ${hasTs})`);
