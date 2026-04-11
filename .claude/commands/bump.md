# /bump $ARGUMENTS

Quickly bump the version in `package.json`.

`$ARGUMENTS` = `patch`, `minor`, or `major`

---

## Rules

- Current version is in `package.json` → `"version"`
- **patch**: last digit (`1.6.0` → `1.6.1`) — bug fixes only
- **minor**: middle digit, reset patch (`1.6.0` → `1.7.0`) — new features (command, framework, resource type)
- **major**: first digit, reset rest (`1.6.0` → `2.0.0`) — breaking changes to CLI API or config format

If no argument given, ask the user which type before changing anything.

---

## Steps

1. Read current version from `package.json`.
2. Compute the new version.
3. Edit `package.json` — change only the `"version"` field.
4. Confirm: `Bumped 1.6.0 → 1.7.0`

Do NOT run tests, commit, or publish. This command only edits `package.json`.  
The user runs `/publish` when ready to go further.
