export type Framework = 'react' | 'nextjs' | 'vue' | 'svelte' | 'solidjs' | 'nuxt' | 'remix' | 'angular' | 'astro' | 'sveltekit' | 'qwik' | 'expo';
export type Pattern = 'atomic-design' | 'feature-based' | 'domain-driven' | 'mvc-like';
export type Language = 'typescript' | 'javascript';
export type Styling = 'css' | 'scss' | 'tailwind';
export type Testing = 'jest' | 'vitest';
export type AtomicLevel = 'atom' | 'molecule' | 'organism' | 'template' | 'page';
export type ConfigKey = 'language' | 'styling' | 'withTests' | 'useClient' | 'pattern' | 'testing';

export interface RchitectConfig {
  framework: Framework;
  pattern: Pattern;
  language: Language;
  styling: Styling;
  withTests: boolean;
  useClient: boolean;
  testing?: Testing;
}

export interface Extensions {
  compExt: 'tsx' | 'jsx' | 'vue' | 'svelte' | 'astro' | 'ts';
  scriptExt: 'ts' | 'js';
  styleExt: 'css' | 'scss';
}

export interface HookTemplateResult {
  files: Record<string, string>;
  resolvedName: string;
}

export interface ServiceTemplateResult {
  files: Record<string, string>;
  resolvedName: string;
}

export interface ContextTemplateResult {
  files: Record<string, string>;
  resolvedName: string;
}

export interface StoreTemplateResult {
  files: Record<string, string>;
  resolvedName: string;
}

export interface BarrelUpdateResult {
  action: 'created' | 'updated' | 'skipped';
  path: string;
}

export interface Structure {
  folders: string[];
  componentPath: (name?: string, level?: string) => string;
  hookPath: () => string;
  pagePath: () => string;
  servicePath: () => string;
  contextPath: () => string;
  storePath: () => string;
  typePath: () => string;
  featurePath: () => string;
  apiPath?: () => string;
  appRouterPath?: (segment?: string) => string;
  serverActionPath?: () => string;
  middlewarePath?: () => string;
  layoutPath?: () => string;
  guardPath?: () => string;
  schemaPath?: () => string;
  queryPath?: () => string;
  i18nPath?: () => string;
}
