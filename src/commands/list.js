const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { findConfig } = require('../utils/findConfig');

const PATTERN_LABELS = {
  'atomic-design': 'Atomic Design',
  'feature-based': 'Feature-Based',
  'domain-driven': 'Domain-Driven (DDD)',
  'mvc-like': 'MVC-like',
};

const FRAMEWORK_LABELS = {
  react: 'React',
  nextjs: 'Next.js',
  vue: 'Vue 3',
  nuxt: 'Nuxt 3',
  svelte: 'Svelte',
  solidjs: 'SolidJS',
  remix: 'Remix',
  angular: 'Angular',
  astro: 'Astro',
};

/**
 * Render a simple directory tree for the project's expected folders.
 * Groups by top-level directory.
 */
function renderTree(folders, configDir) {
  const tree = {};
  for (const folder of folders) {
    const parts = folder.split('/');
    const top = parts[0];
    if (!tree[top]) tree[top] = [];
    if (parts.length > 1) {
      tree[top].push(parts.slice(1).join('/'));
    }
  }

  const topKeys = Object.keys(tree).sort();
  const lines = [];
  for (let i = 0; i < topKeys.length; i++) {
    const top = topKeys[i];
    const isLast = i === topKeys.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    lines.push(chalk.cyan(prefix + top + '/'));

    const children = tree[top].sort();
    for (let j = 0; j < children.length; j++) {
      const child = children[j];
      const childLast = j === children.length - 1;
      const childPrefix = (isLast ? '    ' : '│   ') + (childLast ? '└── ' : '├── ');
      const exists = fs.pathExistsSync(path.join(configDir, top, child));
      const color = exists ? chalk.green : chalk.gray;
      lines.push(color(childPrefix + child + '/'));
    }
  }
  return lines.join('\n');
}

async function listCommand(options) {
  const cwd = process.cwd();
  const showTree = options && options.tree;

  const result = await findConfig(cwd);
  if (!result) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }

  const { config, configDir } = result;

  console.log(chalk.bold.cyan('\n  Rchitect - Project Info\n'));
  console.log(chalk.white('  Framework:  ') + chalk.green(FRAMEWORK_LABELS[config.framework] || config.framework));
  console.log(chalk.white('  Pattern:    ') + chalk.green(PATTERN_LABELS[config.pattern] || config.pattern));
  console.log(chalk.white('  Language:   ') + chalk.green(config.language || 'typescript'));
  console.log(chalk.white('  Styling:    ') + chalk.green(
    config.styling === 'tailwind' ? 'Tailwind CSS' : ((config.styling || 'css').toUpperCase() + ' Modules')
  ));
  console.log(chalk.white('  Tests:      ') + chalk.green(config.withTests ? `Yes (${config.testing || 'jest'})` : 'No'));

  if (config.framework === 'nextjs') {
    console.log(chalk.white('  Use Client: ') + chalk.green(config.useClient ? 'Yes' : 'No'));
  }

  if (configDir !== cwd) {
    console.log(chalk.white('  Config dir: ') + chalk.gray(path.relative(cwd, configDir) || '.'));
  }

  if (showTree) {
    // Load structure to get folder list
    try {
      const structures = {
        react:   require('../structures/react'),
        nextjs:  require('../structures/nextjs'),
        vue:     require('../structures/vue'),
        svelte:  require('../structures/svelte'),
        solidjs: require('../structures/solidjs'),
        nuxt:    require('../structures/nuxt'),
        remix:   require('../structures/remix'),
        angular: require('../structures/angular'),
        astro:   require('../structures/astro'),
      };
      const frameworkStructures = structures[config.framework] || structures.react;
      const structure = frameworkStructures[config.pattern];
      if (structure && structure.folders) {
        console.log(chalk.bold('\n  Project structure:\n'));
        console.log('  ' + renderTree(structure.folders, configDir).split('\n').join('\n  '));
        console.log(chalk.gray('\n  ' + chalk.green('green') + ' = exists, ' + chalk.gray('gray') + ' = not yet created'));
      }
    } catch { /* ignore if structure not found */ }
  }

  console.log('');
}

module.exports = listCommand;
