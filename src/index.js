#!/usr/bin/env node

const { program } = require('commander');
const pkg = require('../package.json');
const initCommand = require('./commands/init');
const addCommand = require('./commands/add');
const listCommand = require('./commands/list');
const configCommand = require('./commands/config');
const removeCommand = require('./commands/remove');
const renameCommand = require('./commands/rename');
const doctorCommand = require('./commands/doctor');
const auditCommand = require('./commands/audit');
const scaffoldCommand = require('./commands/scaffold');
const syncCommand = require('./commands/sync');
const migrateCommand = require('./commands/migrate');
const ejectCommand = require('./commands/eject');
const importCommand = require('./commands/import');
const statsCommand = require('./commands/stats');
const checkDepsCommand = require('./commands/checkDeps');
const envCommand = require('./commands/env');
const barrelFixCommand = require('./commands/barrelFix');
const lintCommand = require('./commands/lint');
const explainCommand = require('./commands/explain');

program
  .name('rchitect')
  .description('Scaffold React, Next.js, Vue, Nuxt, Svelte, SolidJS, Remix, Angular, and Astro projects with architecture patterns')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize a new project structure')
  .option('--dry-run', 'Preview the structure without creating files')
  .action((options) => initCommand(options));

program
  .command('add')
  .description('Add a resource to the project')
  .argument('<type>', 'Type of resource (component, hook, composable, page, service, context, store, type, api, feature, form, modal, provider, route, guard, schema, query, mutation, i18n, layout, loading, error, not-found, middleware, server-action)')
  .argument('[name]', 'Name of the resource (PascalCase), or route segment for App Router types')
  .option('--story', 'Also generate a Storybook story file (component only)')
  .option('--dry-run', 'Preview files that would be created without writing')
  .option('--force', 'Overwrite existing resource without prompting')
  .action(addCommand);

program
  .command('list')
  .description('Show current project configuration')
  .option('--tree', 'Show expected folder structure as a directory tree')
  .action(listCommand);

program
  .command('config')
  .description('Update a project config setting')
  .argument('<action>', 'Action to perform (set)')
  .argument('<key>', 'Config key to update (language, styling, withTests, useClient, pattern, testing)')
  .argument('<value>', 'New value for the key')
  .action(configCommand);

program
  .command('remove')
  .description('Remove a resource from the project')
  .argument('<type>', 'Type of resource (component, hook, page, service, context, store, feature)')
  .argument('<name>', 'Name of the resource (PascalCase)')
  .action(removeCommand);

program
  .command('rename')
  .description('Rename a resource and update all its files and barrel exports')
  .argument('<type>', 'Type of resource (component, hook, page, service, context, store, feature)')
  .argument('<oldName>', 'Current name of the resource (PascalCase)')
  .argument('<newName>', 'New name for the resource (PascalCase)')
  .action(renameCommand);

program
  .command('doctor')
  .description('Check project health against the stored configuration')
  .action(doctorCommand);

program
  .command('audit')
  .description('Scan source directories for naming and barrel violations')
  .action(auditCommand);

program
  .command('scaffold')
  .description('Batch-create resources from a JSON manifest file')
  .argument('<manifest>', 'Path to JSON manifest file')
  .action(scaffoldCommand);

program
  .command('sync')
  .description('Rescan resource directories and add missing barrel exports')
  .action(syncCommand);

program
  .command('migrate')
  .description('Move resource directories to a new architecture pattern layout')
  .argument('<newPattern>', 'Target pattern (atomic-design, feature-based, domain-driven, mvc-like)')
  .option('--apply', 'Execute the migration (default is dry-run)')
  .action(migrateCommand);

program
  .command('eject')
  .description('Copy built-in templates to .rchitect/templates.js for customization')
  .action(ejectCommand);

program
  .command('import')
  .description('Detect an existing project\'s structure and generate .rchitect.json')
  .action(importCommand);

program
  .command('stats')
  .description('Show architecture compliance — which expected folders are present')
  .option('--json', 'Output results as JSON (useful for CI/GitHub Action)')
  .action(statsCommand);

program
  .command('check-deps')
  .description('Verify required npm packages are installed for your framework and config')
  .action(checkDepsCommand);

program
  .command('env')
  .description('Generate a .env.example file with framework-appropriate variables')
  .option('--force', 'Overwrite existing .env.example')
  .action(envCommand);

program
  .command('barrel-fix')
  .description('Scan barrel index files and remove exports pointing to non-existent paths')
  .option('--dry-run', 'Preview stale exports without modifying files')
  .action(barrelFixCommand);

program
  .command('lint')
  .description('Run doctor + audit + barrel-fix together in one pass')
  .option('--fix', 'Auto-fix discovered issues (barrel, naming)')
  .action(lintCommand);

program
  .command('explain')
  .description('Explain a resource\'s role in the architecture')
  .argument('<path>', 'File or directory to explain')
  .action(explainCommand);

// No-args: show interactive TUI menu
if (process.argv.length === 2) {
  const inquirer = require('inquirer');
  const fs = require('fs-extra');
  const path = require('path');

  (async () => {
    const hasConfig = await fs.pathExists(path.join(process.cwd(), '.rchitect.json'));

    console.log('');
    console.log(require('chalk').bold.cyan('  Rchitect v' + pkg.version));
    console.log('');

    const choices = hasConfig
      ? [
          { name: 'Add a resource', value: 'add' },
          { name: 'Show project info', value: 'list' },
          { name: 'Stats & compliance', value: 'stats' },
          { name: 'Check dependencies', value: 'check-deps' },
          { name: 'Run doctor check', value: 'doctor' },
          { name: 'Generate .env.example', value: 'env' },
          { name: 'Fix barrel exports', value: 'barrel-fix' },
          new inquirer.Separator(),
          { name: 'Cancel', value: null },
        ]
      : [
          { name: 'Initialize project', value: 'init' },
          { name: 'Import existing project', value: 'import' },
          new inquirer.Separator(),
          { name: 'Cancel', value: null },
        ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices,
    }]);

    if (!action) {
      console.log('');
      return;
    }

    if (action === 'add') {
      const RESOURCE_TYPES = [
        'component', 'hook', 'composable', 'page', 'service', 'context', 'store',
        'type', 'feature', 'form', 'modal', 'provider', 'route',
        'guard', 'schema', 'query', 'mutation', 'i18n',
      ];
      const { type } = await inquirer.prompt([{
        type: 'list',
        name: 'type',
        message: 'Resource type:',
        choices: RESOURCE_TYPES,
      }]);
      const { name } = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: 'Resource name (PascalCase):',
        validate: v => v.trim().length > 0 || 'Name is required',
      }]);
      await addCommand(type, name.trim(), {});
    } else if (action === 'init') {
      await initCommand({});
    } else if (action === 'import') {
      await importCommand();
    } else if (action === 'list') {
      await listCommand({});
    } else if (action === 'stats') {
      await statsCommand({});
    } else if (action === 'check-deps') {
      await checkDepsCommand();
    } else if (action === 'doctor') {
      await doctorCommand();
    } else if (action === 'env') {
      await envCommand({});
    } else if (action === 'barrel-fix') {
      await barrelFixCommand({});
    }
  })();
} else {
  program.parse();
}
