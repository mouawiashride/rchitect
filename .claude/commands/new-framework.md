# /new-framework $ARGUMENTS

Add support for a new frontend framework to Rchitect.

The argument is the framework name (e.g. `angular`, `qwik`, `astro`).

## Checklist

Work through these steps in order. Use TodoWrite to track progress.

### 1. Structure file
- Create `src/structures/<framework>.js`
- Export 4 patterns: `feature-based`, `atomic-design`, `domain-driven`, `mvc-like`
- Each pattern needs: `folders[]`, `componentPath()`, `hookPath()`, `pagePath()`, `servicePath()`, `contextPath()`, `storePath()`, `typePath()`, `featurePath()`
- Decide whether to use a `src/` prefix (no for Nuxt/Next.js, yes for React/Vue/Svelte/SolidJS)
- Add framework-specific folders (e.g. `composables/` for Vue-like, `hooks/` for React-like)

### 2. Types
- Open `src/types.ts`
- Add the framework name to the `Framework` union type
- If the component extension is new (not tsx/jsx/vue/svelte), add it to `Extensions.compExt`
- If a new path helper is needed (e.g. `layoutPath`), add it as optional `?: () => string` to `Structure`

### 3. Detection
- Open `src/utils/detect.js`
- Add detection before generic frameworks (correct priority order):
  `next → nuxt → react → vue → svelte/kit → solid-js → <new>`
- Use the npm package name as the detection key

### 4. Templates
- Open `src/utils/templates.js`
- Add framework-specific template functions for: component, hook, page, store, context, feature
- Add dispatch at the top of each main template function:
  ```javascript
  if (config.framework === '<new>') return <new>ComponentTemplate(name, config, level);
  ```
- Add `getExtensions` support if the component extension is new
- Export any new template functions at the bottom

### 5. Template declarations
- Open `src/utils/templates.d.ts`
- Export declarations for any new template functions

### 6. add.js
- Open `src/commands/add.js`
- `require` the new structure file
- Add to `structureMap` in `getStructure()`
- Handle any framework-specific resource types (check `NEXTJS_ONLY` / `NEXTJS_OR_NUXT` equivalents)

### 7. init.js
- Open `src/commands/init.js`
- `require` the new structure file
- Add to framework choice list (with user-friendly display name)
- Add to `structureMap`
- Add to `frameworkLabels` map
- Update the post-init hints if the framework has special resource types

### 8. import.js
- Open `src/commands/import.js`
- Add detection in `detectFramework(pkg)` (same priority order as detect.js)
- Add to `frameworkLabels` map
- Update the error message listing supported frameworks

### 9. MCP server
- Open `src/mcp/server.js`
- `require` the new structure file
- Add to **all three** structure maps: `structureMap`, `structureMap2`, `structureMap3`
- Update `resourcePlacement` in `handleGetProjectConfig` for framework-specific types
- Update switch cases in `handleResolveResourcePath` for framework-specific types
- Update switch cases in `handleCreateResource` for framework-specific types

### 10. Tests
- Create `tests/<framework>.test.ts`
- Cover: `getExtensions`, component/hook/store/context/feature templates, structure paths, add command integration, `detectFramework`
- Follow the pattern in `tests/nuxt.test.ts` or `tests/newFrameworks.test.ts`

### 11. Verify
- Run `npm test` — all tests must pass
- Report final test count

### 12. CLAUDE.md
- Add the new framework to the **Supported Frameworks** table in `CLAUDE.md`

## Notes
- Nuxt reuses Vue templates — check if the new framework is similar to an existing one before writing new templates from scratch.
- Always run `npm test` before calling the task complete.
