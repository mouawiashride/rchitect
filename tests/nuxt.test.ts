import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const {
  componentTemplate,
  hookTemplate,
  pageTemplate,
  storeTemplate,
  contextTemplate,
  featureTemplate,
  nuxtApiTemplate,
  nuxtLayoutTemplate,
  nuxtMiddlewareTemplate,
  getExtensions,
} = require('../src/utils/templates');

const addCommand: (type: string, name?: string, opts?: object) => Promise<void> =
  require('../src/commands/add');

// ── Base config ───────────────────────────────────────────────────────────────

const NUXT: RchitectConfig = {
  framework: 'nuxt',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const NUXT_JS: RchitectConfig = { ...NUXT, language: 'javascript' };
const NUXT_TAILWIND: RchitectConfig = { ...NUXT, styling: 'tailwind' };

// ── getExtensions ─────────────────────────────────────────────────────────────

describe('getExtensions for Nuxt', () => {
  it('compExt is vue', () => {
    expect(getExtensions(NUXT).compExt).toBe('vue');
  });

  it('scriptExt is ts for TypeScript', () => {
    expect(getExtensions(NUXT).scriptExt).toBe('ts');
  });

  it('scriptExt is js for JavaScript', () => {
    expect(getExtensions(NUXT_JS).scriptExt).toBe('js');
  });
});

// ── Component ─────────────────────────────────────────────────────────────────

describe('Nuxt componentTemplate', () => {
  it('generates a .vue SFC file', () => {
    const files = componentTemplate('Card', NUXT);
    expect(files['Card.vue']).toBeDefined();
  });

  it('uses <script setup lang="ts">', () => {
    const files = componentTemplate('Card', NUXT);
    expect(files['Card.vue']).toContain('<script setup lang="ts">');
  });

  it('uses <script setup> without lang for JS', () => {
    const files = componentTemplate('Card', NUXT_JS);
    expect(files['Card.vue']).toContain('<script setup>');
    expect(files['Card.vue']).not.toContain('lang="ts"');
  });

  it('includes <style scoped> for non-Tailwind', () => {
    const files = componentTemplate('Card', NUXT);
    expect(files['Card.vue']).toContain('<style scoped>');
  });

  it('omits <style scoped> for Tailwind', () => {
    const files = componentTemplate('Card', NUXT_TAILWIND);
    expect(files['Card.vue']).not.toContain('<style');
  });

  it('includes barrel index.ts', () => {
    const files = componentTemplate('Card', NUXT);
    expect(files['index.ts']).toContain("from './Card.vue'");
  });
});

// ── Hook / Composable ─────────────────────────────────────────────────────────

describe('Nuxt hookTemplate', () => {
  it('prefixes name with use', () => {
    const { resolvedName } = hookTemplate('Auth', NUXT);
    expect(resolvedName).toBe('useAuth');
  });

  it('generates a composable .ts file', () => {
    const { files } = hookTemplate('Auth', NUXT);
    expect(files['useAuth.ts']).toBeDefined();
  });

  it('uses Vue ref/computed imports', () => {
    const { files } = hookTemplate('Auth', NUXT);
    expect(files['useAuth.ts']).toContain("from 'vue'");
  });

  it('generates .js for JavaScript config', () => {
    const { files } = hookTemplate('Auth', NUXT_JS);
    expect(files['useAuth.js']).toBeDefined();
  });
});

// ── Page ──────────────────────────────────────────────────────────────────────

describe('Nuxt pageTemplate', () => {
  it('generates a .vue page file', () => {
    const files = pageTemplate('Dashboard', NUXT);
    expect(files['DashboardPage.vue']).toBeDefined();
  });

  it('page uses <script setup>', () => {
    const files = pageTemplate('Dashboard', NUXT);
    expect(files['DashboardPage.vue']).toContain('<script setup');
  });
});

// ── Store ─────────────────────────────────────────────────────────────────────

describe('Nuxt storeTemplate', () => {
  it('generates a Pinia store file', () => {
    const { files, resolvedName } = storeTemplate('Cart', NUXT);
    expect(resolvedName).toBe('useCartStore');
    expect(files['useCartStore.ts']).toBeDefined();
  });

  it('uses defineStore from pinia', () => {
    const { files } = storeTemplate('Cart', NUXT);
    expect(files['useCartStore.ts']).toContain("from 'pinia'");
  });

  it('includes TypeScript state interface', () => {
    const { files } = storeTemplate('Cart', NUXT);
    expect(files['useCartStore.ts']).toContain('interface CartState');
  });
});

// ── Context ───────────────────────────────────────────────────────────────────

describe('Nuxt contextTemplate', () => {
  it('uses Vue provide/inject', () => {
    const { files } = contextTemplate('Theme', NUXT);
    expect(files['ThemeContext.ts']).toContain("from 'vue'");
  });

  it('generates provide and use functions', () => {
    const { files } = contextTemplate('Theme', NUXT);
    expect(files['ThemeContext.ts']).toContain('provideTheme');
    expect(files['ThemeContext.ts']).toContain('useTheme');
  });
});

// ── Feature ───────────────────────────────────────────────────────────────────

describe('Nuxt featureTemplate', () => {
  it('generates a vue view component', () => {
    const { files } = featureTemplate('Auth', NUXT);
    expect(files['components/AuthView/AuthView.vue']).toBeDefined();
  });

  it('generates a composable', () => {
    const { files } = featureTemplate('Auth', NUXT);
    expect(files['composables/useAuth/useAuth.ts']).toBeDefined();
  });
});

// ── Nuxt API template ─────────────────────────────────────────────────────────

describe('nuxtApiTemplate', () => {
  it('generates a server API handler file', () => {
    const { files, resolvedName } = nuxtApiTemplate('Users', NUXT);
    expect(resolvedName).toBe('users');
    expect(files['users.ts']).toBeDefined();
  });

  it('uses defineEventHandler', () => {
    const { files } = nuxtApiTemplate('Users', NUXT);
    expect(files['users.ts']).toContain('defineEventHandler');
  });

  it('generates .js for JavaScript config', () => {
    const { files } = nuxtApiTemplate('Users', NUXT_JS);
    expect(files['users.js']).toBeDefined();
  });
});

// ── Nuxt Layout template ──────────────────────────────────────────────────────

describe('nuxtLayoutTemplate', () => {
  it('generates a .vue layout file', () => {
    const { files, resolvedName } = nuxtLayoutTemplate('Default', NUXT);
    expect(resolvedName).toBe('Default');
    expect(files['Default.vue']).toBeDefined();
  });

  it('includes a <slot /> element', () => {
    const { files } = nuxtLayoutTemplate('Default', NUXT);
    expect(files['Default.vue']).toContain('<slot />');
  });

  it('includes <style scoped> for non-Tailwind', () => {
    const { files } = nuxtLayoutTemplate('Default', NUXT);
    expect(files['Default.vue']).toContain('<style scoped>');
  });

  it('omits <style> for Tailwind', () => {
    const { files } = nuxtLayoutTemplate('Default', NUXT_TAILWIND);
    expect(files['Default.vue']).not.toContain('<style');
  });
});

// ── Nuxt Middleware template ──────────────────────────────────────────────────

describe('nuxtMiddlewareTemplate', () => {
  it('generates a middleware file', () => {
    const { files, resolvedName } = nuxtMiddlewareTemplate('Auth', NUXT);
    expect(resolvedName).toBe('auth');
    expect(files['auth.ts']).toBeDefined();
  });

  it('uses defineNuxtRouteMiddleware', () => {
    const { files } = nuxtMiddlewareTemplate('Auth', NUXT);
    expect(files['auth.ts']).toContain('defineNuxtRouteMiddleware');
  });

  it('generates .js for JavaScript config', () => {
    const { files } = nuxtMiddlewareTemplate('Auth', NUXT_JS);
    expect(files['auth.js']).toBeDefined();
  });
});

// ── Structures ────────────────────────────────────────────────────────────────

describe('Nuxt structures', () => {
  const structures = require('../src/structures/nuxt');
  const patterns = ['feature-based', 'atomic-design', 'domain-driven', 'mvc-like'] as const;

  for (const pattern of patterns) {
    describe(`pattern: ${pattern}`, () => {
      const s = structures[pattern];

      it('has a folders array', () => {
        expect(Array.isArray(s.folders)).toBe(true);
        expect(s.folders.length).toBeGreaterThan(0);
      });

      it('folders do not start with src/', () => {
        for (const f of s.folders) {
          expect(f).not.toMatch(/^src\//);
        }
      });

      it('hookPath returns composables path', () => {
        expect(s.hookPath()).toContain('composables');
      });

      it('pagePath returns pages', () => {
        expect(s.pagePath()).toBe('pages');
      });

      it('apiPath returns server/api', () => {
        expect(s.apiPath()).toBe('server/api');
      });

      it('layoutPath returns layouts', () => {
        expect(s.layoutPath()).toBe('layouts');
      });

      it('middlewarePath returns middleware', () => {
        expect(s.middlewarePath()).toBe('middleware');
      });
    });
  }
});

// ── Integration: add command ──────────────────────────────────────────────────

describe('add command integration (Nuxt)', () => {
  const tmpDir = path.join(__dirname, '.tmp-nuxt-add');

  beforeEach(async () => {
    await fs.ensureDir(tmpDir);
    await fs.writeJson(path.join(tmpDir, '.rchitect.json'), NUXT);
    jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(tmpDir);
  });

  it('creates a Nuxt component', async () => {
    await addCommand('component', 'Header', {});
    const file = path.join(tmpDir, 'components/shared/Header/Header.vue');
    const exists = await fs.pathExists(file);
    expect(exists).toBe(true);
  });

  it('creates a Nuxt composable', async () => {
    await addCommand('hook', 'Counter', {});
    const file = path.join(tmpDir, 'composables/useCounter/useCounter.ts');
    const exists = await fs.pathExists(file);
    expect(exists).toBe(true);
  });

  it('creates a Pinia store', async () => {
    await addCommand('store', 'Cart', {});
    const file = path.join(tmpDir, 'stores/useCartStore/useCartStore.ts');
    const exists = await fs.pathExists(file);
    expect(exists).toBe(true);
  });

  it('creates a Nuxt API handler', async () => {
    await addCommand('api', 'Products', {});
    const file = path.join(tmpDir, 'server/api/products.ts');
    const exists = await fs.pathExists(file);
    expect(exists).toBe(true);
  });

  it('creates a Nuxt layout', async () => {
    await addCommand('layout', 'Default', {});
    const file = path.join(tmpDir, 'layouts/Default.vue');
    const exists = await fs.pathExists(file);
    expect(exists).toBe(true);
  });

  it('creates a Nuxt middleware', async () => {
    await addCommand('middleware', 'Auth', {});
    const file = path.join(tmpDir, 'middleware/auth.ts');
    const exists = await fs.pathExists(file);
    expect(exists).toBe(true);
  });
});

// ── detect.js ─────────────────────────────────────────────────────────────────

describe('detectFramework for Nuxt', () => {
  const { detectFramework } = require('../src/utils/detect');
  const tmpDir = path.join(__dirname, '.tmp-nuxt-detect');

  beforeEach(async () => {
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('detects nuxt from dependencies', async () => {
    await fs.writeJson(path.join(tmpDir, 'package.json'), {
      dependencies: { nuxt: '^3.0.0' },
    });
    const fw = await detectFramework(tmpDir);
    expect(fw).toBe('nuxt');
  });

  it('prioritizes nuxt over vue', async () => {
    await fs.writeJson(path.join(tmpDir, 'package.json'), {
      dependencies: { nuxt: '^3.0.0', vue: '^3.0.0' },
    });
    const fw = await detectFramework(tmpDir);
    expect(fw).toBe('nuxt');
  });
});
