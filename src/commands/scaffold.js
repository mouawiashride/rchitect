const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const { toCamelCase } = require('../utils/validate');
const {
  getExtensions, componentTemplate, hookTemplate, pageTemplate, serviceTemplate,
  contextTemplate, storeTemplate, typeTemplate, apiTemplate, featureTemplate,
} = require('../utils/templates');
const { updateBarrel } = require('../utils/barrel');

const SUPPORTED_TYPES = ['component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature'];
const PASCAL_CASE_REGEX = /^[A-Z][a-zA-Z0-9]*$/;

async function loadConfig(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }
  return fs.readJson(configPath);
}

function getStructure(config) {
  const structures = config.framework === 'react' ? reactStructures : nextjsStructures;
  return structures[config.pattern];
}

async function writeFiles(files, targetDir, cwd) {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(targetDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
    console.log(chalk.green('  created ') + chalk.gray(path.relative(cwd, fullPath)));
  }
}

async function withBarrel(parentDir, resourceName, config, cwd) {
  const { scriptExt } = getExtensions(config);
  const result = await updateBarrel(parentDir, resourceName, scriptExt, cwd);
  const icon = result.action === 'skipped' ? chalk.gray('  ~barrel ') : chalk.blue('  barrel  ');
  console.log(icon + chalk.gray(result.path) + chalk.gray(` (${result.action})`));
}

async function scaffoldResource(type, name, atomicLevel, config, structure, cwd) {
  if (!PASCAL_CASE_REGEX.test(name)) throw new Error(`"${name}" is not a valid PascalCase name`);

  switch (type) {
    case 'component': {
      const level = atomicLevel || (config.pattern === 'atomic-design' ? 'atom' : undefined);
      const componentDir = path.join(cwd, structure.componentPath(name, level), name);
      if (await fs.pathExists(componentDir)) throw new Error('already exists');
      const files = componentTemplate(name, config, level);
      await writeFiles(files, componentDir, cwd);
      await withBarrel(path.dirname(componentDir), name, config, cwd);
      break;
    }
    case 'hook': {
      const { files, resolvedName } = hookTemplate(name, config);
      const hookDir = path.join(cwd, structure.hookPath(), resolvedName);
      if (await fs.pathExists(hookDir)) throw new Error('already exists');
      await writeFiles(files, hookDir, cwd);
      await withBarrel(path.dirname(hookDir), resolvedName, config, cwd);
      break;
    }
    case 'page': {
      const pageDir = path.join(cwd, structure.pagePath(), name);
      if (await fs.pathExists(pageDir)) throw new Error('already exists');
      const files = pageTemplate(name, config);
      await writeFiles(files, pageDir, cwd);
      await withBarrel(path.dirname(pageDir), name, config, cwd);
      break;
    }
    case 'service': {
      const { files, resolvedName } = serviceTemplate(name, config);
      const serviceDir = path.join(cwd, structure.servicePath(), resolvedName);
      if (await fs.pathExists(serviceDir)) throw new Error('already exists');
      await writeFiles(files, serviceDir, cwd);
      await withBarrel(path.dirname(serviceDir), resolvedName, config, cwd);
      break;
    }
    case 'context': {
      const { files, resolvedName } = contextTemplate(name, config);
      const contextDir = path.join(cwd, structure.contextPath(), resolvedName);
      if (await fs.pathExists(contextDir)) throw new Error('already exists');
      await writeFiles(files, contextDir, cwd);
      await withBarrel(path.dirname(contextDir), resolvedName, config, cwd);
      break;
    }
    case 'store': {
      const { files, resolvedName } = storeTemplate(name, config);
      const storeDir = path.join(cwd, structure.storePath(), resolvedName);
      if (await fs.pathExists(storeDir)) throw new Error('already exists');
      await writeFiles(files, storeDir, cwd);
      await withBarrel(path.dirname(storeDir), resolvedName, config, cwd);
      break;
    }
    case 'type': {
      const { files } = typeTemplate(name, config);
      const typeDir = path.join(cwd, structure.typePath());
      await fs.ensureDir(typeDir);
      await writeFiles(files, typeDir, cwd);
      break;
    }
    case 'api': {
      if (config.framework !== 'nextjs') throw new Error('API routes are only supported for Next.js projects');
      const { files, resolvedName } = apiTemplate(name, config);
      const apiDir = path.join(cwd, structure.apiPath(), resolvedName);
      if (await fs.pathExists(apiDir)) throw new Error('already exists');
      await writeFiles(files, apiDir, cwd);
      break;
    }
    case 'feature': {
      const { files, resolvedName } = featureTemplate(name, config);
      const featureDir = path.join(cwd, structure.featurePath(), resolvedName);
      if (await fs.pathExists(featureDir)) throw new Error('already exists');
      await writeFiles(files, featureDir, cwd);
      break;
    }
  }
}

async function scaffoldCommand(manifestPath) {
  const cwd = process.cwd();
  const resolvedPath = path.resolve(cwd, manifestPath);

  if (!(await fs.pathExists(resolvedPath))) {
    console.log(chalk.red(`\n  Error: Manifest file not found: ${manifestPath}\n`));
    process.exit(1);
  }

  let manifest;
  try {
    manifest = await fs.readJson(resolvedPath);
  } catch {
    console.log(chalk.red('\n  Error: Manifest file is not valid JSON.\n'));
    process.exit(1);
  }

  if (!Array.isArray(manifest.resources) || manifest.resources.length === 0) {
    console.log(chalk.red('\n  Error: Manifest must have a non-empty "resources" array.\n'));
    process.exit(1);
  }

  const config = await loadConfig(cwd);
  const structure = getStructure(config);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  console.log(chalk.bold.cyan(`\n  Scaffolding ${manifest.resources.length} resource(s)...\n`));

  for (const resource of manifest.resources) {
    const { type, name, atomicLevel } = resource;

    if (!type || !name) {
      console.log(chalk.red(`  ✗ Each resource must have "type" and "name" — skipped`));
      failed++;
      continue;
    }

    if (!SUPPORTED_TYPES.includes(type)) {
      console.log(chalk.red(`  ✗ Unknown type "${type}" for "${name}" — skipped`));
      failed++;
      continue;
    }

    try {
      await scaffoldResource(type, name, atomicLevel, config, structure, cwd);
      console.log(chalk.bold.green(`  ✓ ${type} "${name}" created`));
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already exists')) {
        console.log(chalk.yellow(`  ~ ${type} "${name}" skipped — already exists`));
        skipped++;
      } else {
        console.log(chalk.red(`  ✗ ${type} "${name}" failed — ${msg}`));
        failed++;
      }
    }
  }

  console.log(chalk.bold.green(`\n  Done! ${created} created, ${skipped} skipped, ${failed} failed.\n`));
}

module.exports = scaffoldCommand;
