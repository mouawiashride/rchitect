const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');

const VALID_FRAMEWORKS = ['react', 'nextjs'];
const VALID_PATTERNS = ['atomic-design', 'feature-based', 'domain-driven', 'mvc-like'];
const VALID_LANGUAGES = ['typescript', 'javascript'];
const VALID_STYLINGS = ['css', 'scss'];

async function doctorCommand() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.rchitect.json');

  console.log(chalk.bold.cyan('\n  Rchitect Doctor\n'));

  let hasErrors = false;

  // 1. Check config file exists
  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('  ✗ .rchitect.json not found — run "rchitect init" first\n'));
    process.exit(1);
  }
  console.log(chalk.green('  ✓ .rchitect.json found'));

  // 2. Parse and validate the config
  let config;
  try {
    config = await fs.readJson(configPath);
  } catch {
    console.log(chalk.red('  ✗ .rchitect.json is not valid JSON\n'));
    process.exit(1);
  }

  const checks = [
    { key: 'framework', valid: VALID_FRAMEWORKS },
    { key: 'pattern', valid: VALID_PATTERNS },
    { key: 'language', valid: VALID_LANGUAGES },
    { key: 'styling', valid: VALID_STYLINGS },
  ];

  for (const { key, valid } of checks) {
    if (!config[key] || !valid.includes(config[key])) {
      console.log(chalk.red(`  ✗ Invalid "${key}": ${JSON.stringify(config[key])} — expected one of: ${valid.join(', ')}`));
      hasErrors = true;
    } else {
      console.log(chalk.green(`  ✓ ${key}: ${config[key]}`));
    }
  }

  if (typeof config.withTests !== 'boolean') {
    console.log(chalk.red('  ✗ "withTests" must be a boolean'));
    hasErrors = true;
  } else {
    console.log(chalk.green(`  ✓ withTests: ${config.withTests}`));
  }

  if (hasErrors) {
    console.log(chalk.red('\n  Config has errors. Fix them before continuing.\n'));
    process.exit(1);
  }

  // 3. Check expected folders
  const structures = config.framework === 'react' ? reactStructures : nextjsStructures;
  const structure = structures[config.pattern];

  console.log(chalk.gray('\n  Checking project structure...\n'));

  let missingCount = 0;
  for (const folder of structure.folders) {
    const fullPath = path.join(cwd, folder);
    const exists = await fs.pathExists(fullPath);
    if (exists) {
      console.log(chalk.green('  ✓ ') + chalk.gray(folder));
    } else {
      console.log(chalk.yellow('  ⚠ missing: ') + chalk.white(folder));
      missingCount++;
    }
  }

  // 4. Summary
  if (missingCount === 0) {
    console.log(chalk.bold.green('\n  All good! Project structure matches the config.\n'));
  } else {
    console.log(chalk.yellow(`\n  ${missingCount} folder(s) missing.`));
    console.log(chalk.gray('  Run "rchitect init" to create missing folders.\n'));
  }
}

module.exports = doctorCommand;
