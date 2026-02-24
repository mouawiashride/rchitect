import type { BarrelUpdateResult } from '../types';

export function updateBarrel(
  parentDir: string,
  resourceName: string,
  scriptExt: string,
  cwd: string
): Promise<BarrelUpdateResult>;
