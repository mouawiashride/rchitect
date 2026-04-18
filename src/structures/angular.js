// Angular project structures — uses src/app/ prefix
// Modern Angular (v17+) with standalone components
// Services act as hooks/contexts; components are triple-file (.ts + .html + .css)

const structures = {
  'atomic-design': {
    folders: [
      'src/app/components/atoms',
      'src/app/components/molecules',
      'src/app/components/organisms',
      'src/app/components/templates',
      'src/app/core/services',
      'src/app/core/guards',
      'src/app/store',
      'src/app/models',
      'src/app/utils',
      'src/environments',
    ],
    componentPath: (name, level) => {
      const levels = {
        atom: 'src/app/components/atoms',
        molecule: 'src/app/components/molecules',
        organism: 'src/app/components/organisms',
        template: 'src/app/components/templates',
        page: 'src/app/pages',
      };
      return levels[level] || 'src/app/components/atoms';
    },
    hookPath: () => 'src/app/core/services',
    pagePath: () => 'src/app/pages',
    servicePath: () => 'src/app/services',
    contextPath: () => 'src/app/core/services',
    storePath: () => 'src/app/store',
    typePath: () => 'src/app/models',
    featurePath: () => 'src/app/features',
  },

  'feature-based': {
    folders: [
      'src/app/features',
      'src/app/shared/components',
      'src/app/core/services',
      'src/app/core/guards',
      'src/app/store',
      'src/app/models',
      'src/app/utils',
      'src/environments',
    ],
    componentPath: () => 'src/app/shared/components',
    hookPath: () => 'src/app/core/services',
    pagePath: () => 'src/app/pages',
    servicePath: () => 'src/app/services',
    contextPath: () => 'src/app/core/services',
    storePath: () => 'src/app/store',
    typePath: () => 'src/app/models',
    featurePath: () => 'src/app/features',
  },

  'domain-driven': {
    folders: [
      'src/app/domains',
      'src/app/shared/components',
      'src/app/shared/services',
      'src/app/shared/models',
      'src/app/core/guards',
      'src/app/store',
      'src/app/utils',
      'src/environments',
    ],
    componentPath: () => 'src/app/shared/components',
    hookPath: () => 'src/app/shared/services',
    pagePath: () => 'src/app/pages',
    servicePath: () => 'src/app/shared/services',
    contextPath: () => 'src/app/shared/services',
    storePath: () => 'src/app/store',
    typePath: () => 'src/app/shared/models',
    featurePath: () => 'src/app/domains',
  },

  'mvc-like': {
    folders: [
      'src/app/models',
      'src/app/views/components',
      'src/app/views/pages',
      'src/app/controllers',
      'src/app/services',
      'src/app/store',
      'src/app/utils',
      'src/environments',
    ],
    componentPath: () => 'src/app/views/components',
    hookPath: () => 'src/app/services',
    pagePath: () => 'src/app/views/pages',
    servicePath: () => 'src/app/services',
    contextPath: () => 'src/app/services',
    storePath: () => 'src/app/store',
    typePath: () => 'src/app/models',
    featurePath: () => 'src/app/features',
  },
};

module.exports = structures;
