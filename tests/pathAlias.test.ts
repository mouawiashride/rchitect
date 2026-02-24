import * as path from 'path';
import * as fs from 'fs-extra';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildAliases, generatePathAliases }: {
  buildAliases: (folders: string[], isNextjs: boolean) => Record<string, string[]>;
  generatePathAliases: (cwd: string, config: { language: string; framework: string }, structure: { folders: string[] }) => Promise<Record<string, string[]> | null>;
} = require('../src/utils/pathAlias');

describe('buildAliases', () => {
  it('derives aliases from React folder list (with src/ prefix)', () => {
    const folders = ['src/components/atoms', 'src/hooks', 'src/services'];
    const aliases = buildAliases(folders, false);

    expect(aliases['@/components/*']).toEqual(['./src/components/*']);
    expect(aliases['@/hooks/*']).toEqual(['./src/hooks/*']);
    expect(aliases['@/services/*']).toEqual(['./src/services/*']);
  });

  it('deduplicates nested folders under the same root', () => {
    const folders = [
      'src/components/atoms',
      'src/components/molecules',
      'src/components/organisms',
      'src/hooks',
    ];
    const aliases = buildAliases(folders, false);

    // Should only have one @/components/* alias despite three sub-folders
    expect(Object.keys(aliases)).toHaveLength(2);
    expect(aliases['@/components/*']).toEqual(['./src/components/*']);
    expect(aliases['@/hooks/*']).toEqual(['./src/hooks/*']);
  });

  it('derives aliases from Next.js folder list (no src/ prefix)', () => {
    const folders = ['components/atoms', 'hooks', 'services'];
    const aliases = buildAliases(folders, true);

    expect(aliases['@/components/*']).toEqual(['./components/*']);
    expect(aliases['@/hooks/*']).toEqual(['./hooks/*']);
    expect(aliases['@/services/*']).toEqual(['./services/*']);
  });

  it('deduplicates nested Next.js folders', () => {
    const folders = ['shared/components', 'shared/hooks', 'styles'];
    const aliases = buildAliases(folders, true);

    expect(Object.keys(aliases)).toHaveLength(2);
    expect(aliases['@/shared/*']).toEqual(['./shared/*']);
    expect(aliases['@/styles/*']).toEqual(['./styles/*']);
  });

  it('returns an empty object for an empty folder list', () => {
    const aliases = buildAliases([], false);
    expect(aliases).toEqual({});
  });
});

describe('generatePathAliases', () => {
  const testDir: string = path.join(__dirname, '.tmp-pathAlias');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  const tsConfig = { language: 'typescript', framework: 'react' };
  const jsConfig = { language: 'javascript', framework: 'react' };
  const structure = { folders: ['src/components', 'src/hooks'] };

  it('returns null for JavaScript projects', async () => {
    const result = await generatePathAliases(testDir, jsConfig, structure);
    expect(result).toBeNull();
  });

  it('does not create tsconfig.json for JavaScript projects', async () => {
    await generatePathAliases(testDir, jsConfig, structure);
    expect(await fs.pathExists(path.join(testDir, 'tsconfig.json'))).toBe(false);
  });

  it('creates a tsconfig.json if one does not exist', async () => {
    await generatePathAliases(testDir, tsConfig, structure);
    const tsconfigPath = path.join(testDir, 'tsconfig.json');
    expect(await fs.pathExists(tsconfigPath)).toBe(true);
  });

  it('sets baseUrl to "." in tsconfig.json', async () => {
    await generatePathAliases(testDir, tsConfig, structure);
    const tsconfig = await fs.readJson(path.join(testDir, 'tsconfig.json'));
    expect(tsconfig.compilerOptions.baseUrl).toBe('.');
  });

  it('writes correct path aliases to tsconfig.json', async () => {
    await generatePathAliases(testDir, tsConfig, structure);
    const tsconfig = await fs.readJson(path.join(testDir, 'tsconfig.json'));

    expect(tsconfig.compilerOptions.paths['@/components/*']).toEqual(['./src/components/*']);
    expect(tsconfig.compilerOptions.paths['@/hooks/*']).toEqual(['./src/hooks/*']);
  });

  it('merges aliases into an existing tsconfig.json without overwriting existing paths', async () => {
    const tsconfigPath = path.join(testDir, 'tsconfig.json');
    await fs.writeJson(tsconfigPath, {
      compilerOptions: {
        strict: true,
        paths: { '@/custom/*': ['./src/custom/*'] },
      },
    });

    await generatePathAliases(testDir, tsConfig, structure);
    const tsconfig = await fs.readJson(tsconfigPath);

    // Existing entry preserved
    expect(tsconfig.compilerOptions.paths['@/custom/*']).toEqual(['./src/custom/*']);
    // New entries added
    expect(tsconfig.compilerOptions.paths['@/components/*']).toBeDefined();
    // Other compiler options preserved
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('returns the generated aliases object', async () => {
    const aliases = await generatePathAliases(testDir, tsConfig, structure);
    expect(aliases).not.toBeNull();
    expect(aliases!['@/components/*']).toEqual(['./src/components/*']);
  });
});
