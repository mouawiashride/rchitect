import type {
  RchitectConfig,
  Extensions,
  HookTemplateResult,
  ServiceTemplateResult,
  ContextTemplateResult,
  StoreTemplateResult,
} from '../types';

export function getExtensions(config: Pick<RchitectConfig, 'language' | 'styling'>): Extensions;

export function componentTemplate(
  name: string,
  config: RchitectConfig,
  level?: string
): Record<string, string>;

export function hookTemplate(name: string, config: RchitectConfig): HookTemplateResult;

export function pageTemplate(name: string, config: RchitectConfig): Record<string, string>;

export function serviceTemplate(name: string, config: RchitectConfig): ServiceTemplateResult;

export function contextTemplate(name: string, config: RchitectConfig): ContextTemplateResult;

export function storeTemplate(
  name: string,
  config: RchitectConfig
): StoreTemplateResult;

export function typeTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function apiTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function featureTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };
