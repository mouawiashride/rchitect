import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// Mock inquirer before any imports that use it
jest.mock('inquirer');
const inquirer = require('inquirer');

const {
  detectFramework,
  detectLanguage,
  detectStyling,
  detectTesting,
  detectPattern,
  detectWithTests,
} = require('../src/commands/import');

const importCommand: () => Promise<void> = require('../src/commands/import');

describe('import command — helper functions', () => {
  const testDir = path.join(__dirname, '.tmp-import-helpers');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  // ── detectFramework ───────────────────────────────────────────────────────

  it('detects nextjs when next is in dependencies', () => {
    expect(detectFramework({ dependencies: { next: '14.0.0', react: '18.0.0' } })).toBe('nextjs');
  });

  it('detects react when only react is in dependencies', () => {
    expect(detectFramework({ dependencies: { react: '18.0.0' } })).toBe('react');
  });

  it('detects react from devDependencies', () => {
    expect(detectFramework({ devDependencies: { react: '18.0.0' } })).toBe('react');
  });

  it('returns null when no react or next found', () => {
    expect(detectFramework({ dependencies: { lodash: '4.0.0' } })).toBeNull();
  });

  // ── detectLanguage ────────────────────────────────────────────────────────

  it('detects typescript when tsconfig.json exists', async () => {
    await fs.writeJson(path.join(testDir, 'tsconfig.json'), {});
    expect(detectLanguage(testDir)).toBe('typescript');
  });

  it('detects javascript when no tsconfig.json', () => {
    expect(detectLanguage(testDir)).toBe('javascript');
  });

  // ── detectStyling ─────────────────────────────────────────────────────────

  it('detects tailwind from tailwindcss dependency', () => {
    expect(detectStyling({ dependencies: { tailwindcss: '3.0.0' } })).toBe('tailwind');
  });

  it('detects scss from sass dependency', () => {
    expect(detectStyling({ devDependencies: { sass: '1.0.0' } })).toBe('scss');
  });

  it('detects scss from node-sass', () => {
    expect(detectStyling({ devDependencies: { 'node-sass': '7.0.0' } })).toBe('scss');
  });

  it('defaults to css when no special styling dep', () => {
    expect(detectStyling({ dependencies: { react: '18.0.0' } })).toBe('css');
  });

  // ── detectTesting ─────────────────────────────────────────────────────────

  it('detects vitest from dependencies', () => {
    expect(detectTesting({ dependencies: { vitest: '1.0.0' } })).toBe('vitest');
  });

  it('defaults to jest', () => {
    expect(detectTesting({ dependencies: { react: '18.0.0' } })).toBe('jest');
  });

  // ── detectPattern ─────────────────────────────────────────────────────────

  it('detects atomic-design from src/components/atoms', async () => {
    await fs.ensureDir(path.join(testDir, 'src', 'components', 'atoms'));
    expect(detectPattern(testDir)).toBe('atomic-design');
  });

  it('detects atomic-design from components/atoms (no src prefix)', async () => {
    await fs.ensureDir(path.join(testDir, 'components', 'atoms'));
    expect(detectPattern(testDir)).toBe('atomic-design');
  });

  it('detects domain-driven from src/domains', async () => {
    await fs.ensureDir(path.join(testDir, 'src', 'domains'));
    expect(detectPattern(testDir)).toBe('domain-driven');
  });

  it('detects mvc-like from models + views', async () => {
    await fs.ensureDir(path.join(testDir, 'src', 'models'));
    await fs.ensureDir(path.join(testDir, 'src', 'views'));
    expect(detectPattern(testDir)).toBe('mvc-like');
  });

  it('detects feature-based from src/features', async () => {
    await fs.ensureDir(path.join(testDir, 'src', 'features'));
    expect(detectPattern(testDir)).toBe('feature-based');
  });

  it('defaults to feature-based for unknown structure', () => {
    expect(detectPattern(testDir)).toBe('feature-based');
  });

  // ── detectWithTests ───────────────────────────────────────────────────────

  it('returns true when .test.ts file found', async () => {
    await fs.ensureDir(path.join(testDir, 'src'));
    await fs.writeFile(path.join(testDir, 'src', 'Button.test.ts'), '');
    expect(await detectWithTests(testDir)).toBe(true);
  });

  it('returns false when no test files found', async () => {
    expect(await detectWithTests(testDir)).toBe(false);
  });
});

// ── import command integration ────────────────────────────────────────────────

describe('import command', () => {
  const testDir = path.join(__dirname, '.tmp-import-cmd');
  let mockExit: jest.SpyInstance;
  let mockLog: jest.SpyInstance;
  let originalCwd: () => string;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    originalCwd = process.cwd;
    process.cwd = () => testDir;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: true, overwrite: true });
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    mockExit.mockRestore();
    mockLog.mockRestore();
    jest.clearAllMocks();
    await fs.remove(testDir);
  });

  it('exits with error when no package.json', async () => {
    await expect(importCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with error when no react/next in package.json', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), { dependencies: { lodash: '4.0.0' } });
    await expect(importCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('writes .rchitect.json with detected config', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), {
      dependencies: { react: '18.0.0' },
      devDependencies: { typescript: '5.0.0' },
    });
    await fs.writeJson(path.join(testDir, 'tsconfig.json'), {});
    await fs.ensureDir(path.join(testDir, 'src', 'features'));

    await importCommand();

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.framework).toBe('react');
    expect(config.language).toBe('typescript');
    expect(config.pattern).toBe('feature-based');
  });

  it('detects Next.js and writes correct framework', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), {
      dependencies: { next: '14.0.0', react: '18.0.0' },
    });

    await importCommand();

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.framework).toBe('nextjs');
  });

  it('detects tailwind and writes styling: tailwind', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), {
      dependencies: { react: '18.0.0', tailwindcss: '3.0.0' },
    });

    await importCommand();

    const config = await fs.readJson(path.join(testDir, '.rchitect.json'));
    expect(config.styling).toBe('tailwind');
  });

  it('shows warning when .rchitect.json already exists', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), { dependencies: { react: '18.0.0' } });
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { framework: 'react', pattern: 'mvc-like' });
    (inquirer.prompt as jest.Mock).mockResolvedValue({ overwrite: false });

    await importCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('already exists');
  });

  it('aborts when user declines', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), { dependencies: { react: '18.0.0' } });
    (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: false });

    await importCommand();

    expect(await fs.pathExists(path.join(testDir, '.rchitect.json'))).toBe(false);
  });
});
