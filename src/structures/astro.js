// Astro project structures — uses src/ prefix
// Components are .astro files, supports React/Vue/Svelte islands
// src/pages/ for file-based routing, src/layouts/ for page layouts

const structures = {
  'atomic-design': {
    folders: [
      'src/components/atoms',
      'src/components/molecules',
      'src/components/organisms',
      'src/components/templates',
      'src/layouts',
      'src/pages',
      'src/utils',
      'src/types',
      'src/styles',
      'src/assets',
      'public',
    ],
    componentPath: (name, level) => {
      const levels = {
        atom: 'src/components/atoms',
        molecule: 'src/components/molecules',
        organism: 'src/components/organisms',
        template: 'src/components/templates',
        page: 'src/pages',
      };
      return levels[level] || 'src/components/atoms';
    },
    hookPath: () => 'src/utils',
    pagePath: () => 'src/pages',
    servicePath: () => 'src/utils',
    contextPath: () => 'src/utils',
    storePath: () => 'src/stores',
    typePath: () => 'src/types',
    featurePath: () => 'src/features',
    layoutPath: () => 'src/layouts',
  },

  'feature-based': {
    folders: [
      'src/features',
      'src/components',
      'src/layouts',
      'src/pages',
      'src/utils',
      'src/types',
      'src/styles',
      'src/assets',
      'public',
    ],
    componentPath: () => 'src/components',
    hookPath: () => 'src/utils',
    pagePath: () => 'src/pages',
    servicePath: () => 'src/utils',
    contextPath: () => 'src/utils',
    storePath: () => 'src/stores',
    typePath: () => 'src/types',
    featurePath: () => 'src/features',
    layoutPath: () => 'src/layouts',
  },

  'domain-driven': {
    folders: [
      'src/domains',
      'src/shared/components',
      'src/shared/utils',
      'src/layouts',
      'src/pages',
      'src/styles',
      'src/assets',
      'public',
    ],
    componentPath: () => 'src/shared/components',
    hookPath: () => 'src/shared/utils',
    pagePath: () => 'src/pages',
    servicePath: () => 'src/shared/utils',
    contextPath: () => 'src/shared/utils',
    storePath: () => 'src/shared/stores',
    typePath: () => 'src/shared/types',
    featurePath: () => 'src/domains',
    layoutPath: () => 'src/layouts',
  },

  'mvc-like': {
    folders: [
      'src/models',
      'src/components',
      'src/pages',
      'src/layouts',
      'src/utils',
      'src/styles',
      'src/assets',
      'public',
    ],
    componentPath: () => 'src/components',
    hookPath: () => 'src/utils',
    pagePath: () => 'src/pages',
    servicePath: () => 'src/utils',
    contextPath: () => 'src/utils',
    storePath: () => 'src/stores',
    typePath: () => 'src/models',
    featurePath: () => 'src/features',
    layoutPath: () => 'src/layouts',
  },
};

module.exports = structures;
