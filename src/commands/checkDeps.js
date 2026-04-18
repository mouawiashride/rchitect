const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { findConfig } = require('../utils/findConfig');

// Required packages per framework
const FRAMEWORK_DEPS = {
  react:   { required: ['react', 'react-dom'], optional: ['zustand', '@testing-library/react'] },
  nextjs:  { required: ['next', 'react', 'react-dom'], optional: ['@types/react', '@types/node'] },
  vue:     { required: ['vue'], optional: ['pinia', 'vue-router', '@vueuse/core'] },
  nuxt:    { required: ['nuxt'], optional: ['@pinia/nuxt', '@nuxtjs/tailwindcss'] },
  svelte:  { required: ['svelte'], optional: ['svelte-check', '@sveltejs/kit'] },
  solidjs: { required: ['solid-js'], optional: ['@solidjs/router'] },
  remix:   { required: ['@remix-run/react', '@remix-run/node'], optional: ['@remix-run/serve'] },
  angular: { required: ['@angular/core', '@angular/common', '@angular/compiler'], optional: ['@angular/router', '@angular/forms', '@ngrx/store'] },
  astro:   { required: ['astro'], optional: ['@astrojs/react', '@astrojs/vue', '@astrojs/tailwind'] },
};

// Required packages per styling choice
const STYLING_DEPS = {
  tailwind: { required: ['tailwindcss'], optional: ['autoprefixer', 'postcss'] },
  scss:     { required: ['sass'], optional: [] },
  css:      { required: [], optional: [] },
};

// Required packages per test runner
const TESTING_DEPS = {
  jest:    { required: ['jest'], optional: ['@testing-library/jest-dom', 'ts-jest'] },
  vitest:  { required: ['vitest'], optional: ['@vitest/coverage-v8'] },
};

async function checkDepsCommand() {
  const cwd = process.cwd();

  const result = await findConfig(cwd);
  if (!result) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }

  const { config, configDir } = result;
  const pkgPath = path.join(configDir, 'package.json');

  if (!(await fs.pathExists(pkgPath))) {
    console.log(chalk.red('\n  Error: package.json not found.\n'));
    process.exit(1);
  }

  const pkg = await fs.readJson(pkgPath);
  const installed = { ...pkg.dependencies, ...pkg.devDependencies };

  console.log(chalk.bold.cyan(`\n  Rchitect check-deps — ${config.framework} / ${config.pattern}\n`));

  const missing = [];
  const present = [];
  const optionalMissing = [];

  function checkDeps(deps, label) {
    if (!deps) return;
    for (const dep of (deps.required || [])) {
      if (installed[dep]) {
        present.push({ dep, label });
      } else {
        missing.push({ dep, label });
      }
    }
    for (const dep of (deps.optional || [])) {
      if (!installed[dep]) {
        optionalMissing.push({ dep, label });
      }
    }
  }

  checkDeps(FRAMEWORK_DEPS[config.framework], 'framework');
  checkDeps(STYLING_DEPS[config.styling], 'styling');
  if (config.withTests) {
    checkDeps(TESTING_DEPS[config.testing || 'jest'], 'testing');
  }

  // Report present
  if (present.length) {
    console.log(chalk.bold('  Required packages:\n'));
    for (const { dep } of present) {
      console.log(chalk.green('  ✓ ') + chalk.white(dep));
    }
    console.log('');
  }

  // Report missing
  if (missing.length) {
    console.log(chalk.bold.red('  Missing required packages:\n'));
    for (const { dep } of missing) {
      console.log(chalk.red('  ✗ ') + chalk.white(dep));
    }
    console.log('');
    const pm = await fs.pathExists(path.join(configDir, 'yarn.lock')) ? 'yarn add' :
               await fs.pathExists(path.join(configDir, 'pnpm-lock.yaml')) ? 'pnpm add' : 'npm install';
    console.log(chalk.yellow(`  Install missing packages with:`));
    console.log(chalk.cyan(`    ${pm} ${missing.map(m => m.dep).join(' ')}\n`));
  }

  // Report optional missing
  if (optionalMissing.length) {
    console.log(chalk.gray('  Optional packages not installed:'));
    for (const { dep } of optionalMissing) {
      console.log(chalk.gray(`  - ${dep}`));
    }
    console.log('');
  }

  if (!missing.length) {
    console.log(chalk.bold.green('  All required dependencies are installed!\n'));
  }
}

module.exports = checkDepsCommand;
