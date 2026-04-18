const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { findConfig } = require('../utils/findConfig');

// Framework-appropriate .env.example variables
const FRAMEWORK_ENV = {
  react: [
    '# React App',
    'REACT_APP_API_URL=https://api.example.com',
    'REACT_APP_APP_NAME=MyApp',
  ],
  nextjs: [
    '# Next.js',
    'NEXT_PUBLIC_API_URL=https://api.example.com',
    'NEXT_PUBLIC_APP_NAME=MyApp',
    '',
    '# Server-side only (not exposed to browser)',
    'DATABASE_URL=postgresql://localhost:5432/mydb',
    'NEXTAUTH_SECRET=your-secret-here',
    'NEXTAUTH_URL=http://localhost:3000',
  ],
  vue: [
    '# Vue 3 (Vite)',
    'VITE_API_URL=https://api.example.com',
    'VITE_APP_NAME=MyApp',
  ],
  nuxt: [
    '# Nuxt 3',
    'NUXT_PUBLIC_API_URL=https://api.example.com',
    'NUXT_PUBLIC_APP_NAME=MyApp',
    '',
    '# Server-side',
    'DATABASE_URL=postgresql://localhost:5432/mydb',
    'NUXT_SECRET=your-secret-here',
  ],
  svelte: [
    '# SvelteKit',
    'PUBLIC_API_URL=https://api.example.com',
    'PUBLIC_APP_NAME=MyApp',
    '',
    '# Server-side only',
    'DATABASE_URL=postgresql://localhost:5432/mydb',
    'SECRET_KEY=your-secret-here',
  ],
  solidjs: [
    '# SolidJS (Vite)',
    'VITE_API_URL=https://api.example.com',
    'VITE_APP_NAME=MyApp',
  ],
  remix: [
    '# Remix',
    'SESSION_SECRET=your-secret-here',
    'DATABASE_URL=postgresql://localhost:5432/mydb',
    '',
    '# Public vars (exposed via loader)',
    'APP_NAME=MyApp',
    'API_URL=https://api.example.com',
  ],
  angular: [
    '# Angular (environment files are used instead of .env)',
    '# This file documents secrets used in environments/',
    'API_URL=https://api.example.com',
    'APP_NAME=MyApp',
  ],
  astro: [
    '# Astro',
    'PUBLIC_API_URL=https://api.example.com',
    'PUBLIC_APP_NAME=MyApp',
    '',
    '# Server-side (SSR mode)',
    'DATABASE_URL=postgresql://localhost:5432/mydb',
    'SECRET_KEY=your-secret-here',
  ],
};

async function envCommand(options) {
  const cwd = process.cwd();
  const force = options && options.force;

  const result = await findConfig(cwd);
  if (!result) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }

  const { config, configDir } = result;
  const envPath = path.join(configDir, '.env.example');

  if (await fs.pathExists(envPath) && !force) {
    console.log(chalk.yellow('\n  .env.example already exists. Use --force to overwrite.\n'));
    return;
  }

  const lines = FRAMEWORK_ENV[config.framework] || FRAMEWORK_ENV.react;
  const content = lines.join('\n') + '\n';

  await fs.writeFile(envPath, content);
  console.log(chalk.green('\n  created ') + chalk.gray('.env.example'));
  console.log(chalk.bold.green('\n  .env.example created!\n'));
  console.log(chalk.gray('  Copy it to .env.local and fill in your values:'));
  console.log(chalk.cyan('    cp .env.example .env.local\n'));
}

module.exports = envCommand;
