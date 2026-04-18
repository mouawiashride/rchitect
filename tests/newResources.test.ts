import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const {
  formTemplate,
  modalTemplate,
  providerTemplate,
  routeTemplate,
} = require('../src/utils/templates');

const { findConfig } = require('../src/utils/findConfig');

const addCommand: (type: string, name?: string, opts?: object) => Promise<void> =
  require('../src/commands/add');

// ── Base configs ──────────────────────────────────────────────────────────────

const REACT: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const NEXTJS: RchitectConfig = {
  framework: 'nextjs',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const VUE: RchitectConfig = {
  framework: 'vue',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const SVELTE: RchitectConfig = {
  framework: 'svelte',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

// ── formTemplate ──────────────────────────────────────────────────────────────

describe('formTemplate (React)', () => {
  it('resolvedName has Form suffix', () => {
    const { resolvedName } = formTemplate('Login', REACT);
    expect(resolvedName).toBe('LoginForm');
  });

  it('does not double Form suffix', () => {
    const { resolvedName } = formTemplate('LoginForm', REACT);
    expect(resolvedName).toBe('LoginForm');
  });

  it('generates a .tsx file', () => {
    const { files } = formTemplate('Login', REACT);
    expect(files['LoginForm.tsx']).toBeDefined();
  });

  it('includes handleSubmit', () => {
    const { files } = formTemplate('Login', REACT);
    expect(files['LoginForm.tsx']).toContain('handleSubmit');
  });

  it('includes useState for state management', () => {
    const { files } = formTemplate('Login', REACT);
    expect(files['LoginForm.tsx']).toContain('useState');
  });

  it('generates barrel index.ts', () => {
    const { files } = formTemplate('Login', REACT);
    expect(files['index.ts']).toBeDefined();
  });
});

describe('formTemplate (Vue)', () => {
  it('generates a .vue file', () => {
    const { files } = formTemplate('Login', VUE);
    expect(files['LoginForm.vue']).toBeDefined();
  });

  it('uses script setup', () => {
    const { files } = formTemplate('Login', VUE);
    expect(files['LoginForm.vue']).toContain('script setup');
  });
});

describe('formTemplate (Svelte)', () => {
  it('generates a .svelte file', () => {
    const { files } = formTemplate('Login', SVELTE);
    expect(files['LoginForm.svelte']).toBeDefined();
  });
});

// ── modalTemplate ─────────────────────────────────────────────────────────────

describe('modalTemplate (React)', () => {
  it('resolvedName has Modal suffix', () => {
    const { resolvedName } = modalTemplate('Confirm', REACT);
    expect(resolvedName).toBe('ConfirmModal');
  });

  it('does not double Modal suffix', () => {
    const { resolvedName } = modalTemplate('ConfirmModal', REACT);
    expect(resolvedName).toBe('ConfirmModal');
  });

  it('generates a .tsx file', () => {
    const { files } = modalTemplate('Confirm', REACT);
    expect(files['ConfirmModal.tsx']).toBeDefined();
  });

  it('includes isOpen prop', () => {
    const { files } = modalTemplate('Confirm', REACT);
    expect(files['ConfirmModal.tsx']).toContain('isOpen');
  });

  it('includes onClose handler', () => {
    const { files } = modalTemplate('Confirm', REACT);
    expect(files['ConfirmModal.tsx']).toContain('onClose');
  });

  it('generates barrel index.ts', () => {
    const { files } = modalTemplate('Confirm', REACT);
    expect(files['index.ts']).toBeDefined();
  });
});

describe('modalTemplate (Vue)', () => {
  it('generates a .vue file', () => {
    const { files } = modalTemplate('Confirm', VUE);
    expect(files['ConfirmModal.vue']).toBeDefined();
  });
});

// ── providerTemplate ──────────────────────────────────────────────────────────

describe('providerTemplate (React)', () => {
  it('resolvedName has Provider suffix', () => {
    const { resolvedName } = providerTemplate('Theme', REACT);
    expect(resolvedName).toBe('ThemeProvider');
  });

  it('does not double Provider suffix', () => {
    const { resolvedName } = providerTemplate('ThemeProvider', REACT);
    expect(resolvedName).toBe('ThemeProvider');
  });

  it('generates a .tsx file', () => {
    const { files } = providerTemplate('Theme', REACT);
    expect(files['ThemeProvider.tsx']).toBeDefined();
  });

  it('includes createContext', () => {
    const { files } = providerTemplate('Theme', REACT);
    expect(files['ThemeProvider.tsx']).toContain('createContext');
  });

  it('includes useTheme consumer hook', () => {
    const { files } = providerTemplate('Theme', REACT);
    expect(files['ThemeProvider.tsx']).toContain('useTheme');
  });

  it('generates barrel index.ts', () => {
    const { files } = providerTemplate('Theme', REACT);
    expect(files['index.ts']).toBeDefined();
  });
});

// ── routeTemplate ─────────────────────────────────────────────────────────────

describe('routeTemplate (Next.js)', () => {
  it('generates page, layout, and loading files', () => {
    const { files } = routeTemplate('Dashboard', NEXTJS);
    expect(files['page.tsx']).toBeDefined();
    expect(files['layout.tsx']).toBeDefined();
    expect(files['loading.tsx']).toBeDefined();
  });

  it('page includes export default function', () => {
    const { files } = routeTemplate('Dashboard', NEXTJS);
    expect(files['page.tsx']).toContain('export default function');
  });

  it('resolvedName is Dashboard', () => {
    const { resolvedName } = routeTemplate('Dashboard', NEXTJS);
    expect(resolvedName).toBe('Dashboard');
  });
});

describe('routeTemplate (Vue/Nuxt)', () => {
  const NUXT: RchitectConfig = { ...REACT, framework: 'nuxt' };

  it('generates a .vue file', () => {
    const { files } = routeTemplate('Profile', NUXT);
    expect(files['Profile.vue']).toBeDefined();
  });

  it('uses script setup', () => {
    const { files } = routeTemplate('Profile', NUXT);
    expect(files['Profile.vue']).toContain('script setup');
  });
});

// ── findConfig (monorepo) ─────────────────────────────────────────────────────

const TMP_MONO = path.join(__dirname, '.tmp-monorepo');

describe('findConfig (monorepo support)', () => {
  beforeEach(async () => {
    // Root workspace config
    await fs.ensureDir(path.join(TMP_MONO, 'packages/app/src'));
    await fs.writeJson(path.join(TMP_MONO, '.rchitect.json'), REACT);
  });

  afterEach(async () => {
    await fs.remove(TMP_MONO);
  });

  it('finds config in parent directory', async () => {
    const result = await findConfig(path.join(TMP_MONO, 'packages/app/src'));
    expect(result).not.toBeNull();
    expect(result!.config.framework).toBe('react');
  });

  it('returns configDir as the directory containing the config', async () => {
    const result = await findConfig(path.join(TMP_MONO, 'packages/app/src'));
    expect(result!.configDir).toBe(TMP_MONO);
  });

  it('returns null when no config found', async () => {
    const tmpNoConfig = path.join(__dirname, '.tmp-noconfig');
    await fs.ensureDir(tmpNoConfig);
    try {
      const result = await findConfig(tmpNoConfig);
      expect(result).toBeNull();
    } finally {
      await fs.remove(tmpNoConfig);
    }
  });

  it('finds config in same directory', async () => {
    const result = await findConfig(TMP_MONO);
    expect(result).not.toBeNull();
    expect(result!.configDir).toBe(TMP_MONO);
  });
});

// ── add command integration (new resource types) ──────────────────────────────

const TMP = path.join(__dirname, '.tmp-new-resources');

describe('add command — new resource types (React)', () => {
  beforeEach(async () => {
    await fs.ensureDir(TMP);
    await fs.writeJson(path.join(TMP, '.rchitect.json'), REACT);
    jest.spyOn(process, 'cwd').mockReturnValue(TMP);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(TMP);
  });

  it('creates a form component', async () => {
    await addCommand('form', 'Login', {});
    const formDir = path.join(TMP, 'src/components/shared/LoginForm');
    expect(await fs.pathExists(formDir)).toBe(true);
    expect(await fs.pathExists(path.join(formDir, 'LoginForm.tsx'))).toBe(true);
  });

  it('creates a modal component', async () => {
    await addCommand('modal', 'Confirm', {});
    const modalDir = path.join(TMP, 'src/components/shared/ConfirmModal');
    expect(await fs.pathExists(modalDir)).toBe(true);
    expect(await fs.pathExists(path.join(modalDir, 'ConfirmModal.tsx'))).toBe(true);
  });

  it('creates a provider', async () => {
    await addCommand('provider', 'Theme', {});
    const providerDir = path.join(TMP, 'src/contexts/ThemeProvider');
    expect(await fs.pathExists(providerDir)).toBe(true);
    expect(await fs.pathExists(path.join(providerDir, 'ThemeProvider.tsx'))).toBe(true);
  });

  it('treats composable as alias for hook', async () => {
    await addCommand('composable', 'Auth', {});
    expect(await fs.pathExists(path.join(TMP, 'src/hooks/useAuth'))).toBe(true);
  });

  it('auto-detects component type from PascalCase name', async () => {
    await addCommand('Button', undefined, {});
    expect(await fs.pathExists(path.join(TMP, 'src/components/shared/Button'))).toBe(true);
  });

  it('auto-detects hook type from use prefix', async () => {
    await addCommand('useCounter', undefined, {});
    expect(await fs.pathExists(path.join(TMP, 'src/hooks/useCounter'))).toBe(true);
  });
});

// ── add command — Next.js route ───────────────────────────────────────────────

const TMP_NEXT = path.join(__dirname, '.tmp-next-route');

describe('add command — route type (Next.js)', () => {
  beforeEach(async () => {
    await fs.ensureDir(TMP_NEXT);
    await fs.writeJson(path.join(TMP_NEXT, '.rchitect.json'), NEXTJS);
    jest.spyOn(process, 'cwd').mockReturnValue(TMP_NEXT);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(TMP_NEXT);
  });

  it('creates a route with page, layout, loading files', async () => {
    await addCommand('route', 'Dashboard', {});
    const routeDir = path.join(TMP_NEXT, 'app/Dashboard');
    expect(await fs.pathExists(routeDir)).toBe(true);
    expect(await fs.pathExists(path.join(routeDir, 'page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(routeDir, 'layout.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(routeDir, 'loading.tsx'))).toBe(true);
  });
});
