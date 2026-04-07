const { toCamelCase } = require('./validate');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getExtensions(config) {
  const scriptExt = config.language === 'typescript' ? 'ts' : 'js';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';
  let compExt;
  if (config.framework === 'vue') compExt = 'vue';
  else if (config.framework === 'svelte') compExt = 'svelte';
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
  if (config.framework === 'vue') return vueComponentTemplate(name, config, level);
  if (config.framework === 'svelte') return svelteComponentTemplate(name, config, level);
  if (config.framework === 'solidjs') return solidComponentTemplate(name, config, level);
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
  if (config.framework === 'vue') return vueComposableTemplate(name, config);
  if (config.framework === 'svelte') return svelteComposableTemplate(name, config);
  if (config.framework === 'solidjs') return solidHookTemplate(name, config);
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
  if (config.framework === 'vue') return vuePageTemplate(name, config);
  if (config.framework === 'svelte') return sveltePageTemplate(name, config);
  if (config.framework === 'solidjs') return solidPageTemplate(name, config);
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
  if (config.framework === 'vue') return vueContextTemplate(name, config);
  if (config.framework === 'svelte') return svelteContextTemplate(name, config);
  if (config.framework === 'solidjs') return solidContextTemplate(name, config);
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
  if (config.framework === 'vue') return vuePiniaStoreTemplate(name, config);
  if (config.framework === 'svelte') return svelteStoreTemplate(name, config);
  if (config.framework === 'solidjs') return solidStoreTemplate(name, config);
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
  if (config.framework === 'vue') return vueFeatureTemplate(name, config);
  if (config.framework === 'svelte') return svelteFeatureTemplate(name, config);
  if (config.framework === 'solidjs') return solidFeatureTemplate(name, config);
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
};
