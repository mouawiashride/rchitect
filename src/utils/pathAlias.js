const fs = require('fs-extra');
const path = require('path');

/**
 * Derives path aliases from the structure's folder list.
 * Groups nested paths under their top-level key.
 * e.g. ['src/components/atoms', 'src/components/molecules'] → '@/components/*'
 */
function buildAliases(folders, isNextjs) {
  const seen = new Set();
  const aliases = {};

  for (const folder of folders) {
    // Drop the leading 'src/' for React projects
    const normalized = isNextjs ? folder : folder.replace(/^src\//, '');
    // Take only the first path segment as the alias root
    const root = normalized.split('/')[0];

    if (!seen.has(root)) {
      seen.add(root);
      const fullPath = isNextjs ? `./${root}` : `./src/${root}`;
      aliases[`@/${root}/*`] = [`${fullPath}/*`];
    }
  }

  return aliases;
}

/**
 * Writes (or merges) path aliases into the project's tsconfig.json.
 * Only runs for TypeScript projects.
 *
 * @param {string} cwd
 * @param {{ language: string, framework: string }} config
 * @param {{ folders: string[] }} structure
 * @returns {Promise<Record<string, string[]>|null>} aliases written, or null if skipped
 */
async function generatePathAliases(cwd, config, structure) {
  if (config.language !== 'typescript') return null;

  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  const isNextjs = config.framework === 'nextjs';

  const newAliases = buildAliases(structure.folders, isNextjs);

  let tsconfig = {};
  if (await fs.pathExists(tsconfigPath)) {
    tsconfig = await fs.readJson(tsconfigPath);
  }

  if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {};
  tsconfig.compilerOptions.baseUrl = '.';
  tsconfig.compilerOptions.paths = {
    ...newAliases,
    ...(tsconfig.compilerOptions.paths || {}),
  };

  await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
  return newAliases;
}

module.exports = { generatePathAliases, buildAliases };
