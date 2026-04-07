const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const vueStructures = require('../structures/vue');
const svelteStructures = require('../structures/svelte');
const solidjsStructures = require('../structures/solidjs');
const { validateName } = require('../utils/validate');
const { updateBarrel } = require('../utils/barrel');

function loadTemplates(cwd) {
  const custom = path.join(cwd, '.rchitect', 'templates.js');
  if (fs.pathExistsSync(custom)) {
    try { return require(custom); } catch {
      console.log(chalk.yellow('  Warning: .rchitect/templates.js failed to load, using built-in templates.'));
    }
  }
  return require('../utils/templates');
}

const SUPPORTED_TYPES = [
  'component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature',
  'layout', 'loading', 'error', 'not-found', 'middleware', 'server-action',
];

// Types that require a route segment (lowercase) rather than PascalCase name
const SEGMENT_TYPES = ['layout', 'loading', 'error', 'not-found'];

// Types that require Next.js
const NEXTJS_ONLY = ['api', 'layout', 'loading', 'error', 'not-found', 'middleware', 'server-action'];

async function loadConfig(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }
  return fs.readJson(configPath);
}

function getStructure(config) {
  const map = {
    react: reactStructures,
    nextjs: nextjsStructures,
    vue: vueStructures,
    svelte: svelteStructures,
    solidjs: solidjsStructures,
  };
  const structures = map[config.framework] || reactStructures;
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

async function withBarrel(parentDir, resourceName, config, cwd, templates) {
  const { getExtensions } = templates;
  const { scriptExt } = getExtensions(config);
  const result = await updateBarrel(parentDir, resourceName, scriptExt, cwd);
  const icon = result.action === 'skipped' ? chalk.gray('  ~barrel ') : chalk.blue('  barrel  ');
  console.log(icon + chalk.gray(result.path) + chalk.gray(` (${result.action})`));
}

// ── Standard resource handlers ────────────────────────────────────────────────

async function addComponent(name, config, structure, cwd, templates, opts) {
  const { componentTemplate, storyTemplate } = templates;
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
        ...(config.framework === 'react' || config.framework === 'vue' || config.framework === 'svelte' || config.framework === 'solidjs' ? [{ name: 'Page', value: 'page' }] : []),
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
  if (opts && opts.story && storyTemplate) {
    Object.assign(files, storyTemplate(name, config));
  }
  await writeFiles(files, componentDir, cwd);
  await withBarrel(path.dirname(componentDir), name, config, cwd, templates);
  console.log(chalk.bold.green(`\n  Component "${name}" created successfully!\n`));
}

async function addHook(name, config, structure, cwd, templates) {
  const { hookTemplate } = templates;
  validateName(name, 'hook');

  const { files, resolvedName } = hookTemplate(name, config);
  const hookDir = path.join(cwd, structure.hookPath(), resolvedName);

  if (await fs.pathExists(hookDir)) {
    console.log(chalk.red(`\n  Error: Hook "${resolvedName}" already exists at ${path.relative(cwd, hookDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, hookDir, cwd);
  await withBarrel(path.dirname(hookDir), resolvedName, config, cwd, templates);
  console.log(chalk.bold.green(`\n  Hook "${resolvedName}" created successfully!\n`));
}

async function addPage(name, config, structure, cwd, templates) {
  const { pageTemplate } = templates;
  validateName(name, 'page');

  const files = pageTemplate(name, config);
  const pageDir = path.join(cwd, structure.pagePath(), name);

  if (await fs.pathExists(pageDir)) {
    console.log(chalk.red(`\n  Error: Page "${name}" already exists at ${path.relative(cwd, pageDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, pageDir, cwd);
  await withBarrel(path.dirname(pageDir), name, config, cwd, templates);
  console.log(chalk.bold.green(`\n  Page "${name}" created successfully!\n`));
}

async function addService(name, config, structure, cwd, templates) {
  const { serviceTemplate } = templates;
  validateName(name, 'service');

  const { files, resolvedName } = serviceTemplate(name, config);
  const serviceDir = path.join(cwd, structure.servicePath(), resolvedName);

  if (await fs.pathExists(serviceDir)) {
    console.log(chalk.red(`\n  Error: Service "${resolvedName}" already exists at ${path.relative(cwd, serviceDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, serviceDir, cwd);
  await withBarrel(path.dirname(serviceDir), resolvedName, config, cwd, templates);
  console.log(chalk.bold.green(`\n  Service "${resolvedName}" created successfully!\n`));
}

async function addContext(name, config, structure, cwd, templates) {
  const { contextTemplate } = templates;
  validateName(name, 'context');

  const { files, resolvedName } = contextTemplate(name, config);
  const contextDir = path.join(cwd, structure.contextPath(), resolvedName);

  if (await fs.pathExists(contextDir)) {
    console.log(chalk.red(`\n  Error: Context "${resolvedName}" already exists at ${path.relative(cwd, contextDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, contextDir, cwd);
  await withBarrel(path.dirname(contextDir), resolvedName, config, cwd, templates);
  console.log(chalk.bold.green(`\n  Context "${resolvedName}" created successfully!\n`));
}

async function addStore(name, config, structure, cwd, templates) {
  const { storeTemplate } = templates;
  validateName(name, 'store');

  const { files, resolvedName } = storeTemplate(name, config);
  const storeDir = path.join(cwd, structure.storePath(), resolvedName);

  if (await fs.pathExists(storeDir)) {
    console.log(chalk.red(`\n  Error: Store "${resolvedName}" already exists at ${path.relative(cwd, storeDir)}\n`));
    process.exit(1);
  }

  await writeFiles(files, storeDir, cwd);
  await withBarrel(path.dirname(storeDir), resolvedName, config, cwd, templates);
  console.log(chalk.bold.green(`\n  Store "${resolvedName}" created successfully!\n`));
}

async function addType(name, config, structure, cwd, templates) {
  const { typeTemplate } = templates;
  validateName(name, 'type');

  const { files, resolvedName } = typeTemplate(name, config);
  const typeDir = path.join(cwd, structure.typePath());
  await fs.ensureDir(typeDir);
  await writeFiles(files, typeDir, cwd);
  console.log(chalk.bold.green(`\n  Type "${resolvedName}" created successfully!\n`));
}

async function addApi(name, config, structure, cwd, templates) {
  const { apiTemplate } = templates;
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

async function addFeature(name, config, structure, cwd, templates) {
  const { featureTemplate } = templates;
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

// ── Next.js App Router handlers ───────────────────────────────────────────────

function validateSegment(name) {
  if (!name || !name.trim()) {
    console.log(chalk.red('\n  Error: Route segment name is required.\n'));
    process.exit(1);
  }
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
    console.log(chalk.red(`\n  Error: Route segment "${name}" must be lowercase alphanumeric (hyphens/underscores allowed).\n`));
    process.exit(1);
  }
}

const APP_ROUTER_TEMPLATE_MAP = {
  layout: 'layoutTemplate',
  loading: 'loadingTemplate',
  error: 'errorTemplate',
  'not-found': 'notFoundTemplate',
};

async function addAppRouterFile(name, type, config, cwd, templates) {
  const templateFn = templates[APP_ROUTER_TEMPLATE_MAP[type]];

  if (!templateFn) {
    console.log(chalk.red(`\n  Error: No template found for type "${type}".\n`));
    process.exit(1);
  }

  validateSegment(name);

  const targetDir = path.join(cwd, 'app', name);
  const { files } = templateFn(name, config);

  const firstFile = Object.keys(files)[0];
  if (await fs.pathExists(path.join(targetDir, firstFile))) {
    console.log(chalk.red(`\n  Error: ${type} for segment "${name}" already exists.\n`));
    process.exit(1);
  }

  await writeFiles(files, targetDir, cwd);
  console.log(chalk.bold.green(`\n  ${type} for segment "${name}" created successfully!\n`));
}

async function addMiddleware(config, cwd, templates) {
  const { middlewareTemplate } = templates;

  if (config.framework !== 'nextjs') {
    console.log(chalk.red('\n  Error: Middleware is only supported for Next.js projects.\n'));
    process.exit(1);
  }

  const { files, resolvedName } = middlewareTemplate(config);
  const firstFile = Object.keys(files)[0];

  if (await fs.pathExists(path.join(cwd, firstFile))) {
    console.log(chalk.red('\n  Error: middleware file already exists at project root.\n'));
    process.exit(1);
  }

  await writeFiles(files, cwd, cwd);
  console.log(chalk.bold.green('\n  Middleware created successfully!\n'));
}

async function addServerAction(name, config, cwd, templates) {
  const { serverActionTemplate } = templates;
  validateName(name, 'server-action');

  if (config.framework !== 'nextjs') {
    console.log(chalk.red('\n  Error: Server Actions are only supported for Next.js projects.\n'));
    process.exit(1);
  }

  const { files, resolvedName } = serverActionTemplate(name, config);
  const targetDir = path.join(cwd, 'app', 'actions');

  const firstFile = Object.keys(files)[0];
  if (await fs.pathExists(path.join(targetDir, firstFile))) {
    console.log(chalk.red(`\n  Error: Server action "${resolvedName}" already exists.\n`));
    process.exit(1);
  }

  await writeFiles(files, targetDir, cwd);
  console.log(chalk.bold.green(`\n  Server action "${resolvedName}" created successfully!\n`));
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

async function addCommand(type, name, cmd) {
  if (!SUPPORTED_TYPES.includes(type)) {
    console.log(chalk.red(`\n  Error: Unknown type "${type}".`));
    console.log(chalk.gray(`  Supported types: ${SUPPORTED_TYPES.join(', ')}\n`));
    process.exit(1);
  }

  // middleware doesn't need a name; all others do
  if (type !== 'middleware' && !name) {
    console.log(chalk.red(`\n  Error: Name is required for "${type}".\n`));
    process.exit(1);
  }

  // Validate Next.js-only types early
  if (NEXTJS_ONLY.includes(type)) {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    if (config.framework !== 'nextjs') {
      console.log(chalk.red(`\n  Error: "${type}" is only supported for Next.js projects.\n`));
      process.exit(1);
    }
  }

  const opts = cmd && typeof cmd.opts === 'function' ? cmd.opts() : (cmd || {});
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const structure = getStructure(config);
  const templates = loadTemplates(cwd);

  switch (type) {
    case 'component':    return addComponent(name, config, structure, cwd, templates, opts);
    case 'hook':         return addHook(name, config, structure, cwd, templates);
    case 'page':         return addPage(name, config, structure, cwd, templates);
    case 'service':      return addService(name, config, structure, cwd, templates);
    case 'context':      return addContext(name, config, structure, cwd, templates);
    case 'store':        return addStore(name, config, structure, cwd, templates);
    case 'type':         return addType(name, config, structure, cwd, templates);
    case 'api':          return addApi(name, config, structure, cwd, templates);
    case 'feature':      return addFeature(name, config, structure, cwd, templates);
    case 'layout':       return addAppRouterFile(name, 'layout', config, cwd, templates);
    case 'loading':      return addAppRouterFile(name, 'loading', config, cwd, templates);
    case 'error':        return addAppRouterFile(name, 'error', config, cwd, templates);
    case 'not-found':    return addAppRouterFile(name, 'not-found', config, cwd, templates);
    case 'middleware':   return addMiddleware(config, cwd, templates);
    case 'server-action': return addServerAction(name, config, cwd, templates);
  }
}

module.exports = addCommand;
