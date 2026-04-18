const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { findConfig } = require('../utils/findConfig');

function classifyByPath(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (/\/components\//.test(p)) return 'component';
  if (/\/hooks\//.test(p) || /\/composables\//.test(p)) return 'hook / composable';
  if (/\/services\//.test(p)) return 'service';
  if (/\/stores?\//.test(p)) return 'store';
  if (/\/contexts?\//.test(p)) return 'context / provider';
  if (/\/features\//.test(p)) return 'feature module';
  if (/\/schemas?\//.test(p)) return 'schema (validation + types)';
  if (/\/queries?\//.test(p) || /useQuery|useMutation/.test(p)) return 'data fetching hook (TanStack Query)';
  if (/\/guards?\//.test(p)) return 'route guard';
  if (/\/routes?\//.test(p) || /\/app\//.test(p)) return 'route / page';
  if (/\/locales?\//.test(p) || /i18n/i.test(p)) return 'i18n locale file';
  if (/\/types?\//.test(p)) return 'shared types';
  if (/\/utils?\//.test(p) || /\/lib\//.test(p)) return 'utility / helper';
  if (/\/api\//.test(p)) return 'API route handler';
  if (/\/layouts?\//.test(p)) return 'layout';
  if (/\/middleware\//.test(p)) return 'middleware';
  if (/\/actions\//.test(p)) return 'server action';
  return 'uncategorized';
}

function architectureContext(pattern) {
  switch (pattern) {
    case 'atomic-design':
      return 'Atomic Design: atoms → molecules → organisms → templates → pages. Smaller pieces compose into larger ones.';
    case 'feature-based':
      return 'Feature-based: resources are grouped by business capability under features/ — each self-contained.';
    case 'domain-driven':
      return 'Domain-driven: code is organized by bounded domains with their own ubiquitous language.';
    case 'mvc-like':
      return 'MVC-like: clear split between Views, Controllers, and Models.';
    default:
      return `Pattern: ${pattern}`;
  }
}

async function explainCommand(target) {
  const cwd = process.cwd();
  const result = await findConfig(cwd);
  if (!result) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }
  const { config, configDir } = result;

  if (!target) {
    console.log(chalk.red('\n  Error: Please provide a file or directory path.\n'));
    console.log(chalk.gray('  Usage: rchitect explain <path>\n'));
    process.exit(1);
  }

  const abs = path.isAbsolute(target) ? target : path.resolve(cwd, target);
  if (!(await fs.pathExists(abs))) {
    console.log(chalk.red(`\n  Error: "${target}" does not exist.\n`));
    process.exit(1);
  }

  const rel = path.relative(configDir, abs) || path.basename(abs);
  const stat = await fs.stat(abs);
  const kind = stat.isDirectory() ? 'directory' : 'file';
  const category = classifyByPath(rel);

  console.log(chalk.bold(`\n  ${rel}`));
  console.log(chalk.gray(`  ${kind} — ${category}\n`));
  console.log(chalk.gray('  Framework: ') + chalk.cyan(config.framework));
  console.log(chalk.gray('  Pattern:   ') + chalk.cyan(config.pattern));
  console.log(chalk.gray('  ') + architectureContext(config.pattern));

  if (stat.isDirectory()) {
    const entries = await fs.readdir(abs);
    const previews = entries.slice(0, 8);
    console.log(chalk.gray('\n  Contains:'));
    for (const entry of previews) {
      console.log(chalk.gray('    • ') + entry);
    }
    if (entries.length > 8) console.log(chalk.gray(`    ... and ${entries.length - 8} more`));
  } else {
    const content = await fs.readFile(abs, 'utf8');
    const firstLines = content.split('\n').slice(0, 5).join('\n');
    console.log(chalk.gray('\n  Preview:'));
    console.log(firstLines.split('\n').map(l => chalk.gray('    ') + l).join('\n'));
  }
  console.log('');
}

module.exports = explainCommand;
