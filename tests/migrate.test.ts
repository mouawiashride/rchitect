import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const migrateCommand: (pattern: string, options?: { apply?: boolean }) => Promise<void> = require('../src/commands/migrate');

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('migrate command', () => {
  const testDir: string = path.join(__dirname, '.tmp-migrate');
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

  // ── Error cases ───────────────────────────────────────────────────────────────

  it('exits with an error when .rchitect.json is missing', async () => {
    await expect(migrateCommand('domain-driven')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error for an unknown target pattern', async () => {
    await writeConfig();
    await expect(migrateCommand('bad-pattern')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error when migrating FROM atomic-design', async () => {
    await writeConfig({ pattern: 'atomic-design' });
    await expect(migrateCommand('feature-based')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('prints an "already using" message and does not exit when target matches current', async () => {
    await writeConfig({ pattern: 'feature-based' });
    await migrateCommand('feature-based');
    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('Already using');
    expect(mockExit).not.toHaveBeenCalled();
  });

  // ── Dry-run (default) ─────────────────────────────────────────────────────────

  it('dry-run prints the migration plan but does not move directories', async () => {
    await writeConfig({ pattern: 'feature-based' });
    await fs.ensureDir(path.join(testDir, 'src/hooks'));

    await migrateCommand('domain-driven');

    // src/hooks → src/shared/hooks should appear in plan
    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('src/hooks');
    expect(output).toContain('src/shared/hooks');
    // Directory not actually moved
    expect(await fs.pathExists(path.join(testDir, 'src/hooks'))).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'src/shared/hooks'))).toBe(false);
  });

  it('dry-run does not update config.pattern', async () => {
    await writeConfig({ pattern: 'feature-based' });
    await fs.ensureDir(path.join(testDir, 'src/hooks'));

    await migrateCommand('domain-driven');

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.pattern).toBe('feature-based');
  });

  it('dry-run prints "Dry-run mode" message', async () => {
    await writeConfig({ pattern: 'feature-based' });
    await fs.ensureDir(path.join(testDir, 'src/hooks'));
    await migrateCommand('domain-driven');
    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('Dry-run');
  });

  // ── --apply ───────────────────────────────────────────────────────────────────

  it('--apply moves existing directories to new paths', async () => {
    await writeConfig({ pattern: 'feature-based' });
    await fs.ensureDir(path.join(testDir, 'src/hooks/useAuth'));

    await migrateCommand('domain-driven', { apply: true });

    expect(await fs.pathExists(path.join(testDir, 'src/hooks'))).toBe(false);
    expect(await fs.pathExists(path.join(testDir, 'src/shared/hooks/useAuth'))).toBe(true);
  });

  it('--apply updates config.pattern in .rchitect.json', async () => {
    await writeConfig({ pattern: 'feature-based' });
    await fs.ensureDir(path.join(testDir, 'src/hooks'));

    await migrateCommand('domain-driven', { apply: true });

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.pattern).toBe('domain-driven');
  });

  it('--apply only moves directories that exist on disk', async () => {
    await writeConfig({ pattern: 'feature-based' });
    // Only create hooks; services does not exist
    await fs.ensureDir(path.join(testDir, 'src/hooks'));

    await migrateCommand('domain-driven', { apply: true });

    // hooks moved; shared/services should not have been created
    expect(await fs.pathExists(path.join(testDir, 'src/shared/hooks'))).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'src/shared/services'))).toBe(false);
  });

  // ── Atomic-design target ───────────────────────────────────────────────────────

  it('warns but does not exit when migrating TO atomic-design', async () => {
    await writeConfig({ pattern: 'feature-based' });
    await migrateCommand('atomic-design');
    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('Warning');
    expect(mockExit).not.toHaveBeenCalled();
  });

  // ── No-op when no dirs exist ───────────────────────────────────────────────────

  it('handles no existing source dirs gracefully (no-op)', async () => {
    await writeConfig({ pattern: 'feature-based' });
    // No dirs created
    await migrateCommand('domain-driven');
    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('No directories to migrate');
    expect(mockExit).not.toHaveBeenCalled();
  });
});
