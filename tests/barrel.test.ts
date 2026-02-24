import * as path from 'path';
import * as fs from 'fs-extra';
import type { BarrelUpdateResult } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { updateBarrel }: { updateBarrel: (parentDir: string, resourceName: string, scriptExt: string, cwd: string) => Promise<BarrelUpdateResult> } = require('../src/utils/barrel');

describe('updateBarrel', () => {
  const testDir: string = path.join(__dirname, '.tmp-barrel');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('creates a new barrel file when one does not exist', async () => {
    const result = await updateBarrel(testDir, 'Button', 'ts', testDir);

    expect(result.action).toBe('created');
    const barrelPath = path.join(testDir, 'index.ts');
    expect(await fs.pathExists(barrelPath)).toBe(true);
    const content = await fs.readFile(barrelPath, 'utf-8');
    expect(content).toContain("export { default as Button } from './Button';");
  });

  it('updates an existing barrel file when resource is not yet exported', async () => {
    const barrelPath = path.join(testDir, 'index.ts');
    await fs.writeFile(barrelPath, "export { default as Card } from './Card';\n");

    const result = await updateBarrel(testDir, 'Button', 'ts', testDir);

    expect(result.action).toBe('updated');
    const content = await fs.readFile(barrelPath, 'utf-8');
    expect(content).toContain("export { default as Card } from './Card';");
    expect(content).toContain("export { default as Button } from './Button';");
  });

  it('skips the barrel when the resource is already exported', async () => {
    const barrelPath = path.join(testDir, 'index.ts');
    await fs.writeFile(barrelPath, "export { default as Button } from './Button';\n");

    const result = await updateBarrel(testDir, 'Button', 'ts', testDir);

    expect(result.action).toBe('skipped');
    const content = await fs.readFile(barrelPath, 'utf-8');
    // Should not have a duplicate entry
    const matches = content.match(/from '.\/Button'/g);
    expect(matches).toHaveLength(1);
  });

  it('uses the correct extension for JavaScript projects', async () => {
    const result = await updateBarrel(testDir, 'Modal', 'js', testDir);

    expect(result.action).toBe('created');
    const barrelPath = path.join(testDir, 'index.js');
    expect(await fs.pathExists(barrelPath)).toBe(true);
    const content = await fs.readFile(barrelPath, 'utf-8');
    expect(content).toContain("export { default as Modal } from './Modal';");
  });

  it('returns a relative path in the result', async () => {
    const cwd = path.dirname(testDir);
    const result = await updateBarrel(testDir, 'Icon', 'ts', cwd);

    expect(result.path).not.toContain(cwd);
    expect(result.path).toBe(path.relative(cwd, path.join(testDir, 'index.ts')));
  });

  it('creates barrel with the correct export line format', async () => {
    await updateBarrel(testDir, 'MyComponent', 'ts', testDir);

    const content = await fs.readFile(path.join(testDir, 'index.ts'), 'utf-8');
    expect(content.trim()).toBe("export { default as MyComponent } from './MyComponent';");
  });
});
