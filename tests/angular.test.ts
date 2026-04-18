import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const {
  componentTemplate,
  hookTemplate,
  serviceTemplate,
  storeTemplate,
  featureTemplate,
  angularComponentTemplate,
  angularServiceTemplate,
  angularStoreTemplate,
  angularFeatureTemplate,
  getExtensions,
} = require('../src/utils/templates');

const angularStructures = require('../src/structures/angular');
const addCommand: (type: string, name?: string, opts?: object) => Promise<void> =
  require('../src/commands/add');

// ── Base config ───────────────────────────────────────────────────────────────

const ANGULAR: RchitectConfig = {
  framework: 'angular',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const ANGULAR_SCSS: RchitectConfig = { ...ANGULAR, styling: 'scss' };

// ── Extensions ────────────────────────────────────────────────────────────────

describe('getExtensions for Angular', () => {
  it('compExt is ts for Angular', () => {
    expect(getExtensions(ANGULAR).compExt).toBe('ts');
  });

  it('scriptExt is ts', () => {
    expect(getExtensions(ANGULAR).scriptExt).toBe('ts');
  });

  it('styleExt is scss for SCSS config', () => {
    expect(getExtensions(ANGULAR_SCSS).styleExt).toBe('scss');
  });
});

// ── Structures ────────────────────────────────────────────────────────────────

describe('Angular structures', () => {
  it('has all 4 patterns', () => {
    expect(angularStructures['atomic-design']).toBeDefined();
    expect(angularStructures['feature-based']).toBeDefined();
    expect(angularStructures['domain-driven']).toBeDefined();
    expect(angularStructures['mvc-like']).toBeDefined();
  });

  it('feature-based uses src/app/ prefix', () => {
    const s = angularStructures['feature-based'];
    expect(s.folders.some((f: string) => f.startsWith('src/app/'))).toBe(true);
  });

  it('hookPath returns src/app/core/services', () => {
    const s = angularStructures['feature-based'];
    expect(s.hookPath()).toContain('services');
  });

  it('storePath returns src/app/store', () => {
    const s = angularStructures['feature-based'];
    expect(s.storePath()).toContain('store');
  });
});

// ── Angular component template ────────────────────────────────────────────────

describe('angularComponentTemplate', () => {
  it('generates a .component.ts file', () => {
    const { files } = angularComponentTemplate('Button', ANGULAR);
    const tsFile = Object.keys(files).find(f => f.endsWith('.component.ts'));
    expect(tsFile).toBeDefined();
  });

  it('generates a .component.html file', () => {
    const { files } = angularComponentTemplate('Button', ANGULAR);
    const htmlFile = Object.keys(files).find(f => f.endsWith('.component.html'));
    expect(htmlFile).toBeDefined();
  });

  it('generates a style file', () => {
    const { files } = angularComponentTemplate('Button', ANGULAR);
    const styleFile = Object.keys(files).find(f => f.match(/\.(css|scss)$/));
    expect(styleFile).toBeDefined();
  });

  it('generates a barrel index.ts', () => {
    const { files } = angularComponentTemplate('Button', ANGULAR);
    expect(files['index.ts']).toBeDefined();
  });

  it('has standalone: true in @Component', () => {
    const { files } = angularComponentTemplate('Button', ANGULAR);
    const tsFile = Object.keys(files).find(f => f.endsWith('.component.ts'))!;
    expect(files[tsFile]).toContain('standalone: true');
  });

  it('uses kebab-case selector with app- prefix', () => {
    const { files } = angularComponentTemplate('UserProfile', ANGULAR);
    const tsFile = Object.keys(files).find(f => f.endsWith('.component.ts'))!;
    expect(files[tsFile]).toContain("selector: 'app-user-profile'");
  });

  it('resolvedName has Component suffix', () => {
    const { resolvedName } = angularComponentTemplate('Button', ANGULAR);
    expect(resolvedName).toBe('ButtonComponent');
  });

  it('generates SCSS style file when config is scss', () => {
    const { files } = angularComponentTemplate('Card', ANGULAR_SCSS);
    const scssFile = Object.keys(files).find(f => f.endsWith('.scss'));
    expect(scssFile).toBeDefined();
  });
});

// ── Angular service template ──────────────────────────────────────────────────

describe('angularServiceTemplate', () => {
  it('generates a .service.ts file', () => {
    const { files } = angularServiceTemplate('User', ANGULAR);
    expect(files['user.service.ts']).toBeDefined();
  });

  it('has @Injectable decorator', () => {
    const { files } = angularServiceTemplate('User', ANGULAR);
    expect(files['user.service.ts']).toContain('@Injectable');
  });

  it('has providedIn root', () => {
    const { files } = angularServiceTemplate('User', ANGULAR);
    expect(files['user.service.ts']).toContain("providedIn: 'root'");
  });

  it('resolvedName is UserService', () => {
    const { resolvedName } = angularServiceTemplate('User', ANGULAR);
    expect(resolvedName).toBe('UserService');
  });
});

// ── Angular store template ────────────────────────────────────────────────────

describe('angularStoreTemplate', () => {
  it('generates a .store.ts file', () => {
    const { files } = angularStoreTemplate('Cart', ANGULAR);
    expect(files['cart.store.ts']).toBeDefined();
  });

  it('uses BehaviorSubject', () => {
    const { files } = angularStoreTemplate('Cart', ANGULAR);
    expect(files['cart.store.ts']).toContain('BehaviorSubject');
  });

  it('has @Injectable decorator', () => {
    const { files } = angularStoreTemplate('Cart', ANGULAR);
    expect(files['cart.store.ts']).toContain('@Injectable');
  });

  it('resolvedName is CartStore', () => {
    const { resolvedName } = angularStoreTemplate('Cart', ANGULAR);
    expect(resolvedName).toBe('CartStore');
  });
});

// ── Angular feature template ──────────────────────────────────────────────────

describe('angularFeatureTemplate', () => {
  it('generates component and service files', () => {
    const { files } = angularFeatureTemplate('Auth', ANGULAR);
    const hasComponent = Object.keys(files).some(f => f.includes('component'));
    const hasService = Object.keys(files).some(f => f.includes('service'));
    expect(hasComponent).toBe(true);
    expect(hasService).toBe(true);
  });

  it('resolvedName is Auth', () => {
    const { resolvedName } = angularFeatureTemplate('Auth', ANGULAR);
    expect(resolvedName).toBe('Auth');
  });
});

// ── componentTemplate dispatches to Angular ───────────────────────────────────

describe('componentTemplate dispatch for Angular', () => {
  it('dispatches to angularComponentTemplate', () => {
    const files = componentTemplate('Button', ANGULAR);
    const hasTs = Object.keys(files).some(f => f.endsWith('.component.ts'));
    expect(hasTs).toBe(true);
  });
});

// ── serviceTemplate dispatches to Angular ────────────────────────────────────

describe('serviceTemplate dispatch for Angular', () => {
  it('dispatches to angularServiceTemplate', () => {
    const { files } = serviceTemplate('User', ANGULAR);
    expect(files['user.service.ts']).toBeDefined();
  });
});

// ── add command (integration) ─────────────────────────────────────────────────

const TMP = path.join(__dirname, '.tmp-angular');

describe('Angular add command', () => {
  beforeEach(async () => {
    await fs.ensureDir(TMP);
    await fs.writeJson(path.join(TMP, '.rchitect.json'), ANGULAR);
    jest.spyOn(process, 'cwd').mockReturnValue(TMP);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(TMP);
  });

  it('creates a component in src/app/shared/components', async () => {
    await addCommand('component', 'Button', {});
    const componentDir = path.join(TMP, 'src/app/shared/components/Button');
    expect(await fs.pathExists(componentDir)).toBe(true);
  });

  it('creates component .ts, .html, .css files', async () => {
    await addCommand('component', 'Card', {});
    const dir = path.join(TMP, 'src/app/shared/components/Card');
    expect(await fs.pathExists(dir)).toBe(true);
    const files = await fs.readdir(dir);
    expect(files.some(f => f.endsWith('.component.ts'))).toBe(true);
    expect(files.some(f => f.endsWith('.component.html'))).toBe(true);
  });

  it('creates a service in src/app/services', async () => {
    await addCommand('service', 'User', {});
    const serviceDir = path.join(TMP, 'src/app/services/UserService');
    expect(await fs.pathExists(serviceDir)).toBe(true);
  });

  it('creates a store in src/app/store', async () => {
    await addCommand('store', 'Cart', {});
    expect(await fs.pathExists(path.join(TMP, 'src/app/store'))).toBe(true);
  });

  it('creates a feature scaffold', async () => {
    await addCommand('feature', 'Auth', {});
    expect(await fs.pathExists(path.join(TMP, 'src/app/features/Auth'))).toBe(true);
  });
});
