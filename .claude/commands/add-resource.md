# /add-resource $ARGUMENTS

Add a new resource type to Rchitect — available as `rchitect add <type> <Name>`.

`$ARGUMENTS` = the resource type name, e.g. `/add-resource schema`

Use **TodoWrite** to track each step. Mark steps complete immediately — do not batch.

---

## Step 1 — Template function in `src/utils/templates.js`

Write `function <type>Template(name, config)`.

It must return `{ files, resolvedName }` where:
- `files` is `{ 'filename.ext': 'content string', ... }`
- `resolvedName` is what the directory/file will be named (may differ from `name`)

Name conventions used by existing resources:
| Resource  | Input  | resolvedName     |
|-----------|--------|------------------|
| hook      | `Auth` | `useAuth`        |
| service   | `User` | `userService`    |
| store     | `Cart` | `useCartStore`   |
| context   | `Theme`| `ThemeContext`   |
| page      | `Home` | `HomePage`       |

Always handle:
- `config.language === 'typescript'` vs `'javascript'` → different file extensions and type annotations
- `config.styling === 'tailwind'` vs `'css'`/`'scss'` → different class names
- `config.withTests` → add a `.test.ts` file if true

Add per-framework dispatches if the resource looks different for Vue/Nuxt/Svelte/Solid:
```javascript
function <type>Template(name, config) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vue<Type>Template(name, config);
  if (config.framework === 'svelte') return svelte<Type>Template(name, config);
  if (config.framework === 'solidjs') return solid<Type>Template(name, config);
  // React/Next.js default
}
```

Export the new function in `module.exports` at the bottom of the file.

---

## Step 2 — `src/utils/templates.d.ts`

Add the TypeScript declaration:
```typescript
export function <type>Template(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };
```

---

## Step 3 — Path helpers in structure files

Add `<type>Path(): string` to **every pattern** in every structure file that supports this resource:
- `src/structures/react.js`
- `src/structures/nextjs.js`
- `src/structures/vue.js`
- `src/structures/svelte.js`
- `src/structures/solidjs.js`
- `src/structures/nuxt.js`

If the resource only makes sense for certain frameworks, only add it there.

---

## Step 4 — `src/types.ts`

Add the new path helper to the `Structure` interface:
```typescript
<type>Path?: () => string;  // optional if not all frameworks support it
```

---

## Step 5 — `src/commands/add.js`

1. Add `'<type>'` to `SUPPORTED_TYPES`.
2. Write `async function add<Type>(name, config, structure, cwd, templates)` — follow the pattern of `addHook` or `addService`.
3. Add a case to the `switch (type)` dispatcher at the bottom.
4. If the resource is framework-restricted, add it to `NEXTJS_ONLY` or `NEXTJS_OR_NUXT`.

---

## Step 6 — `src/commands/remove.js` (if it's a directory-based resource)

Open `src/commands/remove.js` and add the type so users can `rchitect remove <type> <Name>`.

---

## Step 7 — `src/mcp/server.js` — three handlers

### `handleGetProjectConfig` (~line 145)
Add to `resourcePlacement`:
```javascript
<type>: `${structure.<type>Path()}/<resolvedName>/`,
```
Add to `RESOURCE_DESCRIPTIONS` and `NAMING_CONVENTIONS` constants.

### `handleResolveResourcePath` switch (~line 218)
Add a `case '<type>'` that sets `directory`, `resolvedName`, `files[]`, and `note`. Follow the pattern of the `hook` or `service` case. This function resolves the path **without creating files**.

### `handleCreateResource` switch (~line 468)
Add a `case '<type>'` that calls the template function and writes files to disk. Follow the pattern of the `hook` or `service` case.

Also add `'<type>'` to both `SUPPORTED` and `SUPPORTED_CREATE` arrays.

---

## Step 8 — Tests

Add to `tests/templates.test.ts`:
```typescript
describe('<type>Template', () => {
  it('generates correct files', () => { ... });
  it('resolvedName is correct', () => { ... });
  it('handles TypeScript', () => { ... });
  it('handles JavaScript', () => { ... });
});
```

Add to `tests/commands.test.ts`:
```typescript
it('add <type> creates files on disk', async () => {
  await addCommand('<type>', 'Name', {});
  expect(await fs.pathExists(path.join(tmpDir, '<expected-path>'))).toBe(true);
});
```

Add to `tests/mcp.test.ts`:
```typescript
it('handleResolveResourcePath resolves <type> path', () => {
  const result = handleResolveResourcePath({ type: '<type>', name: 'Name' }, tmpDir);
  expect(result.directory).toBe('<expected-directory>');
});
```

---

## Step 9 — Verify

```
npm test
```

All tests must pass. Report the new test count.
