const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
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
const { detectFramework } = require('../utils/detect');
const { generatePathAliases } = require('../utils/pathAlias');

async function initCommand(options) {
  console.log(chalk.bold.cyan('\n  Rchitect - Project Scaffolder\n'));

  const cwd = process.cwd();

  // Check for existing package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (!(await fs.pathExists(pkgPath))) {
    console.log(chalk.red('  Error: No package.json found in this directory.'));
    console.log(chalk.gray('  Run this command inside an existing React or Next.js project.\n'));
    process.exit(1);
  }

  // Auto-detect framework
  const detected = await detectFramework(cwd);
  let framework;

  const frameworkLabels = { react: 'React', nextjs: 'Next.js', vue: 'Vue 3', svelte: 'Svelte', solidjs: 'SolidJS', nuxt: 'Nuxt 3', remix: 'Remix', angular: 'Angular', astro: 'Astro', sveltekit: 'SvelteKit', qwik: 'Qwik', expo: 'Expo / React Native' };

  if (detected) {
    console.log(chalk.green('  Detected: ') + chalk.white(frameworkLabels[detected] || detected) + '\n');
    const { confirmFramework } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmFramework',
      message: `Use ${frameworkLabels[detected] || detected} as the framework?`,
      default: true,
    }]);
    if (confirmFramework) framework = detected;
  }

  if (!framework) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'framework',
      message: 'Choose your framework:',
      choices: [
        { name: 'React', value: 'react' },
        { name: 'Next.js', value: 'nextjs' },
        { name: 'Vue 3', value: 'vue' },
        { name: 'Nuxt 3', value: 'nuxt' },
        { name: 'Svelte', value: 'svelte' },
        { name: 'SvelteKit', value: 'sveltekit' },
        { name: 'SolidJS', value: 'solidjs' },
        { name: 'Remix', value: 'remix' },
        { name: 'Angular', value: 'angular' },
        { name: 'Astro', value: 'astro' },
        { name: 'Qwik', value: 'qwik' },
        { name: 'Expo / React Native', value: 'expo' },
      ],
    }]);
    framework = answer.framework;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'pattern',
      message: 'Choose an architecture pattern:',
      choices: [
        { name: 'Atomic Design', value: 'atomic-design' },
        { name: 'Feature-Based', value: 'feature-based' },
        { name: 'Domain-Driven (DDD)', value: 'domain-driven' },
        { name: 'MVC-like', value: 'mvc-like' },
      ],
    },
    {
      type: 'list',
      name: 'language',
      message: 'Choose your language:',
      choices: [
        { name: 'TypeScript', value: 'typescript' },
        { name: 'JavaScript', value: 'javascript' },
      ],
    },
    {
      type: 'list',
      name: 'styling',
      message: 'Choose your styling approach:',
      choices: [
        { name: 'CSS Modules', value: 'css' },
        { name: 'SCSS Modules', value: 'scss' },
        { name: 'Tailwind CSS', value: 'tailwind' },
      ],
    },
    {
      type: 'confirm',
      name: 'withTests',
      message: 'Generate test files alongside components?',
      default: false,
    },
    {
      type: 'list',
      name: 'testing',
      message: 'Choose your test runner:',
      choices: [
        { name: 'Jest', value: 'jest' },
        { name: 'Vitest', value: 'vitest' },
      ],
      default: 'jest',
      when: (ans) => ans.withTests,
    },
    {
      type: 'confirm',
      name: 'useClient',
      message: 'Add "use client" directive to components by default?',
      default: false,
      when: () => framework === 'nextjs',
    },
    {
      type: 'confirm',
      name: 'pathAliases',
      message: 'Set up TypeScript path aliases in tsconfig.json?',
      default: true,
      when: (ans) => ans.language === 'typescript',
    },
  ]);

  const { pattern, language, styling, withTests } = answers;
  const useClient = answers.useClient || false;
  const testing = answers.testing || 'jest';
  const setupAliases = answers.pathAliases || false;
  const dryRun = options.dryRun || false;

  const structureMap = {
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
  const structures = structureMap[framework] || reactStructures;
  const structure = structures[pattern];

  if (!structure) {
    console.log(chalk.red('\n  Error: Unknown pattern.\n'));
    process.exit(1);
  }

  // Check for existing config
  const configPath = path.join(cwd, '.rchitect.json');
  if (!dryRun && (await fs.pathExists(configPath))) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'A .rchitect.json already exists. Overwrite?',
      default: false,
    }]);
    if (!overwrite) {
      console.log(chalk.yellow('\n  Aborted.\n'));
      return;
    }
  }

  if (dryRun) {
    console.log(chalk.yellow('\n  [dry-run] Preview of folders to create:\n'));
  } else {
    console.log(chalk.gray(`\n  Scaffolding ${chalk.white(pattern)} structure...\n`));
  }

  const prefix = dryRun ? chalk.yellow('  [dry-run] ') : chalk.green('  created  ');

  // Create folders
  for (const folder of structure.folders) {
    if (!dryRun) await fs.ensureDir(path.join(cwd, folder));
    console.log(prefix + chalk.gray(folder + '/'));
  }

  // Write config
  const config = { framework, pattern, language, styling, withTests, useClient, testing };
  if (!dryRun) await fs.writeJson(configPath, config, { spaces: 2 });
  console.log(prefix + chalk.gray('.rchitect.json'));

  // Generate path aliases
  if (!dryRun && setupAliases) {
    const aliases = await generatePathAliases(cwd, config, structure);
    if (aliases) {
      const count = Object.keys(aliases).length;
      console.log(chalk.green('  updated ') + chalk.gray(`tsconfig.json (${count} path aliases added)`));
    }
  }

  if (dryRun) {
    console.log(chalk.yellow('\n  No files were created (dry-run mode).\n'));
  } else {
    console.log(chalk.bold.green('\n  Done! Architecture folders are ready.\n'));
    console.log(chalk.gray('  Add resources with:'));
    const hookLabel = (framework === 'vue' || framework === 'nuxt' || framework === 'svelte') ? 'composable' : 'hook';
    const isAngular = framework === 'angular';
    console.log(chalk.cyan('    rchitect add component <Name>'));
    console.log(chalk.cyan(`    rchitect add ${hookLabel} <Name>`));
    console.log(chalk.cyan('    rchitect add page <Name>'));
    console.log(chalk.cyan('    rchitect add service <Name>'));
    console.log(chalk.cyan('    rchitect add context <Name>'));
    console.log(chalk.cyan('    rchitect add store <Name>'));
    console.log(chalk.cyan('    rchitect add type <Name>'));
    console.log(chalk.cyan('    rchitect add feature <Name>'));
    if (framework === 'nextjs') {
      console.log(chalk.cyan('    rchitect add api <Name>          (Next.js only)'));
      console.log(chalk.cyan('    rchitect add layout <segment>    (Next.js only)'));
      console.log(chalk.cyan('    rchitect add loading <segment>   (Next.js only)'));
      console.log(chalk.cyan('    rchitect add error <segment>     (Next.js only)'));
      console.log(chalk.cyan('    rchitect add not-found <segment> (Next.js only)'));
      console.log(chalk.cyan('    rchitect add middleware           (Next.js only)'));
      console.log(chalk.cyan('    rchitect add server-action <Name>(Next.js only)'));
    }
    if (framework === 'nuxt') {
      console.log(chalk.cyan('    rchitect add api <Name>          (Nuxt only)'));
      console.log(chalk.cyan('    rchitect add layout <Name>       (Nuxt only)'));
      console.log(chalk.cyan('    rchitect add middleware <Name>   (Nuxt only)'));
    }
    if (framework === 'remix') {
      console.log(chalk.cyan('    rchitect add route <Name>        (creates loader + action)'));
    }
    if (isAngular) {
      console.log(chalk.cyan('    rchitect add service <Name>      (Angular service)'));
      console.log(chalk.cyan('    rchitect add store <Name>        (BehaviorSubject store)'));
    }
    if (framework === 'astro') {
      console.log(chalk.cyan('    rchitect add layout <Name>       (Astro layout)'));
      console.log(chalk.cyan('    rchitect add route <Name>        (Astro page route)'));
    }
    console.log('');
  }
}

module.exports = initCommand;
