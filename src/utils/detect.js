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
  if (allDeps['react']) return 'react';
  if (allDeps['vue']) return 'vue';
  if (allDeps['svelte'] || allDeps['@sveltejs/kit']) return 'svelte';
  if (allDeps['solid-js']) return 'solidjs';

  return null;
}

module.exports = { detectFramework };
