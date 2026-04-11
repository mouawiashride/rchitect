import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const statsCommand: (options: Record<string, unknown>) => Promise<void> =
  require('../src/commands/stats');

const tmpDir = path.join(__dirname, '.tmp-stats');

const REACT_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

beforeEach(async () => {
  await fs.ensureDir(tmpDir);
  jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await fs.remove(tmpDir);
});

describe('stats command', () => {
  it('exits with error when .rchitect.json is missing', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    await expect(statsCommand({ json: false })).rejects.toThrow('process.exit');
    mockExit.mockRestore();
  });

  it('outputs JSON with compliance 0% when no folders exist', async () => {
    await fs.writeJson(path.join(tmpDir, '.rchitect.json'), REACT_CONFIG);

    const output: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      output.push(String(chunk));
      return true;
    });

    await statsCommand({ json: true });

    process.stdout.write = originalWrite;

    const result = JSON.parse(output.join(''));
    expect(result.framework).toBe('react');
    expect(result.pattern).toBe('feature-based');
    expect(result.compliance).toBe(0);
    expect(result.foldersExpected).toBeGreaterThan(0);
    expect(result.foldersPresent).toBe(0);
    expect(Array.isArray(result.folders)).toBe(true);
  });

  it('outputs JSON with 100% compliance when all folders exist', async () => {
    await fs.writeJson(path.join(tmpDir, '.rchitect.json'), REACT_CONFIG);

    // Create all expected folders for react feature-based
    const reactStructures = require('../src/structures/react');
    const structure = reactStructures['feature-based'];
    for (const folder of structure.folders) {
      await fs.ensureDir(path.join(tmpDir, folder));
    }

    const output: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      output.push(String(chunk));
      return true;
    });

    await statsCommand({ json: true });

    const result = JSON.parse(output.join(''));
    expect(result.compliance).toBe(100);
    expect(result.foldersPresent).toBe(result.foldersExpected);
  });

  it('outputs JSON with partial compliance', async () => {
    await fs.writeJson(path.join(tmpDir, '.rchitect.json'), REACT_CONFIG);

    const reactStructures = require('../src/structures/react');
    const structure = reactStructures['feature-based'];
    // Create only the first folder
    await fs.ensureDir(path.join(tmpDir, structure.folders[0]));

    const output: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      output.push(String(chunk));
      return true;
    });

    await statsCommand({ json: true });

    const result = JSON.parse(output.join(''));
    expect(result.foldersPresent).toBe(1);
    expect(result.compliance).toBeGreaterThan(0);
    expect(result.compliance).toBeLessThan(100);
  });

  it('JSON output includes folder details', async () => {
    await fs.writeJson(path.join(tmpDir, '.rchitect.json'), REACT_CONFIG);

    const output: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      output.push(String(chunk));
      return true;
    });

    await statsCommand({ json: true });

    const result = JSON.parse(output.join(''));
    expect(result.folders).toBeInstanceOf(Array);
    for (const entry of result.folders) {
      expect(entry).toHaveProperty('folder');
      expect(entry).toHaveProperty('exists');
      expect(entry).toHaveProperty('fileCount');
    }
  });

  it('reports files inside folders', async () => {
    await fs.writeJson(path.join(tmpDir, '.rchitect.json'), REACT_CONFIG);

    const reactStructures = require('../src/structures/react');
    const structure = reactStructures['feature-based'];
    const firstFolder = structure.folders[0];

    // Create folder with 2 files
    const folderPath = path.join(tmpDir, firstFolder);
    await fs.ensureDir(folderPath);
    await fs.writeFile(path.join(folderPath, 'a.ts'), '');
    await fs.writeFile(path.join(folderPath, 'b.ts'), '');

    const output: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      output.push(String(chunk));
      return true;
    });

    await statsCommand({ json: true });

    const result = JSON.parse(output.join(''));
    const entry = result.folders.find((f: any) => f.folder === firstFolder);
    expect(entry).toBeDefined();
    expect(entry.fileCount).toBe(2);
  });

  it('works with Nuxt config', async () => {
    const NUXT_CONFIG: RchitectConfig = {
      framework: 'nuxt',
      pattern: 'feature-based',
      language: 'typescript',
      styling: 'css',
      withTests: false,
      useClient: false,
    };
    await fs.writeJson(path.join(tmpDir, '.rchitect.json'), NUXT_CONFIG);

    const output: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      output.push(String(chunk));
      return true;
    });

    await statsCommand({ json: true });

    const result = JSON.parse(output.join(''));
    expect(result.framework).toBe('nuxt');
    expect(result.foldersExpected).toBeGreaterThan(0);
  });
});
