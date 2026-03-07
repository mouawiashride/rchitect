import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const scaffoldCommand: (manifest: string) => Promise<void> = require('../src/commands/scaffold');

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('scaffold command', () => {
  const testDir: string = path.join(__dirname, '.tmp-scaffold');
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

  async function writeManifest(data: object, filename = 'manifest.json'): Promise<string> {
    const p = path.join(testDir, filename);
    await fs.writeJson(p, data);
    return p;
  }

  it('exits with an error when .rchitect.json is missing', async () => {
    const p = await writeManifest({ resources: [{ type: 'hook', name: 'Auth' }] });
    await expect(scaffoldCommand(p)).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error when manifest file does not exist', async () => {
    await writeConfig();
    await expect(scaffoldCommand('/nonexistent/manifest.json')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error when manifest is invalid JSON', async () => {
    await writeConfig();
    const p = path.join(testDir, 'bad.json');
    await fs.writeFile(p, '{ invalid json }');
    await expect(scaffoldCommand(p)).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error when manifest has no resources array', async () => {
    await writeConfig();
    const p = await writeManifest({ other: 'data' });
    await expect(scaffoldCommand(p)).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error when resources array is empty', async () => {
    await writeConfig();
    const p = await writeManifest({ resources: [] });
    await expect(scaffoldCommand(p)).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('creates a hook from the manifest', async () => {
    await writeConfig();
    const p = await writeManifest({ resources: [{ type: 'hook', name: 'Auth' }] });

    await scaffoldCommand(p);

    expect(await fs.pathExists(path.join(testDir, 'src/hooks/useAuth/useAuth.ts'))).toBe(true);
  });

  it('creates a context from the manifest', async () => {
    await writeConfig();
    const p = await writeManifest({ resources: [{ type: 'context', name: 'Auth' }] });

    await scaffoldCommand(p);

    expect(await fs.pathExists(path.join(testDir, 'src/contexts/AuthContext/AuthContext.tsx'))).toBe(true);
  });

  it('creates a component with atomicLevel for atomic-design pattern', async () => {
    await writeConfig({ pattern: 'atomic-design' });
    const p = await writeManifest({
      resources: [{ type: 'component', name: 'Button', atomicLevel: 'molecule' }],
    });

    await scaffoldCommand(p);

    expect(await fs.pathExists(path.join(testDir, 'src/components/molecules/Button/Button.tsx'))).toBe(true);
  });

  it('skips a duplicate resource without crashing', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/hooks/useAuth'));
    const p = await writeManifest({ resources: [{ type: 'hook', name: 'Auth' }] });

    await scaffoldCommand(p);

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('skipped');
    expect(output).toContain('0 created, 1 skipped');
  });

  it('marks unknown type as failed without crashing', async () => {
    await writeConfig();
    const p = await writeManifest({ resources: [{ type: 'widget', name: 'Foo' }] });

    await scaffoldCommand(p);

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('failed');
  });

  it('creates multiple resources from a single manifest', async () => {
    await writeConfig();
    const p = await writeManifest({
      resources: [
        { type: 'hook', name: 'Auth' },
        { type: 'context', name: 'Theme' },
      ],
    });

    await scaffoldCommand(p);

    expect(await fs.pathExists(path.join(testDir, 'src/hooks/useAuth'))).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'src/contexts/ThemeContext'))).toBe(true);
  });

  it('prints correct summary counts', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/hooks/useAuth')); // will be skipped
    const p = await writeManifest({
      resources: [
        { type: 'hook', name: 'Auth' },       // skipped (exists)
        { type: 'context', name: 'Theme' },   // created
        { type: 'widget', name: 'Foo' },      // failed
      ],
    });

    await scaffoldCommand(p);

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('1 created, 1 skipped, 1 failed');
  });
});
