const { toCamelCase } = require('./validate');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getExtensions(config) {
  const scriptExt = config.language === 'typescript' ? 'ts' : 'js';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';
  let compExt;
  if (config.framework === 'vue' || config.framework === 'nuxt') compExt = 'vue';
  else if (config.framework === 'svelte') compExt = 'svelte';
  else if (config.framework === 'astro') compExt = 'astro';
  else if (config.framework === 'angular') compExt = 'ts';
  else compExt = config.language === 'typescript' ? 'tsx' : 'jsx';
  return { compExt, scriptExt, styleExt };
}

function toPascalCase(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() +
    str.slice(1).replace(/-([a-z0-9])/g, (_, l) => l.toUpperCase());
}

// ── Component ─────────────────────────────────────────────────────────────────

function atomicBodyByLevel(name, level, isTailwind) {
  const cls = isTailwind ? 'className="container"' : 'className={styles.container}';
  switch (level) {
    case 'atom':
      return `  return <span ${cls}>${name}</span>;`;
    case 'molecule':
      return `  return (\n    <div ${cls}>\n      {/* Compose atoms here */}\n      <span>${name}</span>\n    </div>\n  );`;
    case 'organism':
      return `  return (\n    <section ${cls}>\n      {/* Compose molecules here */}\n      <h2>${name}</h2>\n    </section>\n  );`;
    case 'template':
      return `  return (\n    <div ${cls}>\n      {/* Layout structure — plug in organisms */}\n      <header />\n      <main>${name}</main>\n      <footer />\n    </div>\n  );`;
    case 'page':
      return `  return (\n    <div ${cls}>\n      {/* Page — use a template and pass data */}\n      <h1>${name}</h1>\n    </div>\n  );`;
    default:
      return `  return <div ${cls}>${name}</div>;`;
  }
}

function componentTestTemplate(name, config) {
  const isVitest = config.testing === 'vitest';
  const vitestImport = isVitest ? `import { describe, it } from 'vitest';\n` : '';
  return `${vitestImport}import React from 'react';
import { render } from '@testing-library/react';
import ${name} from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
  });
});
`;
}

function componentTemplate(name, config, level) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vueComponentTemplate(name, config, level);
  if (config.framework === 'svelte' || config.framework === 'sveltekit') return svelteComponentTemplate(name, config, level);
  if (config.framework === 'solidjs') return solidComponentTemplate(name, config, level);
  if (config.framework === 'angular') return angularComponentTemplate(name, config).files;
  if (config.framework === 'astro') return astroComponentTemplate(name, config).files;
  if (config.framework === 'qwik') return qwikComponentTemplate(name, config, level);
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const useClient = config.framework === 'nextjs' && config.useClient;
  const isTS = config.language === 'typescript';
  const clientDirective = useClient ? `'use client';\n\n` : '';

  let body;
  if (config.pattern === 'atomic-design' && level) {
    body = atomicBodyByLevel(name, level, isTailwind);
  } else {
    body = isTailwind
      ? `  return <div className="container">${name}</div>;`
      : `  return <div className={styles.container}>${name}</div>;`;
  }

  const styleImport = isTailwind ? '' : `import styles from './${name}.module.${styleExt}';\n`;
  const propsType = isTS ? `\ninterface ${name}Props {}\n` : '';
  const fcType = isTS ? `: React.FC<${name}Props>` : '';

  const component = `${clientDirective}import React from 'react';
${styleImport}${propsType}
const ${name}${fcType} = () => {
${body}
};

export default ${name};
`;

  const files = {
    [`${name}.${compExt}`]: component,
    [`index.${scriptExt}`]: `export { default } from './${name}';\n`,
  };

  if (!isTailwind) {
    files[`${name}.module.${styleExt}`] = `.container {}\n`;
  }

  if (config.withTests) {
    files[`${name}.test.${compExt}`] = componentTestTemplate(name, config);
  }

  return files;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function hookTemplate(name, config) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vueComposableTemplate(name, config);
  if (config.framework === 'svelte' || config.framework === 'sveltekit') return svelteComposableTemplate(name, config);
  if (config.framework === 'solidjs') return solidHookTemplate(name, config);
  if (config.framework === 'angular') return angularServiceTemplate(name, config);
  if (config.framework === 'astro') return astroUtilTemplate(name, config);
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);
  const hookName = camel.startsWith('use') ? camel : `use${name}`;
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';

  const content = `import { useState, useEffect } from 'react';
${isTS ? `\ninterface ${name}Options {}\n` : ''}
const ${hookName} = (${isTS ? `options?: ${name}Options` : 'options = {}'}) => {
  // Add hook logic here
  return {};
};

export default ${hookName};
`;

  const files = {
    [`${hookName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { default } from './${hookName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${hookName}.test.${scriptExt}`] = `${vitestImport}import { renderHook } from '@testing-library/react';
import ${hookName} from './${hookName}';

describe('${hookName}', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => ${hookName}());
    expect(result.current).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: hookName };
}

// ── Page ──────────────────────────────────────────────────────────────────────

function pageTemplate(name, config) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vuePageTemplate(name, config);
  if (config.framework === 'svelte' || config.framework === 'sveltekit') return sveltePageTemplate(name, config);
  if (config.framework === 'solidjs') return solidPageTemplate(name, config);
  if (config.framework === 'angular') return angularComponentTemplate(name, config).files;
  if (config.framework === 'astro') return astroPageTemplate(name, config).files;
  if (config.framework === 'qwik') {
    const isTS = config.language === 'typescript';
    const ext = isTS ? 'tsx' : 'jsx';
    return { [`index.${ext}`]: `import { component$ } from '@builder.io/qwik';\n\nexport default component$(() => {\n  return <div><h1>${name}</h1></div>;\n});\n` };
  }
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const useClient = config.framework === 'nextjs' && config.useClient;
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const clientDirective = useClient ? `'use client';\n\n` : '';

  const styleImport = isTailwind ? '' : `import styles from './${name}Page.module.${styleExt}';\n`;
  const body = isTailwind
    ? `    <div className="container">\n      <h1>${name}</h1>\n    </div>`
    : `    <div className={styles.container}>\n      <h1>${name}</h1>\n    </div>`;
  const propsType = isTS ? `\ninterface ${name}PageProps {}\n` : '';
  const fcType = isTS ? `: React.FC<${name}PageProps>` : '';

  const component = `${clientDirective}import React from 'react';
${styleImport}${propsType}
const ${name}Page${fcType} = () => {
  return (
${body}
  );
};

export default ${name}Page;
`;

  const files = {
    [`${name}Page.${compExt}`]: component,
    [`index.${scriptExt}`]: `export { default } from './${name}Page';\n`,
  };

  if (!isTailwind) {
    files[`${name}Page.module.${styleExt}`] = `.container {}\n`;
  }

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it } from 'vitest';\n` : '';
    files[`${name}Page.test.${compExt}`] = `${vitestImport}import React from 'react';
import { render } from '@testing-library/react';
import ${name}Page from './${name}Page';

describe('${name}Page', () => {
  it('renders without crashing', () => {
    render(<${name}Page />);
  });
});
`;
  }

  return files;
}

// ── Service ───────────────────────────────────────────────────────────────────

function serviceTemplate(name, config) {
  if (config.framework === 'angular') return angularServiceTemplate(name, config);
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);
  const serviceName = `${camel}Service`;
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';

  const content = isTS
    ? `interface ${name}Service {}\n\nconst ${serviceName}: ${name}Service = {\n  // Add service methods here\n};\n\nexport default ${serviceName};\n`
    : `const ${serviceName} = {\n  // Add service methods here\n};\n\nexport default ${serviceName};\n`;

  const files = {
    [`${serviceName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { default } from './${serviceName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${serviceName}.test.${scriptExt}`] = `${vitestImport}import ${serviceName} from './${serviceName}';

describe('${serviceName}', () => {
  it('should be defined', () => {
    expect(${serviceName}).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: serviceName };
}

// ── Context ───────────────────────────────────────────────────────────────────

function contextTemplate(name, config) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vueContextTemplate(name, config);
  if (config.framework === 'svelte') return svelteContextTemplate(name, config);
  if (config.framework === 'solidjs') return solidContextTemplate(name, config);
  if (config.framework === 'angular') return angularServiceTemplate(name, config);
  if (config.framework === 'astro') return astroUtilTemplate(name, config);
  const { compExt, scriptExt } = getExtensions(config);
  const useClient = config.framework === 'nextjs';
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const clientDirective = useClient ? `'use client';\n\n` : '';
  const hookName = `use${name}`;
  const contextName = `${name}Context`;

  const content = isTS
    ? `${clientDirective}import React, { createContext, useContext, useState } from 'react';

interface ${name}ContextValue {
  // Add context value shape here
}

const ${contextName} = createContext<${name}ContextValue | undefined>(undefined);

export function ${name}Provider({ children }: { children: React.ReactNode }) {
  // Add state and logic here

  const value: ${name}ContextValue = {
    // Provide values here
  };

  return (
    <${contextName}.Provider value={value}>
      {children}
    </${contextName}.Provider>
  );
}

export function ${hookName}(): ${name}ContextValue {
  const context = useContext(${contextName});
  if (!context) {
    throw new Error('${hookName} must be used within a ${name}Provider');
  }
  return context;
}

export default ${contextName};
`
    : `${clientDirective}import React, { createContext, useContext, useState } from 'react';

const ${contextName} = createContext(undefined);

export function ${name}Provider({ children }) {
  // Add state and logic here

  const value = {
    // Provide values here
  };

  return (
    <${contextName}.Provider value={value}>
      {children}
    </${contextName}.Provider>
  );
}

export function ${hookName}() {
  const context = useContext(${contextName});
  if (!context) {
    throw new Error('${hookName} must be used within a ${name}Provider');
  }
  return context;
}

export default ${contextName};
`;

  const files = {
    [`${contextName}.${compExt}`]: content,
    [`index.${scriptExt}`]: `export { ${name}Provider, ${hookName} } from './${contextName}';\nexport { default } from './${contextName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${contextName}.test.${compExt}`] = `${vitestImport}import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { ${name}Provider, ${hookName} } from './${contextName}';

describe('${name}Provider', () => {
  it('renders without crashing', () => {
    render(<${name}Provider><div /></${name}Provider>);
  });
});

describe('${hookName}', () => {
  it('throws when used outside provider', () => {
    expect(() => renderHook(() => ${hookName}())).toThrow();
  });
});
`;
  }

  return { files, resolvedName: contextName };
}

// ── Store ─────────────────────────────────────────────────────────────────────

function storeTemplate(name, config) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vuePiniaStoreTemplate(name, config);
  if (config.framework === 'svelte') return svelteStoreTemplate(name, config);
  if (config.framework === 'solidjs') return solidStoreTemplate(name, config);
  if (config.framework === 'angular') return angularStoreTemplate(name, config);
  if (config.framework === 'astro') return astroUtilTemplate(name, config);
  const { scriptExt } = getExtensions(config);
  const storeName = `use${name}Store`;
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';

  const content = isTS
    ? `import { create } from 'zustand';

interface ${name}State {
  // Add state fields here
}

interface ${name}Actions {
  // Add action signatures here
}

const ${storeName} = create<${name}State & ${name}Actions>()((set, get) => ({
  // Add state and actions here
}));

export default ${storeName};
`
    : `import { create } from 'zustand';

const ${storeName} = create((set, get) => ({
  // Add state and actions here
}));

export default ${storeName};
`;

  const files = {
    [`${storeName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { default } from './${storeName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${storeName}.test.${scriptExt}`] = `${vitestImport}import { act, renderHook } from '@testing-library/react';
import ${storeName} from './${storeName}';

describe('${storeName}', () => {
  it('is defined', () => {
    const { result } = renderHook(() => ${storeName}());
    expect(result.current).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: storeName };
}

// ── Type ──────────────────────────────────────────────────────────────────────

function typeTemplate(name, config) {
  const { scriptExt } = getExtensions(config);

  const content = config.language === 'typescript'
    ? `// ${name} types

export interface ${name} {
  id: string;
  // Add fields here
}

export type ${name}Id = ${name}['id'];

export type Partial${name} = Partial<${name}>;
`
    : `/**
 * @typedef {Object} ${name}
 * @property {string} id
 */

module.exports = {};
`;

  return {
    files: { [`${name}.types.${scriptExt}`]: content },
    resolvedName: `${name}.types`,
  };
}

// ── API Route ─────────────────────────────────────────────────────────────────

function apiTemplate(name, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';
  const camel = toCamelCase(name);

  const content = isTS
    ? `import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ message: 'Created', data: body }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
`
    : `/**
 * @param {import('next/server').NextRequest} request
 */
export async function GET(request) {
  try {
    return Response.json({ message: 'OK' });
  } catch (error) {
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * @param {import('next/server').NextRequest} request
 */
export async function POST(request) {
  try {
    const body = await request.json();
    return Response.json({ message: 'Created', data: body }, { status: 201 });
  } catch (error) {
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
`;

  return {
    files: { [`route.${ext}`]: content },
    resolvedName: camel,
  };
}

// ── Feature ───────────────────────────────────────────────────────────────────

function featureTemplate(name, config) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vueFeatureTemplate(name, config);
  if (config.framework === 'svelte') return svelteFeatureTemplate(name, config);
  if (config.framework === 'solidjs') return solidFeatureTemplate(name, config);
  if (config.framework === 'angular') return angularFeatureTemplate(name, config);
  if (config.framework === 'astro') return astroFeatureTemplate(name, config);
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const useClient = config.framework === 'nextjs' && config.useClient;
  const clientDirective = useClient ? `'use client';\n\n` : '';
  const camel = toCamelCase(name);
  const hookName = `use${name}`;
  const serviceName = `${camel}Service`;

  const styleImport = isTailwind ? '' : `import styles from './${name}View.module.${styleExt}';\n`;
  const body = isTailwind
    ? `    <div className="container">\n      <h1>${name}</h1>\n    </div>`
    : `    <div className={styles.container}>\n      <h1>${name}</h1>\n    </div>`;

  const viewComp = `${clientDirective}import React from 'react';
${styleImport}${isTS ? `\ninterface ${name}ViewProps {}\n` : ''}
const ${name}View${isTS ? `: React.FC<${name}ViewProps>` : ''} = () => {
  return (
${body}
  );
};

export default ${name}View;
`;

  const hookContent = `import { useState, useEffect } from 'react';
${isTS ? `\ninterface ${name}State {}\n` : ''}
const ${hookName} = () => {
  // Add ${name} logic here
  return {};
};

export default ${hookName};
`;

  const serviceContent = isTS
    ? `interface ${name}Service {}\n\nconst ${serviceName}: ${name}Service = {\n  // Add ${name} service methods here\n};\n\nexport default ${serviceName};\n`
    : `const ${serviceName} = {\n  // Add ${name} service methods here\n};\n\nexport default ${serviceName};\n`;

  const typesContent = isTS
    ? `// ${name} types\n\nexport interface ${name} {\n  id: string;\n  // Add fields here\n}\n`
    : `/** @typedef {{ id: string }} ${name} */\n`;

  const featureIndex = `export { default as ${name}View } from './components/${name}View';\nexport { default as ${hookName} } from './hooks/${hookName}';\n`;

  const files = {
    [`components/${name}View/${name}View.${compExt}`]: viewComp,
    [`components/${name}View/index.${scriptExt}`]: `export { default } from './${name}View';\n`,
    [`hooks/${hookName}/${hookName}.${scriptExt}`]: hookContent,
    [`hooks/${hookName}/index.${scriptExt}`]: `export { default } from './${hookName}';\n`,
    [`services/${serviceName}/${serviceName}.${scriptExt}`]: serviceContent,
    [`services/${serviceName}/index.${scriptExt}`]: `export { default } from './${serviceName}';\n`,
    [`types.${scriptExt}`]: typesContent,
    [`index.${scriptExt}`]: featureIndex,
  };

  if (!isTailwind) {
    files[`components/${name}View/${name}View.module.${styleExt}`] = `.container {}\n`;
  }

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it } from 'vitest';\n` : '';
    const vitestHookImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`components/${name}View/${name}View.test.${compExt}`] = `${vitestImport}import React from 'react';\nimport { render } from '@testing-library/react';\nimport ${name}View from './${name}View';\n\ndescribe('${name}View', () => {\n  it('renders without crashing', () => {\n    render(<${name}View />);\n  });\n});\n`;
    files[`hooks/${hookName}/${hookName}.test.${scriptExt}`] = `${vitestHookImport}import { renderHook } from '@testing-library/react';\nimport ${hookName} from './${hookName}';\n\ndescribe('${hookName}', () => {\n  it('returns expected value', () => {\n    const { result } = renderHook(() => ${hookName}());\n    expect(result.current).toBeDefined();\n  });\n});\n`;
  }

  return { files, resolvedName: name };
}

// ── Next.js App Router ────────────────────────────────────────────────────────

function layoutTemplate(segment, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'tsx' : 'jsx';
  const segmentName = toPascalCase(segment);

  const content = isTS
    ? `export default function ${segmentName}Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}
`
    : `export default function ${segmentName}Layout({ children }) {
  return (
    <div>
      {children}
    </div>
  );
}
`;

  return { files: { [`layout.${ext}`]: content }, resolvedName: `${segment}/layout` };
}

function loadingTemplate(segment, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'tsx' : 'jsx';
  const segmentName = toPascalCase(segment);

  const content = `export default function ${segmentName}Loading() {
  return (
    <div>
      <p>Loading...</p>
    </div>
  );
}
`;

  return { files: { [`loading.${ext}`]: content }, resolvedName: `${segment}/loading` };
}

function errorTemplate(segment, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'tsx' : 'jsx';
  const segmentName = toPascalCase(segment);
  const propsType = isTS ? `\ninterface ErrorProps {\n  error: Error & { digest?: string };\n  reset: () => void;\n}\n` : '';
  const props = isTS ? `{ error, reset }: ErrorProps` : `{ error, reset }`;

  const content = `'use client';

import { useEffect } from 'react';
${propsType}
export default function ${segmentName}Error(${props}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
`;

  return { files: { [`error.${ext}`]: content }, resolvedName: `${segment}/error` };
}

function notFoundTemplate(segment, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'tsx' : 'jsx';
  const segmentName = toPascalCase(segment);

  const content = `export default function ${segmentName}NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find the requested resource.</p>
    </div>
  );
}
`;

  return { files: { [`not-found.${ext}`]: content }, resolvedName: `${segment}/not-found` };
}

function middlewareTemplate(config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';

  const content = isTS
    ? `import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
`
    : `/**
 * @param {import('next/server').NextRequest} request
 */
export function middleware(request) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
`;

  return { files: { [`middleware.${ext}`]: content }, resolvedName: 'middleware' };
}

function serverActionTemplate(name, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';
  const camel = toCamelCase(name);
  const actionName = `${camel}Action`;

  const content = isTS
    ? `'use server';

export async function ${actionName}(formData: FormData): Promise<void> {
  // Implement server action
}
`
    : `'use server';

/**
 * @param {FormData} formData
 */
export async function ${actionName}(formData) {
  // Implement server action
}
`;

  return { files: { [`${camel}.${ext}`]: content }, resolvedName: camel };
}

// ── Vue 3 templates ───────────────────────────────────────────────────────────

function vueComponentTemplate(name, config, level) {
  const { scriptExt, styleExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const scriptLang = isTS ? ` lang="ts"` : '';

  let bodyClass = isTailwind ? `class="container"` : `class="${name}"`;
  let atomicComment = '';
  if (config.pattern === 'atomic-design' && level) {
    const comments = {
      atom: '<!-- Atom: smallest UI unit -->',
      molecule: '<!-- Molecule: compose atoms here -->',
      organism: '<!-- Organism: compose molecules here -->',
      template: '<!-- Template: layout structure -->',
      page: '<!-- Page: full view -->',
    };
    atomicComment = `\n  ${comments[level] || ''}`;
  }

  const propsInterface = isTS ? `\ninterface ${name}Props {}\n\n` : '';
  const defineProps = isTS
    ? `const props = defineProps<${name}Props>();\n`
    : `const props = defineProps({});\n`;

  const styleBlock = isTailwind
    ? ''
    : `\n<style scoped>\n.${name} {}\n</style>\n`;

  const content = `<script setup${scriptLang}>\n${propsInterface}${defineProps}</script>\n\n<template>\n  <div ${bodyClass}>${atomicComment}\n    ${name}\n  </div>\n</template>${styleBlock}`;

  const files = {
    [`${name}.vue`]: content,
    [`index.${scriptExt}`]: `export { default } from './${name}.vue';\n`,
  };

  if (config.withTests) {
    const isVitest = config.testing === 'vitest';
    const vitestImport = isVitest ? `import { describe, it } from 'vitest';\n` : '';
    files[`${name}.test.${scriptExt}`] = `${vitestImport}import { mount } from '@vue/test-utils';
import ${name} from './${name}.vue';

describe('${name}', () => {
  it('renders without crashing', () => {
    const wrapper = mount(${name});
    expect(wrapper.exists()).toBe(true);
  });
});
`;
  }

  return files;
}

function vueComposableTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);
  const hookName = camel.startsWith('use') ? camel : `use${name}`;
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';

  const content = `import { ref, computed, onMounted } from 'vue';
${isTS ? `\ninterface ${name}Options {}\n` : ''}
const ${hookName} = (${isTS ? `options?: ${name}Options` : 'options = {}'}) => {
  // Add composable logic here
  return {};
};

export default ${hookName};
`;

  const files = {
    [`${hookName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { default } from './${hookName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${hookName}.test.${scriptExt}`] = `${vitestImport}import { ${hookName} } from './${hookName}';

describe('${hookName}', () => {
  it('returns expected value', () => {
    const result = ${hookName}();
    expect(result).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: hookName };
}

function vuePiniaStoreTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const storeName = `use${name}Store`;
  const storeId = toCamelCase(name);

  const content = isTS
    ? `import { defineStore } from 'pinia';

interface ${name}State {
  // Add state fields here
}

export const ${storeName} = defineStore('${storeId}', {
  state: (): ${name}State => ({
    // Initial state
  }),
  getters: {
    // Add getters here
  },
  actions: {
    // Add actions here
  },
});
`
    : `import { defineStore } from 'pinia';

export const ${storeName} = defineStore('${storeId}', {
  state: () => ({
    // Initial state
  }),
  getters: {},
  actions: {},
});
`;

  const files = {
    [`${storeName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { ${storeName} } from './${storeName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect, beforeEach } from 'vitest';\n` : '';
    files[`${storeName}.test.${scriptExt}`] = `${vitestImport}import { setActivePinia, createPinia } from 'pinia';
import { ${storeName} } from './${storeName}';

describe('${storeName}', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('is defined', () => {
    const store = ${storeName}();
    expect(store).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: storeName };
}

function vueContextTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const hookName = `use${name}`;
  const provideFn = `provide${name}`;

  const content = isTS
    ? `import { provide, inject } from 'vue';
import type { InjectionKey } from 'vue';

interface ${name}ContextValue {
  // Add context value shape here
}

const ${name}ContextKey: InjectionKey<${name}ContextValue> = Symbol('${name}Context');

export function ${provideFn}(value: ${name}ContextValue): void {
  provide(${name}ContextKey, value);
}

export function ${hookName}(): ${name}ContextValue {
  const context = inject(${name}ContextKey);
  if (!context) {
    throw new Error('${hookName} must be used within a component with ${provideFn}');
  }
  return context;
}
`
    : `import { provide, inject } from 'vue';

const ${name}ContextKey = Symbol('${name}Context');

export function ${provideFn}(value) {
  provide(${name}ContextKey, value);
}

export function ${hookName}() {
  const context = inject(${name}ContextKey);
  if (!context) {
    throw new Error('${hookName} must be used within a component with ${provideFn}');
  }
  return context;
}
`;

  const files = {
    [`${name}Context.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { ${provideFn}, ${hookName} } from './${name}Context';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${name}Context.test.${scriptExt}`] = `${vitestImport}import { ${hookName} } from './${name}Context';

describe('${hookName}', () => {
  it('throws when used outside provider', () => {
    expect(() => ${hookName}()).toThrow();
  });
});
`;
  }

  return { files, resolvedName: `${name}Context` };
}

function vuePageTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const scriptLang = isTS ? ` lang="ts"` : '';
  const bodyClass = isTailwind ? `class="container"` : `class="${name}Page"`;
  const styleBlock = isTailwind ? '' : `\n<style scoped>\n.${name}Page {}\n</style>\n`;

  const content = `<script setup${scriptLang}>\n// ${name} page logic\n</script>\n\n<template>\n  <div ${bodyClass}>\n    <h1>${name}</h1>\n  </div>\n</template>${styleBlock}`;

  const files = {
    [`${name}Page.vue`]: content,
    [`index.${scriptExt}`]: `export { default } from './${name}Page.vue';\n`,
  };

  return files;
}

function vueFeatureTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const camel = toCamelCase(name);
  const scriptLang = isTS ? ` lang="ts"` : '';
  const bodyClass = isTailwind ? `class="container"` : `class="${name}View"`;
  const styleBlock = isTailwind ? '' : `\n<style scoped>\n.${name}View {}\n</style>\n`;

  const viewComp = `<script setup${scriptLang}>\n// ${name} view logic\n</script>\n\n<template>\n  <div ${bodyClass}>\n    <h1>${name}</h1>\n  </div>\n</template>${styleBlock}`;

  const composableContent = `import { ref } from 'vue';
${isTS ? `\ninterface ${name}State {}\n` : ''}
const use${name} = () => {
  // Add ${name} composable logic here
  return {};
};

export default use${name};
`;

  const serviceContent = isTS
    ? `interface ${name}Service {}\n\nconst ${camel}Service: ${name}Service = {\n  // Add ${name} service methods here\n};\n\nexport default ${camel}Service;\n`
    : `const ${camel}Service = {\n  // Add ${name} service methods here\n};\n\nexport default ${camel}Service;\n`;

  const typesContent = isTS
    ? `// ${name} types\n\nexport interface ${name} {\n  id: string;\n  // Add fields here\n}\n`
    : `/** @typedef {{ id: string }} ${name} */\n`;

  const files = {
    [`components/${name}View/${name}View.vue`]: viewComp,
    [`components/${name}View/index.${scriptExt}`]: `export { default } from './${name}View.vue';\n`,
    [`composables/use${name}/use${name}.${scriptExt}`]: composableContent,
    [`composables/use${name}/index.${scriptExt}`]: `export { default } from './use${name}';\n`,
    [`services/${camel}Service/${camel}Service.${scriptExt}`]: serviceContent,
    [`services/${camel}Service/index.${scriptExt}`]: `export { default } from './${camel}Service';\n`,
    [`types.${scriptExt}`]: typesContent,
    [`index.${scriptExt}`]: `export { default as ${name}View } from './components/${name}View';\nexport { default as use${name} } from './composables/use${name}';\n`,
  };

  return { files, resolvedName: name };
}

// ── Svelte templates ───────────────────────────────────────────────────────────

function svelteComponentTemplate(name, config, level) {
  const { scriptExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const scriptLang = isTS ? ` lang="ts"` : '';

  let atomicComment = '';
  if (config.pattern === 'atomic-design' && level) {
    const comments = {
      atom: '<!-- Atom: smallest UI unit -->',
      molecule: '<!-- Molecule: compose atoms here -->',
      organism: '<!-- Organism: compose molecules here -->',
      template: '<!-- Template: layout structure -->',
      page: '<!-- Page: full view -->',
    };
    atomicComment = `\n  ${comments[level] || ''}`;
  }

  const propsBlock = isTS
    ? `  interface ${name}Props {}\n  let { }: ${name}Props = $props();\n`
    : `  let { } = $props();\n`;

  const styleBlock = isTailwind
    ? ''
    : `\n<style>\n  .${name} {}\n</style>\n`;

  const bodyClass = isTailwind ? `class="container"` : `class="${name}"`;

  const content = `<script${scriptLang}>\n${propsBlock}</script>\n\n<div ${bodyClass}>${atomicComment}\n  ${name}\n</div>${styleBlock}`;

  const files = {
    [`${name}.svelte`]: content,
    [`index.${scriptExt}`]: `export { default } from './${name}.svelte';\n`,
  };

  if (config.withTests) {
    const isVitest = config.testing === 'vitest';
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${name}.test.${scriptExt}`] = `${vitestImport}import { render } from '@testing-library/svelte';
import ${name} from './${name}.svelte';

describe('${name}', () => {
  it('renders without crashing', () => {
    const { container } = render(${name});
    expect(container).toBeTruthy();
  });
});
`;
  }

  return files;
}

function svelteComposableTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);
  const hookName = camel.startsWith('use') ? camel : `use${name}`;
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';

  const content = isTS
    ? `// Svelte 5 composable using runes
interface ${name}Options {}

export function ${hookName}(options?: ${name}Options) {
  // Add reactive state with $state rune
  // const count = $state(0);
  return {};
}
`
    : `// Svelte 5 composable using runes

export function ${hookName}(options = {}) {
  // Add reactive state with $state rune
  // const count = $state(0);
  return {};
}
`;

  const files = {
    [`${hookName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { ${hookName} } from './${hookName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${hookName}.test.${scriptExt}`] = `${vitestImport}import { ${hookName} } from './${hookName}';

describe('${hookName}', () => {
  it('returns expected value', () => {
    const result = ${hookName}();
    expect(result).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: hookName };
}

function svelteStoreTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const storeName = `${toCamelCase(name)}Store`;

  const content = isTS
    ? `import { writable, derived } from 'svelte/store';

interface ${name}State {
  // Add state fields here
}

function create${name}Store() {
  const { subscribe, set, update } = writable<${name}State>({
    // Initial state
  });

  return {
    subscribe,
    // Add actions here
    reset: () => set({} as ${name}State),
  };
}

export const ${storeName} = create${name}Store();
`
    : `import { writable, derived } from 'svelte/store';

function create${name}Store() {
  const { subscribe, set, update } = writable({
    // Initial state
  });

  return {
    subscribe,
    // Add actions here
    reset: () => set({}),
  };
}

export const ${storeName} = create${name}Store();
`;

  const files = {
    [`${storeName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { ${storeName} } from './${storeName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${storeName}.test.${scriptExt}`] = `${vitestImport}import { get } from 'svelte/store';
import { ${storeName} } from './${storeName}';

describe('${storeName}', () => {
  it('is defined', () => {
    expect(${storeName}).toBeDefined();
  });

  it('has subscribe method', () => {
    expect(typeof ${storeName}.subscribe).toBe('function');
  });
});
`;
  }

  return { files, resolvedName: storeName };
}

function svelteContextTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const setFn = `set${name}Context`;
  const getFn = `get${name}Context`;

  const content = isTS
    ? `import { getContext, setContext } from 'svelte';

interface ${name}ContextValue {
  // Add context value shape here
}

const ${name.toUpperCase()}_CONTEXT_KEY = Symbol('${name}Context');

export function ${setFn}(value: ${name}ContextValue): void {
  setContext(${name.toUpperCase()}_CONTEXT_KEY, value);
}

export function ${getFn}(): ${name}ContextValue {
  const context = getContext<${name}ContextValue>(${name.toUpperCase()}_CONTEXT_KEY);
  if (!context) {
    throw new Error('${getFn} must be called within a ${name} context provider');
  }
  return context;
}
`
    : `import { getContext, setContext } from 'svelte';

const ${name.toUpperCase()}_CONTEXT_KEY = Symbol('${name}Context');

export function ${setFn}(value) {
  setContext(${name.toUpperCase()}_CONTEXT_KEY, value);
}

export function ${getFn}() {
  const context = getContext(${name.toUpperCase()}_CONTEXT_KEY);
  if (!context) {
    throw new Error('${getFn} must be called within a ${name} context provider');
  }
  return context;
}
`;

  const files = {
    [`${name}Context.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { ${setFn}, ${getFn} } from './${name}Context';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${name}Context.test.${scriptExt}`] = `${vitestImport}import { ${getFn} } from './${name}Context';

describe('${getFn}', () => {
  it('throws when used outside context', () => {
    expect(() => ${getFn}()).toThrow();
  });
});
`;
  }

  return { files, resolvedName: `${name}Context` };
}

function sveltePageTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const scriptLang = isTS ? ` lang="ts"` : '';
  const bodyClass = isTailwind ? `class="container"` : `class="${name}Page"`;
  const styleBlock = isTailwind ? '' : `\n<style>\n  .${name}Page {}\n</style>\n`;

  const content = `<script${scriptLang}>\n  // ${name} page logic\n</script>\n\n<div ${bodyClass}>\n  <h1>${name}</h1>\n</div>${styleBlock}`;

  return {
    [`${name}Page.svelte`]: content,
    [`index.${scriptExt}`]: `export { default } from './${name}Page.svelte';\n`,
  };
}

function svelteFeatureTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const camel = toCamelCase(name);
  const scriptLang = isTS ? ` lang="ts"` : '';
  const bodyClass = isTailwind ? `class="container"` : `class="${name}View"`;
  const styleBlock = isTailwind ? '' : `\n<style>\n  .${name}View {}\n</style>\n`;

  const viewComp = `<script${scriptLang}>\n  // ${name} view logic\n</script>\n\n<div ${bodyClass}>\n  <h1>${name}</h1>\n</div>${styleBlock}`;

  const composableContent = isTS
    ? `export function use${name}() {\n  // Add ${name} composable logic here\n  return {};\n}\n`
    : `export function use${name}() {\n  // Add ${name} composable logic here\n  return {};\n}\n`;

  const serviceContent = isTS
    ? `interface ${name}Service {}\n\nconst ${camel}Service: ${name}Service = {\n  // Add ${name} service methods here\n};\n\nexport default ${camel}Service;\n`
    : `const ${camel}Service = {\n  // Add ${name} service methods here\n};\n\nexport default ${camel}Service;\n`;

  const typesContent = isTS
    ? `// ${name} types\n\nexport interface ${name} {\n  id: string;\n  // Add fields here\n}\n`
    : `/** @typedef {{ id: string }} ${name} */\n`;

  const files = {
    [`components/${name}View/${name}View.svelte`]: viewComp,
    [`components/${name}View/index.${scriptExt}`]: `export { default } from './${name}View.svelte';\n`,
    [`composables/use${name}.${scriptExt}`]: composableContent,
    [`services/${camel}Service/${camel}Service.${scriptExt}`]: serviceContent,
    [`services/${camel}Service/index.${scriptExt}`]: `export { default } from './${camel}Service';\n`,
    [`types.${scriptExt}`]: typesContent,
    [`index.${scriptExt}`]: `export { default as ${name}View } from './components/${name}View';\nexport { use${name} } from './composables/use${name}';\n`,
  };

  return { files, resolvedName: name };
}

// ── SolidJS templates ─────────────────────────────────────────────────────────

function solidComponentTemplate(name, config, level) {
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';

  let body;
  const cls = isTailwind ? `class="container"` : `class={styles.container}`;
  if (config.pattern === 'atomic-design' && level) {
    const atomicBodies = {
      atom: `  return <span ${cls}>${name}</span>;`,
      molecule: `  return (\n    <div ${cls}>\n      {/* Compose atoms here */}\n      <span>${name}</span>\n    </div>\n  );`,
      organism: `  return (\n    <section ${cls}>\n      {/* Compose molecules here */}\n      <h2>${name}</h2>\n    </section>\n  );`,
      template: `  return (\n    <div ${cls}>\n      {/* Layout structure */}\n      <main>${name}</main>\n    </div>\n  );`,
      page: `  return (\n    <div ${cls}>\n      <h1>${name}</h1>\n    </div>\n  );`,
    };
    body = atomicBodies[level] || `  return <div ${cls}>${name}</div>;`;
  } else {
    body = `  return <div ${cls}>${name}</div>;`;
  }

  const styleImport = isTailwind ? '' : `import styles from './${name}.module.${styleExt}';\n`;
  const propsType = isTS ? `\ninterface ${name}Props {}\n` : '';
  const compType = isTS ? `: Component<${name}Props>` : '';
  const solidImport = isTS
    ? `import type { Component } from 'solid-js';\n${styleImport}`
    : `${styleImport}`;

  const component = `${solidImport}${propsType}
const ${name}${compType} = () => {
${body}
};

export default ${name};
`;

  const files = {
    [`${name}.${compExt}`]: component,
    [`index.${scriptExt}`]: `export { default } from './${name}';\n`,
  };

  if (!isTailwind) {
    files[`${name}.module.${styleExt}`] = `.container {}\n`;
  }

  if (config.withTests) {
    const isVitest = config.testing === 'vitest';
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${name}.test.${compExt}`] = `${vitestImport}import { render } from '@solidjs/testing-library';
import ${name} from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    const { container } = render(() => <${name} />);
    expect(container).toBeTruthy();
  });
});
`;
  }

  return files;
}

function qwikComponentTemplate(name, config, level) {
  const isTS = config.language === 'typescript';
  const isTailwind = config.styling === 'tailwind';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';
  const ext = isTS ? 'tsx' : 'jsx';
  const cls = isTailwind ? `class="container"` : `class={styles.container}`;

  let body = `      <div ${cls}>${name}</div>`;
  if (config.pattern === 'atomic-design' && level) {
    const bodies = {
      atom: `      <span ${cls}>${name}</span>`,
      molecule: `      <div ${cls}>\n        <span>${name}</span>\n      </div>`,
      organism: `      <section ${cls}>\n        <h2>${name}</h2>\n      </section>`,
      template: `      <div ${cls}>\n        <main>${name}</main>\n      </div>`,
    };
    body = bodies[level] || body;
  }

  const styleImport = isTailwind ? '' : `import styles from './${name}.module.${styleExt}';\n`;
  const propsType = isTS ? `\nexport interface ${name}Props {}\n` : '';
  const propsArg = isTS ? `${name}Props` : '';
  const propsGeneric = isTS ? `<${name}Props>` : '';

  const content = `import { component$ } from '@builder.io/qwik';\n${styleImport}${propsType}\nexport const ${name} = component$${propsGeneric}((props) => {\n  return (\n${body}\n  );\n});\n\nexport default ${name};\n`;

  const files = {
    [`${name}.${ext}`]: content,
    [`index.${isTS ? 'ts' : 'js'}`]: `export { default } from './${name}';\n`,
  };
  if (!isTailwind) files[`${name}.module.${styleExt}`] = `.container {}\n`;
  return files;
}

function solidHookTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);
  const hookName = camel.startsWith('use') ? camel : `use${name}`;
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';

  const content = `import { createSignal, createEffect, onCleanup } from 'solid-js';
${isTS ? `\ninterface ${name}Options {}\n` : ''}
const ${hookName} = (${isTS ? `options?: ${name}Options` : 'options = {}'}) => {
  // Add signal-based logic here
  return {};
};

export default ${hookName};
`;

  const files = {
    [`${hookName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { default } from './${hookName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${hookName}.test.${scriptExt}`] = `${vitestImport}import ${hookName} from './${hookName}';

describe('${hookName}', () => {
  it('returns expected value', () => {
    const result = ${hookName}();
    expect(result).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: hookName };
}

function solidStoreTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const storeName = `use${name}Store`;

  const content = isTS
    ? `import { createStore, produce } from 'solid-js/store';

interface ${name}State {
  // Add state fields here
}

const [state, setState] = createStore<${name}State>({
  // Initial state
});

const ${storeName} = () => ({ state, setState });

export default ${storeName};
`
    : `import { createStore } from 'solid-js/store';

const [state, setState] = createStore({
  // Initial state
});

const ${storeName} = () => ({ state, setState });

export default ${storeName};
`;

  const files = {
    [`${storeName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { default } from './${storeName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${storeName}.test.${scriptExt}`] = `${vitestImport}import ${storeName} from './${storeName}';

describe('${storeName}', () => {
  it('is defined', () => {
    const store = ${storeName}();
    expect(store).toBeDefined();
    expect(store.state).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: storeName };
}

function solidContextTemplate(name, config) {
  const { compExt, scriptExt } = getExtensions(config);
  const isTS = config.language === 'typescript';
  const isVitest = config.testing === 'vitest';
  const hookName = `use${name}`;
  const contextName = `${name}Context`;

  const content = isTS
    ? `import { createContext, useContext } from 'solid-js';
import type { ParentComponent } from 'solid-js';

interface ${name}ContextValue {
  // Add context value shape here
}

const ${contextName} = createContext<${name}ContextValue>();

export const ${name}Provider: ParentComponent = (props) => {
  const value: ${name}ContextValue = {
    // Provide values here
  };

  return (
    <${contextName}.Provider value={value}>
      {props.children}
    </${contextName}.Provider>
  );
};

export function ${hookName}(): ${name}ContextValue {
  const context = useContext(${contextName});
  if (!context) {
    throw new Error('${hookName} must be used within a ${name}Provider');
  }
  return context;
}

export default ${contextName};
`
    : `import { createContext, useContext } from 'solid-js';

const ${contextName} = createContext();

export const ${name}Provider = (props) => {
  const value = {
    // Provide values here
  };

  return (
    <${contextName}.Provider value={value}>
      {props.children}
    </${contextName}.Provider>
  );
};

export function ${hookName}() {
  const context = useContext(${contextName});
  if (!context) {
    throw new Error('${hookName} must be used within a ${name}Provider');
  }
  return context;
}

export default ${contextName};
`;

  const files = {
    [`${contextName}.${compExt}`]: content,
    [`index.${scriptExt}`]: `export { ${name}Provider, ${hookName} } from './${contextName}';\nexport { default } from './${contextName}';\n`,
  };

  if (config.withTests) {
    const vitestImport = isVitest ? `import { describe, it, expect } from 'vitest';\n` : '';
    files[`${contextName}.test.${compExt}`] = `${vitestImport}import { ${hookName} } from './${contextName}';

describe('${hookName}', () => {
  it('throws when used outside provider', () => {
    expect(() => ${hookName}()).toThrow();
  });
});
`;
  }

  return { files, resolvedName: contextName };
}

function solidPageTemplate(name, config) {
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const styleImport = isTailwind ? '' : `import styles from './${name}Page.module.${styleExt}';\n`;
  const cls = isTailwind ? `class="container"` : `class={styles.container}`;
  const solidImport = isTS ? `import type { Component } from 'solid-js';\n` : '';
  const compType = isTS ? `: Component` : '';

  const content = `${solidImport}${styleImport}
const ${name}Page${compType} = () => {
  return (
    <div ${cls}>
      <h1>${name}</h1>
    </div>
  );
};

export default ${name}Page;
`;

  const files = {
    [`${name}Page.${compExt}`]: content,
    [`index.${scriptExt}`]: `export { default } from './${name}Page';\n`,
  };

  if (!isTailwind) {
    files[`${name}Page.module.${styleExt}`] = `.container {}\n`;
  }

  return files;
}

function solidFeatureTemplate(name, config) {
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const isTS = config.language === 'typescript';
  const camel = toCamelCase(name);
  const hookName = `use${name}`;
  const serviceName = `${camel}Service`;

  const styleImport = isTailwind ? '' : `import styles from './${name}View.module.${styleExt}';\n`;
  const cls = isTailwind ? `class="container"` : `class={styles.container}`;
  const solidImport = isTS ? `import type { Component } from 'solid-js';\n` : '';
  const compType = isTS ? `: Component` : '';

  const viewComp = `${solidImport}${styleImport}
const ${name}View${compType} = () => {
  return (
    <div ${cls}>
      <h1>${name}</h1>
    </div>
  );
};

export default ${name}View;
`;

  const hookContent = `import { createSignal } from 'solid-js';
${isTS ? `\ninterface ${name}State {}\n` : ''}
const ${hookName} = () => {
  // Add ${name} signal-based logic here
  return {};
};

export default ${hookName};
`;

  const serviceContent = isTS
    ? `interface ${name}Service {}\n\nconst ${serviceName}: ${name}Service = {\n  // Add ${name} service methods here\n};\n\nexport default ${serviceName};\n`
    : `const ${serviceName} = {\n  // Add ${name} service methods here\n};\n\nexport default ${serviceName};\n`;

  const typesContent = isTS
    ? `// ${name} types\n\nexport interface ${name} {\n  id: string;\n  // Add fields here\n}\n`
    : `/** @typedef {{ id: string }} ${name} */\n`;

  const files = {
    [`components/${name}View/${name}View.${compExt}`]: viewComp,
    [`components/${name}View/index.${scriptExt}`]: `export { default } from './${name}View';\n`,
    [`hooks/${hookName}/${hookName}.${scriptExt}`]: hookContent,
    [`hooks/${hookName}/index.${scriptExt}`]: `export { default } from './${hookName}';\n`,
    [`services/${serviceName}/${serviceName}.${scriptExt}`]: serviceContent,
    [`services/${serviceName}/index.${scriptExt}`]: `export { default } from './${serviceName}';\n`,
    [`types.${scriptExt}`]: typesContent,
    [`index.${scriptExt}`]: `export { default as ${name}View } from './components/${name}View';\nexport { default as ${hookName} } from './hooks/${hookName}';\n`,
  };

  if (!isTailwind) {
    files[`components/${name}View/${name}View.module.${styleExt}`] = `.container {}\n`;
  }

  return { files, resolvedName: name };
}

// ── Nuxt-specific templates ───────────────────────────────────────────────────

function nuxtApiTemplate(name, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';
  const camel = toCamelCase(name);

  const content = isTS
    ? `export default defineEventHandler(async (event) => {
  // ${name} API handler
  return {
    data: null,
  };
});
`
    : `export default defineEventHandler(async (event) => {
  // ${name} API handler
  return {
    data: null,
  };
});
`;

  return {
    files: { [`${camel}.${ext}`]: content },
    resolvedName: camel,
  };
}

function nuxtLayoutTemplate(name, config) {
  const isTS = config.language === 'typescript';
  const isTailwind = config.styling === 'tailwind';
  const scriptLang = isTS ? ` lang="ts"` : '';
  const bodyClass = isTailwind ? `class="layout"` : `class="${name}"`;
  const styleBlock = isTailwind ? '' : `\n<style scoped>\n.${name} {}\n</style>\n`;

  const content = `<script setup${scriptLang}>\n// ${name} layout\n</script>\n\n<template>\n  <div ${bodyClass}>\n    <slot />\n  </div>\n</template>${styleBlock}`;

  return {
    files: { [`${name}.vue`]: content },
    resolvedName: name,
  };
}

function nuxtMiddlewareTemplate(name, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';
  const camel = toCamelCase(name);

  const content = `export default defineNuxtRouteMiddleware((to, from) => {
  // ${name} middleware logic
});
`;

  return {
    files: { [`${camel}.${ext}`]: content },
    resolvedName: camel,
  };
}

// ── Angular templates ─────────────────────────────────────────────────────────

function angularComponentTemplate(name, config) {
  const isTailwind = config.styling === 'tailwind';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';
  const selector = name.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase()).replace(/^-/, '');
  const styleUrl = isTailwind ? '' : `  styleUrls: ['./${selector}.component.${styleExt}'],\n`;
  const styleFile = isTailwind ? {} : { [`${selector}.component.${styleExt}`]: `.${selector} {}\n` };
  const bodyClass = isTailwind ? `class="container"` : `class="${selector}"`;

  const tsContent = `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-${selector}',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './${selector}.component.html',
${styleUrl}})
export class ${name}Component {}
`;

  const htmlContent = `<div ${bodyClass}>
  ${name}
</div>
`;

  const files = {
    [`${selector}.component.ts`]: tsContent,
    [`${selector}.component.html`]: htmlContent,
    [`index.ts`]: `export { ${name}Component } from './${selector}.component';\n`,
    ...styleFile,
  };

  return { files, resolvedName: `${name}Component` };
}

function angularServiceTemplate(name, config) {
  const isTS = config.language === 'typescript';
  const camel = toCamelCase(name);
  const selector = name.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase()).replace(/^-/, '');

  const content = isTS
    ? `import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ${name}Service {
  // Add state and methods here
}
`
    : `import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ${name}Service {
  // Add methods here
}
`;

  return {
    files: {
      [`${selector}.service.ts`]: content,
      [`index.ts`]: `export { ${name}Service } from './${selector}.service';\n`,
    },
    resolvedName: `${name}Service`,
  };
}

function angularStoreTemplate(name, config) {
  const selector = name.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase()).replace(/^-/, '');

  const content = `import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ${name}State {
  // Add state fields here
}

const initialState: ${name}State = {
  // Set initial values here
};

@Injectable({
  providedIn: 'root',
})
export class ${name}Store {
  private state$ = new BehaviorSubject<${name}State>(initialState);
  readonly state: Observable<${name}State> = this.state$.asObservable();

  get snapshot(): ${name}State {
    return this.state$.getValue();
  }

  setState(partial: Partial<${name}State>): void {
    this.state$.next({ ...this.snapshot, ...partial });
  }
}
`;

  return {
    files: {
      [`${selector}.store.ts`]: content,
      [`index.ts`]: `export { ${name}Store } from './${selector}.store';\nexport type { ${name}State } from './${selector}.store';\n`,
    },
    resolvedName: `${name}Store`,
  };
}

function angularFeatureTemplate(name, config) {
  const selector = name.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase()).replace(/^-/, '');
  const isTailwind = config.styling === 'tailwind';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';
  const bodyClass = isTailwind ? `class="container"` : `class="${selector}-view"`;
  const styleUrl = isTailwind ? '' : `  styleUrls: ['./${selector}-view.component.${styleExt}'],\n`;

  const componentTs = `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-${selector}-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './${selector}-view.component.html',
${styleUrl}})
export class ${name}ViewComponent {}
`;

  const componentHtml = `<div ${bodyClass}>
  <h1>${name}</h1>
</div>
`;

  const serviceContent = `import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ${name}Service {
  // Add ${name} service methods here
}
`;

  const files = {
    [`components/${selector}-view/${selector}-view.component.ts`]: componentTs,
    [`components/${selector}-view/${selector}-view.component.html`]: componentHtml,
    [`services/${toCamelCase(name)}Service/${selector}.service.ts`]: serviceContent,
    [`index.ts`]: `export { ${name}ViewComponent } from './components/${selector}-view/${selector}-view.component';\nexport { ${name}Service } from './services/${toCamelCase(name)}Service/${selector}.service';\n`,
  };

  if (!isTailwind) {
    files[`components/${selector}-view/${selector}-view.component.${styleExt}`] = `.${selector}-view {}\n`;
  }

  return { files, resolvedName: name };
}

// ── Astro templates ────────────────────────────────────────────────────────────

function astroComponentTemplate(name, config) {
  const isTailwind = config.styling === 'tailwind';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';
  const bodyClass = isTailwind ? `class="container"` : `class="${name}"`;
  const styleBlock = isTailwind ? '' : `\n<style>\n  .${name} {}\n</style>\n`;

  const content = `---
// ${name} component
interface Props {
  // Add props here
}
const { } = Astro.props;
---

<div ${bodyClass}>
  ${name}
</div>${styleBlock}`;

  const files = {
    [`${name}.astro`]: content,
  };

  return { files, resolvedName: name };
}

function astroPageTemplate(name, config) {
  const isTailwind = config.styling === 'tailwind';
  const bodyClass = isTailwind ? `class="container"` : `class="page"`;

  const content = `---
// ${name} page
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${name}</title>
  </head>
  <body>
    <div ${bodyClass}>
      <h1>${name}</h1>
    </div>
  </body>
</html>
`;

  return {
    files: { [`${name}.astro`]: content },
    resolvedName: name,
  };
}

function astroUtilTemplate(name, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';
  const camel = toCamelCase(name);

  const content = isTS
    ? `// ${name} utility
export function ${camel}(): void {
  // Add logic here
}
`
    : `// ${name} utility
export function ${camel}() {
  // Add logic here
}
`;

  return {
    files: {
      [`${camel}.${ext}`]: content,
      [`index.${ext}`]: `export { ${camel} } from './${camel}';\n`,
    },
    resolvedName: camel,
  };
}

function astroFeatureTemplate(name, config) {
  const isTailwind = config.styling === 'tailwind';
  const camel = toCamelCase(name);
  const bodyClass = isTailwind ? `class="container"` : `class="${name}"`;
  const styleBlock = isTailwind ? '' : `\n<style>\n  .${name} {}\n</style>\n`;

  const componentContent = `---
// ${name} feature component
---

<div ${bodyClass}>
  <h1>${name}</h1>
</div>${styleBlock}`;

  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';

  const utilContent = isTS
    ? `// ${name} utilities\nexport function use${name}() {\n  return {};\n}\n`
    : `// ${name} utilities\nexport function use${name}() {\n  return {};\n}\n`;

  const files = {
    [`components/${name}View/${name}View.astro`]: componentContent,
    [`utils/${camel}/${camel}.${ext}`]: utilContent,
    [`index.${ext}`]: `export { use${name} } from './utils/${camel}/${camel}';\n`,
  };

  return { files, resolvedName: name };
}

// ── Form template ─────────────────────────────────────────────────────────────

function formTemplate(name, config) {
  if (name.endsWith('Form')) name = name.slice(0, -4);
  const isTS = config.language === 'typescript';
  const isTailwind = config.styling === 'tailwind';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';

  if (config.framework === 'vue' || config.framework === 'nuxt') {
    const scriptLang = isTS ? ` lang="ts"` : '';
    const bodyClass = isTailwind ? `class="form"` : `class="${name}"`;
    const styleBlock = isTailwind ? '' : `\n<style scoped>\n.${name} {}\n</style>\n`;
    const typeBlock = isTS ? `\ninterface ${name}Data {\n  // Add form fields here\n}\n` : '';
    const content = `<script setup${scriptLang}>\nimport { reactive } from 'vue';\n${typeBlock}\nconst form = reactive({\n  // Add form fields here\n});\n\nfunction handleSubmit() {\n  // Handle form submission\n}\n</script>\n\n<template>\n  <form ${bodyClass} @submit.prevent="handleSubmit">\n    <!-- Add form fields here -->\n    <button type="submit">Submit</button>\n  </form>\n</template>${styleBlock}`;
    return { files: { [`${name}Form.vue`]: content, [`index.${isTS ? 'ts' : 'js'}`]: `export { default } from './${name}Form.vue';\n` }, resolvedName: `${name}Form` };
  }

  if (config.framework === 'svelte') {
    const scriptLang = isTS ? ` lang="ts"` : '';
    const typeBlock = isTS ? `\n  interface ${name}Data {}\n  let form: ${name}Data = $state({});` : `\n  let form = $state({});`;
    const content = `<script${scriptLang}>${typeBlock}\n\n  function handleSubmit(e: SubmitEvent) {\n    e.preventDefault();\n    // Handle form submission\n  }\n</script>\n\n<form on:submit={handleSubmit}>\n  <!-- Add form fields here -->\n  <button type="submit">Submit</button>\n</form>`;
    return { files: { [`${name}Form.svelte`]: content }, resolvedName: `${name}Form` };
  }

  if (config.framework === 'solidjs') {
    const ext = isTS ? 'tsx' : 'jsx';
    const typeAnnotation = isTS ? `: Component` : '';
    const content = `import { Component, createSignal } from 'solid-js';\n${isTS ? `\ninterface ${name}Data {}\n` : ''}\nconst ${name}Form${typeAnnotation} = () => {\n  const [formData, setFormData] = createSignal({});\n\n  const handleSubmit = (e: Event) => {\n    e.preventDefault();\n    // Handle form submission\n  };\n\n  return (\n    <form onSubmit={handleSubmit}>\n      {/* Add form fields here */}\n      <button type="submit">Submit</button>\n    </form>\n  );\n};\n\nexport default ${name}Form;\n`;
    return { files: { [`${name}Form.${ext}`]: content, [`index.${isTS ? 'ts' : 'js'}`]: `export { default } from './${name}Form';\n` }, resolvedName: `${name}Form` };
  }

  if (config.framework === 'angular') {
    const selector = name.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase()).replace(/^-/, '');
    const tsContent = `import { Component } from '@angular/core';\nimport { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';\n\n@Component({\n  selector: 'app-${selector}-form',\n  standalone: true,\n  imports: [ReactiveFormsModule],\n  templateUrl: './${selector}-form.component.html',\n})\nexport class ${name}FormComponent {\n  form = new FormGroup({\n    // Add form controls here\n  });\n\n  onSubmit() {\n    if (this.form.valid) {\n      // Handle submission\n    }\n  }\n}\n`;
    const htmlContent = `<form [formGroup]="form" (ngSubmit)="onSubmit()">\n  <!-- Add form fields here -->\n  <button type="submit" [disabled]="form.invalid">Submit</button>\n</form>\n`;
    return { files: { [`${selector}-form.component.ts`]: tsContent, [`${selector}-form.component.html`]: htmlContent, [`index.ts`]: `export { ${name}FormComponent } from './${selector}-form.component';\n` }, resolvedName: `${name}FormComponent` };
  }

  if (config.framework === 'astro') {
    const content = `---\n// ${name} form\n---\n\n<form class="${name}" method="POST">\n  <!-- Add form fields here -->\n  <button type="submit">Submit</button>\n</form>\n${isTailwind ? '' : `\n<style>\n  .${name} {}\n</style>`}`;
    return { files: { [`${name}Form.astro`]: content }, resolvedName: `${name}Form` };
  }

  // React / Next.js / Remix
  const ext = isTS ? 'tsx' : 'jsx';
  const useClient = config.framework === 'nextjs' && config.useClient ? `'use client';\n\n` : '';
  const propsType = isTS ? `\ninterface ${name}FormProps {}\n` : '';
  const fcType = isTS ? `: React.FC<${name}FormProps>` : '';
  const typeBlock = isTS ? `\n  interface ${name}Data {\n    // Add field types here\n  }\n` : '';
  const stateType = isTS ? `<${name}Data>` : '';
  const styleImport = isTailwind ? '' : `import styles from './${name}Form.module.${styleExt}';\n`;
  const formClass = isTailwind ? `className="space-y-4"` : `className={styles.form}`;

  const content = `${useClient}import React, { useState } from 'react';\n${styleImport}${propsType}\nconst ${name}Form${fcType} = () => {${typeBlock}\n  const [formData, setFormData] = useState${stateType}({});\n\n  const handleSubmit = (e: React.FormEvent) => {\n    e.preventDefault();\n    // Handle form submission\n  };\n\n  return (\n    <form ${formClass} onSubmit={handleSubmit}>\n      {/* Add form fields here */}\n      <button type="submit">Submit</button>\n    </form>\n  );\n};\n\nexport default ${name}Form;\n`;

  const files = {
    [`${name}Form.${ext}`]: content,
    [`index.${isTS ? 'ts' : 'js'}`]: `export { default } from './${name}Form';\n`,
  };
  if (!isTailwind) files[`${name}Form.module.${styleExt}`] = `.form {}\n`;

  return { files, resolvedName: `${name}Form` };
}

// ── Modal template ────────────────────────────────────────────────────────────

function modalTemplate(name, config) {
  if (name.endsWith('Modal')) name = name.slice(0, -5);
  const isTS = config.language === 'typescript';
  const isTailwind = config.styling === 'tailwind';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';

  if (config.framework === 'vue' || config.framework === 'nuxt') {
    const scriptLang = isTS ? ` lang="ts"` : '';
    const styleBlock = isTailwind ? '' : `\n<style scoped>\n.modal-overlay {}\n.modal {}\n</style>\n`;
    const content = `<script setup${scriptLang}>\nconst props = defineProps<{ isOpen: boolean }>();\nconst emit = defineEmits<{ close: [] }>();\n</script>\n\n<template>\n  <Teleport to="body">\n    <div v-if="props.isOpen" class="modal-overlay" @click="emit('close')">\n      <div class="modal" @click.stop>\n        <!-- Modal content -->\n        <button @click="emit('close')">Close</button>\n      </div>\n    </div>\n  </Teleport>\n</template>${styleBlock}`;
    return { files: { [`${name}Modal.vue`]: content, [`index.${isTS ? 'ts' : 'js'}`]: `export { default } from './${name}Modal.vue';\n` }, resolvedName: `${name}Modal` };
  }

  if (config.framework === 'svelte') {
    const scriptLang = isTS ? ` lang="ts"` : '';
    const content = `<script${scriptLang}>\n  interface ${name}ModalProps { isOpen: boolean; onClose: () => void; }\n  let { isOpen, onClose }: ${name}ModalProps = $props();\n</script>\n\n{#if isOpen}\n<div class="modal-overlay" on:click={onClose} role="dialog" aria-modal="true">\n  <div class="modal" on:click|stopPropagation>\n    <!-- Modal content -->\n    <button on:click={onClose}>Close</button>\n  </div>\n</div>\n{/if}\n\n<style>\n  .modal-overlay {}\n  .modal {}\n</style>`;
    return { files: { [`${name}Modal.svelte`]: content }, resolvedName: `${name}Modal` };
  }

  if (config.framework === 'solidjs') {
    const ext = isTS ? 'tsx' : 'jsx';
    const content = `import { Component, Show } from 'solid-js';\n${isTS ? `\ninterface ${name}ModalProps {\n  isOpen: boolean;\n  onClose: () => void;\n}\n` : ''}\nconst ${name}Modal${isTS ? ': Component<' + name + 'ModalProps>' : ''} = (props) => (\n  <Show when={props.isOpen}>\n    <div class="modal-overlay" onClick={props.onClose}>\n      <div class="modal" onClick={(e) => e.stopPropagation()}>\n        {/* Modal content */}\n        <button onClick={props.onClose}>Close</button>\n      </div>\n    </div>\n  </Show>\n);\n\nexport default ${name}Modal;\n`;
    return { files: { [`${name}Modal.${ext}`]: content, [`index.${isTS ? 'ts' : 'js'}`]: `export { default } from './${name}Modal';\n` }, resolvedName: `${name}Modal` };
  }

  if (config.framework === 'angular') {
    const selector = name.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase()).replace(/^-/, '');
    const tsContent = `import { Component, Input, Output, EventEmitter } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-${selector}-modal',\n  standalone: true,\n  imports: [CommonModule],\n  templateUrl: './${selector}-modal.component.html',\n})\nexport class ${name}ModalComponent {\n  @Input() isOpen = false;\n  @Output() closeModal = new EventEmitter<void>();\n}\n`;
    const htmlContent = `<div *ngIf="isOpen" class="modal-overlay" (click)="closeModal.emit()">\n  <div class="modal" (click)="$event.stopPropagation()">\n    <!-- Modal content -->\n    <button (click)="closeModal.emit()">Close</button>\n  </div>\n</div>\n`;
    return { files: { [`${selector}-modal.component.ts`]: tsContent, [`${selector}-modal.component.html`]: htmlContent, [`index.ts`]: `export { ${name}ModalComponent } from './${selector}-modal.component';\n` }, resolvedName: `${name}ModalComponent` };
  }

  if (config.framework === 'astro') {
    const content = `---\ninterface Props { isOpen?: boolean; }\nconst { isOpen = false } = Astro.props;\n---\n\n{isOpen && (\n  <div class="modal-overlay">\n    <div class="modal">\n      <!-- Modal content -->\n      <slot />\n    </div>\n  </div>\n)}\n\n<style>\n  .modal-overlay {}\n  .modal {}\n</style>\n`;
    return { files: { [`${name}Modal.astro`]: content }, resolvedName: `${name}Modal` };
  }

  // React / Next.js / Remix
  const ext = isTS ? 'tsx' : 'jsx';
  const useClient = config.framework === 'nextjs' && config.useClient ? `'use client';\n\n` : '';
  const propsType = isTS ? `\ninterface ${name}ModalProps {\n  isOpen: boolean;\n  onClose: () => void;\n}\n` : '';
  const fcType = isTS ? `: React.FC<${name}ModalProps>` : '';
  const propsArg = isTS ? `{ isOpen, onClose }: ${name}ModalProps` : `{ isOpen, onClose }`;
  const styleImport = isTailwind ? '' : `import styles from './${name}Modal.module.${styleExt}';\n`;
  const overlayClass = isTailwind ? `className="fixed inset-0 bg-black/50 flex items-center justify-center"` : `className={styles.overlay}`;
  const modalClass = isTailwind ? `className="bg-white rounded-lg p-6 max-w-md w-full"` : `className={styles.modal}`;

  const content = `${useClient}import React from 'react';\n${styleImport}${propsType}\nconst ${name}Modal${fcType} = (${propsArg}) => {\n  if (!isOpen) return null;\n  return (\n    <div ${overlayClass} onClick={onClose}>\n      <div ${modalClass} onClick={(e) => e.stopPropagation()}>\n        {/* Modal content */}\n        <button onClick={onClose}>Close</button>\n      </div>\n    </div>\n  );\n};\n\nexport default ${name}Modal;\n`;

  const files = {
    [`${name}Modal.${ext}`]: content,
    [`index.${isTS ? 'ts' : 'js'}`]: `export { default } from './${name}Modal';\n`,
  };
  if (!isTailwind) files[`${name}Modal.module.${styleExt}`] = `.overlay {}\n.modal {}\n`;

  return { files, resolvedName: `${name}Modal` };
}

// ── Provider template (React, Remix, SolidJS) ─────────────────────────────────

function providerTemplate(name, config) {
  if (name.endsWith('Provider')) name = name.slice(0, -8);
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'tsx' : 'jsx';

  if (config.framework === 'solidjs') {
    const content = `import { createContext, useContext, ParentComponent } from 'solid-js';\n${isTS ? `\ninterface ${name}ContextValue {\n  // Add context value shape here\n}\n` : ''}\nconst ${name}Context = createContext${isTS ? `<${name}ContextValue | undefined>` : ''}();\n\nexport const ${name}Provider: ParentComponent = (props) => {\n  const value${isTS ? `: ${name}ContextValue` : ''} = {\n    // Add values here\n  };\n\n  return (\n    <${name}Context.Provider value={value}>\n      {props.children}\n    </${name}Context.Provider>\n  );\n};\n\nexport function use${name}() {\n  const ctx = useContext(${name}Context);\n  if (!ctx) throw new Error('use${name} must be used within ${name}Provider');\n  return ctx;\n}\n`;
    return { files: { [`${name}Provider.${ext}`]: content, [`index.${isTS ? 'ts' : 'js'}`]: `export { ${name}Provider, use${name} } from './${name}Provider';\n` }, resolvedName: `${name}Provider` };
  }

  // React / Next.js / Remix
  const useClient = config.framework === 'nextjs' ? `'use client';\n\n` : '';
  const content = `${useClient}import React, { createContext, useContext, useState } from 'react';\n${isTS ? `\ninterface ${name}ContextValue {\n  // Add context value shape here\n}\n` : ''}\nconst ${name}Context = React.createContext${isTS ? `<${name}ContextValue | null>` : ''}(null);\n\nexport function ${name}Provider({ children }${isTS ? ': { children: React.ReactNode }' : ''}) {\n  // Add state here\n  const value${isTS ? `: ${name}ContextValue` : ''} = {\n    // Add values here\n  };\n\n  return (\n    <${name}Context.Provider value={value}>\n      {children}\n    </${name}Context.Provider>\n  );\n}\n\nexport function use${name}() {\n  const ctx = useContext(${name}Context);\n  if (!ctx) throw new Error('use${name} must be used within ${name}Provider');\n  return ctx;\n}\n`;

  return {
    files: {
      [`${name}Provider.${ext}`]: content,
      [`index.${isTS ? 'ts' : 'js'}`]: `export { ${name}Provider, use${name} } from './${name}Provider';\n`,
    },
    resolvedName: `${name}Provider`,
  };
}

// ── Route template (Next.js, Nuxt, Remix, Astro) ──────────────────────────────

function routeTemplate(name, config) {
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'tsx' : 'jsx';
  const scriptExt = isTS ? 'ts' : 'js';
  const isTailwind = config.styling === 'tailwind';
  const bodyClass = isTailwind ? `className="container"` : `className="page"`;

  if (config.framework === 'nuxt') {
    const scriptLang = isTS ? ` lang="ts"` : '';
    const content = `<script setup${scriptLang}>\n// ${name} page\n</script>\n\n<template>\n  <div class="page">\n    <h1>${name}</h1>\n    <NuxtLayout>\n      <!-- Page content -->\n    </NuxtLayout>\n  </div>\n</template>\n`;
    return { files: { [`${name}.vue`]: content }, resolvedName: name };
  }

  if (config.framework === 'sveltekit') {
    const scriptLang = isTS ? ` lang="ts"` : '';
    const pageContent = `<script${scriptLang}>\n  import type { PageData } from './$types';\n  export let data${isTS ? ': PageData' : ''};\n</script>\n\n<div class="page">\n  <h1>${name}</h1>\n</div>\n`;
    const serverContent = `${isTS ? "import type { PageServerLoad } from './$types';\n\nexport const load: PageServerLoad = async ({ params }) => {\n  return {};\n};\n" : "export const load = async ({ params }) => {\n  return {};\n};\n"}`;
    return { files: { '+page.svelte': pageContent, [`+page.server.${scriptExt}`]: serverContent }, resolvedName: name };
  }

  if (config.framework === 'qwik') {
    const content = `import { component$ } from '@builder.io/qwik';\nimport type { DocumentHead } from '@builder.io/qwik-city';\n\nexport default component$(() => {\n  return (\n    <div class="page">\n      <h1>${name}</h1>\n    </div>\n  );\n});\n\nexport const head: DocumentHead = { title: '${name}' };\n`;
    return { files: { [`index.${ext}`]: content }, resolvedName: name };
  }

  if (config.framework === 'expo') {
    const content = `import { View, Text } from 'react-native';\n\nexport default function ${name}Screen() {\n  return (\n    <View>\n      <Text>${name}</Text>\n    </View>\n  );\n}\n`;
    return { files: { [`${name.toLowerCase()}.${ext}`]: content }, resolvedName: name };
  }

  if (config.framework === 'remix') {
    const content = `import type { MetaFunction } from '@remix-run/node';\nimport { useLoaderData } from '@remix-run/react';\n${isTS ? `import type { LoaderFunctionArgs } from '@remix-run/node';\n` : ''}\nexport const meta: MetaFunction = () => [\n  { title: '${name}' },\n];\n\nexport async function loader(${isTS ? '{ request }: LoaderFunctionArgs' : '{ request }'}) {\n  // Load data here\n  return {};\n}\n\nexport default function ${name}Route() {\n  const data = useLoaderData${isTS ? '<typeof loader>' : ''}();\n  return (\n    <div ${bodyClass}>\n      <h1>${name}</h1>\n    </div>\n  );\n}\n`;
    return { files: { [`${name.toLowerCase()}.${ext}`]: content }, resolvedName: name };
  }

  if (config.framework === 'astro') {
    const content = `---\n// ${name} page route\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>${name}</title>\n  </head>\n  <body>\n    <div class="page">\n      <h1>${name}</h1>\n    </div>\n  </body>\n</html>\n`;
    return { files: { [`${name.toLowerCase()}.astro`]: content }, resolvedName: name };
  }

  // Next.js: page + layout + loading in one scaffold
  const pageContent = `${isTS ? `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = { title: '${name}' };\n\n` : ''}export default function ${name}Page() {\n  return (\n    <div ${bodyClass}>\n      <h1>${name}</h1>\n    </div>\n  );\n}\n`;
  const layoutContent = `export default function ${name}Layout({ children }${isTS ? ': { children: React.ReactNode }' : ''}) {\n  return <>{children}</>;\n}\n`;
  const loadingContent = `export default function ${name}Loading() {\n  return <div>Loading...</div>;\n}\n`;

  return {
    files: {
      [`page.${ext}`]: pageContent,
      [`layout.${ext}`]: layoutContent,
      [`loading.${ext}`]: loadingContent,
    },
    resolvedName: name,
  };
}

// ── Storybook ─────────────────────────────────────────────────────────────────

function storyTemplate(name, config) {
  const { compExt } = getExtensions(config);
  const isTS = config.language === 'typescript';

  const content = isTS
    ? `import type { Meta, StoryObj } from '@storybook/react';
import ${name} from './${name}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
`
    : `import ${name} from './${name}';

export default {
  title: 'Components/${name}',
  component: ${name},
};

export const Default = {};
`;

  return { [`${name}.stories.${compExt}`]: content };
}

// ── Guard template (Angular, Next.js, generic) ────────────────────────────────

function guardTemplate(name, config) {
  if (name.endsWith('Guard')) name = name.slice(0, -5);
  const isTS = config.language === 'typescript';

  if (config.framework === 'angular') {
    const selector = name.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase()).replace(/^-/, '');
    const content = `import { inject } from '@angular/core';\nimport { CanActivateFn, Router } from '@angular/router';\n\nexport const ${selector.replace(/-([a-z])/g, (_, l) => l.toUpperCase())}Guard: CanActivateFn = (route, state) => {\n  const router = inject(Router);\n  // Add guard logic here\n  return true;\n};\n`;
    return { files: { [`${selector}.guard.ts`]: content }, resolvedName: `${name}Guard` };
  }

  if (config.framework === 'nextjs') {
    const ext = isTS ? 'ts' : 'js';
    const content = `${isTS ? "import type { NextRequest } from 'next/server';\n" : ''}import { NextResponse } from 'next/server';\n\nexport async function ${name.charAt(0).toLowerCase() + name.slice(1)}Guard(${isTS ? 'request: NextRequest' : 'request'}) {\n  // Return NextResponse.redirect(new URL('/login', request.url)) when not authorized\n  return null;\n}\n`;
    return { files: { [`${name}Guard.${ext}`]: content }, resolvedName: `${name}Guard` };
  }

  // Generic (React/Vue/Svelte/etc.) — route guard HOF
  const ext = isTS ? 'ts' : 'js';
  const content = `${isTS ? 'type GuardFn = (ctx: unknown) => boolean | Promise<boolean>;\n\n' : ''}export const ${name.charAt(0).toLowerCase() + name.slice(1)}Guard${isTS ? ': GuardFn' : ''} = async (ctx) => {\n  // Return false to block, true to allow\n  return true;\n};\n`;
  return { files: { [`${name}Guard.${ext}`]: content, [`index.${ext}`]: `export * from './${name}Guard';\n` }, resolvedName: `${name}Guard` };
}

// ── Schema template (Zod by default) ──────────────────────────────────────────

function schemaTemplate(name, config) {
  if (name.endsWith('Schema')) name = name.slice(0, -6);
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';
  const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
  const typeExport = isTS ? `\nexport type ${name} = z.infer<typeof ${lowerName}Schema>;\n` : '';
  const content = `import { z } from 'zod';\n\nexport const ${lowerName}Schema = z.object({\n  // Add schema fields here\n});\n${typeExport}`;
  return { files: { [`${lowerName}.schema.${ext}`]: content }, resolvedName: `${name}Schema` };
}

// ── Query template (TanStack Query) ───────────────────────────────────────────

function queryTemplate(name, config) {
  if (name.endsWith('Query')) name = name.slice(0, -5);
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';
  const hookName = `use${name}Query`;

  if (config.framework === 'vue' || config.framework === 'nuxt') {
    const content = `import { useQuery } from '@tanstack/vue-query';\n\nexport function ${hookName}() {\n  return useQuery({\n    queryKey: ['${name.toLowerCase()}'],\n    queryFn: async () => {\n      // Fetch data here\n      return {};\n    },\n  });\n}\n`;
    return { files: { [`${hookName}.${ext}`]: content, [`index.${ext}`]: `export * from './${hookName}';\n` }, resolvedName: hookName };
  }

  if (config.framework === 'svelte') {
    const content = `import { createQuery } from '@tanstack/svelte-query';\n\nexport function ${hookName}() {\n  return createQuery({\n    queryKey: ['${name.toLowerCase()}'],\n    queryFn: async () => {\n      return {};\n    },\n  });\n}\n`;
    return { files: { [`${hookName}.${ext}`]: content, [`index.${ext}`]: `export * from './${hookName}';\n` }, resolvedName: hookName };
  }

  if (config.framework === 'solidjs') {
    const content = `import { createQuery } from '@tanstack/solid-query';\n\nexport function ${hookName}() {\n  return createQuery(() => ({\n    queryKey: ['${name.toLowerCase()}'],\n    queryFn: async () => {\n      return {};\n    },\n  }));\n}\n`;
    return { files: { [`${hookName}.${ext}`]: content, [`index.${ext}`]: `export * from './${hookName}';\n` }, resolvedName: hookName };
  }

  // React / Next.js / Remix / default
  const useClient = config.framework === 'nextjs' ? `'use client';\n\n` : '';
  const responseType = isTS ? `\ninterface ${name}Data {\n  // Define response shape\n}\n` : '';
  const typeArg = isTS ? `<${name}Data>` : '';
  const content = `${useClient}import { useQuery } from '@tanstack/react-query';\n${responseType}\nexport function ${hookName}() {\n  return useQuery${typeArg}({\n    queryKey: ['${name.toLowerCase()}'],\n    queryFn: async () => {\n      // Fetch data here\n      const res = await fetch('/api/${name.toLowerCase()}');\n      if (!res.ok) throw new Error('Failed to fetch ${name}');\n      return res.json();\n    },\n  });\n}\n`;
  return { files: { [`${hookName}.${ext}`]: content, [`index.${ext}`]: `export * from './${hookName}';\n` }, resolvedName: hookName };
}

// ── Mutation template (TanStack Query) ────────────────────────────────────────

function mutationTemplate(name, config) {
  if (name.endsWith('Mutation')) name = name.slice(0, -8);
  const isTS = config.language === 'typescript';
  const ext = isTS ? 'ts' : 'js';
  const hookName = `use${name}Mutation`;

  if (config.framework === 'vue' || config.framework === 'nuxt') {
    const content = `import { useMutation, useQueryClient } from '@tanstack/vue-query';\n\nexport function ${hookName}() {\n  const queryClient = useQueryClient();\n  return useMutation({\n    mutationFn: async (variables${isTS ? ': unknown' : ''}) => {\n      // Perform mutation\n      return variables;\n    },\n    onSuccess: () => {\n      queryClient.invalidateQueries({ queryKey: ['${name.toLowerCase()}'] });\n    },\n  });\n}\n`;
    return { files: { [`${hookName}.${ext}`]: content, [`index.${ext}`]: `export * from './${hookName}';\n` }, resolvedName: hookName };
  }

  // React / Next.js / Remix / default
  const useClient = config.framework === 'nextjs' ? `'use client';\n\n` : '';
  const varsType = isTS ? `\ninterface ${name}Vars {\n  // Define mutation variables\n}\n` : '';
  const typeArg = isTS ? `<unknown, Error, ${name}Vars>` : '';
  const varsArg = isTS ? `vars: ${name}Vars` : 'vars';
  const content = `${useClient}import { useMutation, useQueryClient } from '@tanstack/react-query';\n${varsType}\nexport function ${hookName}() {\n  const queryClient = useQueryClient();\n  return useMutation${typeArg}({\n    mutationFn: async (${varsArg}) => {\n      const res = await fetch('/api/${name.toLowerCase()}', {\n        method: 'POST',\n        body: JSON.stringify(vars),\n      });\n      if (!res.ok) throw new Error('Failed to mutate ${name}');\n      return res.json();\n    },\n    onSuccess: () => {\n      queryClient.invalidateQueries({ queryKey: ['${name.toLowerCase()}'] });\n    },\n  });\n}\n`;
  return { files: { [`${hookName}.${ext}`]: content, [`index.${ext}`]: `export * from './${hookName}';\n` }, resolvedName: hookName };
}

// ── i18n template (locale key) ────────────────────────────────────────────────

function i18nTemplate(name, config) {
  const locales = (config.locales && config.locales.length) ? config.locales : ['en'];
  const files = {};
  for (const locale of locales) {
    files[`${locale}.json`] = JSON.stringify({ [name]: name }, null, 2);
  }
  return { files, resolvedName: name };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  getExtensions,
  componentTemplate,
  hookTemplate,
  pageTemplate,
  serviceTemplate,
  contextTemplate,
  storeTemplate,
  typeTemplate,
  apiTemplate,
  featureTemplate,
  layoutTemplate,
  loadingTemplate,
  errorTemplate,
  notFoundTemplate,
  middlewareTemplate,
  serverActionTemplate,
  storyTemplate,
  nuxtApiTemplate,
  nuxtLayoutTemplate,
  nuxtMiddlewareTemplate,
  angularComponentTemplate,
  angularServiceTemplate,
  angularStoreTemplate,
  angularFeatureTemplate,
  astroComponentTemplate,
  astroPageTemplate,
  astroUtilTemplate,
  astroFeatureTemplate,
  formTemplate,
  modalTemplate,
  providerTemplate,
  routeTemplate,
  guardTemplate,
  schemaTemplate,
  queryTemplate,
  mutationTemplate,
  i18nTemplate,
};
