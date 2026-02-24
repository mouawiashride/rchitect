const { toCamelCase } = require('./validate');

function getExtensions(config) {
  const compExt = config.language === 'typescript' ? 'tsx' : 'jsx';
  const scriptExt = config.language === 'typescript' ? 'ts' : 'js';
  const styleExt = config.styling === 'scss' ? 'scss' : 'css';
  return { compExt, scriptExt, styleExt };
}

function componentTemplate(name, config, level) {
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const useClient = config.framework === 'nextjs' && config.useClient;
  const isTS = config.language === 'typescript';
  const clientDirective = useClient ? `'use client';\n\n` : '';

  let body;
  if (config.pattern === 'atomic-design' && level) {
    body = atomicBodyByLevel(name, level);
  } else {
    body = `  return <div className={styles.container}>${name}</div>;`;
  }

  const propsType = isTS ? `\ninterface ${name}Props {}\n` : '';
  const fcType = isTS ? `: React.FC<${name}Props>` : '';

  const component = `${clientDirective}import React from 'react';
import styles from './${name}.module.${styleExt}';
${propsType}
const ${name}${fcType} = () => {
${body}
};

export default ${name};
`;

  const files = {
    [`${name}.${compExt}`]: component,
    [`${name}.module.${styleExt}`]: `.container {}\n`,
    [`index.${scriptExt}`]: `export { default } from './${name}';\n`,
  };

  if (config.withTests) {
    files[`${name}.test.${compExt}`] = componentTestTemplate(name);
  }

  return files;
}

function atomicBodyByLevel(name, level) {
  switch (level) {
    case 'atom':
      return `  return <span className={styles.container}>${name}</span>;`;
    case 'molecule':
      return `  return (\n    <div className={styles.container}>\n      {/* Compose atoms here */}\n      <span>${name}</span>\n    </div>\n  );`;
    case 'organism':
      return `  return (\n    <section className={styles.container}>\n      {/* Compose molecules here */}\n      <h2>${name}</h2>\n    </section>\n  );`;
    case 'template':
      return `  return (\n    <div className={styles.container}>\n      {/* Layout structure — plug in organisms */}\n      <header />\n      <main>${name}</main>\n      <footer />\n    </div>\n  );`;
    case 'page':
      return `  return (\n    <div className={styles.container}>\n      {/* Page — use a template and pass data */}\n      <h1>${name}</h1>\n    </div>\n  );`;
    default:
      return `  return <div className={styles.container}>${name}</div>;`;
  }
}

function componentTestTemplate(name) {
  return `import React from 'react';
import { render } from '@testing-library/react';
import ${name} from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
  });
});
`;
}

function hookTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);
  const hookName = camel.startsWith('use') ? camel : `use${name}`;
  const isTS = config.language === 'typescript';

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
    files[`${hookName}.test.${scriptExt}`] = `import { renderHook } from '@testing-library/react';
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

function pageTemplate(name, config) {
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const useClient = config.framework === 'nextjs' && config.useClient;
  const isTS = config.language === 'typescript';
  const clientDirective = useClient ? `'use client';\n\n` : '';

  const propsType = isTS ? `\ninterface ${name}PageProps {}\n` : '';
  const fcType = isTS ? `: React.FC<${name}PageProps>` : '';

  const component = `${clientDirective}import React from 'react';
import styles from './${name}Page.module.${styleExt}';
${propsType}
const ${name}Page${fcType} = () => {
  return (
    <div className={styles.container}>
      <h1>${name}</h1>
    </div>
  );
};

export default ${name}Page;
`;

  const files = {
    [`${name}Page.${compExt}`]: component,
    [`${name}Page.module.${styleExt}`]: `.container {}\n`,
    [`index.${scriptExt}`]: `export { default } from './${name}Page';\n`,
  };

  if (config.withTests) {
    files[`${name}Page.test.${compExt}`] = `import React from 'react';
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

function serviceTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);
  const serviceName = `${camel}Service`;
  const isTS = config.language === 'typescript';

  const content = isTS
    ? `interface ${name}Service {}\n\nconst ${serviceName}: ${name}Service = {\n  // Add service methods here\n};\n\nexport default ${serviceName};\n`
    : `const ${serviceName} = {\n  // Add service methods here\n};\n\nexport default ${serviceName};\n`;

  const files = {
    [`${serviceName}.${scriptExt}`]: content,
    [`index.${scriptExt}`]: `export { default } from './${serviceName}';\n`,
  };

  if (config.withTests) {
    files[`${serviceName}.test.${scriptExt}`] = `import ${serviceName} from './${serviceName}';

describe('${serviceName}', () => {
  it('should be defined', () => {
    expect(${serviceName}).toBeDefined();
  });
});
`;
  }

  return { files, resolvedName: serviceName };
}

function contextTemplate(name, config) {
  const { compExt, scriptExt } = getExtensions(config);
  const useClient = config.framework === 'nextjs';
  const isTS = config.language === 'typescript';
  // Contexts are always client components in Next.js
  const clientDirective = useClient ? `'use client';\n\n` : '';
  const camel = toCamelCase(name);
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
    files[`${contextName}.test.${compExt}`] = `import React from 'react';
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

function storeTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);
  const storeName = `use${name}Store`;
  const isTS = config.language === 'typescript';

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
    files[`${storeName}.test.${scriptExt}`] = `import { act, renderHook } from '@testing-library/react';
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

function typeTemplate(name, config) {
  const { scriptExt } = getExtensions(config);
  const camel = toCamelCase(name);

  // Type files are TS-only; for JS projects generate a JSDoc file
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

  const ext = config.language === 'typescript' ? scriptExt : scriptExt;

  return {
    files: { [`${name}.types.${ext}`]: content },
    resolvedName: `${name}.types`,
  };
}

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

function featureTemplate(name, config) {
  const { compExt, scriptExt, styleExt } = getExtensions(config);
  const isTS = config.language === 'typescript';
  const useClient = config.framework === 'nextjs' && config.useClient;
  const clientDirective = useClient ? `'use client';\n\n` : '';
  const camel = toCamelCase(name);
  const hookName = `use${name}`;
  const serviceName = `${camel}Service`;

  const viewComp = `${clientDirective}import React from 'react';
import styles from './${name}View.module.${styleExt}';
${isTS ? `\ninterface ${name}ViewProps {}\n` : ''}
const ${name}View${isTS ? `: React.FC<${name}ViewProps>` : ''} = () => {
  return (
    <div className={styles.container}>
      <h1>${name}</h1>
    </div>
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
    [`components/${name}View/${name}View.module.${styleExt}`]: `.container {}\n`,
    [`components/${name}View/index.${scriptExt}`]: `export { default } from './${name}View';\n`,
    [`hooks/${hookName}/${hookName}.${scriptExt}`]: hookContent,
    [`hooks/${hookName}/index.${scriptExt}`]: `export { default } from './${hookName}';\n`,
    [`services/${serviceName}/${serviceName}.${scriptExt}`]: serviceContent,
    [`services/${serviceName}/index.${scriptExt}`]: `export { default } from './${serviceName}';\n`,
    [`types.${scriptExt}`]: typesContent,
    [`index.${scriptExt}`]: featureIndex,
  };

  if (config.withTests) {
    files[`components/${name}View/${name}View.test.${compExt}`] = `import React from 'react';\nimport { render } from '@testing-library/react';\nimport ${name}View from './${name}View';\n\ndescribe('${name}View', () => {\n  it('renders without crashing', () => {\n    render(<${name}View />);\n  });\n});\n`;
    files[`hooks/${hookName}/${hookName}.test.${scriptExt}`] = `import { renderHook } from '@testing-library/react';\nimport ${hookName} from './${hookName}';\n\ndescribe('${hookName}', () => {\n  it('returns expected value', () => {\n    const { result } = renderHook(() => ${hookName}());\n    expect(result.current).toBeDefined();\n  });\n});\n`;
  }

  return { files, resolvedName: name };
}

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
};
