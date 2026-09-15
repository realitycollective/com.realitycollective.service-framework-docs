import fs from 'node:fs';
import path from 'node:path';
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// Sidebar for the generated API reference (api-docs/). The per-language sidebars are written by
// scripts/generate-api-cs.mjs and scripts/generate-api-ts.mjs; a language whose output is absent is left out.
// Docusaurus loads this file through a CommonJS transform, so require and __dirname are available.
const apiDocsDir = path.resolve(__dirname, 'api-docs');

function generated(file: string): unknown[] | null {
  const full = path.join(apiDocsDir, file);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return fs.existsSync(full) ? (require(full) as unknown[]) : null;
}

const csharp = generated('csharp/docfx-sidebar.cjs');
const typescript = generated('typescript/typedoc-sidebar.cjs');

const items: unknown[] = ['index'];

if (csharp) {
  items.push({
    type: 'category',
    label: 'C# (Unity)',
    link: {type: 'doc', id: 'csharp/RealityCollective.ServiceFramework'},
    items: csharp,
  });
}

if (typescript) {
  items.push({
    type: 'category',
    label: 'TypeScript (web)',
    link: {type: 'doc', id: 'typescript/index'},
    items: typescript,
  });
}

const sidebars: SidebarsConfig = {
  api: items as SidebarsConfig['api'],
};

export default sidebars;
