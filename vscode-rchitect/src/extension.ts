import * as vscode from 'vscode';
import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fsSync from 'fs';

// ── Rchitect modules (resolved at build time by esbuild) ──────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */
const templates      = require('../../src/utils/templates');
const reactStructures   = require('../../src/structures/react');
const nextjsStructures  = require('../../src/structures/nextjs');
const vueStructures     = require('../../src/structures/vue');
const svelteStructures  = require('../../src/structures/svelte');
const solidjsStructures = require('../../src/structures/solidjs');
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Types ─────────────────────────────────────────────────────────────────────

interface RchitectConfig {
  framework: string;
  pattern: string;
  language: string;
  styling: string;
  withTests: boolean;
  useClient: boolean;
  testing?: string;
}

interface ResourceType {
  label: string;
  value: string;
  detail: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getConfig(root: string): RchitectConfig | null {
  const configPath = path.join(root, '.rchitect.json');
  if (!fsSync.existsSync(configPath)) return null;
  try {
    return JSON.parse(fsSync.readFileSync(configPath, 'utf-8')) as RchitectConfig;
  } catch {
    return null;
  }
}

function getStructure(config: RchitectConfig): Record<string, (...args: unknown[]) => unknown> | null {
  const map: Record<string, Record<string, unknown>> = {
    react: reactStructures,
    nextjs: nextjsStructures,
    vue: vueStructures,
    svelte: svelteStructures,
    solidjs: solidjsStructures,
  };
  const structures = map[config.framework] ?? reactStructures;
  return (structures[config.pattern] as Record<string, (...args: unknown[]) => unknown>) ?? null;
}

async function writeFiles(files: Record<string, string>, targetDir: string): Promise<string[]> {
  const created: string[] = [];
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(targetDir, filePath);
    await fsp.mkdir(path.dirname(fullPath), { recursive: true });
    await fsp.writeFile(fullPath, content as string);
    created.push(fullPath);
  }
  return created;
}

async function updateBarrel(parentDir: string, name: string, scriptExt: string): Promise<void> {
  const barrelPath = path.join(parentDir, `index.${scriptExt}`);
  const exportLine = `export { default } from './${name}';\n`;
  try {
    if (fsSync.existsSync(barrelPath)) {
      const existing = await fsp.readFile(barrelPath, 'utf-8');
      if (!existing.includes(`'./${name}'`)) {
        await fsp.appendFile(barrelPath, exportLine);
      }
    } else {
      await fsp.writeFile(barrelPath, exportLine);
    }
  } catch {
    // barrel update is non-critical — ignore
  }
}

function frameworkLabel(fw: string): string {
  const labels: Record<string, string> = {
    react: 'React', nextjs: 'Next.js', vue: 'Vue 3', svelte: 'Svelte', solidjs: 'SolidJS',
  };
  return labels[fw] ?? fw;
}

function patternLabel(p: string): string {
  const labels: Record<string, string> = {
    'atomic-design': 'Atomic',
    'feature-based': 'Feature',
    'domain-driven': 'DDD',
    'mvc-like': 'MVC',
  };
  return labels[p] ?? p;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function requireConfig(): { root: string; config: RchitectConfig } | null {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Rchitect: No workspace open.');
    return null;
  }
  const config = getConfig(root);
  if (!config) {
    vscode.window.showErrorMessage(
      'Rchitect: No .rchitect.json found. Run "rchitect init" in your terminal first.',
    );
    return null;
  }
  return { root, config };
}

// ── Status bar ────────────────────────────────────────────────────────────────

function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.command = 'rchitect.openConfig';
  context.subscriptions.push(item);
  return item;
}

function refreshStatusBar(item: vscode.StatusBarItem): void {
  const root = getWorkspaceRoot();
  if (!root) { item.hide(); return; }
  const config = getConfig(root);
  if (!config) { item.hide(); return; }
  item.text = `$(circuit-board) ${frameworkLabel(config.framework)} · ${patternLabel(config.pattern)}`;
  item.tooltip = [
    `Rchitect`,
    `Framework : ${frameworkLabel(config.framework)}`,
    `Pattern   : ${config.pattern}`,
    `Language  : ${config.language}`,
    `Styling   : ${config.styling}`,
    `Tests     : ${config.withTests ? (config.testing ?? 'jest') : 'off'}`,
    ``,
    `Click to open .rchitect.json`,
  ].join('\n');
  item.show();
}

// ── Resource type definitions ─────────────────────────────────────────────────

const RESOURCE_TYPES: ResourceType[] = [
  { label: '$(symbol-class) Component',          value: 'component', detail: 'UI component (.tsx / .vue / .svelte)' },
  { label: '$(symbol-method) Hook / Composable', value: 'hook',      detail: 'Reusable stateful logic (useXxx)' },
  { label: '$(browser) Page',                    value: 'page',      detail: 'Page-level component (XxxPage)' },
  { label: '$(database) Store',                  value: 'store',     detail: 'Zustand / Pinia / SolidJS store' },
  { label: '$(symbol-interface) Service',        value: 'service',   detail: 'Data fetching or business logic' },
  { label: '$(link) Context / Provider',         value: 'context',   detail: 'React Context, Vue inject, Svelte context' },
  { label: '$(symbol-namespace) Feature',        value: 'feature',   detail: 'Full feature scaffold (component + hook + service)' },
  { label: '$(symbol-type-parameter) Type',      value: 'type',      detail: 'TypeScript type definitions file' },
];

const ATOMIC_LEVELS = [
  { label: '$(circle-small) Atom',      value: 'atom',     detail: 'Smallest UI unit (button, input, label)' },
  { label: '$(combine) Molecule',       value: 'molecule',  detail: 'Group of atoms (search bar, form field)' },
  { label: '$(layout) Organism',        value: 'organism',  detail: 'Complex section (header, card list)' },
  { label: '$(window) Template',        value: 'template',  detail: 'Page layout structure' },
  { label: '$(browser) Page',           value: 'page',      detail: 'Full page component' },
];

// ── Add resource ──────────────────────────────────────────────────────────────

async function addResource(root: string, config: RchitectConfig, preselectedType?: string): Promise<void> {
  const structure = getStructure(config);
  if (!structure) {
    vscode.window.showErrorMessage('Rchitect: Unknown pattern in .rchitect.json');
    return;
  }

  // 1. Pick resource type
  let resourceType = preselectedType;
  if (!resourceType) {
    const picked = await vscode.window.showQuickPick(RESOURCE_TYPES, {
      placeHolder: 'What would you like to create?',
      matchOnDetail: true,
    });
    if (!picked) return;
    resourceType = picked.value;
  }

  // 2. Pick atomic level (only for atomic-design + component)
  let atomicLevel: string | undefined;
  if (resourceType === 'component' && config.pattern === 'atomic-design') {
    const levelPick = await vscode.window.showQuickPick(ATOMIC_LEVELS, {
      placeHolder: 'Choose atomic design level',
      matchOnDetail: true,
    });
    if (!levelPick) return;
    atomicLevel = levelPick.value;
  }

  // 3. Get name
  const placeholder = resourceType === 'hook' ? 'Auth  →  generates useAuth'
    : resourceType === 'service' ? 'User  →  generates userService'
    : resourceType === 'store' ? 'Cart  →  generates useCartStore'
    : `My${capitalize(resourceType)}`;

  const name = await vscode.window.showInputBox({
    prompt: `${capitalize(resourceType)} name (PascalCase)`,
    placeHolder: placeholder,
    validateInput: (input) => {
      if (!input?.trim()) return 'Name is required';
      if (['component', 'page', 'context', 'feature', 'type'].includes(resourceType!)) {
        if (!/^[A-Z][A-Za-z0-9]*$/.test(input.trim())) {
          return 'Must be PascalCase — e.g. UserCard, AuthModal';
        }
      }
      return null;
    },
  });
  if (!name) return;
  const trimmed = name.trim();

  const { scriptExt } = templates.getExtensions(config) as { scriptExt: string };

  try {
    let files: Record<string, string>;
    let targetDir: string;
    let resolvedName: string;

    switch (resourceType) {
      case 'component': {
        const basePath = config.pattern === 'atomic-design'
          ? (structure.componentPath as (n: string, l: string) => string)(trimmed, atomicLevel ?? 'atom')
          : (structure.componentPath as (n: string) => string)(trimmed);
        targetDir    = path.join(root, basePath, trimmed);
        files        = templates.componentTemplate(trimmed, config, atomicLevel) as Record<string, string>;
        resolvedName = trimmed;
        break;
      }
      case 'hook': {
        const r = templates.hookTemplate(trimmed, config) as { files: Record<string, string>; resolvedName: string };
        files        = r.files;
        resolvedName = r.resolvedName;
        targetDir    = path.join(root, (structure.hookPath as () => string)(), resolvedName);
        break;
      }
      case 'page': {
        files        = templates.pageTemplate(trimmed, config) as Record<string, string>;
        targetDir    = path.join(root, (structure.pagePath as () => string)(), trimmed);
        resolvedName = trimmed;
        break;
      }
      case 'service': {
        const r = templates.serviceTemplate(trimmed, config) as { files: Record<string, string>; resolvedName: string };
        files        = r.files;
        resolvedName = r.resolvedName;
        targetDir    = path.join(root, (structure.servicePath as () => string)(), resolvedName);
        break;
      }
      case 'context': {
        const r = templates.contextTemplate(trimmed, config) as { files: Record<string, string>; resolvedName: string };
        files        = r.files;
        resolvedName = r.resolvedName;
        targetDir    = path.join(root, (structure.contextPath as () => string)(), resolvedName);
        break;
      }
      case 'store': {
        const r = templates.storeTemplate(trimmed, config) as { files: Record<string, string>; resolvedName: string };
        files        = r.files;
        resolvedName = r.resolvedName;
        targetDir    = path.join(root, (structure.storePath as () => string)(), resolvedName);
        break;
      }
      case 'type': {
        const r = templates.typeTemplate(trimmed, config) as { files: Record<string, string>; resolvedName: string };
        files        = r.files;
        resolvedName = r.resolvedName;
        targetDir    = path.join(root, (structure.typePath as () => string)());
        break;
      }
      case 'feature': {
        const r = templates.featureTemplate(trimmed, config) as { files: Record<string, string>; resolvedName: string };
        files        = r.files;
        resolvedName = r.resolvedName;
        targetDir    = path.join(root, (structure.featurePath as () => string)(), resolvedName);
        break;
      }
      default:
        vscode.window.showErrorMessage(`Rchitect: Unknown type "${resourceType}"`);
        return;
    }

    // Guard: already exists
    if (resourceType !== 'type' && fsSync.existsSync(targetDir)) {
      vscode.window.showErrorMessage(
        `Rchitect: "${resolvedName!}" already exists at ${path.relative(root, targetDir)}`,
      );
      return;
    }

    // Write all files
    const created = await writeFiles(files, targetDir);

    // Update parent barrel index (not for type / feature — they manage their own index)
    if (!['type', 'feature'].includes(resourceType)) {
      await updateBarrel(path.dirname(targetDir), resolvedName!, scriptExt);
    }

    // Open the first created file
    const mainFile = created[0];
    const doc = await vscode.workspace.openTextDocument(mainFile);
    await vscode.window.showTextDocument(doc, { preview: false });

    const action = await vscode.window.showInformationMessage(
      `✓ ${capitalize(resourceType)} "${resolvedName!}" created (${created.length} file${created.length > 1 ? 's' : ''})`,
      'Reveal in Explorer',
    );
    if (action === 'Reveal in Explorer') {
      await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(mainFile));
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Rchitect: ${msg}`);
  }
}

// ── Doctor command ────────────────────────────────────────────────────────────

async function runDoctor(root: string, config: RchitectConfig): Promise<void> {
  const structure = getStructure(config);
  if (!structure) {
    vscode.window.showErrorMessage('Rchitect: Unknown pattern in .rchitect.json');
    return;
  }

  const folders = structure.folders as string[];
  const missing = folders.filter(f => !fsSync.existsSync(path.join(root, f)));

  if (missing.length === 0) {
    vscode.window.showInformationMessage(
      `✓ Rchitect Doctor: all ${folders.length} architecture folders are present.`,
    );
    return;
  }

  const action = await vscode.window.showWarningMessage(
    `Rchitect Doctor: ${missing.length} folder${missing.length > 1 ? 's' : ''} missing.`,
    'Create Missing Folders',
    'Show List',
  );

  if (action === 'Create Missing Folders') {
    for (const folder of missing) {
      await fsp.mkdir(path.join(root, folder), { recursive: true });
    }
    vscode.window.showInformationMessage(`✓ Created ${missing.length} missing folder(s).`);
  } else if (action === 'Show List') {
    vscode.window.showInformationMessage(`Missing: ${missing.join(', ')}`);
  }
}

// ── Extension entry point ─────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = createStatusBar(context);
  refreshStatusBar(statusBar);

  // Refresh status bar when .rchitect.json changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/.rchitect.json');
  watcher.onDidChange(() => refreshStatusBar(statusBar));
  watcher.onDidCreate(() => refreshStatusBar(statusBar));
  watcher.onDidDelete(() => refreshStatusBar(statusBar));
  context.subscriptions.push(watcher);

  // ── Register commands ──

  const register = (id: string, fn: (...args: unknown[]) => Promise<void>) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  register('rchitect.addResource', async () => {
    const ctx = requireConfig();
    if (ctx) await addResource(ctx.root, ctx.config);
  });

  register('rchitect.addComponent', async () => {
    const ctx = requireConfig();
    if (ctx) await addResource(ctx.root, ctx.config, 'component');
  });

  register('rchitect.addHook', async () => {
    const ctx = requireConfig();
    if (ctx) await addResource(ctx.root, ctx.config, 'hook');
  });

  register('rchitect.addPage', async () => {
    const ctx = requireConfig();
    if (ctx) await addResource(ctx.root, ctx.config, 'page');
  });

  register('rchitect.addStore', async () => {
    const ctx = requireConfig();
    if (ctx) await addResource(ctx.root, ctx.config, 'store');
  });

  register('rchitect.addService', async () => {
    const ctx = requireConfig();
    if (ctx) await addResource(ctx.root, ctx.config, 'service');
  });

  register('rchitect.addFeature', async () => {
    const ctx = requireConfig();
    if (ctx) await addResource(ctx.root, ctx.config, 'feature');
  });

  register('rchitect.openConfig', async () => {
    const root = getWorkspaceRoot();
    if (!root) return;
    const configPath = path.join(root, '.rchitect.json');
    if (fsSync.existsSync(configPath)) {
      const doc = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(doc);
    } else {
      vscode.window.showErrorMessage('Rchitect: No .rchitect.json found. Run "rchitect init" first.');
    }
  });

  register('rchitect.runDoctor', async () => {
    const ctx = requireConfig();
    if (ctx) await runDoctor(ctx.root, ctx.config);
  });
}

export function deactivate(): void {}
