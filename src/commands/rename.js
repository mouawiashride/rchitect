const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const { validateName, toCamelCase } = require('../utils/validate');
const { getExtensions } = require('../utils/templates');

const SUPPORTED_TYPES = ['component', 'hook', 'page', 'service', 'context', 'store', 'feature'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss']);

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
  const structure = structures[config.pattern];
  if (!structure) {
    console.log(chalk.red('\n  Error: Unknown pattern in config.\n'));
    process.exit(1);
  }
  return structure;
}

function resolveDir(type, name, config, structure, cwd) {
  const camel = toCamelCase(name);
  switch (type) {
    case 'component': return path.join(cwd, structure.componentPath(name), name);
    case 'hook':      return path.join(cwd, structure.hookPath(), `use${name}`);
    case 'page':      return path.join(cwd, structure.pagePath(), name);
    case 'service':   return path.join(cwd, structure.servicePath(), `${camel}Service`);
    case 'context':   return path.join(cwd, structure.contextPath(), `${name}Context`);
    case 'store':     return path.join(cwd, structure.storePath(), `use${name}Store`);
    case 'feature':   return path.join(cwd, structure.featurePath(), name);
    default:          return null;
  }
}

function buildReplacementPairs(oldName, newName) {
  const oldCamel = toCamelCase(oldName);
  const newCamel = toCamelCase(newName);
  return [
    [`use${oldName}Store`,       `use${newName}Store`],
    [`${oldName}Context`,        `${newName}Context`],
    [`${oldName}Provider`,       `${newName}Provider`],
    [`${oldName}Page`,           `${newName}Page`],
    [`use${oldName}`,            `use${newName}`],
    [`${oldCamel}Service`,       `${newCamel}Service`],
    [`${oldCamel}`,              `${newCamel}`],
    [oldName,                    newName],
  ].filter(([a, b]) => a !== b);
}

function applyReplacements(str, pairs) {
  return pairs.reduce((s, [from, to]) => s.split(from).join(to), str);
}

async function applyRenameRecursive(dir, pairs) {
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    const stat = await fs.stat(entryPath);

    if (stat.isDirectory()) {
      await applyRenameRecursive(entryPath, pairs);
      const newEntry = applyReplacements(entry, pairs);
      if (newEntry !== entry) {
        await fs.rename(entryPath, path.join(dir, newEntry));
      }
    } else {
      const ext = path.extname(entry);
      if (TEXT_EXTENSIONS.has(ext)) {
        const content = await fs.readFile(entryPath, 'utf-8');
        const newContent = applyReplacements(content, pairs);
        if (newContent !== content) {
          await fs.writeFile(entryPath, newContent);
        }
      }
      const newEntry = applyReplacements(entry, pairs);
      if (newEntry !== entry) {
        await fs.rename(entryPath, path.join(dir, newEntry));
      }
    }
  }
}

async function updateBarrelForRename(parentDir, oldBasename, newBasename, config, cwd) {
  const { scriptExt } = getExtensions(config);
  const barrelPath = path.join(parentDir, `index.${scriptExt}`);
  if (!(await fs.pathExists(barrelPath))) return;

  const content = await fs.readFile(barrelPath, 'utf-8');
  const newContent = content
    .split(`from './${oldBasename}'`).join(`from './${newBasename}'`)
    .split(`as ${oldBasename} }`).join(`as ${newBasename} }`);

  if (newContent !== content) {
    await fs.writeFile(barrelPath, newContent);
    console.log(chalk.blue('  barrel  ') + chalk.gray(path.relative(cwd, barrelPath) + ' (updated)'));
  }
}

async function renameCommand(type, oldName, newName) {
  if (!SUPPORTED_TYPES.includes(type)) {
    console.log(chalk.red(`\n  Error: Unknown type "${type}".`));
    console.log(chalk.gray(`  Supported types: ${SUPPORTED_TYPES.join(', ')}\n`));
    process.exit(1);
  }

  validateName(oldName, type);
  validateName(newName, type);

  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const structure = getStructure(config);

  const oldDir = resolveDir(type, oldName, config, structure, cwd);
  const newDir = resolveDir(type, newName, config, structure, cwd);

  if (!(await fs.pathExists(oldDir))) {
    console.log(chalk.red(`\n  Error: ${type} "${oldName}" not found at ${path.relative(cwd, oldDir)}\n`));
    process.exit(1);
  }

  if (await fs.pathExists(newDir)) {
    console.log(chalk.red(`\n  Error: ${type} "${newName}" already exists at ${path.relative(cwd, newDir)}\n`));
    process.exit(1);
  }

  const pairs = buildReplacementPairs(oldName, newName);

  await applyRenameRecursive(oldDir, pairs);
  await fs.rename(oldDir, newDir);
  console.log(chalk.green('  renamed ') + chalk.gray(`${path.relative(cwd, oldDir)} → ${path.relative(cwd, newDir)}`));

  if (type !== 'feature') {
    await updateBarrelForRename(path.dirname(newDir), path.basename(oldDir), path.basename(newDir), config, cwd);
  }

  console.log(chalk.bold.green(`\n  ${type} "${oldName}" renamed to "${newName}" successfully!\n`));
}

module.exports = renameCommand;
