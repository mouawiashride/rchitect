import * as path from 'path';
import * as fs from 'fs-extra';
import { detectFramework } from '../src/utils/detect';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

describe('detectFramework', () => {
  const testDir: string = path.join(__dirname, '.tmp-detect');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  async function writePkg(pkg: PackageJson): Promise<void> {
    await fs.writeJson(path.join(testDir, 'package.json'), pkg);
  }

  it('detects Next.js from dependencies', async () => {
    await writePkg({ dependencies: { next: '14.0.0', react: '18.0.0' } });
    expect(await detectFramework(testDir)).toBe('nextjs');
  });

  it('detects React when next is not present', async () => {
    await writePkg({ dependencies: { react: '18.0.0' } });
    expect(await detectFramework(testDir)).toBe('react');
  });

  it('detects Next.js from devDependencies', async () => {
    await writePkg({ devDependencies: { next: '14.0.0' } });
    expect(await detectFramework(testDir)).toBe('nextjs');
  });

  it('returns null when no package.json exists', async () => {
    expect(await detectFramework(testDir)).toBeNull();
  });

  it('returns null when neither react nor next is a dependency', async () => {
    await writePkg({ dependencies: { express: '4.0.0' } });
    expect(await detectFramework(testDir)).toBeNull();
  });

  it('returns null when package.json has no dependencies', async () => {
    await writePkg({ name: 'test' });
    expect(await detectFramework(testDir)).toBeNull();
  });

  it('prioritizes Next.js over React when both are present', async () => {
    await writePkg({ dependencies: { react: '18.0.0', next: '14.0.0' } });
    expect(await detectFramework(testDir)).toBe('nextjs');
  });
});
