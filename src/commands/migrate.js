const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');

const KNOWN_PATTERNS = ['atomic-design', 'feature-based', 'domain-driven', 'mvc-like'];

// Path helpers that represent directory-based resources (skip typePath — single files)
const PATH_HELPERS = ['hookPath', 'servicePath', 'contextPath', 'storePath', 'featurePath', 'pagePath', 'componentPath'];

async function loadConfig(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }
  return fs.readJson(configPath);
}

function getStructures(config) {
  return config.framework === 'react' ? reactStructures : nextjsStructures;
}

function buildMigrationPlan(config, oldStructure, newStructure, cwd) {
  const plan = [];
  const seen = new Set();

  for (const helper of PATH_HELPERS) {
    if (typeof oldStructure[helper] !== 'function') continue;
    if (typeof newStructure[helper] !== 'function') continue;

    const oldRel = oldStructure[helper]();
    const newRel = newStructure[helper]();

    if (oldRel === newRel) continue;

    const key = `${oldRel}→${newRel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    plan.push({ oldRel, newRel, oldAbs: path.join(cwd, oldRel), newAbs: path.join(cwd, newRel) });
  }

  return plan;
}

async function migrateCommand(newPattern, options) {
  const apply = options && options.apply;
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  if (!KNOWN_PATTERNS.includes(newPattern)) {
    console.log(chalk.red(`\n  Error: Unknown pattern "${newPattern}".`));
    console.log(chalk.gray(`  Known patterns: ${KNOWN_PATTERNS.join(', ')}\n`));
    process.exit(1);
  }

  if (config.pattern === newPattern) {
    console.log(chalk.yellow(`\n  Already using "${newPattern}". Nothing to migrate.\n`));
    return;
  }

  if (config.pattern === 'atomic-design') {
    console.log(chalk.red('\n  Error: Cannot auto-migrate from atomic-design — component levels lose meaning.\n'));
    process.exit(1);
  }

  if (newPattern === 'atomic-design') {
    console.log(chalk.yellow('\n  Warning: Components will land in atoms/ — review levels manually after migration.\n'));
  }

  const structures = getStructures(config);
  const oldStructure = structures[config.pattern];
  const newStructure = structures[newPattern];

  const plan = buildMigrationPlan(config, oldStructure, newStructure, cwd);

  // Filter to only dirs that exist on disk
  const existing = [];
  for (const entry of plan) {
    if (await fs.pathExists(entry.oldAbs)) {
      existing.push(entry);
    }
  }

  if (existing.length === 0) {
    console.log(chalk.yellow('\n  No directories to migrate (none of the source paths exist on disk).\n'));
    if (!apply) {
      console.log(chalk.gray('  Run with --apply to update the config pattern.\n'));
    } else {
      await fs.writeJson(path.join(cwd, '.rchitect.json'), { ...config, pattern: newPattern }, { spaces: 2 });
      console.log(chalk.bold.green(`\n  Config updated: pattern → ${newPattern}\n`));
    }
    return;
  }

  // Print plan table
  console.log(chalk.bold(`\n  Migration plan: ${config.pattern} → ${newPattern}\n`));
  for (const { oldRel, newRel } of existing) {
    console.log(chalk.gray(`    ${oldRel}`) + chalk.cyan(' → ') + chalk.green(newRel));
  }

  if (!apply) {
    console.log(chalk.gray('\n  Dry-run mode. Run with --apply to execute.\n'));
    return;
  }

  // Execute moves
  console.log('');
  for (const { oldRel, newRel, oldAbs, newAbs } of existing) {
    await fs.move(oldAbs, newAbs);
    console.log(chalk.green('  moved ') + chalk.gray(`${oldRel} → ${newRel}`));
  }

  // Update config
  await fs.writeJson(path.join(cwd, '.rchitect.json'), { ...config, pattern: newPattern }, { spaces: 2 });
  console.log(chalk.bold.green(`\n  Migration complete! Pattern updated to "${newPattern}".\n`));
}

module.exports = migrateCommand;
