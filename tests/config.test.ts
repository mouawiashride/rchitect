import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const configCommand: (action: string, key: string, value: string) => Promise<void> = require('../src/commands/config');

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('config command', () => {
  const testDir: string = path.join(__dirname, '.tmp-config');
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
    await fs.remove(testDir);
  });

  async function writeConfig(config: Partial<RchitectConfig> = {}): Promise<void> {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE_CONFIG, ...config });
  }

  it('exits with an error when .rchitect.json is missing', async () => {
    await expect(configCommand('set', 'language', 'javascript')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error for an unknown action', async () => {
    await writeConfig();
    await expect(configCommand('get', 'language', 'javascript')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error for an unknown config key', async () => {
    await writeConfig();
    await expect(configCommand('set', 'theme', 'dark')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error for an invalid value', async () => {
    await writeConfig();
    await expect(configCommand('set', 'language', 'python')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('updates the language key successfully', async () => {
    await writeConfig();
    await configCommand('set', 'language', 'javascript');

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.language).toBe('javascript');
  });

  it('updates the styling key successfully', async () => {
    await writeConfig();
    await configCommand('set', 'styling', 'scss');

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.styling).toBe('scss');
  });

  it('updates the pattern key successfully', async () => {
    await writeConfig();
    await configCommand('set', 'pattern', 'atomic-design');

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.pattern).toBe('atomic-design');
  });

  it('converts "true" string to boolean true for withTests', async () => {
    await writeConfig({ withTests: false });
    await configCommand('set', 'withTests', 'true');

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.withTests).toBe(true);
    expect(typeof config.withTests).toBe('boolean');
  });

  it('converts "false" string to boolean false for useClient', async () => {
    await writeConfig({ useClient: true });
    await configCommand('set', 'useClient', 'false');

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.useClient).toBe(false);
    expect(typeof config.useClient).toBe('boolean');
  });

  it('does not modify other config keys when updating one', async () => {
    await writeConfig({ withTests: true, framework: 'nextjs' });
    await configCommand('set', 'language', 'javascript');

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.withTests).toBe(true);
    expect(config.framework).toBe('nextjs');
    expect(config.language).toBe('javascript');
  });

  it('outputs a confirmation message on success', async () => {
    await writeConfig();
    await configCommand('set', 'styling', 'scss');

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('styling');
    expect(output).toContain('scss');
  });
});
