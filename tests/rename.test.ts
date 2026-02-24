import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const renameCommand: (type: string, oldName: string, newName: string) => Promise<void> = require('../src/commands/rename');

const BASE_CONFIG: RchitectConfig = {
  framework: 'react',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

describe('rename command', () => {
  const testDir: string = path.join(__dirname, '.tmp-rename');
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
    await expect(renameCommand('component', 'Button', 'PrimaryButton')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error for an unsupported resource type', async () => {
    await writeConfig();
    await expect(renameCommand('widget', 'Button', 'PrimaryButton')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error when the old resource does not exist on disk', async () => {
    await writeConfig();
    await expect(renameCommand('component', 'Nonexistent', 'Something')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error when the new name already exists on disk', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/components/shared/Button'));
    await fs.ensureDir(path.join(testDir, 'src/components/shared/PrimaryButton'));
    await expect(renameCommand('component', 'Button', 'PrimaryButton')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits with an error when newName is not PascalCase', async () => {
    await writeConfig();
    await fs.ensureDir(path.join(testDir, 'src/components/shared/Button'));
    await expect(renameCommand('component', 'Button', 'primaryButton')).rejects.toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  // ── Component ─────────────────────────────────────────────────────────────────

  it('renames a component directory, files, content, and barrel', async () => {
    await writeConfig();
    const oldDir = path.join(testDir, 'src/components/shared/Button');
    await fs.ensureDir(oldDir);
    await fs.writeFile(path.join(oldDir, 'Button.tsx'), 'export default function Button() {}');
    await fs.writeFile(path.join(oldDir, 'Button.module.css'), '.Button {}');
    await fs.writeFile(path.join(oldDir, 'index.ts'), "export { default as Button } from './Button';\n");
    await fs.writeFile(
      path.join(testDir, 'src/components/shared/index.ts'),
      "export { default as Button } from './Button';\n",
    );

    await renameCommand('component', 'Button', 'PrimaryButton');

    expect(await fs.pathExists(oldDir)).toBe(false);
    const newDir = path.join(testDir, 'src/components/shared/PrimaryButton');
    expect(await fs.pathExists(newDir)).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'PrimaryButton.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'Button.tsx'))).toBe(false);

    const content = await fs.readFile(path.join(newDir, 'PrimaryButton.tsx'), 'utf-8');
    expect(content).toContain('PrimaryButton');
    expect(content).not.toContain('function Button(');

    const barrel = await fs.readFile(path.join(testDir, 'src/components/shared/index.ts'), 'utf-8');
    expect(barrel).toContain("from './PrimaryButton'");
    expect(barrel).not.toContain("from './Button'");
  });

  // ── Hook ──────────────────────────────────────────────────────────────────────

  it('renames a hook directory, files, content, and barrel', async () => {
    await writeConfig();
    const oldDir = path.join(testDir, 'src/hooks/useAuth');
    await fs.ensureDir(oldDir);
    await fs.writeFile(path.join(oldDir, 'useAuth.ts'), 'export default function useAuth() {}');
    await fs.writeFile(path.join(oldDir, 'index.ts'), "export { default as useAuth } from './useAuth';\n");
    await fs.writeFile(
      path.join(testDir, 'src/hooks/index.ts'),
      "export { default as useAuth } from './useAuth';\n",
    );

    await renameCommand('hook', 'Auth', 'Payment');

    expect(await fs.pathExists(oldDir)).toBe(false);
    const newDir = path.join(testDir, 'src/hooks/usePayment');
    expect(await fs.pathExists(newDir)).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'usePayment.ts'))).toBe(true);

    const content = await fs.readFile(path.join(newDir, 'usePayment.ts'), 'utf-8');
    expect(content).toContain('usePayment');

    const barrel = await fs.readFile(path.join(testDir, 'src/hooks/index.ts'), 'utf-8');
    expect(barrel).toContain("from './usePayment'");
    expect(barrel).not.toContain("from './useAuth'");
  });

  // ── Page ──────────────────────────────────────────────────────────────────────

  it('renames a page directory, files, content, and barrel', async () => {
    await writeConfig();
    const oldDir = path.join(testDir, 'src/features/Dashboard');
    await fs.ensureDir(oldDir);
    await fs.writeFile(path.join(oldDir, 'DashboardPage.tsx'), 'export default function DashboardPage() {}');
    await fs.writeFile(path.join(oldDir, 'index.ts'), "export { default as DashboardPage } from './DashboardPage';\n");
    await fs.writeFile(
      path.join(testDir, 'src/features/index.ts'),
      "export { default as Dashboard } from './Dashboard';\n",
    );

    await renameCommand('page', 'Dashboard', 'Settings');

    expect(await fs.pathExists(oldDir)).toBe(false);
    const newDir = path.join(testDir, 'src/features/Settings');
    expect(await fs.pathExists(newDir)).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'SettingsPage.tsx'))).toBe(true);

    const content = await fs.readFile(path.join(newDir, 'SettingsPage.tsx'), 'utf-8');
    expect(content).toContain('SettingsPage');

    const barrel = await fs.readFile(path.join(testDir, 'src/features/index.ts'), 'utf-8');
    expect(barrel).toContain("from './Settings'");
    expect(barrel).not.toContain("from './Dashboard'");
  });

  // ── Service ───────────────────────────────────────────────────────────────────

  it('renames a service directory, files, content, and barrel', async () => {
    await writeConfig({ pattern: 'mvc-like' });
    const oldDir = path.join(testDir, 'src/services/userService');
    await fs.ensureDir(oldDir);
    await fs.writeFile(path.join(oldDir, 'userService.ts'), 'const userService = {}; export default userService;');
    await fs.writeFile(path.join(oldDir, 'index.ts'), "export { default as userService } from './userService';\n");
    await fs.writeFile(
      path.join(testDir, 'src/services/index.ts'),
      "export { default as userService } from './userService';\n",
    );

    await renameCommand('service', 'User', 'Payment');

    expect(await fs.pathExists(oldDir)).toBe(false);
    const newDir = path.join(testDir, 'src/services/paymentService');
    expect(await fs.pathExists(newDir)).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'paymentService.ts'))).toBe(true);

    const content = await fs.readFile(path.join(newDir, 'paymentService.ts'), 'utf-8');
    expect(content).toContain('paymentService');

    const barrel = await fs.readFile(path.join(testDir, 'src/services/index.ts'), 'utf-8');
    expect(barrel).toContain("from './paymentService'");
    expect(barrel).not.toContain("from './userService'");
  });

  // ── Context ───────────────────────────────────────────────────────────────────

  it('renames a context directory, files, content, and barrel', async () => {
    await writeConfig();
    const oldDir = path.join(testDir, 'src/contexts/AuthContext');
    await fs.ensureDir(oldDir);
    await fs.writeFile(
      path.join(oldDir, 'AuthContext.tsx'),
      "export const AuthContext = {}; export function AuthProvider() {} export function useAuth() {}",
    );
    await fs.writeFile(path.join(oldDir, 'index.ts'), "export { default as AuthContext } from './AuthContext';\n");
    await fs.writeFile(
      path.join(testDir, 'src/contexts/index.ts'),
      "export { default as AuthContext } from './AuthContext';\n",
    );

    await renameCommand('context', 'Auth', 'Cart');

    expect(await fs.pathExists(oldDir)).toBe(false);
    const newDir = path.join(testDir, 'src/contexts/CartContext');
    expect(await fs.pathExists(newDir)).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'CartContext.tsx'))).toBe(true);

    const content = await fs.readFile(path.join(newDir, 'CartContext.tsx'), 'utf-8');
    expect(content).toContain('CartContext');
    expect(content).toContain('CartProvider');
    expect(content).toContain('useCart');

    const barrel = await fs.readFile(path.join(testDir, 'src/contexts/index.ts'), 'utf-8');
    expect(barrel).toContain("from './CartContext'");
    expect(barrel).not.toContain("from './AuthContext'");
  });

  // ── Store ─────────────────────────────────────────────────────────────────────

  it('renames a store directory, files, content, and barrel', async () => {
    await writeConfig();
    const oldDir = path.join(testDir, 'src/stores/useCartStore');
    await fs.ensureDir(oldDir);
    await fs.writeFile(path.join(oldDir, 'useCartStore.ts'), 'export const useCartStore = () => ({});');
    await fs.writeFile(path.join(oldDir, 'index.ts'), "export { default as useCartStore } from './useCartStore';\n");
    await fs.writeFile(
      path.join(testDir, 'src/stores/index.ts'),
      "export { default as useCartStore } from './useCartStore';\n",
    );

    await renameCommand('store', 'Cart', 'Payment');

    expect(await fs.pathExists(oldDir)).toBe(false);
    const newDir = path.join(testDir, 'src/stores/usePaymentStore');
    expect(await fs.pathExists(newDir)).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'usePaymentStore.ts'))).toBe(true);

    const content = await fs.readFile(path.join(newDir, 'usePaymentStore.ts'), 'utf-8');
    expect(content).toContain('usePaymentStore');

    const barrel = await fs.readFile(path.join(testDir, 'src/stores/index.ts'), 'utf-8');
    expect(barrel).toContain("from './usePaymentStore'");
    expect(barrel).not.toContain("from './useCartStore'");
  });

  // ── Feature ───────────────────────────────────────────────────────────────────

  it('renames a feature directory and all nested files (no barrel)', async () => {
    await writeConfig();
    const oldDir = path.join(testDir, 'src/features/Checkout');
    const viewDir = path.join(oldDir, 'components/CheckoutView');
    const hookDir = path.join(oldDir, 'hooks/useCheckout');
    await fs.ensureDir(viewDir);
    await fs.ensureDir(hookDir);
    await fs.writeFile(path.join(viewDir, 'CheckoutView.tsx'), 'export default function CheckoutView() {}');
    await fs.writeFile(path.join(hookDir, 'useCheckout.ts'), 'export function useCheckout() {}');
    await fs.writeFile(path.join(oldDir, 'index.ts'), "export * from './components/CheckoutView';\n");

    await renameCommand('feature', 'Checkout', 'Payment');

    expect(await fs.pathExists(oldDir)).toBe(false);
    const newDir = path.join(testDir, 'src/features/Payment');
    expect(await fs.pathExists(newDir)).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'components/PaymentView/PaymentView.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(newDir, 'hooks/usePayment/usePayment.ts'))).toBe(true);

    const viewContent = await fs.readFile(
      path.join(newDir, 'components/PaymentView/PaymentView.tsx'),
      'utf-8',
    );
    expect(viewContent).toContain('PaymentView');

    const indexContent = await fs.readFile(path.join(newDir, 'index.ts'), 'utf-8');
    expect(indexContent).toContain('PaymentView');
  });

  // ── Output messages ───────────────────────────────────────────────────────────

  it('shows a renamed path message in output', async () => {
    await writeConfig();
    const oldDir = path.join(testDir, 'src/hooks/useAuth');
    await fs.ensureDir(oldDir);
    await fs.writeFile(path.join(oldDir, 'useAuth.ts'), 'export default function useAuth() {}');

    await renameCommand('hook', 'Auth', 'Payment');

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('renamed');
  });

  it('shows a success message after renaming', async () => {
    await writeConfig();
    const oldDir = path.join(testDir, 'src/hooks/useAuth');
    await fs.ensureDir(oldDir);
    await fs.writeFile(path.join(oldDir, 'useAuth.ts'), 'export default function useAuth() {}');

    await renameCommand('hook', 'Auth', 'Payment');

    const output = mockLog.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('successfully');
    expect(output).toContain('Auth');
    expect(output).toContain('Payment');
  });
});
