import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Build first: pnpm build && node scripts/check-consumers.mjs
// This script never builds, links workspace packages, or runs install scripts.
const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const fixtures = join(root, 'e2e/consumers');
const packageNames = ['core', 'react', 'vue', 'angular'];
const profiles = {
  core: { adapter: null, dependencies: {} },
  react18: {
    adapter: 'react',
    dependencies: {
      react: '18.0.0',
      'react-dom': '18.0.0',
      '@types/react': '18.3.27',
      '@types/react-dom': '18.3.7',
    },
  },
  react19: {
    adapter: 'react',
    dependencies: {
      react: '19.3.1',
      'react-dom': '19.3.1',
      '@types/react': '19.3.0',
      '@types/react-dom': '19.3.0',
    },
  },
  vue33: {
    adapter: 'vue',
    dependencies: { vue: '3.3.0', '@vue/server-renderer': '3.3.0' },
  },
  vue35: {
    adapter: 'vue',
    dependencies: { vue: '3.5.46', '@vue/server-renderer': '3.5.46' },
  },
  angular21: {
    adapter: 'angular',
    dependencies: {
      '@angular/common': '21.2.26',
      '@angular/compiler': '21.2.26',
      '@angular/core': '21.2.26',
      '@angular/platform-browser': '21.2.26',
      '@angular/router': '21.2.26',
      rxjs: '7.8.2',
    },
  },
};

function select(value, choices, flag) {
  if (value === 'all') return choices;
  const selected = [...new Set(value.split(','))];
  assert(
    selected.every((name) => choices.includes(name)),
    `${flag} must be all or a comma-separated selection of: ${choices.join(', ')}`,
  );
  return selected;
}

function isWithin(parent, child) {
  const path = relative(parent, child);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

// Do not let caller-provided module search paths/preloads defeat isolation.
const env = { ...process.env };
delete env.NODE_PATH;
delete env.NODE_OPTIONS;

function run(command, args, cwd) {
  return new Promise((resolveCommand, reject) => {
    const description = `${[command, ...args].map((arg) => JSON.stringify(arg)).join(' ')}\ncwd: ${cwd}`;
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (data) => stdout.push(data));
    child.stderr.on('data', (data) => stderr.push(data));
    child.on('error', (error) =>
      reject(new Error(`Unable to run ${description}\n${error.message}`)),
    );
    child.on('close', (code, signal) => {
      const output = Buffer.concat(stdout).toString();
      const errors = Buffer.concat(stderr).toString();
      if (code === 0) return resolveCommand(output);
      reject(new Error(`Command failed (${signal ?? code}): ${description}\n${output}${errors}`));
    });
  });
}

async function packAll(temporaryRoot) {
  const archives = {};
  const manifests = {};
  for (const name of packageNames) {
    const directory = join(root, 'packages', name);
    const source = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    try {
      await access(join(directory, 'dist'));
    } catch {
      throw new Error(`Missing ${name} build. Run pnpm build before this harness.`);
    }
    const destination = join(temporaryRoot, 'archives', name);
    await mkdir(destination, { recursive: true });
    await run('pnpm', ['pack', '--pack-destination', destination], directory);
    const files = (await readdir(destination)).filter((file) => file.endsWith('.tgz'));
    assert.equal(files.length, 1, `Expected one ${name} archive`);
    const archive = join(destination, files[0]);
    // Inspect only package metadata, never generated runtime or declaration text.
    const manifest = JSON.parse(
      await run('tar', ['-xOf', archive, 'package/package.json'], temporaryRoot),
    );
    const filesInArchive = new Set(
      (await run('tar', ['-tzf', archive], temporaryRoot)).trim().split('\n'),
    );
    assert(filesInArchive.has('package/LICENSE'), `${name}: missing license`);
    if (name === 'core') {
      for (const asset of [manifest.unpkg, manifest.jsdelivr, manifest.exports['./styles.css']]) {
        assert.equal(typeof asset, 'string', 'Core must declare its CDN and stylesheet paths');
        assert(filesInArchive.has(`package/${asset.replace(/^\.\//, '')}`), `Missing ${asset}`);
      }
    }
    assert.equal(manifest.name, source.name);
    assert.equal(manifest.version, source.version);
    assert(manifest.exports?.['.'], `${name}: missing public exports (build first)`);
    for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [dependency, range] of Object.entries(manifest[section] ?? {})) {
        assert(
          !/^(workspace|link|file):/.test(range),
          `${name}: packed ${dependency} must use a registry range, got ${range}`,
        );
      }
    }
    archives[name] = archive;
    manifests[name] = manifest;
  }
  for (const name of packageNames.filter((name) => name !== 'core')) {
    assert.equal(
      manifests[name].dependencies?.['@onboarding/core'],
      `^${manifests.core.version}`,
      `${name}: packed core dependency must be rewritten to the release version`,
    );
  }
  assert(
    manifests.angular.exports['.'].types && manifests.angular.exports['.'].default,
    'Angular must pack the built APF entry point via publishConfig.directory',
  );
  console.log('Packed all four packages; registry ranges and Angular APF metadata verified.');
  return { archives, manifests };
}

async function checkConsumer(manager, profileName, packed, temporaryRoot) {
  const { adapter, dependencies } = profiles[profileName];
  const project = join(temporaryRoot, `${manager}-${profileName}`);
  await mkdir(project);
  const selectedPackages = adapter ? ['core', adapter] : ['core'];
  const packageDependencies = Object.fromEntries(
    selectedPackages.map((name) => [`@onboarding/${name}`, `file:${packed.archives[name]}`]),
  );
  const manifest = {
    name: `consumer-${manager}-${profileName}`,
    private: true,
    type: 'module',
    dependencies: {
      ...packageDependencies,
      ...dependencies,
      typescript: '5.9.3',
      '@types/node': '22.19.0',
    },
    // Force transitive core references to the same packed release, not the registry.
    // Its actual published semver range was checked above, before any overrides.
    ...(manager === 'npm'
      ? { overrides: { '@onboarding/core': '$@onboarding/core' } }
      : {
          pnpm: { overrides: { '@onboarding/core': packageDependencies['@onboarding/core'] } },
        }),
  };
  await writeFile(join(project, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const files = ['tsconfig.json', 'common.ts', 'core.mts', 'core.cts'];
  if (adapter) files.push(adapter === 'react' ? 'react.tsx' : `${adapter}.ts`);
  await Promise.all(files.map((file) => copyFile(join(fixtures, file), join(project, file))));

  console.log(`[${manager}/${profileName}] Installing in an isolated temporary project...`);
  const args =
    manager === 'npm'
      ? [
          'install',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          '--strict-peer-deps',
          '--workspaces=false',
        ]
      : [
          'install',
          '--ignore-scripts',
          '--ignore-workspace',
          '--strict-peer-dependencies',
          '--config.node-linker=isolated',
        ];
  await run(manager, args, project);

  // Verify exact installed versions and physical isolation, including pnpm symlinks.
  const installedVersions = [];
  for (const [name, requested] of Object.entries(manifest.dependencies)) {
    const directory = await realpath(join(project, 'node_modules', name));
    assert(isWithin(project, directory), `${name} resolves outside the consumer: ${directory}`);
    const installed = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    const expected = name.startsWith('@onboarding/')
      ? packed.manifests[name.slice('@onboarding/'.length)].version
      : requested;
    assert.equal(installed.name, name);
    assert.equal(installed.version, expected, `${name}: unexpected installed version`);
    if (!name.startsWith('@onboarding/')) installedVersions.push(`${name}@${installed.version}`);
  }
  console.log(`[${manager}/${profileName}] ${installedVersions.join(', ')}`);
  await run(
    process.execPath,
    [join(project, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'],
    project,
  );
  for (const file of ['core.mjs', 'core.cjs', ...(adapter ? [`${adapter}.js`] : [])]) {
    await run(process.execPath, [join(project, 'build', file)], project);
  }
  console.log(
    `[${manager}/${profileName}] PASS: strict declarations, core ESM/CJS + CSS + SSR${adapter ? `, ${adapter} ${adapter === 'angular' ? 'APF + provider DI' : 'provider/hook SSR'}` : ''}`,
  );
}

async function main() {
  const { values } = parseArgs({
    options: {
      pm: { type: 'string', default: 'all' },
      profile: { type: 'string', default: 'all' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(`Build first: pnpm build
Usage: node scripts/check-consumers.mjs [--pm npm|pnpm|all] [--profile <selection>]
Profiles (comma-separated, default all): ${Object.keys(profiles).join(', ')}
Example: node scripts/check-consumers.mjs --pm npm --profile core,react18
Every invocation packs all four packages once; each selected pair installs only once.
Fixtures compile with strict TypeScript (no skipLibCheck) and execute from installed tarballs.
Next.js production smoke is excluded; run the existing production Next integration separately.`);
    return;
  }
  const managers = select(values.pm, ['npm', 'pnpm'], '--pm');
  const selectedProfiles = select(values.profile, Object.keys(profiles), '--profile');
  const temporaryBase = await realpath(tmpdir());
  assert(!isWithin(root, temporaryBase), 'TMPDIR must be outside the workspace');
  const temporaryRoot = resolve(await mkdtemp(join(temporaryBase, 'onboarding-consumers-')));
  try {
    const packed = await packAll(temporaryRoot);
    for (const manager of managers) {
      for (const profile of selectedProfiles) {
        await checkConsumer(manager, profile, packed, temporaryRoot);
      }
    }
  } finally {
    // Only the exact resolved directory owned by this invocation is ever removed.
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
