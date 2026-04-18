const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const vueStructures = require('../structures/vue');
const svelteStructures = require('../structures/svelte');
const solidjsStructures = require('../structures/solidjs');
const nuxtStructures = require('../structures/nuxt');
const remixStructures = require('../structures/remix');
const angularStructures = require('../structures/angular');
const astroStructures = require('../structures/astro');
const sveltekitStructures = require('../structures/sveltekit');
const qwikStructures = require('../structures/qwik');
const expoStructures = require('../structures/expo');
const { validateName } = require('../utils/validate');
const { updateBarrel } = require('../utils/barrel');
const { findConfig } = require('../utils/findConfig');

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
  'component', 'hook', 'composable', 'page', 'service', 'context', 'store', 'type',
  'api', 'feature', 'layout', 'loading', 'error', 'not-found', 'middleware', 'server-action',
  'form', 'modal', 'provider', 'route',
  'guard', 'schema', 'query', 'mutation', 'i18n',
];

// Types that require a route segment (lowercase) rather than PascalCase name
const SEGMENT_TYPES = ['layout', 'loading', 'error', 'not-found'];

// Types that require Next.js only (not Nuxt)
const NEXTJS_ONLY = ['loading', 'error', 'not-found', 'server-action'];

// Types that require Next.js or Nuxt
const NEXTJS_OR_NUXT = ['api', 'layout', 'middleware'];

/**
 * Infer resource type from the name when not provided.
 * PascalCase     → component
 * use*           → hook/composable
 * *Service       → service
 * *Store         → store
 * *Context       → context
 * *Page          → page
 * *Provider      → provider
 * *Form          → form
 * *Modal         → modal
 */
function inferType(name, framework) {
  if (!name) return null;
  const isVueOrSvelte = framework === 'vue' || framework === 'nuxt' || framework === 'svelte';
  if (/^use[A-Z]/.test(name)) return isVueOrSvelte ? 'composable' : 'hook';
  if (name.endsWith('Service')) return 'service';
  if (name.endsWith('Store')) return 'store';
  if (name.endsWith('Context')) return 'context';
  if (name.endsWith('Page')) return 'page';
  if (name.endsWith('Provider')) return 'provider';
  if (name.endsWith('Form')) return 'form';
  if (name.endsWith('Modal')) return 'modal';
  if (name.endsWith('Guard')) return 'guard';
  if (name.endsWith('Schema')) return 'schema';
  if (name.endsWith('Query')) return 'query';
  if (name.endsWith('Mutation')) return 'mutation';
  if (/^[A-Z]/.test(name)) return 'component';
  return null;
}

async function loadConfig(cwd) {
  const result = await findConfig(cwd);
  if (!result) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }
  return { config: result.config, configDir: result.configDir };
}

function getStructure(config) {
  const map = {
    react: reactStructures,
    nextjs: nextjsStructures,
    vue: vueStructures,
    svelte: svelteStructures,
    solidjs: solidjsStructures,
    nuxt: nuxtStructures,
    remix: remixStructures,
    angular: angularStructures,
    astro: astroStructures,
    sveltekit: sveltekitStructures,
    qwik: qwikStructures,
    expo: expoStructures,
  };
  const structures = map[config.framework] || reactStructures;
  const structure = structures[config.pattern];
  if (!structure) {
    console.log(chalk.red('\n  Error: Unknown pattern in config.\n'));
    process.exit(1);
  }
  return structure;
}

async function writeFiles(files, targetDir, cwd, opts) {
  const dryRun = opts && opts.dryRun;
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(targetDir, filePath);
    if (dryRun) {
      console.log(chalk.cyan('  would create ') + chalk.gray(path.relative(cwd, fullPath)));
      continue;
    }
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
    console.log(chalk.green('  created ') + chalk.gray(path.relative(cwd, fullPath)));
  }
}

async function resolveConflict(targetDir, resourceName, cwd, opts) {
  if (!(await fs.pathExists(targetDir))) return { action: 'proceed', dir: targetDir };
  if (opts && opts.dryRun) {
    console.log(chalk.yellow(`  [dry-run] "${resourceName}" already exists at ${path.relative(cwd, targetDir)}`));
    return { action: 'abort' };
  }
  if (opts && opts.force) {
    await fs.remove(targetDir);
    console.log(chalk.yellow(`  overwritten ${path.relative(cwd, targetDir)}`));
    return { action: 'proceed', dir: targetDir };
  }
  if (!process.stdin.isTTY) {
    console.log(chalk.red(`\n  Error: "${resourceName}" already exists at ${path.relative(cwd, targetDir)}\n`));
    process.exit(1);
  }
  const { choice } = await inquirer.prompt([{
    type: 'list',
    name: 'choice',
    message: `"${resourceName}" already exists at ${path.relative(cwd, targetDir)}. What do you want to do?`,
    choices: [
      { name: 'Skip (keep existing)', value: 'skip' },
      { name: 'Overwrite', value: 'overwrite' },
      { name: 'Rename', value: 'rename' },
    ],
  }]);
  if (choice === 'skip') return { action: 'abort' };
  if (choice === 'overwrite') {
    await fs.remove(targetDir);
    return { action: 'proceed', dir: targetDir };
  }
  const { newName } = await inquirer.prompt([{
    type: 'input',
    name: 'newName',
    message: 'New name:',
    validate: (v) => !!v.trim() || 'Name is required',
  }]);
  const newDir = path.join(path.dirname(targetDir), newName);
  if (await fs.pathExists(newDir)) {
    console.log(chalk.red(`\n  Error: "${newName}" also exists.\n`));
    return { action: 'abort' };
  }
  return { action: 'proceed', dir: newDir, newName };
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
        ...(config.framework !== 'nextjs' ? [{ name: 'Page', value: 'page' }] : []),
      ],
    }]);
    level = answer.level;
    componentDir = path.join(cwd, structure.componentPath(name, level), name);
  } else {
    componentDir = path.join(cwd, structure.componentPath(name), name);
  }

  const resolved = await resolveConflict(componentDir, name, cwd, opts);
  if (resolved.action === 'abort') return;
  componentDir = resolved.dir;
  const useName = resolved.newName || name;

  const files = componentTemplate(useName, config, level);
  if (opts && opts.story && storyTemplate) {
    Object.assign(files, storyTemplate(useName, config));
  }
  await writeFiles(files, componentDir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(componentDir), useName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Component "${useName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addHook(name, config, structure, cwd, templates, opts) {
  const { hookTemplate } = templates;
  validateName(name, 'hook');

  const { files, resolvedName } = hookTemplate(name, config);
  const hookDir = path.join(cwd, structure.hookPath(), resolvedName);

  const resolved = await resolveConflict(hookDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Hook "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addPage(name, config, structure, cwd, templates, opts) {
  const { pageTemplate } = templates;
  validateName(name, 'page');

  const files = pageTemplate(name, config);
  const pageDir = path.join(cwd, structure.pagePath(), name);

  const resolved = await resolveConflict(pageDir, name, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), name, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Page "${name}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addService(name, config, structure, cwd, templates, opts) {
  const { serviceTemplate } = templates;
  validateName(name, 'service');

  const { files, resolvedName } = serviceTemplate(name, config);
  const serviceDir = path.join(cwd, structure.servicePath(), resolvedName);

  const resolved = await resolveConflict(serviceDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Service "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addContext(name, config, structure, cwd, templates, opts) {
  const { contextTemplate } = templates;
  validateName(name, 'context');

  const { files, resolvedName } = contextTemplate(name, config);
  const contextDir = path.join(cwd, structure.contextPath(), resolvedName);

  const resolved = await resolveConflict(contextDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Context "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addStore(name, config, structure, cwd, templates, opts) {
  const { storeTemplate } = templates;
  validateName(name, 'store');

  const { files, resolvedName } = storeTemplate(name, config);
  const storeDir = path.join(cwd, structure.storePath(), resolvedName);

  const resolved = await resolveConflict(storeDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Store "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
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
  validateName(name, 'api');

  if (config.framework === 'nuxt') {
    const { nuxtApiTemplate } = templates;
    const { files, resolvedName } = nuxtApiTemplate(name, config);
    const apiDir = path.join(cwd, structure.apiPath());
    await fs.ensureDir(apiDir);
    const firstFile = Object.keys(files)[0];
    if (await fs.pathExists(path.join(apiDir, firstFile))) {
      console.log(chalk.red(`\n  Error: API handler "${resolvedName}" already exists.\n`));
      process.exit(1);
    }
    await writeFiles(files, apiDir, cwd);
    console.log(chalk.bold.green(`\n  Nuxt API handler "server/api/${resolvedName}" created successfully!\n`));
    return;
  }

  const { apiTemplate } = templates;
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

async function addNuxtLayout(name, config, structure, cwd, templates) {
  const { nuxtLayoutTemplate } = templates;
  validateName(name, 'layout');

  const { files, resolvedName } = nuxtLayoutTemplate(name, config);
  const layoutDir = path.join(cwd, structure.layoutPath());
  await fs.ensureDir(layoutDir);
  const firstFile = Object.keys(files)[0];

  if (await fs.pathExists(path.join(layoutDir, firstFile))) {
    console.log(chalk.red(`\n  Error: Layout "${resolvedName}" already exists.\n`));
    process.exit(1);
  }

  await writeFiles(files, layoutDir, cwd);
  console.log(chalk.bold.green(`\n  Nuxt layout "${resolvedName}" created successfully!\n`));
}

async function addAstroLayout(name, config, structure, cwd, templates) {
  const { astroComponentTemplate } = templates;
  validateName(name, 'layout');

  // Astro layouts are .astro files placed in src/layouts/
  const { files, resolvedName } = astroComponentTemplate(name, config);
  const layoutDir = path.join(cwd, structure.layoutPath ? structure.layoutPath() : 'src/layouts');
  await fs.ensureDir(layoutDir);
  await writeFiles(files, layoutDir, cwd);
  console.log(chalk.bold.green(`\n  Astro layout "${resolvedName}" created successfully!\n`));
}

// ── New resource type handlers ────────────────────────────────────────────────

async function addForm(name, config, structure, cwd, templates, opts) {
  const { formTemplate } = templates;
  validateName(name, 'form');

  const { files, resolvedName } = formTemplate(name, config);
  const formDir = path.join(cwd, structure.componentPath(name), resolvedName);

  const resolved = await resolveConflict(formDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Form "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addModal(name, config, structure, cwd, templates, opts) {
  const { modalTemplate } = templates;
  validateName(name, 'modal');

  const { files, resolvedName } = modalTemplate(name, config);
  const modalDir = path.join(cwd, structure.componentPath(name), resolvedName);

  const resolved = await resolveConflict(modalDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Modal "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addProvider(name, config, structure, cwd, templates, opts) {
  const { providerTemplate } = templates;
  validateName(name, 'provider');

  const { files, resolvedName } = providerTemplate(name, config);
  const providerDir = path.join(cwd, structure.contextPath(), resolvedName);

  const resolved = await resolveConflict(providerDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Provider "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addRoute(name, config, structure, cwd, templates, opts) {
  const { routeTemplate } = templates;
  validateName(name, 'route');

  const { files, resolvedName } = routeTemplate(name, config);
  let baseDir;
  if (config.framework === 'nextjs') baseDir = 'app';
  else if (config.framework === 'sveltekit') baseDir = `src/routes/${resolvedName.toLowerCase()}`;
  else if (config.framework === 'qwik') baseDir = `src/routes/${resolvedName.toLowerCase()}`;
  else if (config.framework === 'expo') baseDir = 'app';
  else baseDir = structure.pagePath();

  const routeDir = config.framework === 'sveltekit' || config.framework === 'qwik'
    ? path.join(cwd, baseDir)
    : path.join(cwd, baseDir, resolvedName);

  const resolved = await resolveConflict(routeDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;

  await writeFiles(files, resolved.dir, cwd, opts);
  console.log(chalk.bold.green(`\n  Route "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addGuard(name, config, structure, cwd, templates, opts) {
  const { guardTemplate } = templates;
  if (!guardTemplate) {
    console.log(chalk.red(`\n  Error: guardTemplate not available.\n`));
    process.exit(1);
  }
  validateName(name, 'guard');

  const { files, resolvedName } = guardTemplate(name, config);
  const guardDir = path.join(cwd, (structure.guardPath && structure.guardPath()) || 'src/guards', resolvedName);

  const resolved = await resolveConflict(guardDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;
  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Guard "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addSchema(name, config, structure, cwd, templates, opts) {
  const { schemaTemplate } = templates;
  validateName(name, 'schema');

  const { files, resolvedName } = schemaTemplate(name, config);
  const schemaDir = path.join(cwd, (structure.schemaPath && structure.schemaPath()) || 'src/schemas');
  const firstFile = Object.keys(files)[0];
  const target = path.join(schemaDir, firstFile);

  if (await fs.pathExists(target) && !(opts && opts.force) && !(opts && opts.dryRun)) {
    console.log(chalk.red(`\n  Error: Schema "${resolvedName}" already exists.\n`));
    process.exit(1);
  }
  if (!(opts && opts.dryRun)) await fs.ensureDir(schemaDir);
  await writeFiles(files, schemaDir, cwd, opts);
  console.log(chalk.bold.green(`\n  Schema "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addQuery(name, config, structure, cwd, templates, opts) {
  const { queryTemplate } = templates;
  validateName(name, 'query');

  const { files, resolvedName } = queryTemplate(name, config);
  const queryDir = path.join(cwd, (structure.queryPath && structure.queryPath()) || (structure.hookPath && structure.hookPath()) || 'src/queries', resolvedName);

  const resolved = await resolveConflict(queryDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;
  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Query "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addMutation(name, config, structure, cwd, templates, opts) {
  const { mutationTemplate } = templates;
  validateName(name, 'mutation');

  const { files, resolvedName } = mutationTemplate(name, config);
  const mutationDir = path.join(cwd, (structure.queryPath && structure.queryPath()) || (structure.hookPath && structure.hookPath()) || 'src/mutations', resolvedName);

  const resolved = await resolveConflict(mutationDir, resolvedName, cwd, opts);
  if (resolved.action === 'abort') return;
  await writeFiles(files, resolved.dir, cwd, opts);
  if (!(opts && opts.dryRun)) {
    await withBarrel(path.dirname(resolved.dir), resolvedName, config, cwd, templates);
  }
  console.log(chalk.bold.green(`\n  Mutation "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} created successfully!\n`));
}

async function addI18n(name, config, structure, cwd, templates, opts) {
  const { i18nTemplate } = templates;
  if (!name) {
    console.log(chalk.red('\n  Error: i18n key is required.\n'));
    process.exit(1);
  }

  const { files, resolvedName } = i18nTemplate(name, config);
  const i18nDir = path.join(cwd, (structure.i18nPath && structure.i18nPath()) || 'src/locales');
  if (!(opts && opts.dryRun)) await fs.ensureDir(i18nDir);

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(i18nDir, filePath);
    if (opts && opts.dryRun) {
      console.log(chalk.cyan('  would update ') + chalk.gray(path.relative(cwd, fullPath)));
      continue;
    }
    let existing = {};
    if (await fs.pathExists(fullPath)) {
      try { existing = await fs.readJson(fullPath); } catch { existing = {}; }
    }
    const incoming = JSON.parse(content);
    const merged = { ...existing, ...incoming };
    await fs.writeJson(fullPath, merged, { spaces: 2 });
    console.log(chalk.green('  updated ') + chalk.gray(path.relative(cwd, fullPath)));
  }
  console.log(chalk.bold.green(`\n  i18n key "${resolvedName}"${opts && opts.dryRun ? ' (dry-run)' : ''} added successfully!\n`));
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

async function addMiddleware(name, config, structure, cwd, templates) {
  if (config.framework === 'nuxt') {
    const { nuxtMiddlewareTemplate } = templates;
    if (!name) {
      console.log(chalk.red('\n  Error: Name is required for Nuxt middleware.\n'));
      process.exit(1);
    }
    validateName(name, 'middleware');
    const { files, resolvedName } = nuxtMiddlewareTemplate(name, config);
    const middlewareDir = path.join(cwd, structure.middlewarePath());
    await fs.ensureDir(middlewareDir);
    const firstFile = Object.keys(files)[0];
    if (await fs.pathExists(path.join(middlewareDir, firstFile))) {
      console.log(chalk.red(`\n  Error: Middleware "${resolvedName}" already exists.\n`));
      process.exit(1);
    }
    await writeFiles(files, middlewareDir, cwd);
    console.log(chalk.bold.green(`\n  Nuxt middleware "${resolvedName}" created successfully!\n`));
    return;
  }

  const { middlewareTemplate } = templates;
  const { files } = middlewareTemplate(config);
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
  const opts = cmd && typeof cmd.opts === 'function' ? cmd.opts() : (cmd || {});
  const cwd = process.cwd();

  // Auto-detect type from name when type is omitted / used as first positional
  // (commander puts the name into `type` when only one arg is given)
  if (type && !SUPPORTED_TYPES.includes(type)) {
    // type might actually be the name, and name is undefined
    const possibleName = type;
    const { config } = await loadConfig(cwd);
    const detected = inferType(possibleName, config.framework);
    if (detected) {
      console.log(chalk.gray(`  Auto-detected type: ${detected}\n`));
      type = detected;
      // Strip use/composable prefix so hookTemplate can re-add it correctly
      if ((detected === 'hook' || detected === 'composable') && /^use[A-Z]/.test(possibleName)) {
        name = possibleName.slice(3); // strip 'use'
      } else {
        name = possibleName;
      }
    } else {
      console.log(chalk.red(`\n  Error: Unknown type "${type}".`));
      console.log(chalk.gray(`  Supported types: ${SUPPORTED_TYPES.join(', ')}\n`));
      process.exit(1);
    }
  }

  if (!SUPPORTED_TYPES.includes(type)) {
    console.log(chalk.red(`\n  Error: Unknown type "${type}".`));
    console.log(chalk.gray(`  Supported types: ${SUPPORTED_TYPES.join(', ')}\n`));
    process.exit(1);
  }

  // composable is an alias for hook
  if (type === 'composable') type = 'hook';

  // Next.js middleware doesn't need a name; all others do
  if (type !== 'middleware' && !name) {
    console.log(chalk.red(`\n  Error: Name is required for "${type}".\n`));
    process.exit(1);
  }

  // Validate framework-restricted types early
  if (NEXTJS_ONLY.includes(type) || NEXTJS_OR_NUXT.includes(type)) {
    const { config } = await loadConfig(cwd);
    if (NEXTJS_ONLY.includes(type) && config.framework !== 'nextjs') {
      console.log(chalk.red(`\n  Error: "${type}" is only supported for Next.js projects.\n`));
      process.exit(1);
    }
    if (NEXTJS_OR_NUXT.includes(type) && config.framework !== 'nextjs' && config.framework !== 'nuxt') {
      console.log(chalk.red(`\n  Error: "${type}" is only supported for Next.js and Nuxt projects.\n`));
      process.exit(1);
    }
  }

  const { config, configDir } = await loadConfig(cwd);
  const structure = getStructure(config);
  const templates = loadTemplates(configDir);

  switch (type) {
    case 'component':    return addComponent(name, config, structure, configDir, templates, opts);
    case 'hook':         return addHook(name, config, structure, configDir, templates, opts);
    case 'page':         return addPage(name, config, structure, configDir, templates, opts);
    case 'service':      return addService(name, config, structure, configDir, templates, opts);
    case 'context':      return addContext(name, config, structure, configDir, templates, opts);
    case 'store':        return addStore(name, config, structure, configDir, templates, opts);
    case 'type':         return addType(name, config, structure, configDir, templates, opts);
    case 'api':          return addApi(name, config, structure, configDir, templates, opts);
    case 'feature':      return addFeature(name, config, structure, configDir, templates, opts);
    case 'form':         return addForm(name, config, structure, configDir, templates, opts);
    case 'modal':        return addModal(name, config, structure, configDir, templates, opts);
    case 'provider':     return addProvider(name, config, structure, configDir, templates, opts);
    case 'route':        return addRoute(name, config, structure, configDir, templates, opts);
    case 'guard':        return addGuard(name, config, structure, configDir, templates, opts);
    case 'schema':       return addSchema(name, config, structure, configDir, templates, opts);
    case 'query':        return addQuery(name, config, structure, configDir, templates, opts);
    case 'mutation':     return addMutation(name, config, structure, configDir, templates, opts);
    case 'i18n':         return addI18n(name, config, structure, configDir, templates, opts);
    case 'layout':
      if (config.framework === 'nuxt') return addNuxtLayout(name, config, structure, configDir, templates, opts);
      if (config.framework === 'astro') return addAstroLayout(name, config, structure, configDir, templates, opts);
      return addAppRouterFile(name, 'layout', config, configDir, templates, opts);
    case 'loading':      return addAppRouterFile(name, 'loading', config, configDir, templates, opts);
    case 'error':        return addAppRouterFile(name, 'error', config, configDir, templates, opts);
    case 'not-found':    return addAppRouterFile(name, 'not-found', config, configDir, templates, opts);
    case 'middleware':   return addMiddleware(name, config, structure, configDir, templates, opts);
    case 'server-action': return addServerAction(name, config, configDir, templates, opts);
  }
}

module.exports = addCommand;
