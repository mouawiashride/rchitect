const fs = require('fs-extra');
const path = require('path');

async function detectFramework(cwd) {
  const pkgPath = path.join(cwd, 'package.json');

  if (!(await fs.pathExists(pkgPath))) {
    return null;
  }

  const pkg = await fs.readJson(pkgPath);
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  if (allDeps['next']) return 'nextjs';
  if (allDeps['nuxt']) return 'nuxt';
  if (allDeps['@remix-run/react'] || allDeps['@remix-run/node']) return 'remix';
  if (allDeps['@angular/core']) return 'angular';
  if (allDeps['astro']) return 'astro';
  if (allDeps['expo'] || allDeps['expo-router']) return 'expo';
  if (allDeps['@builder.io/qwik'] || allDeps['@builder.io/qwik-city']) return 'qwik';
  if (allDeps['@sveltejs/kit']) return 'sveltekit';
  if (allDeps['react']) return 'react';
  if (allDeps['vue']) return 'vue';
  if (allDeps['svelte']) return 'svelte';
  if (allDeps['solid-js']) return 'solidjs';

  return null;
}

module.exports = { detectFramework };
