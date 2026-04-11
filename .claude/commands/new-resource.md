# /new-resource $ARGUMENTS

Add a new resource type to Rchitect (available via `rchitect add <type> <Name>`).

The argument is the resource type name (e.g. `schema`, `hook-form`, `provider`).

## Checklist

Work through these steps in order. Use TodoWrite to track progress.

### 1. Template function
- Open `src/utils/templates.js`
- Add `function <type>Template(name, config)` that returns `{ files, resolvedName }`
- `files` is an object of `{ 'filename.ext': 'content' }`
- Handle TypeScript vs JavaScript via `config.language`
- Handle Tailwind vs CSS Modules via `config.styling`
- Add framework dispatches if the resource looks different per framework:
  ```javascript
  function <type>Template(name, config) {
    if (config.framework === 'vue' || config.framework === 'nuxt') return vue<Type>Template(name, config);
    // ...
  }
  ```
- Export the new function at the bottom of the file

### 2. Template declaration
- Open `src/utils/templates.d.ts`
- Add the export declaration:
  ```typescript
  export function <type>Template(
    name: string,
    config: RchitectConfig
  ): { files: Record<string, string>; resolvedName: string };
  ```

### 3. Path helpers
- Open each relevant structure file: `react.js`, `nextjs.js`, `vue.js`, `svelte.js`, `solidjs.js`, `nuxt.js`
- Add a `<type>Path()` function to each pattern in each structure file
- If the resource only makes sense for certain frameworks, only add it to those structures

### 4. Types
- Open `src/types.ts`
- Add the new path helper to the `Structure` interface:
  ```typescript
  <type>Path?: () => string;
  ```
  (Use `?` if not all frameworks support it)

### 5. add.js
- Open `src/commands/add.js`
- Add the type to `SUPPORTED_TYPES` array
- Add `add<Type>()` handler function
- Add the case to the `switch (type)` dispatcher
- If it's framework-restricted, add to `NEXTJS_ONLY` or `NEXTJS_OR_NUXT` as appropriate

### 6. remove.js (if the resource is a directory)
- Open `src/commands/remove.js`
- Add the type to the supported removal types
- Add the path resolution case

### 7. MCP server — three places
- Open `src/mcp/server.js`
- `handleGetProjectConfig`: update `resourcePlacement` with the new type
- `handleResolveResourcePath`: add case to the switch (resolves path without creating files)
- `handleCreateResource`: add case to the switch (actually creates files)
- Update `RESOURCE_DESCRIPTIONS` and `NAMING_CONVENTIONS` constants
- Update `SUPPORTED` and `SUPPORTED_CREATE` arrays

### 8. Tests
- `tests/templates.test.ts` — template generates correct files
- `tests/commands.test.ts` — `add <type> <Name>` creates files on disk
- `tests/mcp.test.ts` — `handleResolveResourcePath` returns correct path

### 9. Verify
- Run `npm test` — all tests must pass
- Report final test count

## Notes
- `resolvedName` is what the final directory/file is named (may differ from the input `name`)
- Follow existing conventions: hooks get `use` prefix, services get camelCase + `Service`, etc.
- Always keep `templates.js` and `handleResolveResourcePath` in sync — they are independent implementations of the same naming rules.
