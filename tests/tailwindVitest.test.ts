import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const {
  componentTemplate,
  pageTemplate,
  featureTemplate,
  hookTemplate,
  serviceTemplate,
  contextTemplate,
  storeTemplate,
  storyTemplate,
  layoutTemplate,
  loadingTemplate,
  errorTemplate,
  notFoundTemplate,
  middlewareTemplate,
  serverActionTemplate,
} = require('../src/utils/templates');

const addCommand: (type: string, name?: string, opts?: object) => Promise<void> =
  require('../src/commands/add');

const BASE: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const TAILWIND: RchitectConfig = { ...BASE, styling: 'tailwind' };
const VITEST_CONFIG: RchitectConfig = { ...BASE, withTests: true, testing: 'vitest' };

// ── Tailwind CSS template tests ───────────────────────────────────────────────

describe('Tailwind CSS templates', () => {
  it('componentTemplate with tailwind: no style file generated', () => {
    const files = componentTemplate('Button', TAILWIND);
    expect(Object.keys(files)).not.toContain('Button.module.css');
    expect(Object.keys(files)).not.toContain('Button.module.scss');
  });

  it('componentTemplate with tailwind: uses className string', () => {
    const files = componentTemplate('Button', TAILWIND);
    expect(files['Button.tsx']).toContain('className="container"');
    expect(files['Button.tsx']).not.toContain('styles.container');
  });

  it('componentTemplate with tailwind: no style import', () => {
    const files = componentTemplate('Button', TAILWIND);
    expect(files['Button.tsx']).not.toContain("import styles from");
  });

  it('componentTemplate with css: still generates style file', () => {
    const files = componentTemplate('Button', BASE);
    expect(files['Button.module.css']).toBeDefined();
    expect(files['Button.tsx']).toContain('styles.container');
  });

  it('pageTemplate with tailwind: no style file, uses className string', () => {
    const files = pageTemplate('Home', TAILWIND);
    expect(Object.keys(files)).not.toContain('HomePage.module.css');
    expect(files['HomePage.tsx']).toContain('className="container"');
  });

  it('featureTemplate with tailwind: no style file in components', () => {
    const { files } = featureTemplate('Auth', TAILWIND);
    const keys = Object.keys(files);
    expect(keys.some(k => k.endsWith('.module.css') || k.endsWith('.module.scss'))).toBe(false);
  });

  it('featureTemplate with tailwind: view component uses className string', () => {
    const { files } = featureTemplate('Auth', TAILWIND);
    const viewContent = files['components/AuthView/AuthView.tsx'];
    expect(viewContent).toContain('className="container"');
  });
});

// ── Vitest template tests ─────────────────────────────────────────────────────

describe('Vitest test templates', () => {
  it('componentTemplate with vitest: test file includes vitest import', () => {
    const files = componentTemplate('Button', VITEST_CONFIG);
    const testFile = files['Button.test.tsx'];
    expect(testFile).toContain("from 'vitest'");
    expect(testFile).toContain('describe');
    expect(testFile).toContain('it');
  });

  it('componentTemplate with jest (default): no vitest import', () => {
    const files = componentTemplate('Button', { ...BASE, withTests: true });
    const testFile = files['Button.test.tsx'];
    expect(testFile).not.toContain("from 'vitest'");
  });

  it('componentTemplate with testing=undefined (legacy): no vitest import', () => {
    const legacyConfig = { ...BASE, withTests: true } as RchitectConfig;
    const files = componentTemplate('Button', legacyConfig);
    expect(files['Button.test.tsx']).not.toContain("from 'vitest'");
  });

  it('hookTemplate with vitest: test includes vitest import', () => {
    const { files } = hookTemplate('Auth', VITEST_CONFIG);
    expect(files['useAuth.test.ts']).toContain("from 'vitest'");
  });

  it('serviceTemplate with vitest: test includes vitest import', () => {
    const { files } = serviceTemplate('User', VITEST_CONFIG);
    expect(files['userService.test.ts']).toContain("from 'vitest'");
  });

  it('contextTemplate with vitest: test includes vitest import', () => {
    const { files } = contextTemplate('Auth', VITEST_CONFIG);
    expect(files['AuthContext.test.tsx']).toContain("from 'vitest'");
  });

  it('storeTemplate with vitest: test includes vitest import', () => {
    const { files } = storeTemplate('Cart', VITEST_CONFIG);
    expect(files['useCartStore.test.ts']).toContain("from 'vitest'");
  });
});

// ── Storybook template tests ──────────────────────────────────────────────────

describe('storyTemplate', () => {
  it('generates a .stories.tsx file for TypeScript', () => {
    const files = storyTemplate('Button', BASE);
    expect(files['Button.stories.tsx']).toBeDefined();
  });

  it('TypeScript story uses Meta and StoryObj types', () => {
    const files = storyTemplate('Button', BASE);
    expect(files['Button.stories.tsx']).toContain("from '@storybook/react'");
    expect(files['Button.stories.tsx']).toContain('Meta<typeof Button>');
    expect(files['Button.stories.tsx']).toContain('StoryObj');
    expect(files['Button.stories.tsx']).toContain("export const Default: Story = {}");
  });

  it('generates a .stories.jsx file for JavaScript', () => {
    const files = storyTemplate('Button', { ...BASE, language: 'javascript' });
    expect(files['Button.stories.jsx']).toBeDefined();
    expect(files['Button.stories.jsx']).not.toContain('Meta<');
    expect(files['Button.stories.jsx']).toContain('export const Default');
  });

  it('includes correct title', () => {
    const files = storyTemplate('UserCard', BASE);
    expect(files['UserCard.stories.tsx']).toContain("title: 'Components/UserCard'");
  });
});

// ── --story flag integration test ─────────────────────────────────────────────

describe('add component --story flag', () => {
  const testDir = path.join(__dirname, '.tmp-story');
  let mockExit: jest.SpyInstance;
  let mockLog: jest.SpyInstance;
  let originalCwd: () => string;
  let mockPrompt: jest.SpyInstance;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    originalCwd = process.cwd;
    process.cwd = () => testDir;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    const inquirer = require('inquirer');
    mockPrompt = jest.spyOn(inquirer, 'prompt').mockResolvedValue({});
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockPrompt.mockRestore();
    jest.resetModules();
    await fs.remove(testDir);
  });

  it('generates a .stories.tsx file when --story is passed', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    await addCommand('component', 'Button', { story: true });
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Button/Button.stories.tsx'))).toBe(true);
  });

  it('does not generate a story file without --story flag', async () => {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), BASE);
    await addCommand('component', 'Button', {});
    expect(await fs.pathExists(path.join(testDir, 'src/components/shared/Button/Button.stories.tsx'))).toBe(false);
  });
});

// ── App Router template unit tests ────────────────────────────────────────────

describe('App Router templates', () => {
  const NEXTJS: RchitectConfig = { ...BASE, framework: 'nextjs' };

  describe('layoutTemplate', () => {
    it('generates layout.tsx with correct function name', () => {
      const { files, resolvedName } = layoutTemplate('auth', NEXTJS);
      expect(files['layout.tsx']).toContain('AuthLayout');
      expect(files['layout.tsx']).toContain('children');
      expect(resolvedName).toBe('auth/layout');
    });

    it('generates layout.jsx for JavaScript', () => {
      const { files } = layoutTemplate('auth', { ...NEXTJS, language: 'javascript' });
      expect(files['layout.jsx']).toBeDefined();
    });

    it('handles hyphenated segment names', () => {
      const { files } = layoutTemplate('user-profile', NEXTJS);
      expect(files['layout.tsx']).toContain('UserProfileLayout');
    });
  });

  describe('loadingTemplate', () => {
    it('generates loading.tsx with Loading suffix', () => {
      const { files } = loadingTemplate('dashboard', NEXTJS);
      expect(files['loading.tsx']).toContain('DashboardLoading');
      expect(files['loading.tsx']).toContain('Loading...');
    });
  });

  describe('errorTemplate', () => {
    it('generates error.tsx with "use client"', () => {
      const { files } = errorTemplate('auth', NEXTJS);
      expect(files['error.tsx']).toContain("'use client'");
      expect(files['error.tsx']).toContain('AuthError');
      expect(files['error.tsx']).toContain('reset');
    });

    it('TypeScript version includes error prop types', () => {
      const { files } = errorTemplate('auth', NEXTJS);
      expect(files['error.tsx']).toContain('ErrorProps');
      expect(files['error.tsx']).toContain('digest');
    });
  });

  describe('notFoundTemplate', () => {
    it('generates not-found.tsx', () => {
      const { files } = notFoundTemplate('products', NEXTJS);
      expect(files['not-found.tsx']).toContain('ProductsNotFound');
      expect(files['not-found.tsx']).toContain('Not Found');
    });
  });

  describe('middlewareTemplate', () => {
    it('generates middleware.ts with matcher config', () => {
      const { files, resolvedName } = middlewareTemplate(NEXTJS);
      expect(files['middleware.ts']).toContain('middleware');
      expect(files['middleware.ts']).toContain('matcher');
      expect(files['middleware.ts']).toContain('NextResponse.next()');
      expect(resolvedName).toBe('middleware');
    });

    it('generates middleware.js for JavaScript', () => {
      const { files } = middlewareTemplate({ ...NEXTJS, language: 'javascript' });
      expect(files['middleware.js']).toBeDefined();
    });
  });

  describe('serverActionTemplate', () => {
    it('generates server action with "use server"', () => {
      const { files, resolvedName } = serverActionTemplate('User', NEXTJS);
      expect(files['user.ts']).toContain("'use server'");
      expect(files['user.ts']).toContain('userAction');
      expect(resolvedName).toBe('user');
    });

    it('TypeScript version includes FormData type', () => {
      const { files } = serverActionTemplate('User', NEXTJS);
      expect(files['user.ts']).toContain('FormData');
    });
  });
});
