const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

async function loadConfig(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }
  return fs.readJson(configPath);
}

async function ejectCommand() {
  const cwd = process.cwd();
  await loadConfig(cwd);

  const destDir = path.join(cwd, '.rchitect');
  const destFile = path.join(destDir, 'templates.js');

  if (await fs.pathExists(destFile)) {
    console.log(chalk.yellow('\n  Templates already ejected at .rchitect/templates.js\n'));
    console.log(chalk.gray('  Edit that file to customize your scaffolded output.\n'));
    return;
  }

  const srcFile = path.join(__dirname, '../utils/templates.js');
  await fs.ensureDir(destDir);

  // Copy templates.js and fix the relative require path so it resolves
  // correctly from .rchitect/ instead of src/utils/
  let content = await fs.readFile(srcFile, 'utf-8');
  const validateAbsPath = path.join(__dirname, '../utils/validate.js');
  content = content.replace(
    `require('./validate')`,
    `require(${JSON.stringify(validateAbsPath)})`,
  );
  await fs.writeFile(destFile, content);

  console.log(chalk.green('  created  ') + chalk.gray('.rchitect/templates.js'));
  console.log(chalk.bold.green('\n  Templates ejected successfully!\n'));
  console.log(chalk.gray('  Edit .rchitect/templates.js to customize your generated files.'));
  console.log(chalk.gray('  Rchitect will use your custom templates automatically.\n'));
}

module.exports = ejectCommand;
