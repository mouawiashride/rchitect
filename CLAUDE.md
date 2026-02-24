# CLAUDE.md — Rchitect Project Intelligence

This file is read by Claude Code at the start of every session. Follow every rule here without being asked.

---

## Project Snapshot

**Rchitect** is a published npm CLI (`rchitect@1.1.0`) that scaffolds React and Next.js projects and ships a built-in MCP server (`rchitect-mcp`) for AI assistant integration.

- **Runtime:** Node.js, CommonJS (`require`/`module.exports`) — no ESM anywhere
- **CJS-pinned deps:** chalk@4, inquirer@8 — do NOT upgrade to v5/v9 (ESM-only, breaks everything)
- **Tests:** Jest + ts-jest, TypeScript test files only — `npm test` must always pass
- **Published:** npmjs.com/package/rchitect — bump version before every `npm publish`
- **282 tests** across 11 suites — all must stay green after any change

---

## Workflow Orchestration

### 1. Plan Before Touching Code

Enter plan mode for **any task with 3+ steps or architectural impact**:
- Adding a new resource type, command, or MCP tool
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
    doctor.js           Validates config + checks folder existence
  structures/
    react.js            4 patterns × path helpers for React projects (src/ prefix)
    nextjs.js           4 patterns × path helpers for Next.js projects (no src/)
  utils/
    templates.js        All file content generators (component, hook, context, etc.)
    validate.js         validateName (PascalCase) + toCamelCase
    detect.js           detectFramework from package.json dependencies
    barrel.js           updateBarrel — appends named export to parent index file
    pathAlias.js        generatePathAliases — writes @/ paths to tsconfig.json
  mcp/
    server.js           MCP server binary — 3 tools + 1 resource, exports handlers
tests/
  *.test.ts             TypeScript tests only — mirrors src/ structure
```

---

## Critical Rules for This Codebase

### Adding a new resource type
1. Add template function to `src/utils/templates.js`
2. Add declaration to `src/utils/templates.d.ts`
3. Add path helper to both `src/structures/react.js` and `src/structures/nextjs.js`
4. Update `src/types.ts` — add to `Structure` interface if new path helper
5. Add case to `src/commands/add.js` (and `remove.js` if removable)
6. Add case to `src/mcp/server.js` — `handleResolveResourcePath` switch
7. Write tests: `tests/templates.test.ts`, `tests/commands.test.ts`, `tests/mcp.test.ts`

### Adding a new CLI command
1. Create `src/commands/<name>.js`
2. Register in `src/index.js` with correct arguments
3. Write tests in `tests/commands.test.ts` (or a new suite)

### Changing file naming logic
The naming logic in `src/utils/templates.js` and `src/mcp/server.js` (`handleResolveResourcePath`) must stay in sync. They are independent implementations of the same rules. If you change one, change the other.

### TypeScript declaration files
Every `.js` file in `src/utils/` has a matching `.d.ts` file. When you add or change exported functions, update the `.d.ts` too. This is what allows TypeScript tests to import JS source files.

### Never touch these without understanding the consequence
- `"chalk": "^4.1.2"` — do not upgrade (v5 is ESM-only)
- `"inquirer": "^8.2.6"` — do not upgrade (v9 is ESM-only)
- The `files` field in `package.json` — controls what gets published; `tests/` must stay excluded

---

## Test Discipline

- Run `npm test` after every non-trivial change — before calling the task done
- All 282 tests must pass. A green test suite is the definition of "working".
- When fixing a bug: write a test that would have caught it, then fix the bug.
- Test files live in `tests/`, are TypeScript, and follow the pattern in `tests/commands.test.ts`:
  - Temp directory per suite (`path.join(__dirname, '.tmp-<name>')`)
  - `beforeEach` creates dir + mocks + sets `process.cwd`
  - `afterEach` restores mocks + removes temp dir

---

## Publishing Checklist

Before `npm publish`:
1. Bump `version` in `package.json` (`1.1.0` → `1.2.0` for features, `1.1.1` for fixes)
2. Run `npm test` — all green
3. Run `npm pack --dry-run` — confirm no test files or dev configs included
4. Run `npm publish`
5. Confirm `+ rchitect@x.x.x` in output

---

## What Not To Do

- Do not add `console.log` to `src/mcp/server.js` (breaks stdio transport)
- Do not write boilerplate files (App.tsx, index.tsx) in structures — Rchitect works inside existing projects
- Do not use ESM (`import`/`export`) in `src/` — CommonJS only
- Do not commit `node_modules`, `.tmp-*` directories, or `.rchitect.json` test artifacts
- Do not publish without bumping the version first
