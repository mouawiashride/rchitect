// Vue 3 + Vite project structures
// hookPath → src/composables (Vue convention for composable functions)
// pagePath → src/views (Vue Router convention)

const structures = {
  'atomic-design': {
    folders: [
      'src/components/atoms',
      'src/components/molecules',
      'src/components/organisms',
      'src/components/templates',
      'src/components/pages',
      'src/composables',
      'src/stores',
      'src/services',
      'src/utils',
      'src/types',
      'src/styles',
      'src/assets',
    ],
    componentPath: (name, level) => {
      const levels = {
        atom: 'src/components/atoms',
        molecule: 'src/components/molecules',
        organism: 'src/components/organisms',
        template: 'src/components/templates',
        page: 'src/components/pages',
      };
      return levels[level] || 'src/components/atoms';
    },
    hookPath: () => 'src/composables',
    pagePath: () => 'src/components/pages',
    servicePath: () => 'src/services',
    contextPath: () => 'src/composables',
    storePath: () => 'src/stores',
    typePath: () => 'src/types',
    featurePath: () => 'src/features',
  },

  'feature-based': {
    folders: [
      'src/features',
      'src/components/shared',
      'src/composables',
      'src/stores',
      'src/services',
      'src/views',
      'src/utils',
      'src/types',
      'src/styles',
      'src/assets',
    ],
    componentPath: () => 'src/components/shared',
    hookPath: () => 'src/composables',
    pagePath: () => 'src/views',
    servicePath: () => 'src/services',
    contextPath: () => 'src/composables',
    storePath: () => 'src/stores',
    typePath: () => 'src/types',
    featurePath: () => 'src/features',
  },

  'domain-driven': {
    folders: [
      'src/domains',
      'src/shared/components',
      'src/shared/composables',
      'src/shared/stores',
      'src/shared/services',
      'src/shared/utils',
      'src/shared/types',
      'src/styles',
      'src/assets',
    ],
    componentPath: () => 'src/shared/components',
    hookPath: () => 'src/shared/composables',
    pagePath: () => 'src/domains',
    servicePath: () => 'src/shared/services',
    contextPath: () => 'src/shared/composables',
    storePath: () => 'src/shared/stores',
    typePath: () => 'src/shared/types',
    featurePath: () => 'src/domains',
  },

  'mvc-like': {
    folders: [
      'src/models',
      'src/views/components',
      'src/views/pages',
      'src/controllers',
      'src/services',
      'src/composables',
      'src/stores',
      'src/utils',
      'src/types',
      'src/styles',
      'src/assets',
    ],
    componentPath: () => 'src/views/components',
    hookPath: () => 'src/composables',
    pagePath: () => 'src/views/pages',
    servicePath: () => 'src/services',
    contextPath: () => 'src/composables',
    storePath: () => 'src/stores',
    typePath: () => 'src/types',
    featurePath: () => 'src/features',
  },
};

module.exports = structures;
