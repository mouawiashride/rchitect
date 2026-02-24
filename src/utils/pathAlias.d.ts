import type { RchitectConfig, Structure } from '../types';

export function buildAliases(
  folders: string[],
  isNextjs: boolean
): Record<string, string[]>;

export function generatePathAliases(
  cwd: string,
  config: Pick<RchitectConfig, 'language' | 'framework'>,
  structure: Pick<Structure, 'folders'>
): Promise<Record<string, string[]> | null>;
