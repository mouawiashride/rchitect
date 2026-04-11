const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const vueStructures = require('../structures/vue');
const svelteStructures = require('../structures/svelte');
const solidjsStructures = require('../structures/solidjs');
const nuxtStructures = require('../structures/nuxt');

const structureMap = {
  react: reactStructures,
  nextjs: nextjsStructures,
  vue: vueStructures,
  svelte: svelteStructures,
  solidjs: solidjsStructures,
  nuxt: nuxtStructures,
};

async function countFiles(dir) {
  if (!(await fs.pathExists(dir))) return 0;
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) count++;
    else if (entry.isDirectory()) count += await countFiles(path.join(dir, entry.name));
  }
  return count;
}

async function statsCommand(options) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.rchitect.json');

  if (!(await fs.pathExists(configPath))) {
    if (options.json) {
      process.stdout.write(JSON.stringify({ error: '.rchitect.json not found. Run "rchitect init" first.' }) + '\n');
    } else {
      console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    }
    process.exit(1);
  }

  const config = await fs.readJson(configPath);
  const structures = structureMap[config.framework] || reactStructures;
  const structure = structures[config.pattern];

  if (!structure) {
    if (options.json) {
      process.stdout.write(JSON.stringify({ error: 'Unknown pattern in config.' }) + '\n');
    } else {
      console.log(chalk.red('\n  Error: Unknown pattern in config.\n'));
    }
    process.exit(1);
  }

  const expectedFolders = structure.folders;
  const results = [];
  let presentCount = 0;

  for (const folder of expectedFolders) {
    const fullPath = path.join(cwd, folder);
    const exists = await fs.pathExists(fullPath);
    const fileCount = exists ? await countFiles(fullPath) : 0;
    if (exists) presentCount++;
    results.push({ folder, exists, fileCount });
  }

  const total = expectedFolders.length;
  const compliance = total > 0 ? Math.round((presentCount / total) * 100) : 100;

  if (options.json) {
    const output = {
      framework: config.framework,
      pattern: config.pattern,
      compliance,
      foldersPresent: presentCount,
      foldersExpected: total,
      folders: results,
    };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    return;
  }

  console.log(chalk.bold.cyan('\n  Rchitect Stats\n'));
  console.log(`  ${chalk.gray('framework')}   ${chalk.white(config.framework)}`);
  console.log(`  ${chalk.gray('pattern')}     ${chalk.white(config.pattern)}`);
  console.log('');

  for (const { folder, exists, fileCount } of results) {
    const icon = exists ? chalk.green('  ✔') : chalk.red('  ✘');
    const folderLabel = chalk.gray(folder + '/');
    const filesLabel = exists ? chalk.gray(`  (${fileCount} file${fileCount !== 1 ? 's' : ''})`) : chalk.red('  missing');
    console.log(`${icon}  ${folderLabel}${filesLabel}`);
  }

  console.log('');

  const bar = buildBar(compliance);
  const color = compliance === 100 ? chalk.bold.green : compliance >= 70 ? chalk.bold.yellow : chalk.bold.red;
  console.log(`  ${chalk.gray('compliance')}  ${color(`${compliance}%`)}  ${bar}  ${chalk.gray(`(${presentCount}/${total} folders)`)}`);
  console.log('');

  if (compliance < 100) {
    const missing = results.filter(r => !r.exists).map(r => r.folder);
    console.log(chalk.yellow(`  Missing folders: ${missing.join(', ')}`));
    console.log(chalk.gray('  Run "rchitect init" to recreate missing folders.\n'));
  } else {
    console.log(chalk.bold.green('  All expected folders are present.\n'));
  }
}

function buildBar(pct) {
  const total = 20;
  const filled = Math.round((pct / 100) * total);
  const empty = total - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

module.exports = statsCommand;
