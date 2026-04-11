# /add-framework $ARGUMENTS

Add full support for a new frontend framework to Rchitect.

`$ARGUMENTS` = the framework name, e.g. `/add-framework angular`

Use **TodoWrite** to track each step. Mark steps complete immediately — do not batch.

---

## Step 1 — Structure file

Create `src/structures/<framework>.js`.

Model it after an existing structure that uses the same convention:
- **With `src/` prefix** → copy from `src/structures/react.js` (React, Vue, Svelte, SolidJS)
- **Without `src/` prefix** → copy from `src/structures/nuxt.js` (Nuxt, Next.js)

Required path helpers for every pattern (`atomic-design`, `feature-based`, `domain-driven`, `mvc-like`):
```
componentPath(name?, level?) → string
hookPath()     → string   // 'src/hooks' or 'composables' or 'src/composables'
pagePath()     → string
servicePath()  → string
contextPath()  → string
storePath()    → string
typePath()     → string
featurePath()  → string
```

Add framework-specific helpers only if needed (e.g. `apiPath()`, `layoutPath()`, `middlewarePath()`).

---

## Step 2 — `src/types.ts`

Open `src/types.ts` and:
1. Add the framework name to the `Framework` union:
   ```typescript
   export type Framework = 'react' | 'nextjs' | 'vue' | 'nuxt' | 'svelte' | 'solidjs' | '<new>';
   ```
2. If the component file extension is new (not already `tsx | jsx | vue | svelte`), add it to `Extensions.compExt`.
3. If you added a new path helper (e.g. `layoutPath`), add it as optional to the `Structure` interface:
   ```typescript
   layoutPath?: () => string;
   ```

---

## Step 3 — `src/utils/detect.js`

Add detection in the correct priority order (most-specific first):
```javascript
// Current order:
if (allDeps['next']) return 'nextjs';
if (allDeps['nuxt']) return 'nuxt';
if (allDeps['react']) return 'react';
if (allDeps['vue']) return 'vue';
if (allDeps['svelte'] || allDeps['@sveltejs/kit']) return 'svelte';
if (allDeps['solid-js']) return 'solidjs';
// Add new framework here — use the exact npm package name as the key
```

---

## Step 4 — `src/utils/templates.js`

### 4a — `getExtensions`
If the new framework has a unique component extension, add it:
```javascript
if (config.framework === 'vue' || config.framework === 'nuxt') compExt = 'vue';
else if (config.framework === 'svelte') compExt = 'svelte';
// else if (config.framework === '<new>') compExt = '<ext>';
```

### 4b — Template functions
Write framework-specific versions for: `componentTemplate`, `hookTemplate`, `pageTemplate`, `storeTemplate`, `contextTemplate`, `featureTemplate`.

If the new framework is similar to an existing one, reuse its templates via dispatch:
```javascript
// Example: Nuxt reuses Vue templates
function componentTemplate(name, config, level) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vueComponentTemplate(...);
```

If the new framework needs its own templates, write `<fw>ComponentTemplate`, `<fw>HookTemplate`, etc. and add dispatches at the top of each main function.

### 4c — Export
Add any new template functions to `module.exports` at the bottom.

---

## Step 5 — `src/utils/templates.d.ts`

Add TypeScript declarations for any new exported functions.

---

## Step 6 — `src/commands/add.js`

1. Add `require` at the top:
   ```javascript
   const <fw>Structures = require('../structures/<framework>');
   ```
2. Add to `structureMap` inside `getStructure()`:
   ```javascript
   const map = { react, nextjs, vue, svelte, solidjs, nuxt, <framework>: <fw>Structures };
   ```
3. If the framework has restricted resource types (like Nuxt has `api`/`layout`/`middleware`), add them to `NEXTJS_ONLY` or `NEXTJS_OR_NUXT`, or create a new constant.
4. Add any framework-specific handlers and cases to the `switch (type)` dispatcher.

---

## Step 7 — `src/commands/init.js`

1. Add `require` for the structure file.
2. Add to the framework choice list:
   ```javascript
   { name: '<Display Name>', value: '<framework>' },
   ```
3. Add to `structureMap`.
4. Add to `frameworkLabels`.
5. Update the post-init hints if the framework has special resource types.

---

## Step 8 — `src/commands/import.js`

1. Add detection in `detectFramework(pkg)` — same priority order as `detect.js`.
2. Add to `frameworkLabels`.
3. Update the error message that lists supported frameworks.

---

## Step 9 — `src/mcp/server.js` (three places)

Add `require` at the top, then add the framework to **all three** structure maps:
- `structureMap` inside `handleGetProjectConfig` (~line 130)
- `structureMap2` inside `handleResolveResourcePath` (~line 202)
- `structureMap3` inside `handleCreateResource` (~line 444)

Also update `resourcePlacement` in `handleGetProjectConfig` for any framework-specific resource types.

---

## Step 10 — Tests

Create `tests/<framework>.test.ts`. Follow the pattern in `tests/nuxt.test.ts`:

```typescript
const FRAMEWORK_CONFIG: RchitectConfig = {
  framework: '<framework>',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};
```

Cover:
- `getExtensions` → correct `compExt`
- `componentTemplate` → correct file extension, correct content
- `hookTemplate` → correct prefix / resolved name
- `storeTemplate`, `contextTemplate`, `featureTemplate`
- Structure path helpers for all 4 patterns
- `add` command integration (creates files on disk)
- `detectFramework` (detects from package.json)

---

## Step 11 — Verify

```
npm test
```

All tests must pass. Report the new test count.

---

## Step 12 — Update CLAUDE.md

Add the new framework to the **Supported Frameworks** table in `CLAUDE.md`.
