import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const addCommand: (type: string, name: string) => Promise<void> = require('../src/commands/add');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const listCommand: () => Promise<void> = require('../src/commands/list');

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('add command', () => {
  const testDir: string = path.join(__dirname, '.tmp-add');
  let mockExit: jest.SpyInstance;
  let mockLog: jest.SpyInstance;
  let originalCwd: () => string;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    originalCwd = process.cwd;
    process.cwd = (): string => testDir;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    mockExit.mockRestore();
    mockLog.mockRestore();
    await fs.remove(testDir);
  });

  async function writeConfig(config: Partial<RchitectConfig> = {}): Promise<void> {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE_CONFIG, ...config });
  }

  it('exits with an error when .rchitect.json is missing', async () => {
    await expect(addCommand('component', 'Button')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error for an unsupported resource type', async () => {
    await writeConfig();
    await expect(addCommand('widget', 'Button')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error for an invalid (non-PascalCase) name', async () => {
    await writeConfig();
    await expect(addCommand('component', 'bad-name')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  describe('component — feature-based, React, TypeScript, CSS', () => {
    beforeEach(() => writeConfig());

    it('creates component files in the correct directory', async () => {
      await addCommand('component', 'Button');

      const dir = path.join(testDir, 'src/components/shared/Button');
      expect(await fs.pathExists(path.join(dir, 'Button.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'Button.module.css'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'index.ts'))).toBe(true);
    });

    it('does not create a test file when withTests is false', async () => {
      await addCommand('component', 'Button');
      const dir = path.join(testDir, 'src/components/shared/Button');
      expect(await fs.pathExists(path.join(dir, 'Button.test.tsx'))).toBe(false);
    });

    it('exits with an error if the component already exists', async () => {
      await addCommand('component', 'Button');
      await expect(addCommand('component', 'Button')).rejects.toThrow('process.exit');
    });
  });

  describe('component — TypeScript, SCSS, with tests', () => {
    beforeEach(() => writeConfig({ styling: 'scss', withTests: true }));

    it('creates a .module.scss file and a test file', async () => {
      await addCommand('component', 'Card');

      const dir = path.join(testDir, 'src/components/shared/Card');
      expect(await fs.pathExists(path.join(dir, 'Card.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'Card.module.scss'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'Card.test.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'index.ts'))).toBe(true);
    });
  });

  describe('component — JavaScript', () => {
    beforeEach(() => writeConfig({ pattern: 'mvc-like', language: 'javascript' }));

    it('creates .jsx and .js files', async () => {
      await addCommand('component', 'Modal');

      const dir = path.join(testDir, 'src/views/components/Modal');
      expect(await fs.pathExists(path.join(dir, 'Modal.jsx'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'Modal.module.css'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'index.js'))).toBe(true);
    });
  });

  describe('component — Next.js with "use client"', () => {
    beforeEach(() => writeConfig({ framework: 'nextjs', useClient: true }));

    it('includes the "use client" directive at the top of the file', async () => {
      await addCommand('component', 'Toggle');

      const filePath = path.join(testDir, 'components/shared/Toggle/Toggle.tsx');
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toMatch(/^'use client'/);
    });
  });

  describe('hook — React, TypeScript, with tests', () => {
    beforeEach(() => writeConfig({ withTests: true }));

    it('creates hook files with the "use" prefix', async () => {
      await addCommand('hook', 'Auth');

      const dir = path.join(testDir, 'src/hooks/useAuth');
      expect(await fs.pathExists(path.join(dir, 'useAuth.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'index.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'useAuth.test.ts'))).toBe(true);
    });

    it('exits with an error if the hook already exists', async () => {
      await addCommand('hook', 'Auth');
      await expect(addCommand('hook', 'Auth')).rejects.toThrow('process.exit');
    });
  });

  describe('page — domain-driven, SCSS', () => {
    beforeEach(() => writeConfig({ pattern: 'domain-driven', styling: 'scss' }));

    it('creates page files in the correct directory', async () => {
      await addCommand('page', 'Dashboard');

      const dir = path.join(testDir, 'src/domains/Dashboard');
      expect(await fs.pathExists(path.join(dir, 'DashboardPage.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'DashboardPage.module.scss'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'index.ts'))).toBe(true);
    });
  });

  describe('service — mvc-like, JavaScript, with tests', () => {
    beforeEach(() => writeConfig({ pattern: 'mvc-like', language: 'javascript', withTests: true }));

    it('creates service files with a camelCase name', async () => {
      await addCommand('service', 'User');

      const dir = path.join(testDir, 'src/services/userService');
      expect(await fs.pathExists(path.join(dir, 'userService.js'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'index.js'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'userService.test.js'))).toBe(true);
    });
  });

  describe('context — React, TypeScript', () => {
    beforeEach(() => writeConfig());

    it('creates context files in the correct directory', async () => {
      await addCommand('context', 'Auth');

      const dir = path.join(testDir, 'src/contexts/AuthContext');
      expect(await fs.pathExists(path.join(dir, 'AuthContext.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'index.ts'))).toBe(true);
    });

    it('exits with an error if the context already exists', async () => {
      await addCommand('context', 'Auth');
      await expect(addCommand('context', 'Auth')).rejects.toThrow('process.exit');
    });
  });

  describe('store — React, TypeScript', () => {
    beforeEach(() => writeConfig());

    it('creates store files in the correct directory', async () => {
      await addCommand('store', 'Cart');

      const dir = path.join(testDir, 'src/stores/useCartStore');
      expect(await fs.pathExists(path.join(dir, 'useCartStore.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(dir, 'index.ts'))).toBe(true);
    });

    it('exits with an error if the store already exists', async () => {
      await addCommand('store', 'Cart');
      await expect(addCommand('store', 'Cart')).rejects.toThrow('process.exit');
    });
  });

  describe('type — React, TypeScript', () => {
    beforeEach(() => writeConfig());

    it('creates a .types.ts file in the types directory', async () => {
      await addCommand('type', 'User');

      const typeFile = path.join(testDir, 'src/types/User.types.ts');
      expect(await fs.pathExists(typeFile)).toBe(true);
    });

    it('creates a .types.js file for JavaScript projects', async () => {
      await writeConfig({ language: 'javascript' });
      await addCommand('type', 'User');

      const typeFile = path.join(testDir, 'src/types/User.types.js');
      expect(await fs.pathExists(typeFile)).toBe(true);
    });
  });

  describe('api — Next.js, TypeScript', () => {
    beforeEach(() => writeConfig({ framework: 'nextjs' }));

    it('creates a route.ts in app/api/<name>/', async () => {
      await addCommand('api', 'Users');

      const routeFile = path.join(testDir, 'app/api/users/route.ts');
      expect(await fs.pathExists(routeFile)).toBe(true);
    });

    it('exits with an error if the api route already exists', async () => {
      await addCommand('api', 'Users');
      await expect(addCommand('api', 'Users')).rejects.toThrow('process.exit');
    });
  });

  describe('api — React project (should fail)', () => {
    beforeEach(() => writeConfig({ framework: 'react' }));

    it('exits with an error for React projects', async () => {
      await expect(addCommand('api', 'Users')).rejects.toThrow('process.exit');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('feature — React, TypeScript', () => {
    beforeEach(() => writeConfig());

    it('creates nested feature structure', async () => {
      await addCommand('feature', 'Dashboard');

      const featureDir = path.join(testDir, 'src/features/Dashboard');
      expect(await fs.pathExists(path.join(featureDir, 'components/DashboardView/DashboardView.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(featureDir, 'hooks/useDashboard/useDashboard.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(featureDir, 'services/dashboardService/dashboardService.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(featureDir, 'types.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(featureDir, 'index.ts'))).toBe(true);
    });

    it('exits with an error if the feature already exists', async () => {
      await addCommand('feature', 'Dashboard');
      await expect(addCommand('feature', 'Dashboard')).rejects.toThrow('process.exit');
    });
  });
});

describe('list command', () => {
  const testDir: string = path.join(__dirname, '.tmp-list');
  let mockExit: jest.SpyInstance;
  let mockLog: jest.SpyInstance;
  let originalCwd: () => string;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    originalCwd = process.cwd;
    process.cwd = (): string => testDir;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    mockExit.mockRestore();
    mockLog.mockRestore();
    await fs.remove(testDir);
  });

  it('exits with an error when .rchitect.json is missing', async () => {
    await expect(listCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('displays the project configuration', async () => {
    const config: RchitectConfig = {
      framework: 'nextjs',
      pattern: 'atomic-design',
      language: 'typescript',
      styling: 'scss',
      withTests: true,
      useClient: true,
    };
    await fs.writeJson(path.join(testDir, '.rchitect.json'), config);

    await listCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Next.js');
    expect(output).toContain('Atomic Design');
    expect(output).toContain('typescript');
    expect(output).toContain('SCSS');
    expect(output).toContain('Yes');
  });

  it('does not display the "Use Client" row for React projects', async () => {
    const config: RchitectConfig = {
      framework: 'react',
      pattern: 'feature-based',
      language: 'typescript',
      styling: 'css',
      withTests: false,
      useClient: false,
    };
    await fs.writeJson(path.join(testDir, '.rchitect.json'), config);

    await listCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('React');
    expect(output).not.toContain('Use Client');
  });
});
