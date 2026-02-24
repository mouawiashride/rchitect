const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

const PATTERN_LABELS = {
  'atomic-design': 'Atomic Design',
  'feature-based': 'Feature-Based',
  'domain-driven': 'Domain-Driven (DDD)',
  'mvc-like': 'MVC-like',
};

const FRAMEWORK_LABELS = {
  react: 'React',
  nextjs: 'Next.js',
};

async function listCommand() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.rchitect.json');

  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }

  const config = await fs.readJson(configPath);

  console.log(chalk.bold.cyan('\n  Rchitect - Project Info\n'));
  console.log(chalk.white('  Framework:  ') + chalk.green(FRAMEWORK_LABELS[config.framework] || config.framework));
  console.log(chalk.white('  Pattern:    ') + chalk.green(PATTERN_LABELS[config.pattern] || config.pattern));
  console.log(chalk.white('  Language:   ') + chalk.green(config.language || 'typescript'));
  console.log(chalk.white('  Styling:    ') + chalk.green((config.styling || 'css').toUpperCase() + ' Modules'));
  console.log(chalk.white('  Tests:      ') + chalk.green(config.withTests ? 'Yes' : 'No'));

  if (config.framework === 'nextjs') {
    console.log(chalk.white('  Use Client: ') + chalk.green(config.useClient ? 'Yes' : 'No'));
  }

  console.log('');
}

module.exports = listCommand;
