import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

jest.mock('inquirer');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const inquirer = require('inquirer') as { prompt: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const removeCommand: (type: string, name: string) => Promise<void> = require('../src/commands/remove');

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('remove command', () => {
  const testDir: string = path.join(__dirname, '.tmp-remove');
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
    inquirer.prompt = jest.fn();
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
    await expect(removeCommand('component', 'Button')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error for an unsupported resource type', async () => {
    await writeConfig();
    await expect(removeCommand('widget', 'Button')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error if the resource directory does not exist', async () => {
    await writeConfig();
    await expect(removeCommand('component', 'Nonexistent')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('removes the component directory when user confirms', async () => {
    await writeConfig();
    const componentDir = path.join(testDir, 'src/components/shared/Button');
    await fs.ensureDir(componentDir);
    await fs.writeFile(path.join(componentDir, 'Button.tsx'), '// placeholder');

    inquirer.prompt.mockResolvedValue({ confirm: true });

    await removeCommand('component', 'Button');

    expect(await fs.pathExists(componentDir)).toBe(false);
  });

  it('does not remove the directory when user declines', async () => {
    await writeConfig();
    const componentDir = path.join(testDir, 'src/components/shared/Button');
    await fs.ensureDir(componentDir);

    inquirer.prompt.mockResolvedValue({ confirm: false });

    await removeCommand('component', 'Button');

    expect(await fs.pathExists(componentDir)).toBe(true);
  });

  it('removes a hook directory when user confirms', async () => {
    await writeConfig();
    const hookDir = path.join(testDir, 'src/hooks/useAuth');
    await fs.ensureDir(hookDir);

    inquirer.prompt.mockResolvedValue({ confirm: true });

    await removeCommand('hook', 'Auth');

    expect(await fs.pathExists(hookDir)).toBe(false);
  });

  it('removes a service directory when user confirms', async () => {
    await writeConfig({ pattern: 'mvc-like' });
    const serviceDir = path.join(testDir, 'src/services/userService');
    await fs.ensureDir(serviceDir);

    inquirer.prompt.mockResolvedValue({ confirm: true });

    await removeCommand('service', 'User');

    expect(await fs.pathExists(serviceDir)).toBe(false);
  });

  it('removes a context directory when user confirms', async () => {
    await writeConfig();
    const contextDir = path.join(testDir, 'src/contexts/AuthContext');
    await fs.ensureDir(contextDir);

    inquirer.prompt.mockResolvedValue({ confirm: true });

    await removeCommand('context', 'Auth');

    expect(await fs.pathExists(contextDir)).toBe(false);
  });

  it('removes a store directory when user confirms', async () => {
    await writeConfig();
    const storeDir = path.join(testDir, 'src/stores/useCartStore');
    await fs.ensureDir(storeDir);

    inquirer.prompt.mockResolvedValue({ confirm: true });

    await removeCommand('store', 'Cart');

    expect(await fs.pathExists(storeDir)).toBe(false);
  });

  it('removes a feature directory when user confirms', async () => {
    await writeConfig();
    const featureDir = path.join(testDir, 'src/features/Dashboard');
    await fs.ensureDir(featureDir);
    await fs.writeFile(path.join(featureDir, 'index.ts'), '// placeholder');

    inquirer.prompt.mockResolvedValue({ confirm: true });

    await removeCommand('feature', 'Dashboard');

    expect(await fs.pathExists(featureDir)).toBe(false);
  });

  it('shows an aborted message when user declines', async () => {
    await writeConfig();
    const componentDir = path.join(testDir, 'src/components/shared/Button');
    await fs.ensureDir(componentDir);

    inquirer.prompt.mockResolvedValue({ confirm: false });

    await removeCommand('component', 'Button');

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('Aborted');
  });

  it('shows a success message after removal', async () => {
    await writeConfig();
    const componentDir = path.join(testDir, 'src/components/shared/Button');
    await fs.ensureDir(componentDir);

    inquirer.prompt.mockResolvedValue({ confirm: true });

    await removeCommand('component', 'Button');

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('Removed');
    expect(output).toContain('Button');
  });
});
