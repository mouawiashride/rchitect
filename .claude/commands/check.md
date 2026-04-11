# /check

Run a full health check on the Rchitect project. Report the results concisely.

## Steps

1. **Run the test suite**:
   ```
   npm test
   ```
   Report:
   - Total tests passed / failed
   - Number of test suites
   - Any failing test names with their error messages

2. **Check version consistency**:
   - Read `version` from `package.json`
   - Confirm it matches what `npm info rchitect version` reports (or is ahead of it)

3. **Check for stale test count in CLAUDE.md**:
   - Read the test count mentioned in CLAUDE.md
   - Compare with actual test count from step 1
   - Flag if they don't match

4. **Summarise**:
   ```
   Tests:    612 passed, 0 failed (24 suites)
   Version:  1.6.0 (published)
   CLAUDE.md: up to date
   ```

## Notes
- If any tests fail, show the full error — don't just say "tests failed".
- This command is read-only — it never modifies files.
