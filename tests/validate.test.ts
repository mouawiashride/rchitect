import { validateName, toCamelCase } from '../src/utils/validate';

describe('validateName', () => {
  let mockExit: jest.SpyInstance;
  let mockLog: jest.SpyInstance;

  beforeEach(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockLog.mockRestore();
  });

  it('accepts valid PascalCase names', () => {
    expect(validateName('Button', 'component')).toBe(true);
    expect(validateName('UserProfile', 'component')).toBe(true);
    expect(validateName('DataTable', 'component')).toBe(true);
    expect(validateName('A', 'component')).toBe(true);
    expect(validateName('X1', 'component')).toBe(true);
  });

  it('rejects names starting with lowercase', () => {
    expect(() => validateName('button', 'component')).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('rejects names starting with a number', () => {
    expect(() => validateName('123bad', 'component')).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('rejects names with special characters', () => {
    expect(() => validateName('my-component', 'component')).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('rejects names with underscores', () => {
    expect(() => validateName('My_Component', 'component')).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('rejects empty names', () => {
    expect(() => validateName('', 'component')).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('rejects null names', () => {
    expect(() => validateName(null as unknown as string, 'component')).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('rejects undefined names', () => {
    expect(() => validateName(undefined as unknown as string, 'component')).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('rejects whitespace-only names', () => {
    expect(() => validateName('   ', 'component')).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('includes the resource type in the error message', () => {
    expect(() => validateName('bad', 'hook')).toThrow('process.exit');
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('hook'));
  });
});

describe('toCamelCase', () => {
  it('converts PascalCase to camelCase', () => {
    expect(toCamelCase('Button')).toBe('button');
    expect(toCamelCase('UserProfile')).toBe('userProfile');
    expect(toCamelCase('A')).toBe('a');
  });

  it('keeps already camelCase strings unchanged', () => {
    expect(toCamelCase('useAuth')).toBe('useAuth');
  });
});
