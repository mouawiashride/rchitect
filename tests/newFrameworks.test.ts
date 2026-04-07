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
  getExtensions,
} = require('../src/utils/templates');

const addCommand: (type: string, name?: string, opts?: object) => Promise<void> =
  require('../src/commands/add');

// ── Base configs ──────────────────────────────────────────────────────────────

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

const SOLID: RchitectConfig = {
  framework: 'solidjs',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

// ── getExtensions ─────────────────────────────────────────────────────────────

describe('getExtensions for new frameworks', () => {
  it('Vue: compExt is vue', () => {
    expect(getExtensions(VUE).compExt).toBe('vue');
  });

  it('Svelte: compExt is svelte', () => {
    expect(getExtensions(SVELTE).compExt).toBe('svelte');
  });

  it('SolidJS TypeScript: compExt is tsx', () => {
    expect(getExtensions(SOLID).compExt).toBe('tsx');
  });

  it('SolidJS JavaScript: compExt is jsx', () => {
    expect(getExtensions({ ...SOLID, language: 'javascript' }).compExt).toBe('jsx');
  });
});

// ── Vue templates ─────────────────────────────────────────────────────────────

describe('Vue componentTemplate', () => {
  it('generates a .vue file', () => {
    const files = componentTemplate('Button', VUE);
    expect(files['Button.vue']).toBeDefined();
  });

  it('does not generate a .tsx file', () => {
    const files = componentTemplate('Button', VUE);
    expect(files['Button.tsx']).toBeUndefined();
  });

  it('uses <script setup lang="ts"> for TypeScript', () => {
    const files = componentTemplate('Button', VUE);
    expect(files['Button.vue']).toContain('<script setup lang="ts">');
  });

  it('uses <script setup> (no lang) for JavaScript', () => {
    const files = componentTemplate('Button', { ...VUE, language: 'javascript' });
    expect(files['Button.vue']).toContain('<script setup>');
    expect(files['Button.vue']).not.toContain('lang="ts"');
  });

  it('uses defineProps', () => {
    const files = componentTemplate('Button', VUE);
    expect(files['Button.vue']).toContain('defineProps');
  });

  it('includes <template> block', () => {
    const files = componentTemplate('Button', VUE);
    expect(files['Button.vue']).toContain('<template>');
  });

  it('includes <style scoped> for css styling', () => {
    const files = componentTemplate('Button', VUE);
    expect(files['Button.vue']).toContain('<style scoped>');
  });

  it('no <style> block for tailwind', () => {
    const files = componentTemplate('Button', { ...VUE, styling: 'tailwind' });
    expect(files['Button.vue']).not.toContain('<style');
  });

  it('no separate .module.css file', () => {
    const files = componentTemplate('Button', VUE);
    expect(files['Button.module.css']).toBeUndefined();
  });

  it('generates index.ts barrel', () => {
    const files = componentTemplate('Button', VUE);
    expect(files['index.ts']).toContain("from './Button.vue'");
  });

  it('with tests: generates .test.ts (not .test.vue)', () => {
    const files = componentTemplate('Button', { ...VUE, withTests: true });
    expect(files['Button.test.ts']).toBeDefined();
    expect(files['Button.test.vue']).toBeUndefined();
  });

  it('test file uses @vue/test-utils', () => {
    const files = componentTemplate('Button', { ...VUE, withTests: true });
    expect(files['Button.test.ts']).toContain('@vue/test-utils');
  });
});

describe('Vue hookTemplate (composable)', () => {
  it('generates a .ts composable file', () => {
    const { files, resolvedName } = hookTemplate('Auth', VUE);
    expect(resolvedName).toBe('useAuth');
    expect(files['useAuth.ts']).toBeDefined();
  });

  it('imports from vue', () => {
    const { files } = hookTemplate('Auth', VUE);
    expect(files['useAuth.ts']).toContain("from 'vue'");
  });

  it('uses ref and computed', () => {
    const { files } = hookTemplate('Auth', VUE);
    expect(files['useAuth.ts']).toContain('ref');
  });
});

describe('Vue storeTemplate (Pinia)', () => {
  it('generates a Pinia store', () => {
    const { files, resolvedName } = storeTemplate('Cart', VUE);
    expect(resolvedName).toBe('useCartStore');
    expect(files['useCartStore.ts']).toBeDefined();
  });

  it('imports defineStore from pinia', () => {
    const { files } = storeTemplate('Cart', VUE);
    expect(files['useCartStore.ts']).toContain("from 'pinia'");
    expect(files['useCartStore.ts']).toContain('defineStore');
  });

  it('has state/getters/actions structure', () => {
    const { files } = storeTemplate('Cart', VUE);
    expect(files['useCartStore.ts']).toContain('state');
    expect(files['useCartStore.ts']).toContain('actions');
  });

  it('TypeScript version has interface', () => {
    const { files } = storeTemplate('Cart', VUE);
    expect(files['useCartStore.ts']).toContain('interface CartState');
  });

  it('JavaScript version has no interface', () => {
    const { files } = storeTemplate('Cart', { ...VUE, language: 'javascript' });
    expect(files['useCartStore.js']).not.toContain('interface');
  });

  it('with tests: generates Pinia test with setActivePinia', () => {
    const { files } = storeTemplate('Cart', { ...VUE, withTests: true });
    expect(files['useCartStore.test.ts']).toContain('setActivePinia');
    expect(files['useCartStore.test.ts']).toContain('createPinia');
  });
});

describe('Vue contextTemplate (provide/inject)', () => {
  it('generates a provide/inject context file', () => {
    const { files, resolvedName } = contextTemplate('Auth', VUE);
    expect(resolvedName).toBe('AuthContext');
    expect(files['AuthContext.ts']).toBeDefined();
  });

  it('imports from vue', () => {
    const { files } = contextTemplate('Auth', VUE);
    expect(files['AuthContext.ts']).toContain("from 'vue'");
  });

  it('uses InjectionKey for TypeScript', () => {
    const { files } = contextTemplate('Auth', VUE);
    expect(files['AuthContext.ts']).toContain('InjectionKey');
  });

  it('exports provideAuth and useAuth', () => {
    const { files } = contextTemplate('Auth', VUE);
    expect(files['AuthContext.ts']).toContain('provideAuth');
    expect(files['AuthContext.ts']).toContain('useAuth');
  });

  it('throws when used outside provider', () => {
    const { files } = contextTemplate('Auth', VUE);
    expect(files['AuthContext.ts']).toContain('throw new Error');
  });
});

describe('Vue featureTemplate', () => {
  it('generates .vue view component', () => {
    const { files } = featureTemplate('Dashboard', VUE);
    expect(files['components/DashboardView/DashboardView.vue']).toBeDefined();
  });

  it('generates composable file', () => {
    const { files } = featureTemplate('Dashboard', VUE);
    expect(files['composables/useDashboard/useDashboard.ts']).toBeDefined();
  });

  it('composable imports from vue', () => {
    const { files } = featureTemplate('Dashboard', VUE);
    expect(files['composables/useDashboard/useDashboard.ts']).toContain("from 'vue'");
  });
});

// ── Svelte templates ──────────────────────────────────────────────────────────

describe('Svelte componentTemplate', () => {
  it('generates a .svelte file', () => {
    const files = componentTemplate('Card', SVELTE);
    expect(files['Card.svelte']).toBeDefined();
  });

  it('does not generate a .tsx file', () => {
    const files = componentTemplate('Card', SVELTE);
    expect(files['Card.tsx']).toBeUndefined();
  });

  it('uses $props() rune', () => {
    const files = componentTemplate('Card', SVELTE);
    expect(files['Card.svelte']).toContain('$props()');
  });

  it('has <script lang="ts"> for TypeScript', () => {
    const files = componentTemplate('Card', SVELTE);
    expect(files['Card.svelte']).toContain('<script lang="ts">');
  });

  it('has <script> (no lang) for JavaScript', () => {
    const files = componentTemplate('Card', { ...SVELTE, language: 'javascript' });
    expect(files['Card.svelte']).toContain('<script>');
  });

  it('includes <style> block for css', () => {
    const files = componentTemplate('Card', SVELTE);
    expect(files['Card.svelte']).toContain('<style>');
  });

  it('no <style> block for tailwind', () => {
    const files = componentTemplate('Card', { ...SVELTE, styling: 'tailwind' });
    expect(files['Card.svelte']).not.toContain('<style>');
  });

  it('no separate .module.css file', () => {
    const files = componentTemplate('Card', SVELTE);
    expect(files['Card.module.css']).toBeUndefined();
  });

  it('with tests: generates .test.ts (not .test.svelte)', () => {
    const files = componentTemplate('Card', { ...SVELTE, withTests: true });
    expect(files['Card.test.ts']).toBeDefined();
    expect(files['Card.test.svelte']).toBeUndefined();
  });

  it('test file uses @testing-library/svelte', () => {
    const files = componentTemplate('Card', { ...SVELTE, withTests: true });
    expect(files['Card.test.ts']).toContain('@testing-library/svelte');
  });
});

describe('Svelte storeTemplate (writable)', () => {
  it('generates a writable store file', () => {
    const { files, resolvedName } = storeTemplate('Cart', SVELTE);
    expect(resolvedName).toBe('cartStore');
    expect(files['cartStore.ts']).toBeDefined();
  });

  it('imports from svelte/store', () => {
    const { files } = storeTemplate('Cart', SVELTE);
    expect(files['cartStore.ts']).toContain("from 'svelte/store'");
  });

  it('uses writable', () => {
    const { files } = storeTemplate('Cart', SVELTE);
    expect(files['cartStore.ts']).toContain('writable');
  });

  it('has subscribe method', () => {
    const { files } = storeTemplate('Cart', SVELTE);
    expect(files['cartStore.ts']).toContain('subscribe');
  });

  it('with tests: checks subscribe method', () => {
    const { files } = storeTemplate('Cart', { ...SVELTE, withTests: true });
    expect(files['cartStore.test.ts']).toContain('subscribe');
    expect(files['cartStore.test.ts']).toContain("from 'svelte/store'");
  });
});

describe('Svelte contextTemplate (setContext/getContext)', () => {
  it('uses Svelte setContext and getContext', () => {
    const { files } = contextTemplate('Auth', SVELTE);
    expect(files['AuthContext.ts']).toContain("from 'svelte'");
    expect(files['AuthContext.ts']).toContain('setContext');
    expect(files['AuthContext.ts']).toContain('getContext');
  });

  it('exports setAuthContext and getAuthContext', () => {
    const { files } = contextTemplate('Auth', SVELTE);
    expect(files['AuthContext.ts']).toContain('setAuthContext');
    expect(files['AuthContext.ts']).toContain('getAuthContext');
  });
});

// ── SolidJS templates ─────────────────────────────────────────────────────────

describe('SolidJS componentTemplate', () => {
  it('generates a .tsx file', () => {
    const files = componentTemplate('Button', SOLID);
    expect(files['Button.tsx']).toBeDefined();
  });

  it('imports Component type from solid-js', () => {
    const files = componentTemplate('Button', SOLID);
    expect(files['Button.tsx']).toContain("from 'solid-js'");
    expect(files['Button.tsx']).toContain('Component');
  });

  it('uses class (not className) for styling', () => {
    const files = componentTemplate('Button', SOLID);
    expect(files['Button.tsx']).toContain('class={styles.container}');
    expect(files['Button.tsx']).not.toContain('className=');
  });

  it('with tailwind: uses class="container" (not className)', () => {
    const files = componentTemplate('Button', { ...SOLID, styling: 'tailwind' });
    expect(files['Button.tsx']).toContain('class="container"');
    expect(files['Button.tsx']).not.toContain('className=');
  });

  it('generates separate .module.css for css styling', () => {
    const files = componentTemplate('Button', SOLID);
    expect(files['Button.module.css']).toBeDefined();
  });

  it('no .module.css for tailwind', () => {
    const files = componentTemplate('Button', { ...SOLID, styling: 'tailwind' });
    expect(files['Button.module.css']).toBeUndefined();
  });

  it('with tests: uses @solidjs/testing-library', () => {
    const files = componentTemplate('Button', { ...SOLID, withTests: true });
    expect(files['Button.test.tsx']).toContain('@solidjs/testing-library');
  });
});

describe('SolidJS hookTemplate', () => {
  it('generates a hook with solid-js imports', () => {
    const { files } = hookTemplate('Auth', SOLID);
    expect(files['useAuth.ts']).toContain("from 'solid-js'");
    expect(files['useAuth.ts']).toContain('createSignal');
  });
});

describe('SolidJS storeTemplate (createStore)', () => {
  it('generates a SolidJS store', () => {
    const { files, resolvedName } = storeTemplate('Cart', SOLID);
    expect(resolvedName).toBe('useCartStore');
    expect(files['useCartStore.ts']).toBeDefined();
  });

  it('imports from solid-js/store', () => {
    const { files } = storeTemplate('Cart', SOLID);
    expect(files['useCartStore.ts']).toContain("from 'solid-js/store'");
    expect(files['useCartStore.ts']).toContain('createStore');
  });
});

describe('SolidJS contextTemplate', () => {
  it('uses createContext and useContext from solid-js', () => {
    const { files } = contextTemplate('Auth', SOLID);
    expect(files['AuthContext.tsx']).toContain("from 'solid-js'");
    expect(files['AuthContext.tsx']).toContain('createContext');
    expect(files['AuthContext.tsx']).toContain('useContext');
  });

  it('uses ParentComponent for provider', () => {
    const { files } = contextTemplate('Auth', SOLID);
    expect(files['AuthContext.tsx']).toContain('ParentComponent');
  });

  it('uses props.children (not {children})', () => {
    const { files } = contextTemplate('Auth', SOLID);
    expect(files['AuthContext.tsx']).toContain('props.children');
  });
});

// ── add command integration ───────────────────────────────────────────────────

describe('add component for Vue', () => {
  const testDir = path.join(__dirname, '.tmp-vue-add');
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

  it('creates Button.vue for Vue project', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), VUE);
    await addCommand('component', 'Button', {});
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Button/Button.vue'))).toBe(true);
  });

  it('creates hook in src/composables for Vue', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), VUE);
    await addCommand('hook', 'Auth', {});
    expect(await fs.pathExists(path.join(testDir, 'src/composables/useAuth/useAuth.ts'))).toBe(true);
  });

  it('creates Pinia store for Vue', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), VUE);
    await addCommand('store', 'Cart', {});
    expect(await fs.pathExists(path.join(testDir, 'src/stores/useCartStore/useCartStore.ts'))).toBe(true);
    const content = await fs.readFile(path.join(testDir, 'src/stores/useCartStore/useCartStore.ts'), 'utf-8');
    expect(content).toContain('defineStore');
  });

  it('Vue component has no .module.css', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), VUE);
    await addCommand('component', 'Tag', {});
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Tag/Tag.module.css'))).toBe(false);
  });

  it('Vue component has inline <style scoped> in .vue file', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), VUE);
    await addCommand('component', 'Tag', {});
    const content = await fs.readFile(path.join(testDir, 'src/components/shared/Tag/Tag.vue'), 'utf-8');
    expect(content).toContain('<style scoped>');
  });
});

describe('add component for Svelte', () => {
  const testDir = path.join(__dirname, '.tmp-svelte-add');
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

  it('creates Card.svelte for Svelte project', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), SVELTE);
    await addCommand('component', 'Card', {});
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Card/Card.svelte'))).toBe(true);
  });

  it('creates Svelte writable store', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), SVELTE);
    await addCommand('store', 'Cart', {});
    expect(await fs.pathExists(path.join(testDir, 'src/stores/cartStore/cartStore.ts'))).toBe(true);
    const content = await fs.readFile(path.join(testDir, 'src/stores/cartStore/cartStore.ts'), 'utf-8');
    expect(content).toContain("from 'svelte/store'");
  });
});

describe('add component for SolidJS', () => {
  const testDir = path.join(__dirname, '.tmp-solid-add');
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

  it('creates Button.tsx for SolidJS project', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), SOLID);
    await addCommand('component', 'Button', {});
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Button/Button.tsx'))).toBe(true);
    const content = await fs.readFile(path.join(testDir, 'src/components/shared/Button/Button.tsx'), 'utf-8');
    expect(content).toContain("from 'solid-js'");
  });

  it('creates SolidJS store with createStore', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), SOLID);
    await addCommand('store', 'Cart', {});
    expect(await fs.pathExists(path.join(testDir, 'src/stores/useCartStore/useCartStore.ts'))).toBe(true);
    const content = await fs.readFile(path.join(testDir, 'src/stores/useCartStore/useCartStore.ts'), 'utf-8');
    expect(content).toContain('createStore');
  });
});

// ── Structure path helpers ────────────────────────────────────────────────────

describe('Vue structure path helpers', () => {
  const vueStructures = require('../src/structures/vue');

  it('feature-based: hookPath is composables', () => {
    expect(vueStructures['feature-based'].hookPath()).toBe('src/composables');
  });

  it('feature-based: pagePath is views', () => {
    expect(vueStructures['feature-based'].pagePath()).toBe('src/views');
  });

  it('domain-driven: hookPath is shared/composables', () => {
    expect(vueStructures['domain-driven'].hookPath()).toBe('src/shared/composables');
  });

  it('atomic-design: hookPath is composables', () => {
    expect(vueStructures['atomic-design'].hookPath()).toBe('src/composables');
  });
});

describe('Svelte structure path helpers', () => {
  const svelteStructures = require('../src/structures/svelte');

  it('feature-based: hookPath is composables', () => {
    expect(svelteStructures['feature-based'].hookPath()).toBe('src/composables');
  });

  it('feature-based: pagePath is pages', () => {
    expect(svelteStructures['feature-based'].pagePath()).toBe('src/pages');
  });
});

describe('SolidJS structure path helpers', () => {
  const solidjsStructures = require('../src/structures/solidjs');

  it('feature-based: hookPath is hooks', () => {
    expect(solidjsStructures['feature-based'].hookPath()).toBe('src/hooks');
  });

  it('feature-based: pagePath is features', () => {
    expect(solidjsStructures['feature-based'].pagePath()).toBe('src/features');
  });
});

// ── detect.js ─────────────────────────────────────────────────────────────────

describe('detectFramework for new frameworks', () => {
  const { detectFramework } = require('../src/utils/detect');
  const testDir = path.join(__dirname, '.tmp-detect-fw');

  beforeEach(() => fs.ensureDir(testDir));
  afterEach(() => fs.remove(testDir));

  it('detects vue from vue dependency', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), { dependencies: { vue: '3.0.0' } });
    expect(await detectFramework(testDir)).toBe('vue');
  });

  it('detects svelte from svelte dependency', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), { dependencies: { svelte: '5.0.0' } });
    expect(await detectFramework(testDir)).toBe('svelte');
  });

  it('detects svelte from @sveltejs/kit', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), { devDependencies: { '@sveltejs/kit': '2.0.0' } });
    expect(await detectFramework(testDir)).toBe('svelte');
  });

  it('detects solidjs from solid-js', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), { dependencies: { 'solid-js': '1.0.0' } });
    expect(await detectFramework(testDir)).toBe('solidjs');
  });

  it('next.js takes priority over vue (monorepo edge case)', async () => {
    await fs.writeJson(path.join(testDir, 'package.json'), {
      dependencies: { next: '14.0.0', vue: '3.0.0' },
    });
    expect(await detectFramework(testDir)).toBe('nextjs');
  });
});
