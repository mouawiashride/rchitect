const chalk = require('chalk');

const PASCAL_CASE_REGEX = /^[A-Z][a-zA-Z0-9]*$/;

function validateName(name, type) {
  if (!name || name.trim().length === 0) {
    console.log(chalk.red(`\n  Error: ${type} name cannot be empty.\n`));
    process.exit(1);
  }

  if (!PASCAL_CASE_REGEX.test(name)) {
    console.log(chalk.red(`\n  Error: "${name}" is not a valid ${type} name.`));
    console.log(chalk.gray('  Names must be PascalCase (start with uppercase, alphanumeric only).'));
    console.log(chalk.gray('  Examples: Button, UserProfile, DataTable\n'));
    process.exit(1);
  }

  return true;
}

function toCamelCase(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

module.exports = { validateName, toCamelCase };
