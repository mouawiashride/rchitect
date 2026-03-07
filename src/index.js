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

program
  .name('rchitect')
  .description('Scaffold React & Next.js projects with architecture patterns')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize a new project structure')
  .option('--dry-run', 'Preview the structure without creating files')
  .action((options) => initCommand(options));

program
  .command('add')
  .description('Add a resource to the project')
  .argument('<type>', 'Type of resource (component, hook, page, service, context, store, type, api, feature)')
  .argument('<name>', 'Name of the resource (PascalCase)')
  .action(addCommand);

program
  .command('list')
  .description('Show current project configuration')
  .action(listCommand);

program
  .command('config')
  .description('Update a project config setting')
  .argument('<action>', 'Action to perform (set)')
  .argument('<key>', 'Config key to update (language, styling, withTests, useClient, pattern)')
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

program.parse();
