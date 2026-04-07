import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const { handleCreateResource, handleResolveResourcePath } = require('../src/mcp/server');

const BASE: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const NEXTJS: RchitectConfig = { ...BASE, framework: 'nextjs' };

describe('handleCreateResource', () => {
  const testDir = path.join(__dirname, '.tmp-mcp-create');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  // ── Error cases ───────────────────────────────────────────────────────────

  it('returns error when .rchitect.json is missing', async () => {
    const result = await handleCreateResource({ type: 'component', name: 'Button' }, testDir);
    expect(result.error).toContain('.rchitect.json not found');
  });

  it('returns error for unknown type', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    const result = await handleCreateResource({ type: 'wizard', name: 'Magic' }, testDir);
    expect(result.error).toContain('Unknown type');
  });

  // ── Component ─────────────────────────────────────────────────────────────

  it('creates a component and returns created file list', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    const result = await handleCreateResource({ type: 'component', name: 'Button' }, testDir);
    expect(result.success).toBe(true);
    expect(result.created.length).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Button/Button.tsx'))).toBe(true);
  });

  it('returns error if component already exists', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    await handleCreateResource({ type: 'component', name: 'Button' }, testDir);
    const result = await handleCreateResource({ type: 'component', name: 'Button' }, testDir);
    expect(result.error).toContain('already exists');
  });

  it('creates an atomic-design component at the given level', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE, pattern: 'atomic-design' });
    const result = await handleCreateResource({ type: 'component', name: 'Tag', atomicLevel: 'atom' }, testDir);
    expect(result.success).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'src/components/atoms/Tag/Tag.tsx'))).toBe(true);
  });

  // ── Hook ──────────────────────────────────────────────────────────────────

  it('creates a hook and returns success', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    const result = await handleCreateResource({ type: 'hook', name: 'Auth' }, testDir);
    expect(result.success).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'src/hooks/useAuth/useAuth.ts'))).toBe(true);
  });

  // ── Service ───────────────────────────────────────────────────────────────

  it('creates a service', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    const result = await handleCreateResource({ type: 'service', name: 'User' }, testDir);
    expect(result.success).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'src/services/userService/userService.ts'))).toBe(true);
  });

  // ── Feature ───────────────────────────────────────────────────────────────

  it('creates a full feature scaffold', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    const result = await handleCreateResource({ type: 'feature', name: 'Dashboard' }, testDir);
    expect(result.success).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'src/features/Dashboard/index.ts'))).toBe(true);
  });

  // ── App Router types ──────────────────────────────────────────────────────

  it('creates a Next.js layout file', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), NEXTJS);
    const result = await handleCreateResource({ type: 'layout', segment: 'auth' }, testDir);
    expect(result.success).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'app', 'auth', 'layout.tsx'))).toBe(true);
  });

  it('returns error for App Router type on React project', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    const result = await handleCreateResource({ type: 'layout', segment: 'auth' }, testDir);
    expect(result.error).toContain('Next.js');
  });

  it('creates middleware at project root', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), NEXTJS);
    const result = await handleCreateResource({ type: 'middleware', name: '' }, testDir);
    expect(result.success).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'middleware.ts'))).toBe(true);
  });

  it('creates a server action', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), NEXTJS);
    const result = await handleCreateResource({ type: 'server-action', name: 'User' }, testDir);
    expect(result.success).toBe(true);
    expect(await fs.pathExists(path.join(testDir, 'app', 'actions', 'user.ts'))).toBe(true);
  });

  // ── Tailwind: no style file ───────────────────────────────────────────────

  it('does not create a style file for tailwind projects', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE, styling: 'tailwind' });
    await handleCreateResource({ type: 'component', name: 'Card' }, testDir);
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Card/Card.module.css'))).toBe(false);
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Card/Card.tsx'))).toBe(true);
  });
});

// ── handleResolveResourcePath — new types ────────────────────────────────────

describe('handleResolveResourcePath — App Router and Tailwind', () => {
  const testDir = path.join(__dirname, '.tmp-mcp-resolve');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('resolves layout path for Next.js', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE, framework: 'nextjs' });
    const result = handleResolveResourcePath({ type: 'layout', name: 'auth' }, testDir);
    expect(result.directory).toBe('app/auth');
    expect(result.files).toContain('layout.tsx');
  });

  it('returns error for layout on React project', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    const result = handleResolveResourcePath({ type: 'layout', name: 'auth' }, testDir);
    expect(result.error).toContain('Next.js');
  });

  it('resolves middleware path', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE, framework: 'nextjs' });
    const result = handleResolveResourcePath({ type: 'middleware', name: '' }, testDir);
    expect(result.files).toContain('middleware.ts');
    expect(result.resolvedName).toBe('middleware');
  });

  it('resolves component without style file for tailwind', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE, styling: 'tailwind' });
    const result = handleResolveResourcePath({ type: 'component', name: 'Button' }, testDir);
    expect(result.files).not.toContain('Button.module.css');
    expect(result.files).not.toContain('Button.module.scss');
  });
});
