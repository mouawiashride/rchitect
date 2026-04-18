const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { findConfig } = require('../utils/findConfig');

/**
 * Parse named exports from a barrel index file.
 * Handles: export { X } from './X';
 *          export { default as X } from './X';
 *          export * from './X';
 */
function parseBarrelExports(content) {
  const exports = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^export\s+(?:\{[^}]+\}|\*)\s+from\s+['"]([^'"]+)['"]/);
    if (match) {
      exports.push({ line: line.trim(), source: match[1] });
    }
  }
  return exports;
}

/**
 * Resolve a relative import path from a barrel file.
 * source is like './Button' — resolves relative to barrelDir.
 */
function resolveSource(barrelDir, source) {
  return path.resolve(barrelDir, source);
}

/**
 * Check if a barrel export target exists on disk.
 * The source could be a directory (with index.ts/js) or a file.
 */
async function sourceExists(barrelDir, source) {
  const resolved = resolveSource(barrelDir, source);

  // Direct file check (with common extensions)
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.astro'];
  for (const ext of exts) {
    if (await fs.pathExists(resolved + ext)) return true;
  }

  // Directory with index file
  if (await fs.pathExists(resolved)) {
    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) {
      for (const idx of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
        if (await fs.pathExists(path.join(resolved, idx))) return true;
      }
    }
  }

  return false;
}

async function findBarrelFiles(dir) {
  const barrels = [];
  if (!(await fs.pathExists(dir))) return barrels;

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && /^index\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      barrels.push(path.join(dir, entry.name));
    }
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      const sub = await findBarrelFiles(path.join(dir, entry.name));
      barrels.push(...sub);
    }
  }
  return barrels;
}

async function barrelFixCommand(options) {
  const cwd = process.cwd();
  const dryRun = options && options.dryRun;

  const result = await findConfig(cwd);
  if (!result) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }

  const { configDir } = result;
  const srcDir = path.join(configDir, 'src');
  const searchDir = await fs.pathExists(srcDir) ? srcDir : configDir;

  console.log(chalk.bold.cyan('\n  Rchitect barrel-fix — scanning for stale exports\n'));

  const barrels = await findBarrelFiles(searchDir);

  if (!barrels.length) {
    console.log(chalk.gray('  No barrel index files found.\n'));
    return;
  }

  let totalStale = 0;
  let totalFixed = 0;

  for (const barrelPath of barrels) {
    const content = await fs.readFile(barrelPath, 'utf8');
    const exports = parseBarrelExports(content);
    if (!exports.length) continue;

    const barrelDir = path.dirname(barrelPath);
    const stale = [];

    for (const exp of exports) {
      const exists = await sourceExists(barrelDir, exp.source);
      if (!exists) {
        stale.push(exp);
      }
    }

    if (!stale.length) continue;

    totalStale += stale.length;
    const rel = path.relative(configDir, barrelPath);

    if (dryRun) {
      console.log(chalk.yellow(`  [dry-run] ${rel} — ${stale.length} stale export(s):`));
      for (const exp of stale) {
        console.log(chalk.gray(`    - ${exp.line}`));
      }
    } else {
      // Remove stale lines
      const staleLines = new Set(stale.map(e => e.line));
      const newLines = content.split('\n').filter(line => !staleLines.has(line.trim()));
      // Remove trailing blank lines from removed exports
      await fs.writeFile(barrelPath, newLines.join('\n'));
      totalFixed += stale.length;
      console.log(chalk.blue(`  fixed `) + chalk.gray(`${rel}`) + chalk.red(` (-${stale.length})`));
      for (const exp of stale) {
        console.log(chalk.gray(`    removed: ${exp.line}`));
      }
    }
    console.log('');
  }

  if (totalStale === 0) {
    console.log(chalk.bold.green('  All barrel exports are valid — nothing to fix.\n'));
  } else if (dryRun) {
    console.log(chalk.yellow(`  [dry-run] Found ${totalStale} stale export(s). Run without --dry-run to fix.\n`));
  } else {
    console.log(chalk.bold.green(`  Fixed ${totalFixed} stale export(s) across ${barrels.length} barrel file(s).\n`));
  }
}

module.exports = barrelFixCommand;
