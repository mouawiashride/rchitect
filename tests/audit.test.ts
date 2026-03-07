import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const auditModule = require('../src/commands/audit');
const auditCommand: () => Promise<void> = auditModule;
const { checkHook, checkService, checkContext, checkStore, checkComponent } = auditModule;

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('audit command', () => {
  const testDir: string = path.join(__dirname, '.tmp-audit');
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
    jest.clearAllMocks();
    await fs.remove(testDir);
  });

  async function writeConfig(config: Partial<RchitectConfig> = {}): Promise<void> {
    await fs.writeJson(path.join(testDir, '.rchitect.json'), { ...BASE_CONFIG, ...config });
  }

  // ── Error cases ──────────────────────────────────────────────────────────────

  it('exits with an error when .rchitect.json is missing', async () => {
    await expect(auditCommand()).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  // ── Clean project ─────────────────────────────────────────────────────────────

  it('reports no violations when all directories are correctly named', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/hooks/useAuth'));
    await fs.ensureDir(path.join(testDir, 'src/services/userService'));
    await fs.ensureDir(path.join(testDir, 'src/contexts/AuthContext'));
    await fs.ensureDir(path.join(testDir, 'src/stores/useCartStore'));
    await fs.ensureDir(path.join(testDir, 'src/components/shared/Button'));

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('No violations');
  });

  // ── Naming violations ─────────────────────────────────────────────────────────

  it('reports a violation for a hook dir not starting with "use" + uppercase', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/hooks/authHook'));

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('authHook');
    expect(output).toContain('hook');
  });

  it('reports a violation for a service dir not matching camelCaseService', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/services/UserSvc'));

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('UserSvc');
  });

  it('reports a violation for a context dir not ending with "Context"', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/contexts/AuthCtx'));

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('AuthCtx');
  });

  it('reports a violation for a store dir not matching use${Name}Store', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/stores/cartStore'));

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('cartStore');
  });

  it('reports a violation for a component dir not PascalCase', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/components/shared/my-button'));

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('my-button');
  });

  // ── Barrel violation ──────────────────────────────────────────────────────────

  it('reports a barrel violation when barrel exists but subdir is not exported', async () => {
    await writeConfig();
    const hooksDir = path.join(testDir, 'src/hooks');
    await fs.ensureDir(path.join(hooksDir, 'useAuth'));
    await fs.writeFile(path.join(hooksDir, 'index.ts'), "// empty barrel\n");

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('useAuth');
    expect(output).toContain('barrel');
  });

  it('does not report a barrel violation when no barrel file exists', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/hooks/useAuth'));
    // No index.ts created

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('No violations');
  });

  // ── Atomic-design ─────────────────────────────────────────────────────────────

  it('audits component dirs at each level for atomic-design', async () => {
    await writeConfig({ pattern: 'atomic-design' });
    await fs.ensureDir(path.join(testDir, 'src/components/atoms/button')); // bad
    await fs.ensureDir(path.join(testDir, 'src/components/molecules/Card')); // good

    await auditCommand();

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('button');
    expect(output).not.toContain('molecules/Card');
  });

  // ── Pure check functions ──────────────────────────────────────────────────────

  describe('checkHook', () => {
    it('accepts valid hook names', () => {
      expect(checkHook('useAuth')).toBeNull();
      expect(checkHook('usePaymentStore')).toBeNull();
    });
    it('rejects names not starting with "use" + uppercase', () => {
      expect(checkHook('authHook')).not.toBeNull();
      expect(checkHook('use')).not.toBeNull();
      expect(checkHook('uselowercase')).not.toBeNull();
    });
  });

  describe('checkService', () => {
    it('accepts valid service names', () => {
      expect(checkService('userService')).toBeNull();
      expect(checkService('paymentService')).toBeNull();
    });
    it('rejects names not matching camelCaseService', () => {
      expect(checkService('UserService')).not.toBeNull(); // capital U
      expect(checkService('userSvc')).not.toBeNull();
      expect(checkService('service')).not.toBeNull();
    });
  });

  describe('checkContext', () => {
    it('accepts valid context names', () => {
      expect(checkContext('AuthContext')).toBeNull();
      expect(checkContext('ThemeContext')).toBeNull();
    });
    it('rejects names not ending with "Context"', () => {
      expect(checkContext('AuthCtx')).not.toBeNull();
      expect(checkContext('Auth')).not.toBeNull();
    });
  });

  describe('checkStore', () => {
    it('accepts valid store names', () => {
      expect(checkStore('useCartStore')).toBeNull();
      expect(checkStore('usePaymentStore')).toBeNull();
    });
    it('rejects names not matching use${Name}Store', () => {
      expect(checkStore('cartStore')).not.toBeNull();
      expect(checkStore('useCart')).not.toBeNull();
      expect(checkStore('UseCartStore')).not.toBeNull();
    });
  });

  describe('checkComponent', () => {
    it('accepts valid component names', () => {
      expect(checkComponent('Button')).toBeNull();
      expect(checkComponent('UserCard')).toBeNull();
    });
    it('rejects non-PascalCase names', () => {
      expect(checkComponent('button')).not.toBeNull();
      expect(checkComponent('my-button')).not.toBeNull();
      expect(checkComponent('123bad')).not.toBeNull();
    });
  });
});
