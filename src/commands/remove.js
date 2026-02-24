const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const { validateName, toCamelCase } = require('../utils/validate');

const SUPPORTED_TYPES = ['component', 'hook', 'page', 'service', 'context', 'store', 'feature'];

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

function resolveTargetDir(type, name, config, structure, cwd) {
  const camel = toCamelCase(name);
  switch (type) {
    case 'component':
      return path.join(cwd, structure.componentPath(name), name);
    case 'hook':
      return path.join(cwd, structure.hookPath(), `use${name}`);
    case 'page':
      return path.join(cwd, structure.pagePath(), name);
    case 'service':
      return path.join(cwd, structure.servicePath(), `${camel}Service`);
    case 'context':
      return path.join(cwd, structure.contextPath(), `${name}Context`);
    case 'store':
      return path.join(cwd, structure.storePath(), `use${name}Store`);
    case 'feature':
      return path.join(cwd, structure.featurePath(), name);
    default:
      return null;
  }
}

async function removeCommand(type, name) {
  if (!SUPPORTED_TYPES.includes(type)) {
    console.log(chalk.red(`\n  Error: Unknown type "${type}".`));
    console.log(chalk.gray(`  Supported types: ${SUPPORTED_TYPES.join(', ')}\n`));
    process.exit(1);
  }

  validateName(name, type);

  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const structure = getStructure(config);

  const targetDir = resolveTargetDir(type, name, config, structure, cwd);
  const relTarget = path.relative(cwd, targetDir);

  if (!(await fs.pathExists(targetDir))) {
    console.log(chalk.red(`\n  Error: ${type} "${name}" not found at ${relTarget}\n`));
    process.exit(1);
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Delete ${chalk.white(relTarget)} and all its contents?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('\n  Aborted.\n'));
    return;
  }

  await fs.remove(targetDir);
  console.log(chalk.bold.green(`\n  Removed ${type} "${name}" from ${relTarget}\n`));
}

module.exports = removeCommand;
