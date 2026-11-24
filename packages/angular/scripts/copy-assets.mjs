import { copyFile, readFile, writeFile } from 'node:fs/promises';

await copyFile(
  new URL('../../../LICENSE', import.meta.url),
  new URL('../dist/LICENSE', import.meta.url),
);

// The workspace wrapper publishes dist, but dist must itself be packable by npm
// (including ATTW's --pack) without pnpm-only workspace ranges or nested paths.
const manifestUrl = new URL('../dist/package.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
const core = JSON.parse(
  await readFile(new URL('../../core/package.json', import.meta.url), 'utf8'),
);
manifest.dependencies[core.name] = `^${core.version}`;
if (manifest.publishConfig) {
  delete manifest.publishConfig.directory;
  delete manifest.publishConfig.linkDirectory;
}
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
