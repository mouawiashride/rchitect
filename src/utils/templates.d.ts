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

export function layoutTemplate(
  segment: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function loadingTemplate(
  segment: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function errorTemplate(
  segment: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function notFoundTemplate(
  segment: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function middlewareTemplate(
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function serverActionTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function storyTemplate(
  name: string,
  config: RchitectConfig
): Record<string, string>;

export function nuxtApiTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function nuxtLayoutTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function nuxtMiddlewareTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function angularComponentTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function angularServiceTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function angularStoreTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function angularFeatureTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function astroComponentTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function astroPageTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function astroUtilTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function astroFeatureTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function formTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function modalTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function providerTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function routeTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function guardTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function schemaTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function queryTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function mutationTemplate(
  name: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };

export function i18nTemplate(
  key: string,
  config: RchitectConfig
): { files: Record<string, string>; resolvedName: string };
