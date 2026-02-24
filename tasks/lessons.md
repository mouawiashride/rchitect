# Lessons Learned

Patterns discovered through corrections. Reviewed at the start of each session.

---

## npm tokens are sensitive

**What happened:** Auth tokens appeared in the conversation history.
**Rule:** Never paste npm tokens (or any secret) into a chat. Use `npm config set` in the terminal only. Revoke any token that was exposed.

---

## Zod version matters for MCP SDK

**Rule:** The `@modelcontextprotocol/sdk` works with Zod v3 (`^3.25`). Do NOT install Zod v4 — it breaks the SDK. Pin explicitly in package.json.

---

## CJS-only constraint is permanent

**Rule:** chalk@4 and inquirer@8 are intentionally pinned. v5/v9 are ESM-only and incompatible with `require()`. Never suggest upgrading these.

---

## MCP server stdout is reserved for JSON-RPC

**Rule:** Any `console.log()` in `src/mcp/server.js` will corrupt the MCP stdio transport. All output must go to `process.stderr`. The handler functions must never write to stdout.

---

## `require.main === module` guard for dual-use files

**Rule:** Files that are both a runnable binary and a testable module must guard their startup code with `if (require.main === module)`. Without this, `require()`-ing the file in tests triggers the server startup and leaks open handles.

---

## `handleResolveResourcePath` and `templates.js` must stay in sync

**Rule:** Both files implement the same naming logic independently. If you change how a hook name, service name, or any other resolved name is computed in `templates.js`, the same change must be made in `handleResolveResourcePath` in `server.js`.

---

## Declaration files required for JS → TS test imports

**Rule:** Every `src/utils/*.js` file needs a matching `.d.ts` declaration file. Without it, TypeScript test files that `import` from those JS modules fail with TS7016. Always create the `.d.ts` when adding a new utility file.
