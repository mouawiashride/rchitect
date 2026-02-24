export type Framework = 'react' | 'nextjs';
export type Pattern = 'atomic-design' | 'feature-based' | 'domain-driven' | 'mvc-like';
export type Language = 'typescript' | 'javascript';
export type Styling = 'css' | 'scss';
export type AtomicLevel = 'atom' | 'molecule' | 'organism' | 'template' | 'page';
export type ConfigKey = 'language' | 'styling' | 'withTests' | 'useClient' | 'pattern';

export interface RchitectConfig {
  framework: Framework;
  pattern: Pattern;
  language: Language;
  styling: Styling;
  withTests: boolean;
  useClient: boolean;
}

export interface Extensions {
  compExt: 'tsx' | 'jsx';
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
}
