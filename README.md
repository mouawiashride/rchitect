# Rchitect

**The architecture config your team and AI assistant share.**

Rchitect scaffolds React and Next.js projects with a chosen architecture pattern — and stores your decisions in a `.rchitect.json` file that both your team and AI coding assistants can read. No more explaining your folder structure to every new developer or every new chat session.

---

## Use with AI Assistants (MCP)

Rchitect ships a built-in **MCP server** (`rchitect-mcp`) that gives any MCP-compatible AI assistant — Claude, Cursor, Copilot — live access to your project's architecture.

Once connected, the AI knows:
- Which framework and pattern you're using
- Exactly which folder a component/hook/feature goes in
- How files are named, which extensions to use, and whether tests are expected

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "rchitect": {
      "command": "npx",
      "args": ["rchitect-mcp"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

> **Important:** The `cwd` field must point to your project's root — the directory that contains `.rchitect.json`. This is how the server knows which project's config to read.

### Cursor

Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "rchitect": {
      "command": "npx",
      "args": ["rchitect-mcp"]
    }
  }
}
```

Cursor reads `cwd` from the workspace root automatically.

### Available MCP Tools

| Tool | Description | Inputs |
|------|-------------|--------|
| `get_project_config` | Returns the full `.rchitect.json` plus plain-English explanations of each field | none |
| `get_architecture_guide` | Returns the folder layout, resource placement rules, and naming conventions for all 9 resource types | none |
| `resolve_resource_path` | Given a resource type and name, returns the exact directory path and expected filenames | `type`, `name`, `atomicLevel?` |

### Available MCP Resources

| Resource URI | Description |
|--------------|-------------|
| `rchitect://config` | The raw `.rchitect.json` as `application/json` |

### Example AI workflow

```
You: Where should I put a UserCard molecule?
AI:  [calls resolve_resource_path { type: "component", name: "UserCard", atomicLevel: "molecule" }]
     → components/molecules/UserCard/UserCard.tsx
```

```
You: Create a new Auth context for this project.
AI:  [calls get_architecture_guide to check conventions]
     → creates src/contexts/AuthContext/AuthContext.tsx with Provider + useAuth hook
```

---

## Features

- **Framework auto-detection** — Reads your `package.json` and detects React or Next.js automatically
- **4 architecture patterns** — Atomic Design, Feature-Based, Domain-Driven (DDD), MVC-like
- **9 resource generators** — Components, hooks, pages, services, contexts, stores, types, API routes, features
- **TypeScript & JavaScript** — All generated files match your language choice
- **CSS & SCSS Modules** — Your styling preference throughout
- **Atomic rename** — Rename a resource and have every file, import, and barrel export updated automatically
- **Barrel index auto-update** — Parent `index.ts` updated with each new resource
- **Next.js `"use client"` support** — Directive added to generated components when enabled
- **Test file generation** — `.test.tsx` / `.test.ts` files generated alongside every resource
- **Atomic Design smart templates** — Each level generates a semantically different template body
- **PascalCase validation** — Names validated before any file is created
- **Dry-run mode** — Preview folder structure without writing anything
- **Config persistence** — `.rchitect.json` stores all choices so `add` commands just work
- **MCP server** — Built-in MCP server for AI assistant integration

---

## Installation

```bash
npm install -D rchitect
```

Or use directly with npx:

```bash
npx rchitect init
```

---

## Quick Start

Inside your existing React or Next.js project:

```bash
npx rchitect init
```

Rchitect will:

1. **Auto-detect** your framework from `package.json`
2. Ask you to choose an **architecture pattern**
3. Ask your preferences for **language**, **styling**, **tests**, and `"use client"`
4. Create the architecture folders inside your project
5. Save your choices in `.rchitect.json`

Then add resources:

```bash
npx rchitect add component UserCard
npx rchitect add hook Auth
npx rchitect add page Dashboard
npx rchitect add service User
npx rchitect add context Theme
npx rchitect add store Cart
npx rchitect add type Product
npx rchitect add api Users          # Next.js only
npx rchitect add feature Checkout
```

---

## Commands

### `rchitect init`

Scaffolds architecture folders inside your existing project. Requires a `package.json` in the current directory.

```bash
npx rchitect init           # interactive setup
npx rchitect init --dry-run  # preview without creating files
```

**Prompts:**

| Prompt | Options |
|--------|---------|
| Framework | Auto-detected, or choose React / Next.js |
| Architecture pattern | Atomic Design, Feature-Based, Domain-Driven, MVC-like |
| Language | TypeScript, JavaScript |
| Styling | CSS Modules, SCSS Modules |
| Test files | Yes / No |
| "use client" *(Next.js only)* | Yes / No |
| Path aliases *(TypeScript only)* | Yes / No — adds `@/` aliases to `tsconfig.json` |

---

### `rchitect add <type> <Name>`

Creates a resource in the correct location for your pattern. All names must be PascalCase.

#### `component`

```bash
npx rchitect add component UserCard
```

```
UserCard/
├── UserCard.tsx
├── UserCard.module.css
├── UserCard.test.tsx   # if tests enabled
└── index.ts
```

For **Atomic Design** projects, you are prompted to choose a level (atom, molecule, organism, template, page — each generates a different template body).

#### `hook`

```bash
npx rchitect add hook Auth       # → useAuth/
```

```
useAuth/
├── useAuth.ts
├── useAuth.test.ts   # if tests enabled
└── index.ts
```

#### `page`

```bash
npx rchitect add page Dashboard  # → Dashboard/DashboardPage.tsx
```

#### `service`

```bash
npx rchitect add service User    # → userService/userService.ts
```

#### `context`

```bash
npx rchitect add context Theme
```

```
ThemeContext/
├── ThemeContext.tsx   # Provider + useTheme hook with safety throw
└── index.ts
```

Always gets `'use client';` in Next.js — contexts are always client components.

#### `store`

```bash
npx rchitect add store Cart      # → useCartStore/useCartStore.ts
```

Generates a Zustand store with TypeScript `State` and `Actions` interfaces.

#### `type`

```bash
npx rchitect add type Product    # → types/Product.types.ts
```

Generates an interface, type alias, and Partial type. Placed directly in the `types/` directory.

#### `api` *(Next.js only)*

```bash
npx rchitect add api Users       # → app/api/users/route.ts
```

Generates typed GET and POST handlers using `NextRequest` / `NextResponse`.

#### `feature`

```bash
npx rchitect add feature Checkout
```

```
Checkout/
├── components/CheckoutView/
│   ├── CheckoutView.tsx
│   ├── CheckoutView.module.css
│   └── index.ts
├── hooks/useCheckout/
│   ├── useCheckout.ts
│   └── index.ts
├── services/checkoutService/
│   ├── checkoutService.ts
│   └── index.ts
├── types.ts
└── index.ts
```

---

### `rchitect list`

Displays the current project configuration.

```bash
npx rchitect list
```

```
  Framework:  Next.js
  Pattern:    Atomic Design
  Language:   typescript
  Styling:    SCSS Modules
  Tests:      Yes
  Use Client: Yes
```

---

### `rchitect config set <key> <value>`

Updates a single config key without re-running `init`.

```bash
npx rchitect config set withTests true
npx rchitect config set styling scss
npx rchitect config set language javascript
```

**Valid keys:** `language`, `styling`, `withTests`, `useClient`, `pattern`

---

### `rchitect remove <type> <Name>`

Removes a resource directory after confirmation.

```bash
npx rchitect remove component UserCard
npx rchitect remove feature Checkout
```

---

### `rchitect rename <type> <OldName> <NewName>`

Renames a resource atomically — the directory, every file inside it, all internal references, and the parent barrel export are updated in one command.

```bash
npx rchitect rename component Button PrimaryButton
npx rchitect rename hook Auth Payment
npx rchitect rename context Theme Dark
npx rchitect rename feature Checkout OrderFlow
```

**What gets updated:**

| Step | Example |
|------|---------|
| Directory renamed | `src/hooks/useAuth/` → `src/hooks/usePayment/` |
| Files renamed | `useAuth.ts` → `usePayment.ts` |
| File contents updated | `useAuth()` → `usePayment()` everywhere inside |
| Parent barrel updated | `from './useAuth'` → `from './usePayment'` |

**Supported types:** `component`, `hook`, `page`, `service`, `context`, `store`, `feature`

For **feature** renames, nested subdirectories and their files are also renamed recursively (e.g. `CheckoutView/` → `OrderFlowView/`, `useCheckout/` → `useOrderFlow/`).

---

### `rchitect doctor`

Checks project health: validates `.rchitect.json` and reports which expected folders exist or are missing.

```bash
npx rchitect doctor
```

```
  ✓ .rchitect.json found
  ✓ framework: nextjs
  ✓ pattern: atomic-design
  ✓ language: typescript
  ✓ styling: scss
  ✓ withTests: true

  Checking project structure...

  ✓ components/atoms
  ✓ components/molecules
  ⚠ missing: components/organisms

  1 folder(s) missing. Run "rchitect init" to create missing folders.
```

---

### `rchitect --version`

```bash
npx rchitect --version
```

---

## Architecture Patterns

### Atomic Design

React:
```
src/components/atoms/
src/components/molecules/
src/components/organisms/
src/components/templates/
src/components/pages/
src/hooks/
src/contexts/
src/stores/
src/services/
src/utils/
src/types/
src/styles/
src/assets/
```

Next.js:
```
components/atoms/
components/molecules/
components/organisms/
components/templates/
hooks/
contexts/
stores/
services/
utils/
types/
styles/
```

### Feature-Based

React:
```
src/features/
src/components/shared/
src/hooks/
src/contexts/
src/stores/
src/services/
src/utils/
src/types/
src/styles/
src/assets/
```

Next.js:
```
features/
components/shared/
hooks/
contexts/
stores/
services/
utils/
types/
styles/
```

### Domain-Driven (DDD)

React:
```
src/domains/
src/shared/components/
src/shared/hooks/
src/shared/contexts/
src/shared/stores/
src/shared/services/
src/shared/utils/
src/shared/types/
src/styles/
src/assets/
```

Next.js:
```
domains/
shared/components/
shared/hooks/
shared/contexts/
shared/stores/
shared/services/
shared/utils/
shared/types/
styles/
```

### MVC-like

React:
```
src/models/
src/views/components/
src/views/pages/
src/controllers/
src/services/
src/hooks/
src/contexts/
src/stores/
src/utils/
src/types/
src/styles/
src/assets/
```

Next.js:
```
models/
views/components/
views/pages/
controllers/
services/
hooks/
contexts/
stores/
utils/
types/
styles/
```

---

## Configuration

All preferences are stored in `.rchitect.json`:

```json
{
  "framework": "nextjs",
  "pattern": "atomic-design",
  "language": "typescript",
  "styling": "scss",
  "withTests": true,
  "useClient": true
}
```

You can edit this file directly or use `rchitect config set` to change individual values.

---

## Naming Rules

All resource names must be **PascalCase** — start with an uppercase letter, alphanumeric only.

```
Button        ✓
UserProfile   ✓
DataTable     ✓
button        ✗
123bad        ✗
my-component  ✗
```

Rchitect applies name transformations automatically:

| Type | Input | Output |
|------|-------|--------|
| hook | `Auth` | `useAuth` |
| service | `User` | `userService` |
| context | `Auth` | `AuthContext` |
| store | `Cart` | `useCartStore` |
| page | `Dashboard` | `DashboardPage` |
| api | `UserProfile` | `app/api/userProfile/route.ts` |

---

## Tech Stack

- [commander](https://www.npmjs.com/package/commander) — CLI framework
- [inquirer](https://www.npmjs.com/package/inquirer) — Interactive prompts
- [chalk](https://www.npmjs.com/package/chalk) — Colored terminal output
- [fs-extra](https://www.npmjs.com/package/fs-extra) — File system operations
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — MCP server for AI assistant integration
- [zod](https://www.npmjs.com/package/zod) — Schema validation for MCP tool inputs

---

## License

MIT
