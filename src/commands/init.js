const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
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

  if (detected) {
    console.log(chalk.green('  Detected: ') + chalk.white(detected === 'nextjs' ? 'Next.js' : 'React') + '\n');
    const { confirmFramework } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmFramework',
      message: `Use ${detected === 'nextjs' ? 'Next.js' : 'React'} as the framework?`,
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
      message: 'Choose your styling:',
      choices: [
        { name: 'CSS Modules', value: 'css' },
        { name: 'SCSS Modules', value: 'scss' },
      ],
    },
    {
      type: 'confirm',
      name: 'withTests',
      message: 'Generate test files alongside components?',
      default: false,
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
  const setupAliases = answers.pathAliases || false;
  const dryRun = options.dryRun || false;

  const structures = framework === 'react' ? reactStructures : nextjsStructures;
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
  const config = { framework, pattern, language, styling, withTests, useClient };
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
    console.log(chalk.cyan('    rchitect add component <Name>'));
    console.log(chalk.cyan('    rchitect add hook <Name>'));
    console.log(chalk.cyan('    rchitect add page <Name>'));
    console.log(chalk.cyan('    rchitect add service <Name>'));
    console.log(chalk.cyan('    rchitect add context <Name>'));
    console.log(chalk.cyan('    rchitect add store <Name>'));
    console.log(chalk.cyan('    rchitect add type <Name>'));
    console.log(chalk.cyan('    rchitect add api <Name>   (Next.js only)'));
    console.log(chalk.cyan('    rchitect add feature <Name>\n'));
  }
}

module.exports = initCommand;
