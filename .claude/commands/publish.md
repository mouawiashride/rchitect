# /publish

Run the full Rchitect publish workflow. Execute every step in order — stop and report if any step fails.

## Steps

1. **Read current version** from `package.json`.

2. **Determine new version** based on changes since last publish:
   - Feature additions (new command, framework, resource type) → minor bump (x.Y.0)
   - Bug fixes only → patch bump (x.y.Z)
   - Ask the user if it's unclear.

3. **Bump version** in `package.json`.

4. **Run tests**: `npm test`
   - All tests must pass. If any fail, fix them before continuing.
   - Report the final test count.

5. **Dry-run pack**: `npm pack --dry-run`
   - Verify: no `tests/`, `vscode-rchitect/`, `github-action/`, or `.claude/` in the tarball.
   - Stop if unexpected files are included.

6. **Publish**: `npm publish`
   - Confirm `+ rchitect@x.x.x` in the output.

7. **Commit and push**:
   ```
   git add package.json
   git commit -m "chore: bump to vX.Y.Z"
   git push origin main
   ```

8. **Report** the published version and npm URL.

## Notes
- Never skip the dry-run step.
- Never publish with a version that already exists on npm.
- If the npm token is expired, tell the user to run `npm login` or set a new automation token.
