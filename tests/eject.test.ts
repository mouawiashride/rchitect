import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ejectCommand: () => Promise<void> = require('../src/commands/eject');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const addCommand: (type: string, name: string) => Promise<void> = require('../src/commands/add');

jest.mock('inquirer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const inquirer = require('inquirer') as { prompt: jest.Mock };

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('eject command', () => {
  const testDir: string = path.join(__dirname, '.tmp-eject');
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
    inquirer.prompt = jest.fn();
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    mockExit.mockRestore();
    mockLog.mockRestore();
    jest.clearAllMocks();
    jest.resetModules(); // clear require cache so custom templates don't bleed between tests
    await fs.remove(testDir);
  });

  async function writeConfig(config: Partial<RchitectConfig> = {}): Promise<void> {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE_CONFIG, ...config });
  }

  it('exits with an error when .rchitect.json is missing', async () => {
    await expect(ejectCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('creates the .rchitect/ directory if it does not exist', async () => {
    await writeConfig();
    await ejectCommand();
    expect(await fs.pathExists(path.join(testDir, '.rchitect'))).toBe(true);
  });

  it('copies templates.js to .rchitect/templates.js', async () => {
    await writeConfig();
    await ejectCommand();
    expect(await fs.pathExists(path.join(testDir, '.rchitect/templates.js'))).toBe(true);
  });

  it('ejected file contains componentTemplate', async () => {
    await writeConfig();
    await ejectCommand();
    const content = await fs.readFile(path.join(testDir, '.rchitect/templates.js'), 'utf-8');
    expect(content).toContain('componentTemplate');
  });

  it('prints an "already ejected" message when run a second time', async () => {
    await writeConfig();
    await ejectCommand();
    mockLog.mockClear();
    await ejectCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('already ejected');
  });

  it('ejected file is a valid CommonJS module', async () => {
    await writeConfig();
    await ejectCommand();
    const ejectedPath = path.join(testDir, '.rchitect/templates.js');
    expect(() => require(ejectedPath)).not.toThrow();
  });

  it('prints a success message after ejecting', async () => {
    await writeConfig();
    await ejectCommand();
    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('ejected successfully');
  });
});

describe('add command with ejected templates', () => {
  const testDir: string = path.join(__dirname, '.tmp-eject-add');
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
    inquirer.prompt = jest.fn();
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    mockExit.mockRestore();
    mockLog.mockRestore();
    jest.clearAllMocks();
    jest.resetModules();
    await fs.remove(testDir);
  });

  async function writeConfig(config: Partial<RchitectConfig> = {}): Promise<void> {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE_CONFIG, ...config });
  }

  it('uses custom template when .rchitect/templates.js exists', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, '.rchitect'));

    // Write a custom templates.js that injects a marker into component output
    const validatePath = path.join(__dirname, '../src/utils/validate.js');
    await fs.writeFile(
      path.join(testDir, '.rchitect/templates.js'),
      `
const { toCamelCase } = require(${JSON.stringify(validatePath)});
function getExtensions() { return { compExt: 'tsx', scriptExt: 'ts', styleExt: 'css' }; }
function componentTemplate(name) {
  return {
    [\`\${name}.tsx\`]: '/* CUSTOM TEMPLATE */',
    [\`\${name}.module.css\`]: '',
    ['index.ts']: \`export { default as \${name} } from './\${name}';\n\`,
  };
}
function hookTemplate(name) { const n = name.startsWith('use') ? name : 'use' + name; return { files: { [\`\${n}.ts\`]: '', ['index.ts']: '' }, resolvedName: n }; }
function pageTemplate(name) { return { [\`\${name}Page.tsx\`]: '', [\`\${name}Page.module.css\`]: '', ['index.ts']: '' }; }
function serviceTemplate(name) { const n = name.charAt(0).toLowerCase() + name.slice(1) + 'Service'; return { files: { [\`\${n}.ts\`]: '', ['index.ts']: '' }, resolvedName: n }; }
function contextTemplate(name) { return { files: { [\`\${name}Context.tsx\`]: '', ['index.ts']: '' }, resolvedName: name + 'Context' }; }
function storeTemplate(name) { return { files: { [\`use\${name}Store.ts\`]: '', ['index.ts']: '' }, resolvedName: 'use' + name + 'Store' }; }
function typeTemplate(name) { return { files: { [\`\${name}.types.ts\`]: '' }, resolvedName: name + '.types' }; }
function apiTemplate(name) { const n = name.charAt(0).toLowerCase() + name.slice(1); return { files: { 'route.ts': '' }, resolvedName: n }; }
function featureTemplate(name) { return { files: { 'index.ts': '' }, resolvedName: name }; }
module.exports = { getExtensions, componentTemplate, hookTemplate, pageTemplate, serviceTemplate, contextTemplate, storeTemplate, typeTemplate, apiTemplate, featureTemplate };
`,
    );

    // Use a fresh require to avoid cached module from previous tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const freshAdd: (type: string, name: string) => Promise<void> = require('../src/commands/add');
    await freshAdd('component', 'Button');

    const content = await fs.readFile(
      path.join(testDir, 'src/components/shared/Button/Button.tsx'),
      'utf-8',
    );
    expect(content).toBe('/* CUSTOM TEMPLATE */');
  });

  it('falls back to built-in templates when no .rchitect/templates.js exists', async () => {
    await writeConfig();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const freshAdd: (type: string, name: string) => Promise<void> = require('../src/commands/add');
    await freshAdd('component', 'Button');

    const content = await fs.readFile(
      path.join(testDir, 'src/components/shared/Button/Button.tsx'),
      'utf-8',
    );
    // Built-in template contains React import or function definition — not the custom marker
    expect(content).not.toBe('/* CUSTOM TEMPLATE */');
    expect(content.length).toBeGreaterThan(0);
  });
});
