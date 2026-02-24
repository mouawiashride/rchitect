#!/usr/bin/env node

'use strict';

// ── Imports ─────────────────────────────────────────────────────────────────
const path = require('path');
const fs   = require('fs-extra');
const { McpServer }            = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const reactStructures  = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const { toCamelCase }  = require('../utils/validate');

// ── Pattern metadata ─────────────────────────────────────────────────────────

const PATTERN_DESCRIPTIONS = {
  'atomic-design':  'Atomic Design — UI components are split into atoms (primitives), molecules (atom groups), organisms (complex sections), and templates (page-level layouts). Each level has a distinct structural role.',
  'feature-based':  'Feature-Based — Code is grouped by product features/modules. Shared UI lives in components/shared, feature-specific code lives under features/<Name>.',
  'domain-driven':  'Domain-Driven Design (DDD) — Code mirrors business domains. Each domain is self-contained under domains/<Name>; cross-cutting concerns live under shared/.',
  'mvc-like':       'MVC-like — Classic Model-View-Controller separation. Models define data shapes, views hold UI components and pages, controllers hold business logic, services handle data access.',
};

const RESOURCE_DESCRIPTIONS = {
  component: 'A React UI component. Lives in its own directory with a TSX/JSX file, a CSS/SCSS module, a barrel index, and optionally a test file.',
  hook:      'A custom React hook. Name is PascalCase input; the "use" prefix is added automatically. Lives in hooks/use<Name>/.',
  page:      'A page-level component. The "Page" suffix is added automatically. e.g. Dashboard → DashboardPage.tsx.',
  service:   'A service module that handles data fetching or business logic. Name becomes camelCase + "Service". e.g. User → userService.ts.',
  context:   'A React Context with a typed Provider and a safe consumer hook. Name becomes <Name>Context. Contexts are always "use client" in Next.js.',
  store:     'A Zustand state management store. Name becomes use<Name>Store. TypeScript projects get State and Actions interfaces.',
  type:      'A TypeScript types file. Name becomes <Name>.types.ts. Contains an interface, a type alias, and a Partial type. Placed directly in the types directory (no subdirectory).',
  api:       'A Next.js App Router API route. Creates app/api/<name>/route.ts with typed GET and POST handlers. Next.js projects only.',
  feature:   'A full feature scaffold with its own components/, hooks/, services/, types.ts, and index.ts. Ideal for self-contained product features.',
};

const NAMING_CONVENTIONS = {
  component: 'PascalCase. Directory and main file share the name. e.g. UserCard → components/.../UserCard/UserCard.tsx',
  hook:      'PascalCase input; "use" prefix added automatically. e.g. Auth → useAuth. Files: useAuth.ts, index.ts',
  page:      'PascalCase. "Page" suffix added to file name. e.g. Dashboard → DashboardPage.tsx',
  service:   'PascalCase input converted to camelCase + "Service". e.g. User → userService.ts',
  context:   'PascalCase. "<Name>Context" as file name. e.g. Auth → AuthContext.tsx',
  store:     'PascalCase. "use<Name>Store" as file name. e.g. Cart → useCartStore.ts',
  type:      'PascalCase. "<Name>.types.ts" as file name. e.g. User → User.types.ts',
  api:       'PascalCase input converted to camelCase as directory. e.g. UserProfile → app/api/userProfile/route.ts',
  feature:   'PascalCase. Directory is the name verbatim. e.g. Dashboard → features/Dashboard/',
};

// ── Pure handler functions ───────────────────────────────────────────────────

/**
 * Returns the parsed .rchitect.json with plain-English explanations.
 * @param {string} cwd - Project root directory
 * @returns {{ config: object, explanation: object } | { error: string }}
 */
function handleGetProjectConfig(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!fs.pathExistsSync(configPath)) {
    return { error: '.rchitect.json not found. Run "rchitect init" first.' };
  }

  const config = fs.readJsonSync(configPath);

  const explanation = {
    framework: config.framework === 'nextjs'
      ? 'Next.js — App Router project. API routes (app/api/) are supported.'
      : 'React — standard React project. No server-side routing.',
    pattern: PATTERN_DESCRIPTIONS[config.pattern] || `Unknown pattern: ${config.pattern}`,
    language: config.language === 'typescript'
      ? 'TypeScript — files use .tsx / .ts extensions.'
      : 'JavaScript — files use .jsx / .js extensions.',
    styling: config.styling === 'scss'
      ? 'SCSS — style files use .module.scss extension.'
      : 'CSS — style files use .module.css extension.',
    withTests: config.withTests
      ? 'true — a .test.tsx or .test.ts file is generated alongside every resource.'
      : 'false — no test files are generated.',
    useClient: config.framework === 'nextjs'
      ? (config.useClient
          ? 'true — \'use client\'; directive is prepended to all generated components.'
          : 'false — components do not get the \'use client\'; directive by default.')
      : 'N/A — "use client" only applies to Next.js projects.',
  };

  return { config, explanation };
}

/**
 * Returns the full architecture guide for the project.
 * @param {string} cwd - Project root directory
 * @returns {object | { error: string }}
 */
function handleGetArchitectureGuide(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!fs.pathExistsSync(configPath)) {
    return { error: '.rchitect.json not found. Run "rchitect init" first.' };
  }

  const config = fs.readJsonSync(configPath);
  const structures = config.framework === 'react' ? reactStructures : nextjsStructures;
  const structure  = structures[config.pattern];

  if (!structure) {
    return { error: `Unknown pattern "${config.pattern}" in .rchitect.json.` };
  }

  const { compExt, scriptExt, styleExt } = getFileExtensions(config);

  const resourcePlacement = {
    component: config.pattern === 'atomic-design'
      ? `${structure.componentPath(undefined, 'atom')} | molecules | organisms | templates (chosen by atomic level). Each component lives in its own subdirectory.`
      : `${structure.componentPath()}/<Name>/`,
    hook:     `${structure.hookPath()}/use<Name>/`,
    page:     `${structure.pagePath()}/<Name>/`,
    service:  `${structure.servicePath()}/<name>Service/`,
    context:  `${structure.contextPath()}/<Name>Context/`,
    store:    `${structure.storePath()}/use<Name>Store/`,
    type:     `${structure.typePath()}/<Name>.types.${scriptExt}  (single file — no subdirectory)`,
    api:      config.framework === 'nextjs'
      ? `${structure.apiPath()}/<name>/route.${scriptExt}  (Next.js only)`
      : 'Not supported — API routes require Next.js.',
    feature:  `${structure.featurePath()}/<Name>/  (contains components/, hooks/, services/, types.${scriptExt}, index.${scriptExt})`,
  };

  return {
    pattern: config.pattern,
    framework: config.framework,
    description: PATTERN_DESCRIPTIONS[config.pattern] || config.pattern,
    folders: structure.folders,
    resourcePlacement,
    namingConventions: NAMING_CONVENTIONS,
    resourceDescriptions: RESOURCE_DESCRIPTIONS,
    fileExtensions: {
      component: `.${compExt}`,
      script:    `.${scriptExt}`,
      style:     `.module.${styleExt}`,
      test:      config.withTests ? `.test.${compExt} or .test.${scriptExt}` : 'disabled (withTests: false)',
    },
  };
}

/**
 * Given a resource type and name, returns the exact directory and expected filenames.
 * @param {{ type: string, name: string, atomicLevel?: string }} args
 * @param {string} cwd - Project root directory
 * @returns {object}
 */
function handleResolveResourcePath({ type, name, atomicLevel }, cwd) {
  const SUPPORTED = ['component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature'];
  if (!SUPPORTED.includes(type)) {
    return { error: `Unknown type "${type}". Supported: ${SUPPORTED.join(', ')}.` };
  }

  const configPath = path.join(cwd, '.rchitect.json');
  if (!fs.pathExistsSync(configPath)) {
    return { error: '.rchitect.json not found. Run "rchitect init" first.' };
  }

  const config    = fs.readJsonSync(configPath);
  const structures = config.framework === 'react' ? reactStructures : nextjsStructures;
  const structure  = structures[config.pattern];

  const { compExt, scriptExt, styleExt } = getFileExtensions(config);
  const camel = toCamelCase(name);

  let directory, resolvedName, files, note;

  switch (type) {
    case 'component': {
      let level = atomicLevel;
      note = null;
      if (config.pattern === 'atomic-design') {
        if (!level) {
          level = 'atom';
          note = 'No atomicLevel provided — defaulted to "atom". Valid levels: atom, molecule, organism, template' +
                 (config.framework === 'react' ? ', page' : '') + '.';
        }
      } else if (level) {
        note = `atomicLevel "${level}" is ignored for pattern "${config.pattern}".`;
        level = undefined;
      }
      const basePath = config.pattern === 'atomic-design'
        ? structure.componentPath(name, level)
        : structure.componentPath(name);
      directory    = `${basePath}/${name}`;
      resolvedName = name;
      files = [`${name}.${compExt}`, `${name}.module.${styleExt}`, `index.${scriptExt}`];
      if (config.withTests) files.push(`${name}.test.${compExt}`);
      break;
    }

    case 'hook': {
      const hookName = camel.startsWith('use') ? camel : `use${name}`;
      directory    = `${structure.hookPath()}/${hookName}`;
      resolvedName = hookName;
      files = [`${hookName}.${scriptExt}`, `index.${scriptExt}`];
      if (config.withTests) files.push(`${hookName}.test.${scriptExt}`);
      note = camel.startsWith('use') ? null : '"use" prefix added automatically.';
      break;
    }

    case 'page': {
      const pageName = `${name}Page`;
      directory    = `${structure.pagePath()}/${name}`;
      resolvedName = pageName;
      files = [`${pageName}.${compExt}`, `${pageName}.module.${styleExt}`, `index.${scriptExt}`];
      if (config.withTests) files.push(`${pageName}.test.${compExt}`);
      note = '"Page" suffix added automatically.';
      break;
    }

    case 'service': {
      const serviceName = `${camel}Service`;
      directory    = `${structure.servicePath()}/${serviceName}`;
      resolvedName = serviceName;
      files = [`${serviceName}.${scriptExt}`, `index.${scriptExt}`];
      if (config.withTests) files.push(`${serviceName}.test.${scriptExt}`);
      note = `Name normalized to camelCase: "${camel}" + "Service".`;
      break;
    }

    case 'context': {
      const contextName = `${name}Context`;
      directory    = `${structure.contextPath()}/${contextName}`;
      resolvedName = contextName;
      files = [`${contextName}.${compExt}`, `index.${scriptExt}`];
      if (config.withTests) files.push(`${contextName}.test.${compExt}`);
      note = config.framework === 'nextjs'
        ? '"Context" suffix added. Always gets \'use client\'; in Next.js (contexts are always client components).'
        : '"Context" suffix added.';
      break;
    }

    case 'store': {
      const storeName = `use${name}Store`;
      directory    = `${structure.storePath()}/${storeName}`;
      resolvedName = storeName;
      files = [`${storeName}.${scriptExt}`, `index.${scriptExt}`];
      if (config.withTests) files.push(`${storeName}.test.${scriptExt}`);
      note = '"use<Name>Store" naming pattern applied.';
      break;
    }

    case 'type': {
      const typesName = `${name}.types`;
      directory    = structure.typePath();
      resolvedName = typesName;
      files = [`${typesName}.${scriptExt}`];
      note = 'Type files are placed directly in the types directory — no subdirectory created.';
      break;
    }

    case 'api': {
      if (config.framework !== 'nextjs') {
        return { error: 'API routes are only supported for Next.js projects.' };
      }
      const apiName = camel;
      directory    = `${structure.apiPath()}/${apiName}`;
      resolvedName = apiName;
      files = [`route.${scriptExt}`];
      note = `Name normalized to camelCase: "${camel}". Access at /api/${apiName}.`;
      break;
    }

    case 'feature': {
      directory    = `${structure.featurePath()}/${name}`;
      resolvedName = name;
      const serviceName = `${camel}Service`;
      const hookName    = `use${name}`;
      files = [
        `components/${name}View/${name}View.${compExt}`,
        `components/${name}View/${name}View.module.${styleExt}`,
        `components/${name}View/index.${scriptExt}`,
        `hooks/${hookName}/${hookName}.${scriptExt}`,
        `hooks/${hookName}/index.${scriptExt}`,
        `services/${serviceName}/${serviceName}.${scriptExt}`,
        `services/${serviceName}/index.${scriptExt}`,
        `types.${scriptExt}`,
        `index.${scriptExt}`,
      ];
      if (config.withTests) {
        files.push(`components/${name}View/${name}View.test.${compExt}`);
        files.push(`hooks/${hookName}/${hookName}.test.${scriptExt}`);
      }
      note = 'Feature scaffold includes components, hooks, services, types, and a barrel index.';
      break;
    }
  }

  return { type, name, directory, files, resolvedName, note: note || null };
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getFileExtensions(config) {
  return {
    compExt:   config.language === 'typescript' ? 'tsx' : 'jsx',
    scriptExt: config.language === 'typescript' ? 'ts'  : 'js',
    styleExt:  config.styling  === 'scss'       ? 'scss' : 'css',
  };
}

// ── MCP Server wiring ─────────────────────────────────────────────────────────

const server = new McpServer({
  name:    'rchitect-mcp',
  version: '1.0.0',
});

server.tool(
  'get_project_config',
  'Returns the full .rchitect.json configuration for the current project, plus plain-English explanations of each field. ' +
  'Use this first to understand the framework, architecture pattern, language, and styling choices before generating any files.',
  {},
  async () => {
    const result = handleGetProjectConfig(process.cwd());
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_architecture_guide',
  'Returns the complete architecture guide for this project: which folders exist, where each resource type ' +
  '(component, hook, page, service, context, store, type, api, feature) belongs, and exactly how files are named. ' +
  'Always call this before proposing a file path to the user.',
  {},
  async () => {
    const result = handleGetArchitectureGuide(process.cwd());
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'resolve_resource_path',
  'Given a resource type and name, returns the exact directory path and expected filenames that rchitect would create. ' +
  'For atomic-design components, optionally provide atomicLevel (atom | molecule | organism | template | page for React, ' +
  'atom | molecule | organism | template for Next.js).',
  {
    type: z.enum(['component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature'])
            .describe('The resource type to resolve'),
    name: z.string()
            .describe('PascalCase resource name, e.g. UserCard, Auth, Dashboard'),
    atomicLevel: z.enum(['atom', 'molecule', 'organism', 'template', 'page']).optional()
                   .describe('Atomic Design level — required for component type when pattern is atomic-design'),
  },
  async ({ type, name, atomicLevel }) => {
    const result = handleResolveResourcePath({ type, name, atomicLevel }, process.cwd());
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.resource(
  'rchitect-config',
  'rchitect://config',
  {
    description: 'The raw .rchitect.json configuration for this project. ' +
                 'Contains framework, architecture pattern, language, styling, test, and useClient preferences.',
    mimeType: 'application/json',
  },
  async (uri) => {
    const cwd        = process.cwd();
    const configPath = path.join(cwd, '.rchitect.json');

    if (!(await fs.pathExists(configPath))) {
      return {
        contents: [{
          uri:      uri.href,
          mimeType: 'application/json',
          text:     JSON.stringify({ error: '.rchitect.json not found. Run "rchitect init" first.' }),
        }],
      };
    }

    const raw = await fs.readJson(configPath);
    return {
      contents: [{
        uri:      uri.href,
        mimeType: 'application/json',
        text:     JSON.stringify(raw, null, 2),
      }],
    };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(String(err) + '\n');
    process.exit(1);
  });
}

// ── Exports for testing ───────────────────────────────────────────────────────

module.exports = { handleGetProjectConfig, handleGetArchitectureGuide, handleResolveResourcePath };
