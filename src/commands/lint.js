const chalk = require('chalk');
const doctorCommand = require('./doctor');
const auditCommand = require('./audit');
const barrelFixCommand = require('./barrelFix');

async function lintCommand(cmd) {
  const opts = cmd && typeof cmd.opts === 'function' ? cmd.opts() : (cmd || {});
  const fix = !!opts.fix;
  let hadIssues = false;

  console.log(chalk.bold('\n▸ Doctor'));
  try { await doctorCommand(); } catch (e) { hadIssues = true; }

  console.log(chalk.bold('\n▸ Audit'));
  try { await auditCommand(); } catch (e) { hadIssues = true; }

  console.log(chalk.bold('\n▸ Barrel fix' + (fix ? '' : ' (dry-run)')));
  try {
    await barrelFixCommand({ opts: () => ({ dryRun: !fix }) });
  } catch (e) { hadIssues = true; }

  if (!hadIssues) {
    console.log(chalk.bold.green('\n  ✓ No issues found.\n'));
  } else {
    console.log(chalk.bold.yellow(`\n  Run "rchitect lint --fix" to auto-fix issues.\n`));
  }
}

module.exports = lintCommand;
