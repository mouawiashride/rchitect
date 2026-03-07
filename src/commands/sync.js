const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const { getExtensions } = require('../utils/templates');
const { updateBarrel } = require('../utils/barrel');

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

function buildSyncDirs(config, structure, cwd) {
  const paths = [
    structure.hookPath(),
    structure.servicePath(),
    structure.contextPath(),
    structure.storePath(),
    structure.featurePath(),
    structure.pagePath(),
  ];

  if (config.pattern === 'atomic-design') {
    const levels = ['atom', 'molecule', 'organism', 'template', 'page'];
    for (const level of levels) {
      paths.push(structure.componentPath(undefined, level));
    }
  } else {
    paths.push(structure.componentPath());
  }

  // Deduplicate (e.g. feature-based: pagePath === featurePath)
  const seen = new Set();
  return paths
    .filter(p => { if (seen.has(p)) return false; seen.add(p); return true; })
    .map(p => ({ absDir: path.join(cwd, p), label: p }));
}

async function syncCommand() {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const structure = getStructure(config);
  const { scriptExt } = getExtensions(config);

  const dirs = buildSyncDirs(config, structure, cwd);

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const { absDir } of dirs) {
    if (!(await fs.pathExists(absDir))) continue;

    const entries = await fs.readdir(absDir);
    for (const entry of entries) {
      const entryPath = path.join(absDir, entry);
      const stat = await fs.stat(entryPath);
      if (!stat.isDirectory()) continue;

      const result = await updateBarrel(absDir, entry, scriptExt, cwd);
      if (result.action === 'skipped') {
        totalSkipped++;
      } else {
        totalAdded++;
        const icon = result.action === 'created' ? chalk.green('  created ') : chalk.blue('  updated ');
        console.log(icon + chalk.gray(result.path));
      }
    }
  }

  console.log(chalk.bold.green(`\n  Sync complete. ${totalAdded} export(s) added, ${totalSkipped} already up to date.\n`));
}

module.exports = syncCommand;
