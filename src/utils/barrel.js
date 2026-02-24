const fs = require('fs-extra');
const path = require('path');

/**
 * Appends a named export to the parent directory's barrel index file.
 * Creates the barrel if it doesn't exist yet.
 *
 * @param {string} parentDir  - Absolute path to the parent directory (e.g. src/components/atoms)
 * @param {string} resourceName - The exported name (e.g. 'Button')
 * @param {string} scriptExt  - 'ts' or 'js'
 * @param {string} cwd        - Project root for relative path display
 * @returns {{ action: 'created'|'updated'|'skipped', path: string }}
 */
async function updateBarrel(parentDir, resourceName, scriptExt, cwd) {
  const barrelPath = path.join(parentDir, `index.${scriptExt}`);
  const exportLine = `export { default as ${resourceName} } from './${resourceName}';\n`;

  if (await fs.pathExists(barrelPath)) {
    const existing = await fs.readFile(barrelPath, 'utf-8');
    if (existing.includes(`from './${resourceName}'`)) {
      return { action: 'skipped', path: path.relative(cwd, barrelPath) };
    }
    await fs.appendFile(barrelPath, exportLine);
    return { action: 'updated', path: path.relative(cwd, barrelPath) };
  }

  await fs.writeFile(barrelPath, exportLine);
  return { action: 'created', path: path.relative(cwd, barrelPath) };
}

module.exports = { updateBarrel };
