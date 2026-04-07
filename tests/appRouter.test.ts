import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const addCommand: (type: string, name?: string, opts?: object) => Promise<void> =
  require('../src/commands/add');

const BASE: RchitectConfig = {
  framework: 'nextjs',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const REACT_BASE: RchitectConfig = { ...BASE, framework: 'react' };

describe('Next.js App Router commands', () => {
  const testDir = path.join(__dirname, '.tmp-approuter');
  let mockExit: jest.SpyInstance;
  let mockLog: jest.SpyInstance;
  let originalCwd: () => string;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    originalCwd = process.cwd;
    process.cwd = () => testDir;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    mockExit.mockRestore();
    mockLog.mockRestore();
    jest.resetModules();
    await fs.remove(testDir);
  });

  // ── layout ────────────────────────────────────────────────────────────────

  describe('layout', () => {
    it('creates app/<segment>/layout.tsx for Next.js', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('layout', 'auth');
      const file = path.join(testDir, 'app', 'auth', 'layout.tsx');
      expect(await fs.pathExists(file)).toBe(true);
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toContain('AuthLayout');
      expect(content).toContain('children');
    });

    it('exits with error for React projects', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), REACT_BASE);
      await expect(addCommand('layout', 'auth')).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('exits with error if layout already exists', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('layout', 'auth');
      await expect(addCommand('layout', 'auth')).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('generates .jsx for JavaScript projects', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE, language: 'javascript' });
      await addCommand('layout', 'auth');
      expect(await fs.pathExists(path.join(testDir, 'app', 'auth', 'layout.jsx'))).toBe(true);
    });

    it('converts hyphenated segment to PascalCase function name', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('layout', 'user-profile');
      const content = await fs.readFile(path.join(testDir, 'app', 'user-profile', 'layout.tsx'), 'utf-8');
      expect(content).toContain('UserProfileLayout');
    });
  });

  // ── loading ───────────────────────────────────────────────────────────────

  describe('loading', () => {
    it('creates app/<segment>/loading.tsx', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('loading', 'dashboard');
      const file = path.join(testDir, 'app', 'dashboard', 'loading.tsx');
      expect(await fs.pathExists(file)).toBe(true);
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toContain('DashboardLoading');
      expect(content).toContain('Loading');
    });

    it('exits with error for React projects', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), REACT_BASE);
      await expect(addCommand('loading', 'dashboard')).rejects.toThrow('process.exit');
    });
  });

  // ── error ─────────────────────────────────────────────────────────────────

  describe('error', () => {
    it('creates app/<segment>/error.tsx with "use client"', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('error', 'auth');
      const content = await fs.readFile(path.join(testDir, 'app', 'auth', 'error.tsx'), 'utf-8');
      expect(content).toContain("'use client'");
      expect(content).toContain('AuthError');
      expect(content).toContain('reset');
    });

    it('exits with error for React projects', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), REACT_BASE);
      await expect(addCommand('error', 'auth')).rejects.toThrow('process.exit');
    });
  });

  // ── not-found ─────────────────────────────────────────────────────────────

  describe('not-found', () => {
    it('creates app/<segment>/not-found.tsx', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('not-found', 'products');
      const file = path.join(testDir, 'app', 'products', 'not-found.tsx');
      expect(await fs.pathExists(file)).toBe(true);
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toContain('ProductsNotFound');
      expect(content).toContain('Not Found');
    });

    it('exits with error for React projects', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), REACT_BASE);
      await expect(addCommand('not-found', 'products')).rejects.toThrow('process.exit');
    });
  });

  // ── middleware ────────────────────────────────────────────────────────────

  describe('middleware', () => {
    it('creates middleware.ts at project root', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('middleware', undefined);
      const file = path.join(testDir, 'middleware.ts');
      expect(await fs.pathExists(file)).toBe(true);
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toContain('middleware');
      expect(content).toContain('matcher');
    });

    it('creates middleware.js for JavaScript projects', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE, language: 'javascript' });
      await addCommand('middleware', undefined);
      expect(await fs.pathExists(path.join(testDir, 'middleware.js'))).toBe(true);
    });

    it('exits with error if middleware already exists', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('middleware', undefined);
      await expect(addCommand('middleware', undefined)).rejects.toThrow('process.exit');
    });

    it('exits with error for React projects', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), REACT_BASE);
      await expect(addCommand('middleware', undefined)).rejects.toThrow('process.exit');
    });
  });

  // ── server-action ─────────────────────────────────────────────────────────

  describe('server-action', () => {
    it('creates app/actions/<name>.ts with "use server"', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('server-action', 'User');
      const file = path.join(testDir, 'app', 'actions', 'user.ts');
      expect(await fs.pathExists(file)).toBe(true);
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toContain("'use server'");
      expect(content).toContain('userAction');
    });

    it('exits with error for React projects', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), REACT_BASE);
      await expect(addCommand('server-action', 'User')).rejects.toThrow('process.exit');
    });

    it('exits with error if action already exists', async () => {
      await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
      await addCommand('server-action', 'User');
      await expect(addCommand('server-action', 'User')).rejects.toThrow('process.exit');
    });
  });

  // ── segment validation ────────────────────────────────────────────────────

  it('exits with error for invalid segment name (uppercase)', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    await expect(addCommand('layout', 'Auth')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
