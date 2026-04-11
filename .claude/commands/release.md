# /release

Create a GitHub release for the current version of Rchitect.

## Steps

1. **Read current version** from `package.json` (e.g. `1.6.0`).

2. **Check that the version is already published** on npm:
   ```
   npm info rchitect version
   ```
   If it's not published yet, tell the user to run `/publish` first.

3. **Check that the working tree is clean**:
   ```
   git status
   ```
   If there are uncommitted changes, ask the user whether to commit them first.

4. **Create and push a git tag**:
   ```
   git tag v1.6.0
   git push origin v1.6.0
   ```

5. **Create a GitHub release** using the GitHub API via `curl`:
   - Endpoint: `POST https://api.github.com/repos/mouawiashride/rchitect/releases`
   - Title: `v{version}`
   - Body: summarise what changed in this version (read git log since the last tag)
   - Use the token from `git credential fill` for https://github.com

6. **Report** the release URL.

## Notes
- Tag format is always `v{version}` (e.g. `v1.6.0`).
- For the VS Code extension, use tag `vscode-v{version}` instead.
- Do not force-push tags that already exist — ask the user first.
