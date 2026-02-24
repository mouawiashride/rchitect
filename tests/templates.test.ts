import {
  componentTemplate,
  hookTemplate,
  pageTemplate,
  serviceTemplate,
  contextTemplate,
  storeTemplate,
  typeTemplate,
  apiTemplate,
  featureTemplate,
  getExtensions,
} from '../src/utils/templates';
import type { RchitectConfig, Extensions, ContextTemplateResult, StoreTemplateResult } from '../src/types';

describe('getExtensions', () => {
  it('returns tsx/ts/css for typescript + css', () => {
    const ext: Extensions = getExtensions({ language: 'typescript', styling: 'css' } as RchitectConfig);
    expect(ext).toEqual<Extensions>({ compExt: 'tsx', scriptExt: 'ts', styleExt: 'css' });
  });

  it('returns jsx/js/scss for javascript + scss', () => {
    const ext: Extensions = getExtensions({ language: 'javascript', styling: 'scss' } as RchitectConfig);
    expect(ext).toEqual<Extensions>({ compExt: 'jsx', scriptExt: 'js', styleExt: 'scss' });
  });

  it('returns tsx/ts/scss for typescript + scss', () => {
    const ext: Extensions = getExtensions({ language: 'typescript', styling: 'scss' } as RchitectConfig);
    expect(ext).toEqual<Extensions>({ compExt: 'tsx', scriptExt: 'ts', styleExt: 'scss' });
  });
});

describe('componentTemplate', () => {
  const baseConfig: RchitectConfig = {
    framework: 'react',
    pattern: 'feature-based',
    language: 'typescript',
    styling: 'css',
    withTests: false,
    useClient: false,
  };

  it('generates correct file names for TypeScript + CSS', () => {
    const files = componentTemplate('Button', baseConfig);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['Button.tsx', 'Button.module.css', 'index.ts'])
    );
  });

  it('generates correct file names for JavaScript + SCSS', () => {
    const config: RchitectConfig = { ...baseConfig, language: 'javascript', styling: 'scss' };
    const files = componentTemplate('Card', config);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['Card.jsx', 'Card.module.scss', 'index.js'])
    );
  });

  it('includes the component name in the file content', () => {
    const files = componentTemplate('Button', baseConfig);
    expect(files['Button.tsx']).toContain('const Button');
    expect(files['Button.tsx']).toContain('export default Button');
  });

  it('includes TypeScript interface when language is typescript', () => {
    const files = componentTemplate('Button', baseConfig);
    expect(files['Button.tsx']).toContain('interface ButtonProps');
    expect(files['Button.tsx']).toContain('React.FC<ButtonProps>');
  });

  it('omits TypeScript interface when language is javascript', () => {
    const config: RchitectConfig = { ...baseConfig, language: 'javascript' };
    const files = componentTemplate('Button', config);
    expect(files['Button.jsx']).not.toContain('interface');
    expect(files['Button.jsx']).not.toContain('React.FC');
  });

  it('adds "use client" for Next.js when useClient is true', () => {
    const config: RchitectConfig = { ...baseConfig, framework: 'nextjs', useClient: true };
    const files = componentTemplate('Button', config);
    expect(files['Button.tsx']).toMatch(/^'use client'/);
  });

  it('does not add "use client" for React framework even when useClient is true', () => {
    const config: RchitectConfig = { ...baseConfig, framework: 'react', useClient: true };
    const files = componentTemplate('Button', config);
    expect(files['Button.tsx']).not.toContain('use client');
  });

  it('does not add "use client" when useClient is false', () => {
    const config: RchitectConfig = { ...baseConfig, framework: 'nextjs', useClient: false };
    const files = componentTemplate('Button', config);
    expect(files['Button.tsx']).not.toContain('use client');
  });

  it('generates a test file when withTests is true', () => {
    const config: RchitectConfig = { ...baseConfig, withTests: true };
    const files = componentTemplate('Button', config);
    expect(files['Button.test.tsx']).toBeDefined();
    expect(files['Button.test.tsx']).toContain("describe('Button'");
    expect(files['Button.test.tsx']).toContain('render(<Button />)');
  });

  it('does not generate a test file when withTests is false', () => {
    const files = componentTemplate('Button', baseConfig);
    expect(files['Button.test.tsx']).toBeUndefined();
  });

  it('generates a barrel export in the index file', () => {
    const files = componentTemplate('Button', baseConfig);
    expect(files['index.ts']).toContain("export { default } from './Button'");
  });

  it('imports the correct style module extension', () => {
    const config: RchitectConfig = { ...baseConfig, styling: 'scss' };
    const files = componentTemplate('Button', config);
    expect(files['Button.tsx']).toContain("from './Button.module.scss'");
  });
});

describe('componentTemplate — atomic design levels', () => {
  const atomicConfig: RchitectConfig = {
    framework: 'react',
    pattern: 'atomic-design',
    language: 'typescript',
    styling: 'css',
    withTests: false,
    useClient: false,
  };

  it('generates <span> for atom level', () => {
    const files = componentTemplate('Icon', atomicConfig, 'atom');
    expect(files['Icon.tsx']).toContain('<span');
  });

  it('generates composition comment for molecule level', () => {
    const files = componentTemplate('SearchBar', atomicConfig, 'molecule');
    expect(files['SearchBar.tsx']).toContain('Compose atoms here');
  });

  it('generates <section> for organism level', () => {
    const files = componentTemplate('Header', atomicConfig, 'organism');
    expect(files['Header.tsx']).toContain('<section');
    expect(files['Header.tsx']).toContain('Compose molecules here');
  });

  it('generates layout structure for template level', () => {
    const files = componentTemplate('MainLayout', atomicConfig, 'template');
    expect(files['MainLayout.tsx']).toContain('<header');
    expect(files['MainLayout.tsx']).toContain('<main>');
    expect(files['MainLayout.tsx']).toContain('<footer');
  });

  it('generates <h1> for page level', () => {
    const files = componentTemplate('Home', atomicConfig, 'page');
    expect(files['Home.tsx']).toContain('<h1>');
  });
});

describe('hookTemplate', () => {
  const baseConfig: Pick<RchitectConfig, 'language' | 'withTests'> = {
    language: 'typescript',
    withTests: false,
  };

  it('adds "use" prefix to the hook name', () => {
    const { files, resolvedName } = hookTemplate('Auth', baseConfig as RchitectConfig);
    expect(resolvedName).toBe('useAuth');
    expect(files['useAuth.ts']).toContain('const useAuth');
  });

  it('does not double the "use" prefix', () => {
    // toCamelCase('UseAuth') => 'useAuth', which starts with 'use'
    const { resolvedName } = hookTemplate('UseAuth', baseConfig as RchitectConfig);
    expect(resolvedName).toBe('useAuth');
  });

  it('generates a TypeScript interface when language is typescript', () => {
    const { files } = hookTemplate('Auth', baseConfig as RchitectConfig);
    expect(files['useAuth.ts']).toContain('interface AuthOptions');
  });

  it('omits the TypeScript interface when language is javascript', () => {
    const config = { ...baseConfig, language: 'javascript' } as RchitectConfig;
    const { files } = hookTemplate('Auth', config);
    expect(files['useAuth.js']).not.toContain('interface');
  });

  it('generates a test file when withTests is true', () => {
    const config = { ...baseConfig, withTests: true } as RchitectConfig;
    const { files } = hookTemplate('Auth', config);
    expect(files['useAuth.test.ts']).toBeDefined();
    expect(files['useAuth.test.ts']).toContain('renderHook');
  });

  it('generates a barrel export', () => {
    const { files } = hookTemplate('Auth', baseConfig as RchitectConfig);
    expect(files['index.ts']).toContain("export { default } from './useAuth'");
  });
});

describe('pageTemplate', () => {
  const baseConfig: RchitectConfig = {
    framework: 'react',
    language: 'typescript',
    styling: 'css',
    withTests: false,
    useClient: false,
    pattern: 'feature-based',
  };

  it('generates the correct page component files', () => {
    const files = pageTemplate('Dashboard', baseConfig);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['DashboardPage.tsx', 'DashboardPage.module.css', 'index.ts'])
    );
  });

  it('includes the "Page" suffix in the component name', () => {
    const files = pageTemplate('Dashboard', baseConfig);
    expect(files['DashboardPage.tsx']).toContain('const DashboardPage');
    expect(files['DashboardPage.tsx']).toContain('export default DashboardPage');
  });

  it('adds "use client" for Next.js when useClient is true', () => {
    const config: RchitectConfig = { ...baseConfig, framework: 'nextjs', useClient: true };
    const files = pageTemplate('Dashboard', config);
    expect(files['DashboardPage.tsx']).toMatch(/^'use client'/);
  });

  it('generates a test file when withTests is true', () => {
    const config: RchitectConfig = { ...baseConfig, withTests: true };
    const files = pageTemplate('Dashboard', config);
    expect(files['DashboardPage.test.tsx']).toBeDefined();
    expect(files['DashboardPage.test.tsx']).toContain('DashboardPage');
  });
});

describe('serviceTemplate', () => {
  const baseConfig: Pick<RchitectConfig, 'language' | 'withTests'> = {
    language: 'typescript',
    withTests: false,
  };

  it('generates service files with camelCase name', () => {
    const { files, resolvedName } = serviceTemplate('User', baseConfig as RchitectConfig);
    expect(resolvedName).toBe('userService');
    expect(files['userService.ts']).toBeDefined();
    expect(files['index.ts']).toBeDefined();
  });

  it('generates a TypeScript interface', () => {
    const { files } = serviceTemplate('User', baseConfig as RchitectConfig);
    expect(files['userService.ts']).toContain('interface UserService');
  });

  it('omits the interface for JavaScript', () => {
    const config = { ...baseConfig, language: 'javascript' } as RchitectConfig;
    const { files } = serviceTemplate('User', config);
    expect(files['userService.js']).not.toContain('interface');
  });

  it('generates a test file when withTests is true', () => {
    const config = { ...baseConfig, withTests: true } as RchitectConfig;
    const { files } = serviceTemplate('User', config);
    expect(files['userService.test.ts']).toBeDefined();
    expect(files['userService.test.ts']).toContain('userService');
  });

  it('generates a barrel export', () => {
    const { files } = serviceTemplate('User', baseConfig as RchitectConfig);
    expect(files['index.ts']).toContain("export { default } from './userService'");
  });
});

describe('contextTemplate', () => {
  const baseConfig: RchitectConfig = {
    framework: 'react',
    pattern: 'feature-based',
    language: 'typescript',
    styling: 'css',
    withTests: false,
    useClient: false,
  };

  it('resolvedName is "${name}Context"', () => {
    const { resolvedName }: ContextTemplateResult = contextTemplate('Auth', baseConfig);
    expect(resolvedName).toBe('AuthContext');
  });

  it('generates AuthContext.tsx and index.ts', () => {
    const { files } = contextTemplate('Auth', baseConfig);
    expect(files['AuthContext.tsx']).toBeDefined();
    expect(files['index.ts']).toBeDefined();
  });

  it('generates TypeScript interface for the context value', () => {
    const { files } = contextTemplate('Auth', baseConfig);
    expect(files['AuthContext.tsx']).toContain('interface AuthContextValue');
  });

  it('exports the Provider and hook from the index', () => {
    const { files } = contextTemplate('Auth', baseConfig);
    expect(files['index.ts']).toContain('AuthProvider');
    expect(files['index.ts']).toContain('useAuth');
  });

  it('includes safety throw in the hook', () => {
    const { files } = contextTemplate('Auth', baseConfig);
    expect(files['AuthContext.tsx']).toContain('throw new Error');
    expect(files['AuthContext.tsx']).toContain('AuthProvider');
  });

  it('always adds "use client" for Next.js regardless of useClient flag', () => {
    const config: RchitectConfig = { ...baseConfig, framework: 'nextjs', useClient: false };
    const { files } = contextTemplate('Auth', config);
    expect(files['AuthContext.tsx']).toMatch(/^'use client'/);
  });

  it('does not add "use client" for React projects', () => {
    const { files } = contextTemplate('Auth', baseConfig);
    expect(files['AuthContext.tsx']).not.toContain('use client');
  });

  it('generates JavaScript files without TypeScript interface', () => {
    const config: RchitectConfig = { ...baseConfig, language: 'javascript', styling: 'css' };
    const { files } = contextTemplate('Auth', config);
    expect(files['AuthContext.jsx']).toBeDefined();
    expect(files['AuthContext.jsx']).not.toContain('interface');
  });

  it('generates a test file when withTests is true', () => {
    const config: RchitectConfig = { ...baseConfig, withTests: true };
    const { files } = contextTemplate('Auth', config);
    expect(files['AuthContext.test.tsx']).toBeDefined();
    expect(files['AuthContext.test.tsx']).toContain('AuthProvider');
    expect(files['AuthContext.test.tsx']).toContain('useAuth');
  });
});

describe('storeTemplate', () => {
  const baseConfig: Pick<RchitectConfig, 'language' | 'withTests'> = {
    language: 'typescript',
    withTests: false,
  };

  it('resolvedName is "use${name}Store"', () => {
    const { resolvedName }: StoreTemplateResult = storeTemplate('Cart', baseConfig as RchitectConfig);
    expect(resolvedName).toBe('useCartStore');
  });

  it('generates useCartStore.ts and index.ts', () => {
    const { files } = storeTemplate('Cart', baseConfig as RchitectConfig);
    expect(files['useCartStore.ts']).toBeDefined();
    expect(files['index.ts']).toBeDefined();
  });

  it('generates TypeScript State and Actions interfaces', () => {
    const { files } = storeTemplate('Cart', baseConfig as RchitectConfig);
    expect(files['useCartStore.ts']).toContain('interface CartState');
    expect(files['useCartStore.ts']).toContain('interface CartActions');
  });

  it('uses zustand create() for TypeScript', () => {
    const { files } = storeTemplate('Cart', baseConfig as RchitectConfig);
    expect(files['useCartStore.ts']).toContain("from 'zustand'");
    expect(files['useCartStore.ts']).toContain('create<');
  });

  it('generates a simpler zustand store for JavaScript', () => {
    const config = { ...baseConfig, language: 'javascript' } as RchitectConfig;
    const { files } = storeTemplate('Cart', config);
    expect(files['useCartStore.js']).toBeDefined();
    expect(files['useCartStore.js']).not.toContain('interface');
    expect(files['useCartStore.js']).toContain('create(');
  });

  it('generates a barrel export', () => {
    const { files } = storeTemplate('Cart', baseConfig as RchitectConfig);
    expect(files['index.ts']).toContain("export { default } from './useCartStore'");
  });

  it('generates a test file when withTests is true', () => {
    const config = { ...baseConfig, withTests: true } as RchitectConfig;
    const { files } = storeTemplate('Cart', config);
    expect(files['useCartStore.test.ts']).toBeDefined();
    expect(files['useCartStore.test.ts']).toContain('useCartStore');
  });
});

describe('typeTemplate', () => {
  const tsConfig: RchitectConfig = {
    framework: 'react',
    pattern: 'feature-based',
    language: 'typescript',
    styling: 'css',
    withTests: false,
    useClient: false,
  };

  it('resolvedName is "${name}.types"', () => {
    const { resolvedName } = typeTemplate('User', tsConfig);
    expect(resolvedName).toBe('User.types');
  });

  it('generates a .types.ts file for TypeScript projects', () => {
    const { files } = typeTemplate('User', tsConfig);
    expect(files['User.types.ts']).toBeDefined();
  });

  it('includes a TypeScript interface', () => {
    const { files } = typeTemplate('User', tsConfig);
    expect(files['User.types.ts']).toContain('export interface User');
  });

  it('includes a type alias and Partial type', () => {
    const { files } = typeTemplate('User', tsConfig);
    expect(files['User.types.ts']).toContain('export type UserId');
    expect(files['User.types.ts']).toContain('export type PartialUser');
  });

  it('generates a .types.js file for JavaScript projects', () => {
    const config: RchitectConfig = { ...tsConfig, language: 'javascript' };
    const { files } = typeTemplate('User', config);
    expect(files['User.types.js']).toBeDefined();
    expect(files['User.types.js']).toContain('@typedef');
  });
});

describe('apiTemplate', () => {
  const tsConfig: RchitectConfig = {
    framework: 'nextjs',
    pattern: 'feature-based',
    language: 'typescript',
    styling: 'css',
    withTests: false,
    useClient: false,
  };

  it('generates a route.ts file for TypeScript', () => {
    const { files } = apiTemplate('Users', tsConfig);
    expect(files['route.ts']).toBeDefined();
  });

  it('includes typed GET and POST handlers', () => {
    const { files } = apiTemplate('Users', tsConfig);
    expect(files['route.ts']).toContain('NextRequest');
    expect(files['route.ts']).toContain('export async function GET');
    expect(files['route.ts']).toContain('export async function POST');
  });

  it('resolvedName is the camelCase of name', () => {
    const { resolvedName } = apiTemplate('UserProfile', tsConfig);
    expect(resolvedName).toBe('userProfile');
  });

  it('generates a route.js file for JavaScript', () => {
    const config: RchitectConfig = { ...tsConfig, language: 'javascript' };
    const { files } = apiTemplate('Users', config);
    expect(files['route.js']).toBeDefined();
    expect(files['route.js']).toContain('export async function GET');
    expect(files['route.js']).toContain('export async function POST');
  });
});

describe('featureTemplate', () => {
  const baseConfig: RchitectConfig = {
    framework: 'react',
    pattern: 'feature-based',
    language: 'typescript',
    styling: 'css',
    withTests: false,
    useClient: false,
  };

  it('resolvedName is the feature name', () => {
    const { resolvedName } = featureTemplate('Dashboard', baseConfig);
    expect(resolvedName).toBe('Dashboard');
  });

  it('generates a view component', () => {
    const { files } = featureTemplate('Dashboard', baseConfig);
    expect(files['components/DashboardView/DashboardView.tsx']).toBeDefined();
    expect(files['components/DashboardView/DashboardView.tsx']).toContain('DashboardView');
  });

  it('generates a hook', () => {
    const { files } = featureTemplate('Dashboard', baseConfig);
    expect(files['hooks/useDashboard/useDashboard.ts']).toBeDefined();
    expect(files['hooks/useDashboard/useDashboard.ts']).toContain('useDashboard');
  });

  it('generates a service', () => {
    const { files } = featureTemplate('Dashboard', baseConfig);
    expect(files['services/dashboardService/dashboardService.ts']).toBeDefined();
    expect(files['services/dashboardService/dashboardService.ts']).toContain('dashboardService');
  });

  it('generates types.ts', () => {
    const { files } = featureTemplate('Dashboard', baseConfig);
    expect(files['types.ts']).toBeDefined();
    expect(files['types.ts']).toContain('Dashboard');
  });

  it('generates a feature index.ts with named exports', () => {
    const { files } = featureTemplate('Dashboard', baseConfig);
    expect(files['index.ts']).toContain('DashboardView');
    expect(files['index.ts']).toContain('useDashboard');
  });

  it('generates barrel index files for sub-directories', () => {
    const { files } = featureTemplate('Dashboard', baseConfig);
    expect(files['components/DashboardView/index.ts']).toBeDefined();
    expect(files['hooks/useDashboard/index.ts']).toBeDefined();
    expect(files['services/dashboardService/index.ts']).toBeDefined();
  });

  it('generates a style file for the view component', () => {
    const { files } = featureTemplate('Dashboard', baseConfig);
    expect(files['components/DashboardView/DashboardView.module.css']).toBeDefined();
  });

  it('generates test files when withTests is true', () => {
    const config: RchitectConfig = { ...baseConfig, withTests: true };
    const { files } = featureTemplate('Dashboard', config);
    expect(files['components/DashboardView/DashboardView.test.tsx']).toBeDefined();
    expect(files['hooks/useDashboard/useDashboard.test.ts']).toBeDefined();
  });

  it('does not generate test files when withTests is false', () => {
    const { files } = featureTemplate('Dashboard', baseConfig);
    expect(files['components/DashboardView/DashboardView.test.tsx']).toBeUndefined();
  });

  it('adds "use client" directive to view when framework is nextjs and useClient is true', () => {
    const config: RchitectConfig = { ...baseConfig, framework: 'nextjs', useClient: true };
    const { files } = featureTemplate('Dashboard', config);
    expect(files['components/DashboardView/DashboardView.tsx']).toMatch(/^'use client'/);
  });
});
