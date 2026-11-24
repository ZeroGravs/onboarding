import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const name = process.argv[2];
if (!['core', 'react', 'vue', 'angular'].includes(name)) throw new Error('Unknown package');
const root = fileURLToPath(new URL('../', import.meta.url));
await copyFile(resolve(root, 'LICENSE'), resolve(root, 'packages', name, 'LICENSE'));
if (name === 'core') {
  await copyFile(
    resolve(root, 'packages/core/src/styles.css'),
    resolve(root, 'packages/core/dist/styles.css'),
  );
}
