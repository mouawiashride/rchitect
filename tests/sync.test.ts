import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const syncCommand: () => Promise<void> = require('../src/commands/sync');

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('sync command', () => {
  const testDir: string = path.join(__dirname, '.tmp-sync');
  let mockExit: jest.SpyInstance;
  let mockLog: jest.SpyInstance;
  let originalCwd: () => string;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    originalCwd = process.cwd;
    process.cwd = (): string => testDir;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    mockExit.mockRestore();
    mockLog.mockRestore();
    jest.clearAllMocks();
    await fs.remove(testDir);
  });

  async function writeConfig(config: Partial<RchitectConfig> = {}): Promise<void> {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE_CONFIG, ...config });
  }

  it('exits with an error when .rchitect.json is missing', async () => {
    await expect(syncCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('completes without error when all resource dirs are missing', async () => {
    await writeConfig();
    await syncCommand();
    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('Sync complete');
    expect(output).toContain('0 export(s) added');
  });

  it('creates a new barrel for a subdir with no barrel', async () => {
    await writeConfig();
    const hookDir = path.join(testDir, 'src/hooks/useAuth');
    await fs.ensureDir(hookDir);

    await syncCommand();

    const barrel = path.join(testDir, 'src/hooks/index.ts');
    expect(await fs.pathExists(barrel)).toBe(true);
    const content = await fs.readFile(barrel, 'utf-8');
    expect(content).toContain("from './useAuth'");
  });

  it('updates an existing barrel that is missing an export', async () => {
    await writeConfig();
    const hooksDir = path.join(testDir, 'src/hooks');
    await fs.ensureDir(path.join(hooksDir, 'useAuth'));
    await fs.ensureDir(path.join(hooksDir, 'usePayment'));
    await fs.writeFile(path.join(hooksDir, 'index.ts'), "export { default as useAuth } from './useAuth';\n");

    await syncCommand();

    const content = await fs.readFile(path.join(hooksDir, 'index.ts'), 'utf-8');
    expect(content).toContain("from './useAuth'");
    expect(content).toContain("from './usePayment'");
  });

  it('skips a subdir already exported in the barrel', async () => {
    await writeConfig();
    const hooksDir = path.join(testDir, 'src/hooks');
    await fs.ensureDir(path.join(hooksDir, 'useAuth'));
    await fs.writeFile(path.join(hooksDir, 'index.ts'), "export { default as useAuth } from './useAuth';\n");

    await syncCommand();

    // Content should not be duplicated
    const content = await fs.readFile(path.join(hooksDir, 'index.ts'), 'utf-8');
    const matches = content.match(/from '\.\/useAuth'/g) || [];
    expect(matches.length).toBe(1);
  });

  it('syncs multiple subdirs across multiple parent dirs', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/hooks/useAuth'));
    await fs.ensureDir(path.join(testDir, 'src/contexts/AuthContext'));

    await syncCommand();

    expect(await fs.pathExists(path.join(testDir, 'src/hooks/index.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'src/contexts/index.ts'))).toBe(true);
  });

  it('prints a summary with the count of added exports', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/hooks/useAuth'));
    await fs.ensureDir(path.join(testDir, 'src/hooks/usePayment'));

    await syncCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('2 export(s) added');
  });

  it('deduplicates shared paths (feature-based pagePath === featurePath)', async () => {
    await writeConfig({ pattern: 'feature-based' });
    const featuresDir = path.join(testDir, 'src/features');
    await fs.ensureDir(path.join(featuresDir, 'Checkout'));

    await syncCommand();

    // src/features/index.ts should only have one entry, not two
    const barrel = await fs.readFile(path.join(featuresDir, 'index.ts'), 'utf-8');
    const matches = barrel.match(/from '\.\/Checkout'/g) || [];
    expect(matches.length).toBe(1);
  });

  it('handles atomic-design pattern with multiple component level dirs', async () => {
    await writeConfig({ pattern: 'atomic-design' });
    await fs.ensureDir(path.join(testDir, 'src/components/atoms/Button'));
    await fs.ensureDir(path.join(testDir, 'src/components/molecules/Card'));

    await syncCommand();

    const atomsBarrel = path.join(testDir, 'src/components/atoms/index.ts');
    const moleculesBarrel = path.join(testDir, 'src/components/molecules/index.ts');
    expect(await fs.pathExists(atomsBarrel)).toBe(true);
    expect(await fs.pathExists(moleculesBarrel)).toBe(true);
  });
});
