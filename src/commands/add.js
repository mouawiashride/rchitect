const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const { validateName } = require('../utils/validate');
const {
  getExtensions, componentTemplate, hookTemplate, pageTemplate, serviceTemplate,
  contextTemplate, storeTemplate, typeTemplate, apiTemplate, featureTemplate,
} = require('../utils/templates');
const { updateBarrel } = require('../utils/barrel');

const SUPPORTED_TYPES = ['component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature'];

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

async function addComponent(name, config, structure, cwd) {
  validateName(name, 'component');

  let componentDir;
  let level;

  if (config.pattern === 'atomic-design') {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'level',
      message: 'Choose the component level:',
      choices: [
        { name: 'Atom', value: 'atom' },
        { name: 'Molecule', value: 'molecule' },
        { name: 'Organism', value: 'organism' },
        { name: 'Template', value: 'template' },
        ...(config.framework === 'react' ? [{ name: 'Page', value: 'page' }] : []),
      ],
    }]);
    level = answer.level;
    componentDir = path.join(cwd, structure.componentPath(name, level), name);
  } else {
    componentDir = path.join(cwd, structure.componentPath(name), name);
  }

  if (await fs.pathExists(componentDir)) {
    console.log(chalk.red(`\n  Error: Component "${name}" already exists at ${path.relative(cwd, componentDir)}\n`));
    process.exit(1);
  }

  const files = componentTemplate(name, config, level);
  await writeFiles(files, componentDir, cwd);
  await withBarrel(path.dirname(componentDir), name, config, cwd);
  console.log(chalk.bold.green(`\n  Component "${name}" created successfully!\n`));
}

async function addHook(name, config, structure, cwd) {
  validateName(name, 'hook');

  const { files, resolvedName } = hookTemplate(name, config);
  const hookDir = path.join(cwd, structure.hookPath(), resolvedName);

  if (await fs.pathExists(hookDir)) {
    console.log(chalk.red(`\n  Error: Hook "${resolvedName}" already exists at ${path.relative(cwd, hookDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, hookDir, cwd);
  await withBarrel(path.dirname(hookDir), resolvedName, config, cwd);
  console.log(chalk.bold.green(`\n  Hook "${resolvedName}" created successfully!\n`));
}

async function addPage(name, config, structure, cwd) {
  validateName(name, 'page');

  const files = pageTemplate(name, config);
  const pageDir = path.join(cwd, structure.pagePath(), name);

  if (await fs.pathExists(pageDir)) {
    console.log(chalk.red(`\n  Error: Page "${name}" already exists at ${path.relative(cwd, pageDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, pageDir, cwd);
  await withBarrel(path.dirname(pageDir), name, config, cwd);
  console.log(chalk.bold.green(`\n  Page "${name}" created successfully!\n`));
}

async function addService(name, config, structure, cwd) {
  validateName(name, 'service');

  const { files, resolvedName } = serviceTemplate(name, config);
  const serviceDir = path.join(cwd, structure.servicePath(), resolvedName);

  if (await fs.pathExists(serviceDir)) {
    console.log(chalk.red(`\n  Error: Service "${resolvedName}" already exists at ${path.relative(cwd, serviceDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, serviceDir, cwd);
  await withBarrel(path.dirname(serviceDir), resolvedName, config, cwd);
  console.log(chalk.bold.green(`\n  Service "${resolvedName}" created successfully!\n`));
}

async function addContext(name, config, structure, cwd) {
  validateName(name, 'context');

  const { files, resolvedName } = contextTemplate(name, config);
  const contextDir = path.join(cwd, structure.contextPath(), resolvedName);

  if (await fs.pathExists(contextDir)) {
    console.log(chalk.red(`\n  Error: Context "${resolvedName}" already exists at ${path.relative(cwd, contextDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, contextDir, cwd);
  await withBarrel(path.dirname(contextDir), resolvedName, config, cwd);
  console.log(chalk.bold.green(`\n  Context "${resolvedName}" created successfully!\n`));
}

async function addStore(name, config, structure, cwd) {
  validateName(name, 'store');

  const { files, resolvedName } = storeTemplate(name, config);
  const storeDir = path.join(cwd, structure.storePath(), resolvedName);

  if (await fs.pathExists(storeDir)) {
    console.log(chalk.red(`\n  Error: Store "${resolvedName}" already exists at ${path.relative(cwd, storeDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, storeDir, cwd);
  await withBarrel(path.dirname(storeDir), resolvedName, config, cwd);
  console.log(chalk.bold.green(`\n  Store "${resolvedName}" created successfully!\n`));
}

async function addType(name, config, structure, cwd) {
  validateName(name, 'type');

  const { files, resolvedName } = typeTemplate(name, config);
  const typeDir = path.join(cwd, structure.typePath());
  await fs.ensureDir(typeDir);
  await writeFiles(files, typeDir, cwd);
  console.log(chalk.bold.green(`\n  Type "${resolvedName}" created successfully!\n`));
}

async function addApi(name, config, structure, cwd) {
  validateName(name, 'api');

  if (config.framework !== 'nextjs') {
    console.log(chalk.red('\n  Error: API routes are only supported for Next.js projects.\n'));
    process.exit(1);
  }

  const { files, resolvedName } = apiTemplate(name, config);
  const apiDir = path.join(cwd, structure.apiPath(), resolvedName);

  if (await fs.pathExists(apiDir)) {
    console.log(chalk.red(`\n  Error: API route "${resolvedName}" already exists at ${path.relative(cwd, apiDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, apiDir, cwd);
  console.log(chalk.bold.green(`\n  API route "app/api/${resolvedName}/route" created successfully!\n`));
}

async function addFeature(name, config, structure, cwd) {
  validateName(name, 'feature');

  const { files, resolvedName } = featureTemplate(name, config);
  const featureDir = path.join(cwd, structure.featurePath(), resolvedName);

  if (await fs.pathExists(featureDir)) {
    console.log(chalk.red(`\n  Error: Feature "${resolvedName}" already exists at ${path.relative(cwd, featureDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, featureDir, cwd);
  console.log(chalk.bold.green(`\n  Feature "${resolvedName}" scaffolded successfully!\n`));
}

async function addCommand(type, name) {
  if (!SUPPORTED_TYPES.includes(type)) {
    console.log(chalk.red(`\n  Error: Unknown type "${type}".`));
    console.log(chalk.gray(`  Supported types: ${SUPPORTED_TYPES.join(', ')}\n`));
    process.exit(1);
  }

  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const structure = getStructure(config);

  switch (type) {
    case 'component': return addComponent(name, config, structure, cwd);
    case 'hook':      return addHook(name, config, structure, cwd);
    case 'page':      return addPage(name, config, structure, cwd);
    case 'service':   return addService(name, config, structure, cwd);
    case 'context':   return addContext(name, config, structure, cwd);
    case 'store':     return addStore(name, config, structure, cwd);
    case 'type':      return addType(name, config, structure, cwd);
    case 'api':       return addApi(name, config, structure, cwd);
    case 'feature':   return addFeature(name, config, structure, cwd);
  }
}

module.exports = addCommand;
