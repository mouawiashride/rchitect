import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  handleGetProjectConfig,
  handleGetArchitectureGuide,
  handleResolveResourcePath,
}: {
  handleGetProjectConfig: (cwd: string) => Record<string, unknown>;
  handleGetArchitectureGuide: (cwd: string) => Record<string, unknown>;
  handleResolveResourcePath: (
    args: { type: string; name: string; atomicLevel?: string },
    cwd: string
  ) => Record<string, unknown>;
} = require('../src/mcp/server');

// ── Helpers ───────────────────────────────────────────────────────────────────

const testDir: string = path.join(__dirname, '.tmp-mcp');

async function writeConfig(overrides: Partial<RchitectConfig> = {}): Promise<void> {
  const defaults: RchitectConfig = {
    framework:  'nextjs',
    pattern:    'atomic-design',
    language:   'typescript',
    styling:    'scss',
    withTests:  true,
    useClient:  true,
  };
  await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...defaults, ...overrides });
}

beforeEach(async () => { await fs.ensureDir(testDir); });
afterEach(async ()  => { await fs.remove(testDir); });

// ── handleGetProjectConfig ────────────────────────────────────────────────────

describe('handleGetProjectConfig', () => {
  it('returns an error object when .rchitect.json is missing', () => {
    const result = handleGetProjectConfig(testDir) as { error: string };
    expect(result.error).toMatch(/rchitect\.json not found/i);
  });

  it('returns config and explanation when file exists', async () => {
    await writeConfig();
    const result = handleGetProjectConfig(testDir) as { config: RchitectConfig; explanation: Record<string, string> };
    expect(result.config).toBeDefined();
    expect(result.explanation).toBeDefined();
  });

  it('config contains all expected keys', async () => {
    await writeConfig();
    const { config } = handleGetProjectConfig(testDir) as { config: RchitectConfig };
    expect(config.framework).toBe('nextjs');
    expect(config.pattern).toBe('atomic-design');
    expect(config.language).toBe('typescript');
    expect(config.styling).toBe('scss');
    expect(config.withTests).toBe(true);
    expect(config.useClient).toBe(true);
  });

  it('explanation contains a plain-English string for each config key', async () => {
    await writeConfig();
    const { explanation } = handleGetProjectConfig(testDir) as { explanation: Record<string, string> };
    expect(typeof explanation.framework).toBe('string');
    expect(typeof explanation.pattern).toBe('string');
    expect(typeof explanation.language).toBe('string');
    expect(typeof explanation.styling).toBe('string');
    expect(typeof explanation.withTests).toBe('string');
    expect(typeof explanation.useClient).toBe('string');
  });

  it('explanation.framework mentions "Next.js" for nextjs projects', async () => {
    await writeConfig({ framework: 'nextjs' });
    const { explanation } = handleGetProjectConfig(testDir) as { explanation: Record<string, string> };
    expect(explanation.framework).toContain('Next.js');
  });

  it('explanation.framework mentions "React" for react projects', async () => {
    await writeConfig({ framework: 'react' });
    const { explanation } = handleGetProjectConfig(testDir) as { explanation: Record<string, string> };
    expect(explanation.framework).toContain('React');
  });

  it('explanation.withTests reflects the boolean value', async () => {
    await writeConfig({ withTests: false });
    const { explanation } = handleGetProjectConfig(testDir) as { explanation: Record<string, string> };
    expect(explanation.withTests).toContain('false');
  });
});

// ── handleGetArchitectureGuide ────────────────────────────────────────────────

describe('handleGetArchitectureGuide', () => {
  it('returns an error when .rchitect.json is missing', () => {
    const result = handleGetArchitectureGuide(testDir) as { error: string };
    expect(result.error).toMatch(/rchitect\.json not found/i);
  });

  it('returns the correct pattern name', async () => {
    await writeConfig({ pattern: 'feature-based', framework: 'react' });
    const result = handleGetArchitectureGuide(testDir) as { pattern: string };
    expect(result.pattern).toBe('feature-based');
  });

  it('returns the correct framework', async () => {
    await writeConfig({ framework: 'nextjs' });
    const result = handleGetArchitectureGuide(testDir) as { framework: string };
    expect(result.framework).toBe('nextjs');
  });

  it('includes a non-empty description', async () => {
    await writeConfig();
    const result = handleGetArchitectureGuide(testDir) as { description: string };
    expect(result.description.length).toBeGreaterThan(10);
  });

  it('folders array matches the nextjs atomic-design structure', async () => {
    await writeConfig({ framework: 'nextjs', pattern: 'atomic-design' });
    const result = handleGetArchitectureGuide(testDir) as { folders: string[] };
    expect(result.folders).toContain('components/atoms');
    expect(result.folders).toContain('hooks');
    // Next.js folders should NOT start with src/
    expect(result.folders.every((f) => !f.startsWith('src/'))).toBe(true);
  });

  it('folders array matches the react feature-based structure', async () => {
    await writeConfig({ framework: 'react', pattern: 'feature-based' });
    const result = handleGetArchitectureGuide(testDir) as { folders: string[] };
    expect(result.folders).toContain('src/features');
    expect(result.folders).toContain('src/components/shared');
  });

  it('resourcePlacement contains entries for all 9 resource types', async () => {
    await writeConfig();
    const result = handleGetArchitectureGuide(testDir) as { resourcePlacement: Record<string, string> };
    const types = ['component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature'];
    for (const t of types) {
      expect(result.resourcePlacement[t]).toBeDefined();
    }
  });

  it('resourcePlacement.api mentions Next.js limitation for react projects', async () => {
    await writeConfig({ framework: 'react', pattern: 'feature-based' });
    const result = handleGetArchitectureGuide(testDir) as { resourcePlacement: Record<string, string> };
    expect(result.resourcePlacement.api).toContain('Next.js');
  });

  it('namingConventions contains entry for hook showing "use" prefix', async () => {
    await writeConfig();
    const result = handleGetArchitectureGuide(testDir) as { namingConventions: Record<string, string> };
    expect(result.namingConventions.hook).toContain('use');
  });

  it('fileExtensions reflects typescript + scss config', async () => {
    await writeConfig({ language: 'typescript', styling: 'scss' });
    const result = handleGetArchitectureGuide(testDir) as { fileExtensions: Record<string, string> };
    expect(result.fileExtensions.component).toContain('tsx');
    expect(result.fileExtensions.style).toContain('scss');
  });

  it('fileExtensions reflects javascript + css config', async () => {
    await writeConfig({ framework: 'react', language: 'javascript', styling: 'css' });
    const result = handleGetArchitectureGuide(testDir) as { fileExtensions: Record<string, string> };
    expect(result.fileExtensions.component).toContain('jsx');
    expect(result.fileExtensions.style).toContain('css');
  });
});

// ── handleResolveResourcePath ─────────────────────────────────────────────────

describe('handleResolveResourcePath', () => {
  it('returns an error for an unknown type', async () => {
    await writeConfig();
    const result = handleResolveResourcePath({ type: 'widget', name: 'Button' }, testDir) as { error: string };
    expect(result.error).toMatch(/unknown type/i);
  });

  it('returns an error when .rchitect.json is missing', () => {
    const result = handleResolveResourcePath({ type: 'component', name: 'Button' }, testDir) as { error: string };
    expect(result.error).toMatch(/rchitect\.json not found/i);
  });

  describe('component', () => {
    it('resolves molecule path for atomic-design', async () => {
      await writeConfig({ framework: 'nextjs', pattern: 'atomic-design' });
      const result = handleResolveResourcePath({ type: 'component', name: 'SearchBar', atomicLevel: 'molecule' }, testDir);
      expect(result.directory).toBe('components/molecules/SearchBar');
      expect(result.resolvedName).toBe('SearchBar');
    });

    it('defaults to atom when atomicLevel is omitted in atomic-design', async () => {
      await writeConfig({ framework: 'nextjs', pattern: 'atomic-design' });
      const result = handleResolveResourcePath({ type: 'component', name: 'Icon' }, testDir);
      expect(result.directory).toBe('components/atoms/Icon');
      expect((result.note as string)).toContain('atom');
    });

    it('ignores atomicLevel for non-atomic patterns', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'component', name: 'Button', atomicLevel: 'atom' }, testDir);
      expect(result.directory).toBe('src/components/shared/Button');
      expect((result.note as string)).toContain('ignored');
    });

    it('includes tsx and css module in files for typescript + css', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based', language: 'typescript', styling: 'css' });
      const result = handleResolveResourcePath({ type: 'component', name: 'Card' }, testDir);
      expect((result.files as string[])).toContain('Card.tsx');
      expect((result.files as string[])).toContain('Card.module.css');
      expect((result.files as string[])).toContain('index.ts');
    });

    it('includes test file when withTests is true', async () => {
      await writeConfig({ withTests: true });
      const result = handleResolveResourcePath({ type: 'component', name: 'Button', atomicLevel: 'atom' }, testDir);
      expect((result.files as string[])).toContain('Button.test.tsx');
    });

    it('omits test file when withTests is false', async () => {
      await writeConfig({ withTests: false, framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'component', name: 'Button' }, testDir);
      expect((result.files as string[])).not.toContain('Button.test.tsx');
    });
  });

  describe('hook', () => {
    it('adds "use" prefix to the hook name', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'hook', name: 'Auth' }, testDir);
      expect(result.resolvedName).toBe('useAuth');
      expect(result.directory).toBe('src/hooks/useAuth');
    });

    it('does not double the "use" prefix', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'hook', name: 'UseData' }, testDir);
      expect(result.resolvedName).toBe('useData');
    });

    it('lists hook file, index, and test when withTests is true', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based', withTests: true });
      const result = handleResolveResourcePath({ type: 'hook', name: 'Auth' }, testDir);
      expect((result.files as string[])).toContain('useAuth.ts');
      expect((result.files as string[])).toContain('index.ts');
      expect((result.files as string[])).toContain('useAuth.test.ts');
    });
  });

  describe('page', () => {
    it('adds "Page" suffix to the resolved name', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'page', name: 'Dashboard' }, testDir);
      expect(result.resolvedName).toBe('DashboardPage');
      expect((result.files as string[])).toContain('DashboardPage.tsx');
    });

    it('places page in the features directory for feature-based', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'page', name: 'Dashboard' }, testDir);
      expect(result.directory).toBe('src/features/Dashboard');
    });
  });

  describe('service', () => {
    it('converts name to camelCase + Service', async () => {
      await writeConfig({ framework: 'react', pattern: 'mvc-like' });
      const result = handleResolveResourcePath({ type: 'service', name: 'User' }, testDir);
      expect(result.resolvedName).toBe('userService');
      expect(result.directory).toBe('src/services/userService');
    });
  });

  describe('context', () => {
    it('appends "Context" suffix', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'context', name: 'Auth' }, testDir);
      expect(result.resolvedName).toBe('AuthContext');
      expect(result.directory).toBe('src/contexts/AuthContext');
    });

    it('note mentions "use client" for Next.js', async () => {
      await writeConfig({ framework: 'nextjs', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'context', name: 'Auth' }, testDir);
      expect((result.note as string)).toContain('use client');
    });
  });

  describe('store', () => {
    it('applies use<Name>Store naming', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'store', name: 'Cart' }, testDir);
      expect(result.resolvedName).toBe('useCartStore');
      expect(result.directory).toBe('src/stores/useCartStore');
    });
  });

  describe('type', () => {
    it('places file directly in types directory (no subdirectory)', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'type', name: 'User' }, testDir);
      expect(result.directory).toBe('src/types');
      expect(result.resolvedName).toBe('User.types');
      expect((result.files as string[])).toContain('User.types.ts');
    });

    it('uses .js extension for JavaScript projects', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based', language: 'javascript' });
      const result = handleResolveResourcePath({ type: 'type', name: 'User' }, testDir);
      expect((result.files as string[])).toContain('User.types.js');
    });
  });

  describe('api', () => {
    it('resolves to app/api/<camelName>/route.ts for Next.js', async () => {
      await writeConfig({ framework: 'nextjs', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'api', name: 'Users' }, testDir);
      expect(result.directory).toBe('app/api/users');
      expect((result.files as string[])).toContain('route.ts');
      expect(result.resolvedName).toBe('users');
    });

    it('returns an error for React projects', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'api', name: 'Users' }, testDir) as { error: string };
      expect(result.error).toMatch(/Next\.js/);
    });
  });

  describe('feature', () => {
    it('places feature in the correct base directory', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based' });
      const result = handleResolveResourcePath({ type: 'feature', name: 'Dashboard' }, testDir);
      expect(result.directory).toBe('src/features/Dashboard');
      expect(result.resolvedName).toBe('Dashboard');
    });

    it('lists all nested files in the feature scaffold', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based', withTests: false });
      const result = handleResolveResourcePath({ type: 'feature', name: 'Dashboard' }, testDir);
      const files = result.files as string[];
      expect(files).toContain('components/DashboardView/DashboardView.tsx');
      expect(files).toContain('hooks/useDashboard/useDashboard.ts');
      expect(files).toContain('services/dashboardService/dashboardService.ts');
      expect(files).toContain('types.ts');
      expect(files).toContain('index.ts');
    });

    it('adds test files to the feature when withTests is true', async () => {
      await writeConfig({ framework: 'react', pattern: 'feature-based', withTests: true });
      const result = handleResolveResourcePath({ type: 'feature', name: 'Dashboard' }, testDir);
      const files = result.files as string[];
      expect(files).toContain('components/DashboardView/DashboardView.test.tsx');
      expect(files).toContain('hooks/useDashboard/useDashboard.test.ts');
    });
  });
});
