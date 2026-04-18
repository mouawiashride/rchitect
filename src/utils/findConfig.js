const fs = require('fs-extra');
const path = require('path');

/**
 * Walk up the directory tree from `startDir` to find the nearest `.rchitect.json`.
 * Useful for monorepo setups where the config lives in a parent workspace.
 *
 * @param {string} startDir - directory to start searching from (usually process.cwd())
 * @returns {Promise<{ config: object, configDir: string } | null>}
 */
async function findConfig(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const configPath = path.join(dir, '.rchitect.json');
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      return { config, configDir: dir };
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) break;
    dir = parent;
  }

  return null;
}

module.exports = { findConfig };
