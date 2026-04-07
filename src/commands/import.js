const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');

const PATTERNS = ['atomic-design', 'feature-based', 'domain-driven', 'mvc-like'];

function detectFramework(pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps.next) return 'nextjs';
  if (deps.react) return 'react';
  if (deps.vue) return 'vue';
  if (deps.svelte || deps['@sveltejs/kit']) return 'svelte';
  if (deps['solid-js']) return 'solidjs';
  return null;
}

function detectLanguage(cwd) {
  return fs.pathExistsSync(path.join(cwd, 'tsconfig.json')) ? 'typescript' : 'javascript';
}

function detectStyling(pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps.tailwindcss) return 'tailwind';
  if (deps.sass || deps['node-sass'] || deps['sass-loader']) return 'scss';
  return 'css';
}

function detectTesting(pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps.vitest) return 'vitest';
  return 'jest';
}

async function detectWithTests(cwd) {
  // Check for any .test.ts / .test.tsx / .spec.ts files in src/ or root
  const searchDirs = ['src', '.'];
  for (const dir of searchDirs) {
    const fullDir = path.join(cwd, dir);
    if (!await fs.pathExists(fullDir)) continue;
    try {
      const entries = await fs.readdir(fullDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          return true;
        }
      }
    } catch { /* ignore */ }
  }
  return false;
}

function detectPattern(cwd) {
  const check = (...segments) => fs.pathExistsSync(path.join(cwd, ...segments));

  // Atomic Design — has atoms directory
  if (check('src', 'components', 'atoms') || check('components', 'atoms')) {
    return 'atomic-design';
  }
  // Domain-Driven — has domains directory
  if (check('src', 'domains') || check('domains')) {
    return 'domain-driven';
  }
  // MVC-like — has models AND (views or controllers)
  const hasMvc =
    (check('src', 'models') || check('models')) &&
    (check('src', 'views') || check('views') || check('src', 'controllers') || check('controllers'));
  if (hasMvc) return 'mvc-like';
  // Feature-Based — has features directory or components/shared
  if (check('src', 'features') || check('features') || check('src', 'components', 'shared') || check('components', 'shared')) {
    return 'feature-based';
  }
  return 'feature-based'; // sensible default
}

function detectUseClient(cwd) {
  // Heuristic: if any component file has 'use client' it was intentional
  // For simplicity, default to false
  return false;
}

async function importCommand() {
  const cwd = process.cwd();

  console.log(chalk.bold.cyan('\n  Rchitect import — detect & import project config\n'));

  // 1. Require package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (!(await fs.pathExists(pkgPath))) {
    console.log(chalk.red('  Error: No package.json found. Run this inside a React or Next.js project.\n'));
    process.exit(1);
  }

  const pkg = await fs.readJson(pkgPath);

  // 2. Detect everything
  const framework = detectFramework(pkg);
  if (!framework) {
    console.log(chalk.red('  Error: Could not detect a supported framework (React, Next.js, Vue, Svelte, SolidJS) in package.json.\n'));
    process.exit(1);
  }

  const language = detectLanguage(cwd);
  const styling = detectStyling(pkg);
  const testing = detectTesting(pkg);
  const withTests = await detectWithTests(cwd);
  const pattern = detectPattern(cwd);
  const useClient = detectUseClient(cwd);

  // 3. Display what was detected
  console.log(chalk.bold('  Detected configuration:\n'));
  const frameworkLabels = { react: 'React', nextjs: 'Next.js', vue: 'Vue 3', svelte: 'Svelte', solidjs: 'SolidJS' };
  console.log(`  ${chalk.gray('framework')}   ${chalk.cyan(frameworkLabels[framework] || framework)}`);
  console.log(`  ${chalk.gray('pattern')}     ${chalk.cyan(pattern)}`);
  console.log(`  ${chalk.gray('language')}    ${chalk.cyan(language)}`);
  console.log(`  ${chalk.gray('styling')}     ${chalk.cyan(styling)}`);
  console.log(`  ${chalk.gray('withTests')}   ${chalk.cyan(String(withTests))}`);
  console.log(`  ${chalk.gray('testing')}     ${chalk.cyan(testing)}`);
  if (framework === 'nextjs') {
    console.log(`  ${chalk.gray('useClient')}   ${chalk.cyan(String(useClient))}`);
  }
  console.log('');

  // 4. Check if config already exists
  const configPath = path.join(cwd, '.rchitect.json');
  if (await fs.pathExists(configPath)) {
    const existing = await fs.readJson(configPath);
    console.log(chalk.yellow('  Warning: .rchitect.json already exists:'));
    console.log(chalk.gray(`    pattern: ${existing.pattern}, framework: ${existing.framework}\n`));
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'Overwrite existing .rchitect.json?',
      default: false,
    }]);
    if (!overwrite) {
      console.log(chalk.yellow('\n  Aborted.\n'));
      return;
    }
  } else {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Write this configuration to .rchitect.json?',
      default: true,
    }]);
    if (!confirm) {
      console.log(chalk.yellow('\n  Aborted.\n'));
      return;
    }
  }

  // 5. Write config
  const config = { framework, pattern, language, styling, withTests, useClient, testing };
  await fs.writeJson(configPath, config, { spaces: 2 });

  console.log(chalk.bold.green('\n  .rchitect.json created! Run "rchitect doctor" to verify.\n'));
}

module.exports = importCommand;
// Export helpers for testing
module.exports.detectFramework = detectFramework;
module.exports.detectLanguage = detectLanguage;
module.exports.detectStyling = detectStyling;
module.exports.detectTesting = detectTesting;
module.exports.detectPattern = detectPattern;
module.exports.detectWithTests = detectWithTests;
