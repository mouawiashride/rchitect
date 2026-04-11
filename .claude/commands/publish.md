# /publish

Publish a new version of the `rchitect` npm package. Follow every step — stop if anything fails.

---

## 1 — Determine the version bump

Read `package.json` → `version` (currently `1.6.0`).

Choose bump type based on what changed since the last publish:
- Added a command, framework, or resource type → **minor** (1.6.0 → 1.7.0)
- Fixed a bug with no new features → **patch** (1.6.0 → 1.6.1)
- Breaking CLI/config changes → **major** (1.6.0 → 2.0.0)

If the user didn't specify, ask before changing anything.

---

## 2 — Bump `package.json`

Edit only the `"version"` field in `package.json`. No other changes.

---

## 3 — Run the test suite

```
npm test
```

All **612 tests across 24 suites** must pass. If any fail, fix them before continuing.  
If the test count has grown (new tests were added), update CLAUDE.md to reflect the new count.

---

## 4 — Dry-run pack check

```
npm pack --dry-run
```

Confirm these paths are **NOT** in the output — stop if any appear:
- `tests/`
- `vscode-rchitect/`
- `github-action/`
- `.claude/`
- `tasks/`
- `*.tgz`

Confirm these paths **ARE** present:
- `src/commands/` (all .js files)
- `src/structures/` (react, nextjs, vue, svelte, solidjs, nuxt)
- `src/utils/templates.js`
- `src/mcp/server.js`

---

## 5 — Publish

```
npm publish
```

Confirm the output contains `+ rchitect@<new-version>`. If you see a 401 or 403, tell the user their npm token is expired and they need to run `npm login` or set a new automation token with `npm config set`.

---

## 6 — Commit and push

```
git add package.json
git commit -m "chore: bump to v<version>"
git push origin main
```

---

## 7 — Report

State the published version and the npmjs.com URL:
`https://www.npmjs.com/package/rchitect`
