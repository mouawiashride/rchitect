# /sync-check

Verify that all the files that must stay in sync with each other actually are.  
This project has several "parallel implementations" that drift whenever a framework or resource is added.  
Run this after any change that touches frameworks, resource types, or templates.

---

## Check 1 — All 6 frameworks in all 3 structureMaps in `src/mcp/server.js`

Read `src/mcp/server.js`. Find the three structure maps:
- `structureMap` (~line 130) inside `handleGetProjectConfig`
- `structureMap2` (~line 202) inside `handleResolveResourcePath`
- `structureMap3` (~line 444) inside `handleCreateResource`

Every map must contain all 6 keys: `react`, `nextjs`, `vue`, `svelte`, `solidjs`, `nuxt`.

Report any missing framework per map.

---

## Check 2 — All 6 frameworks in `src/commands/add.js`

Read `src/commands/add.js`. Find `structureMap` inside `getStructure()`.  
All 6 frameworks must be present.

---

## Check 3 — All 6 frameworks in `src/commands/init.js`

Check `structureMap` and the `choices` array in the `framework` prompt question.  
All 6 frameworks must be in both.

---

## Check 4 — All 6 frameworks in `src/commands/import.js`

Check `detectFramework(pkg)` — all 6 must have detection logic.  
The priority order must match `src/utils/detect.js`:
```
next → nuxt → react → vue → svelte/sveltejs/kit → solid-js
```

---

## Check 5 — `templates.js` naming matches `handleResolveResourcePath` naming

These two files implement the same naming rules independently. Read both and verify:

| Resource | templates.js resolvedName | server.js resolvedName |
|----------|--------------------------|------------------------|
| hook     | `use${name}`             | `use${name}`           |
| service  | `${camel}Service`        | `${camel}Service`      |
| store    | `use${name}Store`        | `use${name}Store`      |
| context  | `${name}Context`         | `${name}Context`       |
| page     | `${name}Page`            | `${name}Page`          |
| api (nuxt)| `toCamelCase(name)`     | `toCamelCase(name)`    |

Report any discrepancy.

---

## Check 6 — All resource types present in both `SUPPORTED` arrays in `server.js`

Find:
- `const SUPPORTED` in `handleResolveResourcePath`
- `const SUPPORTED_CREATE` in `handleCreateResource`

Both must contain all 15 types:
```
component, hook, page, service, context, store, type, api, feature,
layout, loading, error, not-found, middleware, server-action
```

---

## Check 7 — Test count in CLAUDE.md matches reality

Run `npm test -- --verbose 2>&1 | grep "Tests:"` and compare the number to the count stated in `CLAUDE.md`.  
If they don't match, report what CLAUDE.md says and what the actual count is.

---

## Check 8 — `src/utils/templates.d.ts` exports match `templates.js` exports

Read the `module.exports` at the bottom of `src/utils/templates.js`.  
Read every `export function` declaration in `src/utils/templates.d.ts`.  
Every exported function must have a matching declaration. Report any missing ones.

---

## Summary

After running all checks, output a table:

| Check | Status | Detail |
|-------|--------|--------|
| 3× structureMaps in server.js | ✅ / ❌ | ... |
| add.js structureMap | ✅ / ❌ | ... |
| init.js framework choices | ✅ / ❌ | ... |
| import.js detection | ✅ / ❌ | ... |
| templates ↔ server naming | ✅ / ❌ | ... |
| SUPPORTED arrays | ✅ / ❌ | ... |
| CLAUDE.md test count | ✅ / ❌ | says X, actual Y |
| templates.d.ts completeness | ✅ / ❌ | ... |
