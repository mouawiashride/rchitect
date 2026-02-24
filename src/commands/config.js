const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

const VALID_KEYS = ['language', 'styling', 'withTests', 'useClient', 'pattern'];

const VALID_VALUES = {
  language: ['typescript', 'javascript'],
  styling: ['css', 'scss'],
  withTests: ['true', 'false'],
  useClient: ['true', 'false'],
  pattern: ['atomic-design', 'feature-based', 'domain-driven', 'mvc-like'],
};

function parseValue(key, raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

async function configCommand(action, key, value) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.rchitect.json');

  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }

  if (action !== 'set') {
    console.log(chalk.red(`\n  Error: Unknown action "${action}". Supported actions: set\n`));
    process.exit(1);
  }

  if (!VALID_KEYS.includes(key)) {
    console.log(chalk.red(`\n  Error: Unknown config key "${key}".`));
    console.log(chalk.gray(`  Valid keys: ${VALID_KEYS.join(', ')}\n`));
    process.exit(1);
  }

  const allowed = VALID_VALUES[key];
  if (!allowed.includes(value)) {
    console.log(chalk.red(`\n  Error: Invalid value "${value}" for "${key}".`));
    console.log(chalk.gray(`  Valid values: ${allowed.join(', ')}\n`));
    process.exit(1);
  }

  const config = await fs.readJson(configPath);
  const parsed = parseValue(key, value);
  config[key] = parsed;

  await fs.writeJson(configPath, config, { spaces: 2 });

  console.log(
    chalk.green('\n  Updated ') +
    chalk.white(key) +
    chalk.gray(' → ') +
    chalk.cyan(String(parsed)) + '\n'
  );
}

module.exports = configCommand;
