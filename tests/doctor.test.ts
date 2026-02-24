import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const doctorCommand: () => Promise<void> = require('../src/commands/doctor');

const VALID_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

// Feature-based React folders
const FEATURE_BASED_FOLDERS = [
  'src/features',
  'src/components/shared',
  'src/hooks',
  'src/contexts',
  'src/stores',
  'src/services',
  'src/utils',
  'src/types',
  'src/styles',
  'src/assets',
];

describe('doctor command', () => {
  const testDir: string = path.join(__dirname, '.tmp-doctor');
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

  async function writeConfig(config: object): Promise<void> {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), config);
  }

  async function createFolders(folders: string[]): Promise<void> {
    for (const folder of folders) {
      await fs.ensureDir(path.join(testDir, folder));
    }
  }

  it('exits when .rchitect.json is missing', async () => {
    await expect(doctorCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits when the framework field is invalid', async () => {
    await writeConfig({ ...VALID_CONFIG, framework: 'angular' });
    await expect(doctorCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits when the pattern field is invalid', async () => {
    await writeConfig({ ...VALID_CONFIG, pattern: 'unknown-pattern' });
    await expect(doctorCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits when the language field is invalid', async () => {
    await writeConfig({ ...VALID_CONFIG, language: 'python' });
    await expect(doctorCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits when the styling field is invalid', async () => {
    await writeConfig({ ...VALID_CONFIG, styling: 'tailwind' });
    await expect(doctorCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits when withTests is not a boolean', async () => {
    await writeConfig({ ...VALID_CONFIG, withTests: 'true' });
    await expect(doctorCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('reports all config fields as valid when config is correct', async () => {
    await writeConfig(VALID_CONFIG);
    // No folders needed — doctor still runs but reports missing folders

    await doctorCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(output).toContain('framework');
    expect(output).toContain('pattern');
    expect(output).toContain('language');
    expect(output).toContain('styling');
    expect(output).toContain('withTests');
  });

  it('reports missing folders with a warning symbol', async () => {
    await writeConfig(VALID_CONFIG);

    await doctorCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(output).toContain('missing');
  });

  it('reports present folders with a checkmark', async () => {
    await writeConfig(VALID_CONFIG);
    await createFolders(FEATURE_BASED_FOLDERS);

    await doctorCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    // Should not have missing folders message
    expect(output).not.toContain('missing');
  });

  it('shows "All good" message when all folders exist', async () => {
    await writeConfig(VALID_CONFIG);
    await createFolders(FEATURE_BASED_FOLDERS);

    await doctorCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(output).toContain('All good');
  });

  it('shows folder count in summary when some folders are missing', async () => {
    await writeConfig(VALID_CONFIG);
    // Create only half the folders
    await createFolders(FEATURE_BASED_FOLDERS.slice(0, 3));

    await doctorCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(output).toMatch(/\d+ folder\(s\) missing/);
  });

  it('works correctly for a Next.js project config', async () => {
    const nextConfig = {
      ...VALID_CONFIG,
      framework: 'nextjs',
      pattern: 'feature-based',
    };
    await writeConfig(nextConfig);

    await doctorCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(output).toContain('framework');
  });
});
