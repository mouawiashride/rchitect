# CLAUDE.md — Rchitect Project Intelligence

This file is read by Claude Code at the start of every session. Follow every rule here without being asked.

---

## Project Snapshot

**Rchitect** is a published npm CLI (`rchitect@1.8.0`) that scaffolds React, Next.js, Vue 3, Nuxt 3, Svelte, SvelteKit, SolidJS, Remix, Angular, Astro, Qwik, and Expo projects, and ships a built-in MCP server (`rchitect-mcp`) for AI assistant integration.

- **Runtime:** Node.js, CommonJS (`require`/`module.exports`) — no ESM anywhere
- **CJS-pinned deps:** chalk@4, inquirer@8 — do NOT upgrade to v5/v9 (ESM-only, breaks everything)
- **Zod:** pinned to v3 (`^3.25`) — do NOT upgrade to v4 (breaks MCP SDK)
- **Tests:** Jest + ts-jest, TypeScript test files only — `npm test` must always pass
- **Published:** npmjs.com/package/rchitect — bump version before every `npm publish`
- **739 tests** across 28 suites — all must stay green after any change
- **VS Code Extension:** `vscode-rchitect/` — published as GitHub Release `vscode-v1.0.0`
- **GitHub Action:** `github-action/` — architecture compliance check for PRs

---

## Workflow Orchestration

### 1. Plan Before Touching Code

Enter plan mode for **any task with 3+ steps or architectural impact**:
- Adding a new resource type, command, or MCP tool
- Adding a new framework
- Changing how paths are resolved or files are named
- Any change that touches more than 2 files

If a task seems simple but grows during implementation — **stop, re-plan, continue**. Never push through confusion.

Write specs upfront. Ambiguity caught before coding costs nothing. Ambiguity caught after costs a rewrite.

### 2. Subagent Strategy

- Use **Explore** subagents to read/search the codebase — keeps main context clean
- Use **Plan** subagents for architectural decisions before writing a line
- Run independent searches in parallel (structures + templates + tests simultaneously)
- One focused task per subagent — not "look at everything"

### 3. Self-Improvement Loop

After any correction from the user:
1. Understand exactly what went wrong
2. Write a rule in `tasks/lessons.md` that would have prevented it
3. Apply that rule immediately to the current task

Review `tasks/lessons.md` at the start of any session that continues previous work.

### 4. Verify Before Marking Done

Never call a task complete without proving it:
- **Code changes** → run `npm test`, confirm 0 failures
- **New feature** → verify the generated files look correct on disk
- **npm publish** → confirm `+ rchitect@x.x.x` in output
- Ask yourself: *"Would a staff engineer approve this?"* If not, fix it first.

### 5. Demand Elegance

For non-trivial changes, pause and ask: *"Is there a more elegant solution?"*

If a fix feels like a workaround — it probably is. Find the root cause.

Skip this for simple, obvious fixes. Don't over-engineer a one-liner.

### 6. Autonomous Bug Fixing

When given a bug: fix it. Don't ask for hand-holding.

- Read the error, trace it to the source, fix the root cause
- Run `npm test` to confirm the fix doesn't break anything else
- If tests were missing for the bug scenario, add them

---

## Task Management

Every non-trivial task follows this sequence:

1. **Plan** — use TodoWrite to lay out steps before starting
2. **Implement** — one todo at a time, mark complete immediately when done
3. **Verify** — run `npm test`, check output, confirm correctness
4. **Document** — if a lesson was learned, write it to `tasks/lessons.md`

Never batch-complete todos. Mark each one done the moment it's finished.

---

## Core Principles

- **Simplicity first** — the minimum code that correctly solves the problem. No extras.
- **No laziness** — find root causes, not workarounds. Senior engineer standards.
- **Minimal impact** — changes touch only what's necessary. Don't clean up unrelated code.
- **No backwards-compat hacks** — if something is unused, delete it cleanly.
- **No stdout in MCP server** — `src/mcp/server.js` must never call `console.log`. All debug output goes to `process.stderr`. stdout is reserved for JSON-RPC.

---

## Project Architecture

```
src/
  index.js              CLI entry — registers all commands with commander
  types.ts              Shared TypeScript types (RchitectConfig, Structure, etc.)
  commands/
    init.js             Interactive setup, creates folders, writes .rchitect.json
    add.js              Dispatches to addComponent/addHook/etc. based on type
    list.js             Displays .rchitect.json in a readable table
    config.js           Updates a single key in .rchitect.json
    remove.js           Deletes resource directory after confirmation
    rename.js           Renames a resource and updates barrel exports
    doctor.js           Validates config + checks folder existence
    audit.js            Scans source for naming/barrel violations
    scaffold.js         Batch-creates resources from a JSON manifest
    sync.js             Rescans dirs and adds missing barrel exports
    migrate.js          Moves resources to a new architecture pattern
    eject.js            Copies built-in templates to .rchitect/templates.js
    import.js           Detects existing project structure → .rchitect.json
    stats.js            Architecture compliance check with --json flag
  structures/
    react.js            4 patterns × path helpers (src/ prefix)
    nextjs.js           4 patterns × path helpers (no src/, app/ router)
    vue.js              4 patterns × path helpers (src/ prefix, composables)
    svelte.js           4 patterns × path helpers (src/ prefix, composables)
    solidjs.js          4 patterns × path helpers (src/ prefix, mirrors React)
    nuxt.js             4 patterns × path helpers (no src/, Nuxt conventions)
  utils/
    templates.js        All file content generators — dispatches by framework
    templates.d.ts      TypeScript declarations for templates.js exports
    validate.js         validateName (PascalCase) + toCamelCase
    detect.js           detectFramework from package.json dependencies
    barrel.js           updateBarrel — appends named export to parent index
    pathAlias.js        generatePathAliases — writes @/ paths to tsconfig.json
  mcp/
    server.js           MCP server binary — 3 tools, exports handlers
tests/
  *.test.ts             TypeScript tests only — 24 suites, 612 tests
vscode-rchitect/        VS Code extension (esbuild bundled, GitHub Release)
github-action/          GitHub Action for PR architecture compliance checks
```

---

## Supported Frameworks

| Framework | Detection key    | src/ prefix | Hook folder      | Notes                         |
|-----------|------------------|-------------|------------------|-------------------------------|
| react     | `react`          | yes         | `hooks`          | JSX/TSX, Zustand, React ctx   |
| nextjs    | `next`           | no          | `hooks`          | App Router, Server Actions    |
| vue       | `vue`            | yes         | `composables`    | Vue SFCs, Pinia, provide/inject|
| nuxt      | `nuxt`           | no          | `composables`    | Nuxt 3 conventions            |
| svelte    | `svelte`         | yes         | `composables`    | Svelte 5 runes, svelte/store  |
| solidjs   | `solid-js`       | yes         | `hooks`          | solid-js, createStore         |

Detection order in `detect.js`: next → nuxt → react → vue → svelte/kit → solid-js

---

## Framework Dispatch Pattern

`src/utils/templates.js` uses a dispatch pattern at the top of each template function:

```javascript
function componentTemplate(name, config, level) {
  if (config.framework === 'vue' || config.framework === 'nuxt') return vueComponentTemplate(...);
  if (config.framework === 'svelte') return svelteComponentTemplate(...);
  if (config.framework === 'solidjs') return solidComponentTemplate(...);
  // React/Next.js code follows...
}
```

**Rule:** Nuxt reuses Vue templates for component/hook/page/context/store/feature. Nuxt-specific resources (api, layout, middleware) have their own template functions: `nuxtApiTemplate`, `nuxtLayoutTemplate`, `nuxtMiddlewareTemplate`.

---

## Critical Rules for This Codebase

### Adding a new framework

1. Create `src/structures/<framework>.js` with 4 patterns and all path helpers
2. Update `src/types.ts` — add to `Framework` union and `Extensions.compExt` if needed
3. Update `src/utils/detect.js` — add detection in correct priority order
4. Update `src/utils/templates.js` — add dispatch at top of each template function
5. Update `src/commands/add.js` — add to `structureMap`, handle framework-specific resource types
6. Update `src/commands/init.js` — add to framework choices list and `structureMap`
7. Update `src/commands/import.js` — add detection in `detectFramework(pkg)`
8. Update `src/mcp/server.js` — add to all 3 `structureMap` objects
9. Write tests in `tests/<framework>.test.ts`

### Adding a new resource type

1. Add template function to `src/utils/templates.js`
2. Add declaration to `src/utils/templates.d.ts`
3. Add path helper to all relevant structure files (`react.js`, `nextjs.js`, etc.)
4. Update `src/types.ts` — add to `Structure` interface if new path helper
5. Add case to `src/commands/add.js` (and `remove.js` if removable)
6. Add case to `src/mcp/server.js` — all 3 handlers (`handleGetProjectConfig`, `handleResolveResourcePath`, `handleCreateResource`)
7. Write tests in `tests/templates.test.ts`, `tests/commands.test.ts`, `tests/mcp.test.ts`

### Adding a new CLI command

1. Create `src/commands/<name>.js`
2. Register in `src/index.js` with correct arguments and options
3. Write tests in a dedicated `tests/<name>.test.ts`

### Changing file naming logic

The naming logic in `src/utils/templates.js` and `src/mcp/server.js` (`handleResolveResourcePath`) must stay in sync. They are independent implementations of the same rules. If you change one, change the other.

### TypeScript declaration files

Every `.js` file in `src/utils/` has a matching `.d.ts` file. When you add or change exported functions, update the `.d.ts` too. This is what allows TypeScript tests to import JS source files.

### MCP server structure maps

`server.js` has **three** separate `structureMap` objects (`structureMap`, `structureMap2`, `structureMap3`) — one in each handler function. When adding a framework, update all three.

### Never touch these without understanding the consequence

- `"chalk": "^4.1.2"` — do not upgrade (v5 is ESM-only)
- `"inquirer": "^8.2.6"` — do not upgrade (v9 is ESM-only)
- `"zod": "^3.25"` — do not upgrade to v4 (breaks MCP SDK)
- The `files` field in `package.json` — controls what gets published; `tests/`, `vscode-rchitect/`, `github-action/` must stay excluded

---

## Test Discipline

- Run `npm test` after every non-trivial change — before calling the task done
- All 612 tests must pass. A green test suite is the definition of "working".
- When fixing a bug: write a test that would have caught it, then fix the bug.
- Test files live in `tests/`, are TypeScript, and follow the pattern in `tests/commands.test.ts`:
  - Temp directory per suite (`path.join(__dirname, '.tmp-<name>')`)
  - `beforeEach` creates dir + mocks + sets `process.cwd`
  - `afterEach` restores mocks + removes temp dir
- Each new framework gets its own test file: `tests/<framework>.test.ts`

---

## Publishing Checklist

Before `npm publish`:
1. Bump `version` in `package.json` (`1.6.0` → `1.7.0` for features, `1.6.1` for fixes)
2. Run `npm test` — all green
3. Run `npm pack --dry-run` — confirm no test files, `vscode-rchitect/`, or `github-action/` included
4. Run `npm publish`
5. Confirm `+ rchitect@x.x.x` in output
6. Commit + push to GitHub
7. Use `/release` skill to tag and create a GitHub release

---

## Project Skills (Slash Commands)

Custom slash commands live in `.claude/commands/`. Invoke them with `/skill-name`.

| Command            | Purpose                                              |
|--------------------|------------------------------------------------------|
| `/publish`         | Full publish workflow: test → pack → publish → push  |
| `/release`         | Create a GitHub release tag for the current version  |
| `/new-framework`   | Checklist for adding a new framework                 |
| `/new-resource`    | Checklist for adding a new resource type             |
| `/check`           | Run tests and show compliance stats                  |

---

## What Not To Do

- Do not add `console.log` to `src/mcp/server.js` (breaks stdio transport)
- Do not write boilerplate files (App.tsx, index.tsx) in structures — Rchitect works inside existing projects
- Do not use ESM (`import`/`export`) in `src/` — CommonJS only
- Do not commit `node_modules`, `.tmp-*` directories, or `.rchitect.json` test artifacts
- Do not publish without bumping the version first
- Do not put secrets (tokens, passwords) in `.claude/settings.local.json` allow lists — use environment variables or `npm config set` in the terminal only
