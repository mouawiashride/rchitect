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
const vueStructures    = require('../structures/vue');
const svelteStructures = require('../structures/svelte');
const solidjsStructures = require('../structures/solidjs');
const nuxtStructures   = require('../structures/nuxt');
const { toCamelCase, validateName }  = require('../utils/validate');
const {
  getExtensions, componentTemplate, hookTemplate, pageTemplate, serviceTemplate,
  contextTemplate, storeTemplate, typeTemplate, apiTemplate, featureTemplate,
  layoutTemplate, loadingTemplate, errorTemplate, notFoundTemplate,
  middlewareTemplate, serverActionTemplate,
  nuxtApiTemplate, nuxtLayoutTemplate, nuxtMiddlewareTemplate,
} = require('../utils/templates');
const { updateBarrel } = require('../utils/barrel');

// ── Pattern metadata ─────────────────────────────────────────────────────────

const PATTERN_DESCRIPTIONS = {
  'atomic-design':  'Atomic Design — UI components are split into atoms (primitives), molecules (atom groups), organisms (complex sections), and templates (page-level layouts). Each level has a distinct structural role.',
  'feature-based':  'Feature-Based — Code is grouped by product features/modules. Shared UI lives in components/shared, feature-specific code lives under features/<Name>.',
  'domain-driven':  'Domain-Driven Design (DDD) — Code mirrors business domains. Each domain is self-contained under domains/<Name>; cross-cutting concerns live under shared/.',
  'mvc-like':       'MVC-like — Classic Model-View-Controller separation. Models define data shapes, views hold UI components and pages, controllers hold business logic, services handle data access.',
};

const RESOURCE_DESCRIPTIONS = {
  component:       'A React UI component. Lives in its own directory with a TSX/JSX file, a style module (unless Tailwind), a barrel index, and optionally a test file.',
  hook:            'A custom React hook. Name is PascalCase input; the "use" prefix is added automatically. Lives in hooks/use<Name>/.',
  page:            'A page-level component. The "Page" suffix is added automatically. e.g. Dashboard → DashboardPage.tsx.',
  service:         'A service module that handles data fetching or business logic. Name becomes camelCase + "Service". e.g. User → userService.ts.',
  context:         'A React Context with a typed Provider and a safe consumer hook. Name becomes <Name>Context. Contexts are always "use client" in Next.js.',
  store:           'A Zustand state management store. Name becomes use<Name>Store. TypeScript projects get State and Actions interfaces.',
  type:            'A TypeScript types file. Name becomes <Name>.types.ts. Contains an interface, a type alias, and a Partial type. Placed directly in the types directory (no subdirectory).',
  api:             'A Next.js App Router API route. Creates app/api/<name>/route.ts with typed GET and POST handlers. Next.js projects only.',
  feature:         'A full feature scaffold with its own components/, hooks/, services/, types.ts, and index.ts. Ideal for self-contained product features.',
  layout:          'A Next.js App Router layout file. Creates app/<segment>/layout.tsx. Wraps children for the route segment. Next.js only.',
  loading:         'A Next.js App Router loading UI. Creates app/<segment>/loading.tsx. Shows while the segment is streaming. Next.js only.',
  error:           'A Next.js App Router error boundary. Creates app/<segment>/error.tsx with reset handler. Always a client component. Next.js only.',
  'not-found':     'A Next.js App Router 404 page. Creates app/<segment>/not-found.tsx. Shown when notFound() is called. Next.js only.',
  middleware:      'A Next.js middleware file at the project root. Runs before every matching request. Next.js only.',
  'server-action': 'A Next.js Server Action. Creates app/actions/<name>.ts with "use server" directive. Next.js only.',
};

const NAMING_CONVENTIONS = {
  component:       'PascalCase. Directory and main file share the name. e.g. UserCard → components/.../UserCard/UserCard.tsx',
  hook:            'PascalCase input; "use" prefix added automatically. e.g. Auth → useAuth. Files: useAuth.ts, index.ts',
  page:            'PascalCase. "Page" suffix added to file name. e.g. Dashboard → DashboardPage.tsx',
  service:         'PascalCase input converted to camelCase + "Service". e.g. User → userService.ts',
  context:         'PascalCase. "<Name>Context" as file name. e.g. Auth → AuthContext.tsx',
  store:           'PascalCase. "use<Name>Store" as file name. e.g. Cart → useCartStore.ts',
  type:            'PascalCase. "<Name>.types.ts" as file name. e.g. User → User.types.ts',
  api:             'PascalCase input converted to camelCase as directory. e.g. UserProfile → app/api/userProfile/route.ts',
  feature:         'PascalCase. Directory is the name verbatim. e.g. Dashboard → features/Dashboard/',
  layout:          'Lowercase route segment. e.g. auth → app/auth/layout.tsx',
  loading:         'Lowercase route segment. e.g. auth → app/auth/loading.tsx',
  error:           'Lowercase route segment. e.g. auth → app/auth/error.tsx (always "use client")',
  'not-found':     'Lowercase route segment. e.g. auth → app/auth/not-found.tsx',
  middleware:      'No name needed. Creates middleware.ts at project root.',
  'server-action': 'PascalCase input converted to camelCase. e.g. User → app/actions/user.ts',
};

const ALL_TYPES = [
  'component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature',
  'layout', 'loading', 'error', 'not-found', 'middleware', 'server-action',
];

// ── Pure handler functions ───────────────────────────────────────────────────

function handleGetProjectConfig(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!fs.pathExistsSync(configPath)) {
    return { error: '.rchitect.json not found. Run "rchitect init" first.' };
  }

  const config = fs.readJsonSync(configPath);

  const stylingLabel = config.styling === 'tailwind'
    ? 'Tailwind CSS — utility classes used directly in JSX. No CSS module files are generated.'
    : config.styling === 'scss'
      ? 'SCSS — style files use .module.scss extension.'
      : 'CSS — style files use .module.css extension.';

  const explanation = {
    framework: {
      react:   'React — standard React project. Component-based UI with hooks, context, and Zustand stores.',
      nextjs:  'Next.js — App Router project. API routes and App Router resources (layout, loading, error, middleware) are supported.',
      vue:     'Vue 3 — component-based framework with Composition API. Uses composables (useXxx), Pinia stores, and .vue SFCs.',
      svelte:  'Svelte — reactive UI framework with .svelte single-file components, writable stores, and composables.',
      solidjs: 'SolidJS — fine-grained reactive framework with JSX, createSignal-based hooks, and solid-js/store.',
    }[config.framework] || config.framework,
    pattern: PATTERN_DESCRIPTIONS[config.pattern] || `Unknown pattern: ${config.pattern}`,
    language: config.language === 'typescript'
      ? 'TypeScript — files use .tsx / .ts extensions.'
      : 'JavaScript — files use .jsx / .js extensions.',
    styling: stylingLabel,
    withTests: config.withTests
      ? 'true — a .test.tsx or .test.ts file is generated alongside every resource.'
      : 'false — no test files are generated.',
    testing: config.withTests
      ? (config.testing === 'vitest'
          ? 'vitest — test files include explicit vitest imports.'
          : 'jest — test files use global jest APIs.')
      : 'N/A — withTests is false.',
    useClient: config.framework === 'nextjs'
      ? (config.useClient
          ? 'true — \'use client\'; directive is prepended to all generated components.'
          : 'false — components do not get the \'use client\'; directive by default.')
      : 'N/A — "use client" only applies to Next.js projects.',
  };

  return { config, explanation };
}

function handleGetArchitectureGuide(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!fs.pathExistsSync(configPath)) {
    return { error: '.rchitect.json not found. Run "rchitect init" first.' };
  }

  const config = fs.readJsonSync(configPath);
  const structureMap = {
    react: reactStructures,
    nextjs: nextjsStructures,
    vue: vueStructures,
    svelte: svelteStructures,
    solidjs: solidjsStructures,
    nuxt: nuxtStructures,
  };
  const structures = structureMap[config.framework] || reactStructures;
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
      : config.framework === 'nuxt'
      ? `server/api/<name>.${scriptExt}  (Nuxt only)`
      : 'Not supported — API routes require Next.js or Nuxt.',
    feature:  `${structure.featurePath()}/<Name>/  (contains components/, hooks/, services/, types.${scriptExt}, index.${scriptExt})`,
    layout:   config.framework === 'nextjs' ? 'app/<segment>/layout.tsx' : config.framework === 'nuxt' ? 'layouts/<Name>.vue' : 'Not supported — Next.js or Nuxt only.',
    loading:  config.framework === 'nextjs' ? 'app/<segment>/loading.tsx' : 'Not supported — Next.js only.',
    error:    config.framework === 'nextjs' ? 'app/<segment>/error.tsx (always "use client")' : 'Not supported — Next.js only.',
    'not-found': config.framework === 'nextjs' ? 'app/<segment>/not-found.tsx' : 'Not supported — Next.js only.',
    middleware:  config.framework === 'nextjs' ? 'middleware.ts (project root)' : config.framework === 'nuxt' ? `middleware/<name>.${scriptExt}` : 'Not supported — Next.js or Nuxt only.',
    'server-action': config.framework === 'nextjs' ? 'app/actions/<name>.ts' : 'Not supported — Next.js only.',
  };

  const styleLabel = config.styling === 'tailwind'
    ? 'none (Tailwind utility classes — no CSS module files)'
    : `.module.${styleExt}`;

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
      style:     styleLabel,
      test:      config.withTests ? `.test.${compExt} or .test.${scriptExt}` : 'disabled (withTests: false)',
    },
  };
}

function handleResolveResourcePath({ type, name, atomicLevel }, cwd) {
  const SUPPORTED = ['component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature',
    'layout', 'loading', 'error', 'not-found', 'middleware', 'server-action'];
  if (!SUPPORTED.includes(type)) {
    return { error: `Unknown type "${type}". Supported: ${SUPPORTED.join(', ')}.` };
  }

  const configPath = path.join(cwd, '.rchitect.json');
  if (!fs.pathExistsSync(configPath)) {
    return { error: '.rchitect.json not found. Run "rchitect init" first.' };
  }

  const config    = fs.readJsonSync(configPath);
  const structureMap2 = {
    react: reactStructures,
    nextjs: nextjsStructures,
    vue: vueStructures,
    svelte: svelteStructures,
    solidjs: solidjsStructures,
    nuxt: nuxtStructures,
  };
  const structures = structureMap2[config.framework] || reactStructures;
  const structure  = structures[config.pattern];

  const { compExt, scriptExt, styleExt } = getFileExtensions(config);
  const isTailwind = config.styling === 'tailwind';
  const camel = name ? toCamelCase(name) : '';

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
      const hasSeparateStyleFile = !isTailwind && config.framework !== 'vue' && config.framework !== 'svelte';
      const testExt = (config.framework === 'vue' || config.framework === 'svelte') ? scriptExt : compExt;
      files = [`${name}.${compExt}`, `index.${scriptExt}`];
      if (hasSeparateStyleFile) files.splice(1, 0, `${name}.module.${styleExt}`);
      if (config.withTests) files.push(`${name}.test.${testExt}`);
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
      const pageHasSeparateStyle = !isTailwind && config.framework !== 'vue' && config.framework !== 'svelte';
      const pageTestExt = (config.framework === 'vue' || config.framework === 'svelte') ? scriptExt : compExt;
      files = [`${pageName}.${compExt}`, `index.${scriptExt}`];
      if (pageHasSeparateStyle) files.splice(1, 0, `${pageName}.module.${styleExt}`);
      if (config.withTests) files.push(`${pageName}.test.${pageTestExt}`);
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
      if (config.framework !== 'nextjs' && config.framework !== 'nuxt') {
        return { error: 'API routes are only supported for Next.js and Nuxt projects.' };
      }
      const apiName = camel;
      directory    = `${structure.apiPath()}`;
      resolvedName = apiName;
      if (config.framework === 'nuxt') {
        files = [`${apiName}.${scriptExt}`];
        note = `Nuxt server route. Accessible at /api/${apiName}.`;
      } else {
        directory = `${structure.apiPath()}/${apiName}`;
        files = [`route.${scriptExt}`];
        note = `Name normalized to camelCase: "${camel}". Access at /api/${apiName}.`;
      }
      break;
    }

    case 'feature': {
      directory    = `${structure.featurePath()}/${name}`;
      resolvedName = name;
      const serviceName = `${camel}Service`;
      const hookName    = `use${name}`;
      files = [
        `components/${name}View/${name}View.${compExt}`,
        `components/${name}View/index.${scriptExt}`,
        `hooks/${hookName}/${hookName}.${scriptExt}`,
        `hooks/${hookName}/index.${scriptExt}`,
        `services/${serviceName}/${serviceName}.${scriptExt}`,
        `services/${serviceName}/index.${scriptExt}`,
        `types.${scriptExt}`,
        `index.${scriptExt}`,
      ];
      if (!isTailwind) {
        files.splice(1, 0, `components/${name}View/${name}View.module.${styleExt}`);
      }
      if (config.withTests) {
        files.push(`components/${name}View/${name}View.test.${compExt}`);
        files.push(`hooks/${hookName}/${hookName}.test.${scriptExt}`);
      }
      note = 'Feature scaffold includes components, hooks, services, types, and a barrel index.';
      break;
    }

    case 'layout': {
      if (config.framework === 'nuxt') {
        directory    = structure.layoutPath ? structure.layoutPath() : 'layouts';
        resolvedName = name;
        files = [`${name}.vue`];
        note = 'Nuxt layout. Use definePageMeta to apply it.';
      } else if (config.framework === 'nextjs') {
        const ext = config.language === 'typescript' ? 'tsx' : 'jsx';
        directory    = `app/${name}`;
        resolvedName = `${name}/layout`;
        files = [`layout.${ext}`];
        note = null;
      } else {
        return { error: '"layout" is only supported for Next.js and Nuxt projects.' };
      }
      break;
    }

    case 'loading':
    case 'error':
    case 'not-found': {
      if (config.framework !== 'nextjs') {
        return { error: `"${type}" is only supported for Next.js projects.` };
      }
      const ext = config.language === 'typescript' ? 'tsx' : 'jsx';
      const fileNames = { loading: 'loading', error: 'error', 'not-found': 'not-found' };
      directory    = `app/${name}`;
      resolvedName = `${name}/${fileNames[type]}`;
      files = [`${fileNames[type]}.${ext}`];
      note = type === 'error' ? 'error.tsx is always a "use client" component.' : null;
      break;
    }

    case 'middleware': {
      if (config.framework === 'nuxt') {
        const ext = config.language === 'typescript' ? 'ts' : 'js';
        directory    = structure.middlewarePath ? structure.middlewarePath() : 'middleware';
        resolvedName = camel;
        files = [`${camel}.${ext}`];
        note = 'Nuxt route middleware. Runs on navigation.';
      } else if (config.framework === 'nextjs') {
        const ext = config.language === 'typescript' ? 'ts' : 'js';
        directory    = '';
        resolvedName = 'middleware';
        files = [`middleware.${ext}`];
        note = 'Created at the project root. Runs before every matching request.';
      } else {
        return { error: 'Middleware is only supported for Next.js and Nuxt projects.' };
      }
      break;
    }

    case 'server-action': {
      if (config.framework !== 'nextjs') {
        return { error: 'Server Actions are only supported for Next.js projects.' };
      }
      const ext = config.language === 'typescript' ? 'ts' : 'js';
      directory    = 'app/actions';
      resolvedName = camel;
      files = [`${camel}.${ext}`];
      note = `"use server" directive added. Invoke from client components or other server code.`;
      break;
    }
  }

  return { type, name, directory, files, resolvedName, note: note || null };
}

// ── Create resource handler ───────────────────────────────────────────────────

async function handleCreateResource({ type, name, atomicLevel, segment }, cwd) {
  const SUPPORTED_CREATE = [
    'component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature',
    'layout', 'loading', 'error', 'not-found', 'middleware', 'server-action',
  ];
  if (!SUPPORTED_CREATE.includes(type)) {
    return { error: `Unknown type "${type}". Supported: ${SUPPORTED_CREATE.join(', ')}.` };
  }

  const configPath = path.join(cwd, '.rchitect.json');
  if (!fs.pathExistsSync(configPath)) {
    return { error: '.rchitect.json not found. Run "rchitect init" first.' };
  }

  const config    = fs.readJsonSync(configPath);
  const structureMap3 = {
    react: reactStructures,
    nextjs: nextjsStructures,
    vue: vueStructures,
    svelte: svelteStructures,
    solidjs: solidjsStructures,
    nuxt: nuxtStructures,
  };
  const structures = structureMap3[config.framework] || reactStructures;
  const structure  = structures[config.pattern];
  const { scriptExt } = getFileExtensions(config);
  const created = [];

  try {
    // Helper to write files and record created paths
    const write = async (files, targetDir) => {
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(targetDir, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content);
        created.push(path.relative(cwd, fullPath));
      }
    };

    switch (type) {
      case 'component': {
        try { validateName(name, 'component'); } catch (e) { return { error: e.message }; }
        const level = atomicLevel || (config.pattern === 'atomic-design' ? 'atom' : undefined);
        const basePath = config.pattern === 'atomic-design'
          ? structure.componentPath(name, level)
          : structure.componentPath(name);
        const dir = path.join(cwd, basePath, name);
        if (await fs.pathExists(dir)) return { error: `Component "${name}" already exists.` };
        await write(componentTemplate(name, config, level), dir);
        await updateBarrel(path.dirname(dir), name, scriptExt, cwd);
        break;
      }

      case 'hook': {
        try { validateName(name, 'hook'); } catch (e) { return { error: e.message }; }
        const { files, resolvedName } = hookTemplate(name, config);
        const dir = path.join(cwd, structure.hookPath(), resolvedName);
        if (await fs.pathExists(dir)) return { error: `Hook "${resolvedName}" already exists.` };
        await write(files, dir);
        await updateBarrel(path.dirname(dir), resolvedName, scriptExt, cwd);
        break;
      }

      case 'service': {
        try { validateName(name, 'service'); } catch (e) { return { error: e.message }; }
        const { files, resolvedName } = serviceTemplate(name, config);
        const dir = path.join(cwd, structure.servicePath(), resolvedName);
        if (await fs.pathExists(dir)) return { error: `Service "${resolvedName}" already exists.` };
        await write(files, dir);
        await updateBarrel(path.dirname(dir), resolvedName, scriptExt, cwd);
        break;
      }

      case 'context': {
        try { validateName(name, 'context'); } catch (e) { return { error: e.message }; }
        const { files, resolvedName } = contextTemplate(name, config);
        const dir = path.join(cwd, structure.contextPath(), resolvedName);
        if (await fs.pathExists(dir)) return { error: `Context "${resolvedName}" already exists.` };
        await write(files, dir);
        await updateBarrel(path.dirname(dir), resolvedName, scriptExt, cwd);
        break;
      }

      case 'page': {
        try { validateName(name, 'page'); } catch (e) { return { error: e.message }; }
        const files = pageTemplate(name, config);
        const dir = path.join(cwd, structure.pagePath(), name);
        if (await fs.pathExists(dir)) return { error: `Page "${name}" already exists.` };
        await write(files, dir);
        await updateBarrel(path.dirname(dir), name, scriptExt, cwd);
        break;
      }

      case 'store': {
        try { validateName(name, 'store'); } catch (e) { return { error: e.message }; }
        const { files, resolvedName } = storeTemplate(name, config);
        const dir = path.join(cwd, structure.storePath(), resolvedName);
        if (await fs.pathExists(dir)) return { error: `Store "${resolvedName}" already exists.` };
        await write(files, dir);
        await updateBarrel(path.dirname(dir), resolvedName, scriptExt, cwd);
        break;
      }

      case 'type': {
        try { validateName(name, 'type'); } catch (e) { return { error: e.message }; }
        const { files } = typeTemplate(name, config);
        const dir = path.join(cwd, structure.typePath());
        await fs.ensureDir(dir);
        await write(files, dir);
        break;
      }

      case 'api': {
        if (config.framework !== 'nextjs' && config.framework !== 'nuxt') {
          return { error: 'API routes are only supported for Next.js and Nuxt projects.' };
        }
        try { validateName(name, 'api'); } catch (e) { return { error: e.message }; }
        if (config.framework === 'nuxt') {
          const { files } = nuxtApiTemplate(name, config);
          const dir = path.join(cwd, structure.apiPath());
          await fs.ensureDir(dir);
          await write(files, dir);
        } else {
          const { files, resolvedName } = apiTemplate(name, config);
          const dir = path.join(cwd, structure.apiPath(), resolvedName);
          if (await fs.pathExists(dir)) return { error: `API route "${resolvedName}" already exists.` };
          await write(files, dir);
        }
        break;
      }

      case 'feature': {
        try { validateName(name, 'feature'); } catch (e) { return { error: e.message }; }
        const { files, resolvedName } = featureTemplate(name, config);
        const dir = path.join(cwd, structure.featurePath(), resolvedName);
        if (await fs.pathExists(dir)) return { error: `Feature "${resolvedName}" already exists.` };
        await write(files, dir);
        break;
      }

      case 'layout': {
        if (config.framework === 'nuxt') {
          if (!name) return { error: 'Name is required for Nuxt layouts.' };
          try { validateName(name, 'layout'); } catch (e) { return { error: e.message }; }
          const { files } = nuxtLayoutTemplate(name, config);
          const dir = path.join(cwd, structure.layoutPath ? structure.layoutPath() : 'layouts');
          await fs.ensureDir(dir);
          await write(files, dir);
        } else if (config.framework === 'nextjs') {
          const seg = segment || name;
          if (!seg) return { error: 'Segment name is required.' };
          const { files } = layoutTemplate(seg, config);
          const dir = path.join(cwd, 'app', seg);
          await write(files, dir);
        } else {
          return { error: '"layout" is only supported for Next.js and Nuxt projects.' };
        }
        break;
      }

      case 'loading':
      case 'error':
      case 'not-found': {
        if (config.framework !== 'nextjs') return { error: `"${type}" is only supported for Next.js projects.` };
        const seg = segment || name;
        if (!seg) return { error: 'Segment name is required.' };
        const templateFns = { loading: loadingTemplate, error: errorTemplate, 'not-found': notFoundTemplate };
        const { files } = templateFns[type](seg, config);
        const dir = path.join(cwd, 'app', seg);
        await write(files, dir);
        break;
      }

      case 'middleware': {
        if (config.framework === 'nuxt') {
          if (!name) return { error: 'Name is required for Nuxt middleware.' };
          try { validateName(name, 'middleware'); } catch (e) { return { error: e.message }; }
          const { files } = nuxtMiddlewareTemplate(name, config);
          const dir = path.join(cwd, structure.middlewarePath ? structure.middlewarePath() : 'middleware');
          await fs.ensureDir(dir);
          await write(files, dir);
        } else if (config.framework === 'nextjs') {
          const { files } = middlewareTemplate(config);
          const firstFile = Object.keys(files)[0];
          if (await fs.pathExists(path.join(cwd, firstFile))) return { error: 'middleware file already exists.' };
          await write(files, cwd);
        } else {
          return { error: 'Middleware is only supported for Next.js and Nuxt projects.' };
        }
        break;
      }

      case 'server-action': {
        if (config.framework !== 'nextjs') return { error: 'Server Actions are only supported for Next.js projects.' };
        try { validateName(name, 'server-action'); } catch (e) { return { error: e.message }; }
        const { files, resolvedName } = serverActionTemplate(name, config);
        const dir = path.join(cwd, 'app', 'actions');
        const firstFile = Object.keys(files)[0];
        if (await fs.pathExists(path.join(dir, firstFile))) return { error: `Server action "${resolvedName}" already exists.` };
        await write(files, dir);
        break;
      }
    }

    return { success: true, type, name, created };
  } catch (err) {
    return { error: String(err.message || err) };
  }
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
  'Use this first to understand the framework, architecture pattern, language, styling (including Tailwind), and testing choices before generating any files.',
  {},
  async () => {
    const result = handleGetProjectConfig(process.cwd());
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'get_architecture_guide',
  'Returns the complete architecture guide for this project: which folders exist, where each resource type belongs, ' +
  'and exactly how files are named. Includes Next.js App Router types (layout, loading, error, not-found, middleware, server-action). ' +
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
  'Supports all types including Next.js App Router types. For layout/loading/error/not-found, "name" is the route segment (lowercase).',
  {
    type: z.enum([
      'component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature',
      'layout', 'loading', 'error', 'not-found', 'middleware', 'server-action',
    ]).describe('The resource type to resolve'),
    name: z.string()
            .describe('PascalCase resource name, or lowercase route segment for layout/loading/error/not-found'),
    atomicLevel: z.enum(['atom', 'molecule', 'organism', 'template', 'page']).optional()
                   .describe('Atomic Design level — for component type when pattern is atomic-design'),
  },
  async ({ type, name, atomicLevel }) => {
    const result = handleResolveResourcePath({ type, name, atomicLevel }, process.cwd());
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'create_resource',
  'Creates a new resource in the project using rchitect templates. ' +
  'Use resolve_resource_path first to confirm the target path, then call this to actually create the files. ' +
  'For layout/loading/error/not-found, pass the route segment as "segment" (lowercase). ' +
  'For atomic-design components, pass the atomicLevel.',
  {
    type: z.enum([
      'component', 'hook', 'page', 'service', 'context', 'store', 'type', 'api', 'feature',
      'layout', 'loading', 'error', 'not-found', 'middleware', 'server-action',
    ]).describe('Resource type to create'),
    name: z.string().optional()
            .describe('PascalCase resource name (not needed for middleware)'),
    atomicLevel: z.enum(['atom', 'molecule', 'organism', 'template', 'page']).optional()
                   .describe('Atomic level for atomic-design components'),
    segment: z.string().optional()
               .describe('Route segment for layout/loading/error/not-found (e.g. "auth", "dashboard")'),
  },
  async ({ type, name, atomicLevel, segment }) => {
    const result = await handleCreateResource({ type, name: name || '', atomicLevel, segment }, process.cwd());
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

module.exports = { handleGetProjectConfig, handleGetArchitectureGuide, handleResolveResourcePath, handleCreateResource };
