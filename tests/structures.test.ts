import type { Structure, Pattern } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const reactStructures: Record<Pattern, Structure> = require('../src/structures/react');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextjsStructures: Record<Pattern, Structure> = require('../src/structures/nextjs');

const patterns: Pattern[] = ['atomic-design', 'feature-based', 'domain-driven', 'mvc-like'];

describe('React structures', () => {
  it.each(patterns)('%s has a non-empty folders array', (pattern) => {
    expect(Array.isArray(reactStructures[pattern].folders)).toBe(true);
    expect(reactStructures[pattern].folders.length).toBeGreaterThan(0);
  });

  it.each(patterns)('%s has a componentPath function', (pattern) => {
    expect(typeof reactStructures[pattern].componentPath).toBe('function');
  });

  it.each(patterns)('%s has a hookPath function', (pattern) => {
    expect(typeof reactStructures[pattern].hookPath).toBe('function');
  });

  it.each(patterns)('%s has a pagePath function', (pattern) => {
    expect(typeof reactStructures[pattern].pagePath).toBe('function');
  });

  it.each(patterns)('%s has a servicePath function', (pattern) => {
    expect(typeof reactStructures[pattern].servicePath).toBe('function');
  });

  it.each(patterns)('%s folders all start with "src/"', (pattern) => {
    reactStructures[pattern].folders.forEach((folder) => {
      expect(folder.startsWith('src/')).toBe(true);
    });
  });

  describe('atomic-design componentPath', () => {
    const cp = reactStructures['atomic-design'].componentPath;

    it('resolves atom path', () => {
      expect(cp('Test', 'atom')).toBe('src/components/atoms');
    });

    it('resolves molecule path', () => {
      expect(cp('Test', 'molecule')).toBe('src/components/molecules');
    });

    it('resolves organism path', () => {
      expect(cp('Test', 'organism')).toBe('src/components/organisms');
    });

    it('resolves template path', () => {
      expect(cp('Test', 'template')).toBe('src/components/templates');
    });

    it('resolves page path', () => {
      expect(cp('Test', 'page')).toBe('src/components/pages');
    });

    it('defaults to atoms for an unknown level', () => {
      expect(cp('Test', 'unknown')).toBe('src/components/atoms');
    });
  });

  describe('path helpers', () => {
    it('feature-based: componentPath points to shared components', () => {
      expect(reactStructures['feature-based'].componentPath()).toBe('src/components/shared');
    });

    it('feature-based: hookPath points to hooks', () => {
      expect(reactStructures['feature-based'].hookPath()).toBe('src/hooks');
    });

    it('feature-based: servicePath points to services', () => {
      expect(reactStructures['feature-based'].servicePath()).toBe('src/services');
    });

    it('domain-driven: componentPath points to shared components', () => {
      expect(reactStructures['domain-driven'].componentPath()).toBe('src/shared/components');
    });

    it('mvc-like: componentPath points to views/components', () => {
      expect(reactStructures['mvc-like'].componentPath()).toBe('src/views/components');
    });

    it('mvc-like: pagePath points to views/pages', () => {
      expect(reactStructures['mvc-like'].pagePath()).toBe('src/views/pages');
    });
  });
});

describe('Next.js structures', () => {
  it.each(patterns)('%s has a non-empty folders array', (pattern) => {
    expect(Array.isArray(nextjsStructures[pattern].folders)).toBe(true);
    expect(nextjsStructures[pattern].folders.length).toBeGreaterThan(0);
  });

  it.each(patterns)('%s has a componentPath function', (pattern) => {
    expect(typeof nextjsStructures[pattern].componentPath).toBe('function');
  });

  it.each(patterns)('%s has a hookPath function', (pattern) => {
    expect(typeof nextjsStructures[pattern].hookPath).toBe('function');
  });

  it.each(patterns)('%s has a pagePath function', (pattern) => {
    expect(typeof nextjsStructures[pattern].pagePath).toBe('function');
  });

  it.each(patterns)('%s has a servicePath function', (pattern) => {
    expect(typeof nextjsStructures[pattern].servicePath).toBe('function');
  });

  it.each(patterns)('%s folders do NOT start with "src/"', (pattern) => {
    nextjsStructures[pattern].folders.forEach((folder) => {
      expect(folder.startsWith('src/')).toBe(false);
    });
  });

  describe('atomic-design componentPath', () => {
    const cp = nextjsStructures['atomic-design'].componentPath;

    it('resolves atom path', () => {
      expect(cp('Test', 'atom')).toBe('components/atoms');
    });

    it('resolves molecule path', () => {
      expect(cp('Test', 'molecule')).toBe('components/molecules');
    });

    it('resolves organism path', () => {
      expect(cp('Test', 'organism')).toBe('components/organisms');
    });

    it('resolves template path', () => {
      expect(cp('Test', 'template')).toBe('components/templates');
    });

    it('defaults to atoms for an unknown level', () => {
      expect(cp('Test', 'unknown')).toBe('components/atoms');
    });
  });

  describe('path helpers', () => {
    it('feature-based: componentPath points to shared components', () => {
      expect(nextjsStructures['feature-based'].componentPath()).toBe('components/shared');
    });

    it('feature-based: pagePath points to features', () => {
      expect(nextjsStructures['feature-based'].pagePath()).toBe('features');
    });

    it('atomic-design: pagePath points to app router', () => {
      expect(nextjsStructures['atomic-design'].pagePath()).toBe('app');
    });

    it('domain-driven: componentPath points to shared/components', () => {
      expect(nextjsStructures['domain-driven'].componentPath()).toBe('shared/components');
    });

    it('mvc-like: componentPath points to views/components', () => {
      expect(nextjsStructures['mvc-like'].componentPath()).toBe('views/components');
    });
  });
});
