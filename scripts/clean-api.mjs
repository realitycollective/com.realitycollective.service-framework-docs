// Removes generated API output so the site builds without the API section.
import fs from 'node:fs';
import {apiDocsDir} from './lib.mjs';

fs.rmSync(apiDocsDir, {recursive: true, force: true});
console.log('Removed api-docs/');
