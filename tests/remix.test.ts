import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const {
  componentTemplate,
  hookTemplate,
  pageTemplate,
  serviceTemplate,
  contextTemplate,
  storeTemplate,
  featureTemplate,
  routeTemplate,
  formTemplate,
  modalTemplate,
  providerTemplate,
  getExtensions,
} = require('../src/utils/templates');

const remixStructures = require('../src/structures/remix');
const addCommand: (type: string, name?: string, opts?: object) => Promise<void> =
  require('../src/commands/add');

// ── Base config ───────────────────────────────────────────────────────────────

const REMIX: RchitectConfig = {
  framework: 'remix',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const REMIX_JS: RchitectConfig = { ...REMIX, language: 'javascript' };
const REMIX_TAILWIND: RchitectConfig = { ...REMIX, styling: 'tailwind' };

// ── Extensions ────────────────────────────────────────────────────────────────

describe('getExtensions for Remix', () => {
  it('compExt is tsx for TypeScript', () => {
    expect(getExtensions(REMIX).compExt).toBe('tsx');
  });

  it('compExt is jsx for JavaScript', () => {
    expect(getExtensions(REMIX_JS).compExt).toBe('jsx');
  });

  it('scriptExt is ts for TypeScript', () => {
    expect(getExtensions(REMIX).scriptExt).toBe('ts');
  });
});

// ── Structures ────────────────────────────────────────────────────────────────

describe('Remix structures', () => {
  it('has all 4 patterns', () => {
    expect(remixStructures['atomic-design']).toBeDefined();
    expect(remixStructures['feature-based']).toBeDefined();
    expect(remixStructures['domain-driven']).toBeDefined();
    expect(remixStructures['mvc-like']).toBeDefined();
  });

  it('feature-based uses app/ prefix', () => {
    const s = remixStructures['feature-based'];
    expect(s.folders.some((f: string) => f.startsWith('app/'))).toBe(true);
  });

  it('pagePath returns app/routes', () => {
    const s = remixStructures['feature-based'];
    expect(s.pagePath()).toContain('routes');
  });

  it('hookPath returns app/hooks', () => {
    const s = remixStructures['feature-based'];
    expect(s.hookPath()).toContain('hooks');
  });
});

// ── Component ─────────────────────────────────────────────────────────────────

describe('Remix componentTemplate', () => {
  it('generates a .tsx file', () => {
    const files = componentTemplate('Button', REMIX);
    expect(files['Button.tsx']).toBeDefined();
  });

  it('exports default Button', () => {
    const files = componentTemplate('Button', REMIX);
    expect(files['Button.tsx']).toContain('export default Button');
  });

  it('includes style module for non-Tailwind', () => {
    const files = componentTemplate('Button', REMIX);
    expect(files['Button.module.css']).toBeDefined();
  });

  it('omits style file for Tailwind', () => {
    const files = componentTemplate('Button', REMIX_TAILWIND);
    expect(files['Button.module.css']).toBeUndefined();
  });

  it('includes barrel index.ts', () => {
    const files = componentTemplate('Button', REMIX);
    expect(files['index.ts']).toBeDefined();
  });
});

// ── Hook ─────────────────────────────────────────────────────────────────────

describe('Remix hookTemplate', () => {
  it('adds use prefix', () => {
    const { resolvedName } = hookTemplate('Auth', REMIX);
    expect(resolvedName).toBe('useAuth');
  });

  it('generates .ts file', () => {
    const { files } = hookTemplate('Counter', REMIX);
    expect(files['useCounter.ts']).toBeDefined();
  });

  it('uses useState from react', () => {
    const { files } = hookTemplate('Counter', REMIX);
    expect(files['useCounter.ts']).toContain("from 'react'");
  });
});

// ── Route template ────────────────────────────────────────────────────────────

describe('Remix routeTemplate', () => {
  it('generates a route file with loader', () => {
    const { files, resolvedName } = routeTemplate('Dashboard', REMIX);
    expect(resolvedName).toBe('Dashboard');
    const routeFile = Object.keys(files).find(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
    expect(routeFile).toBeDefined();
    if (routeFile) {
      expect(files[routeFile]).toContain('loader');
    }
  });

  it('includes MetaFunction export', () => {
    const { files } = routeTemplate('Profile', REMIX);
    const routeFile = Object.keys(files).find(f => f.endsWith('.tsx'));
    if (routeFile) {
      expect(files[routeFile]).toContain('MetaFunction');
    }
  });

  it('generates .jsx for JavaScript config', () => {
    const { files } = routeTemplate('Home', REMIX_JS);
    const routeFile = Object.keys(files).find(f => f.endsWith('.jsx'));
    expect(routeFile).toBeDefined();
  });
});

// ── Form ──────────────────────────────────────────────────────────────────────

describe('Remix formTemplate', () => {
  it('generates a form component', () => {
    const { files, resolvedName } = formTemplate('Login', REMIX);
    expect(resolvedName).toBe('LoginForm');
  });

  it('generates a .tsx file', () => {
    const { files } = formTemplate('Login', REMIX);
    expect(files['LoginForm.tsx']).toBeDefined();
  });
});

// ── Modal ─────────────────────────────────────────────────────────────────────

describe('Remix modalTemplate', () => {
  it('generates a modal component', () => {
    const { resolvedName } = modalTemplate('Confirm', REMIX);
    expect(resolvedName).toBe('ConfirmModal');
  });

  it('generates a .tsx file', () => {
    const { files } = modalTemplate('Confirm', REMIX);
    expect(files['ConfirmModal.tsx']).toBeDefined();
  });
});

// ── Provider ──────────────────────────────────────────────────────────────────

describe('Remix providerTemplate', () => {
  it('generates a provider component', () => {
    const { resolvedName } = providerTemplate('Theme', REMIX);
    expect(resolvedName).toBe('ThemeProvider');
  });

  it('includes useTheme hook', () => {
    const { files } = providerTemplate('Theme', REMIX);
    const providerFile = files['ThemeProvider.tsx'];
    expect(providerFile).toContain('useTheme');
  });
});

// ── add command (integration) ─────────────────────────────────────────────────

const TMP = path.join(__dirname, '.tmp-remix');

describe('Remix add command', () => {
  beforeEach(async () => {
    await fs.ensureDir(TMP);
    await fs.writeJson(path.join(TMP, '.rchitect.json'), REMIX);
    jest.spyOn(process, 'cwd').mockReturnValue(TMP);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(TMP);
  });

  it('creates a component in app/components', async () => {
    await addCommand('component', 'Card', {});
    expect(await fs.pathExists(path.join(TMP, 'app/components/Card/Card.tsx'))).toBe(true);
  });

  it('creates a hook in app/hooks', async () => {
    await addCommand('hook', 'Auth', {});
    expect(await fs.pathExists(path.join(TMP, 'app/hooks/useAuth/useAuth.ts'))).toBe(true);
  });

  it('creates a page in app/routes', async () => {
    await addCommand('page', 'Dashboard', {});
    const pageDir = path.join(TMP, 'app/routes/Dashboard');
    expect(await fs.pathExists(pageDir)).toBe(true);
  });

  it('creates a form component', async () => {
    await addCommand('form', 'Login', {});
    const formDir = path.join(TMP, 'app/components/LoginForm');
    expect(await fs.pathExists(formDir)).toBe(true);
  });

  it('creates a feature scaffold', async () => {
    await addCommand('feature', 'Auth', {});
    expect(await fs.pathExists(path.join(TMP, 'app/features/Auth'))).toBe(true);
  });
});
