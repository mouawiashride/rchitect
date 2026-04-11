# /test-fw $ARGUMENTS

Run only the tests for a specific framework or module, without running the full 612-test suite.

`$ARGUMENTS` = framework name or test file keyword, e.g. `/test-fw nuxt` or `/test-fw mcp`

---

## How it works

Each framework has a dedicated test file:
| Argument  | Test file                        |
|-----------|----------------------------------|
| `react`   | `tests/templates.test.ts`        |
| `nextjs`  | `tests/commands.test.ts`         |
| `vue`     | `tests/newFrameworks.test.ts`    |
| `svelte`  | `tests/newFrameworks.test.ts`    |
| `solidjs` | `tests/newFrameworks.test.ts`    |
| `nuxt`    | `tests/nuxt.test.ts`             |
| `mcp`     | `tests/mcp.test.ts`              |
| `stats`   | `tests/stats.test.ts`            |
| `detect`  | `tests/detect.test.ts`           |
| `barrel`  | `tests/barrel.test.ts`           |
| `migrate` | `tests/migrate.test.ts`          |
| `scaffold`| `tests/scaffold.test.ts`         |

---

## Steps

1. Map the argument to the correct test file from the table above.
2. Run:
   ```
   npx jest tests/<file>.test.ts --verbose
   ```
3. Report: how many tests passed/failed, and any failure details.

If the argument doesn't match any known file, run the full suite (`npm test`) instead.
