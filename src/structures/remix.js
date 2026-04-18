// Remix project structures — no src/ prefix, routes in app/routes/
// Uses React under the hood — same JSX/TSX, hooks, contexts

const structures = {
  'atomic-design': {
    folders: [
      'app/components/atoms',
      'app/components/molecules',
      'app/components/organisms',
      'app/components/templates',
      'app/hooks',
      'app/contexts',
      'app/stores',
      'app/services',
      'app/utils',
      'app/types',
      'app/styles',
      'app/routes',
    ],
    componentPath: (name, level) => {
      const levels = {
        atom: 'app/components/atoms',
        molecule: 'app/components/molecules',
        organism: 'app/components/organisms',
        template: 'app/components/templates',
        page: 'app/components/pages',
      };
      return levels[level] || 'app/components/atoms';
    },
    hookPath: () => 'app/hooks',
    pagePath: () => 'app/routes',
    servicePath: () => 'app/services',
    contextPath: () => 'app/contexts',
    storePath: () => 'app/stores',
    typePath: () => 'app/types',
    featurePath: () => 'app/features',
  },

  'feature-based': {
    folders: [
      'app/features',
      'app/components',
      'app/hooks',
      'app/contexts',
      'app/stores',
      'app/services',
      'app/utils',
      'app/types',
      'app/styles',
      'app/routes',
    ],
    componentPath: () => 'app/components',
    hookPath: () => 'app/hooks',
    pagePath: () => 'app/routes',
    servicePath: () => 'app/services',
    contextPath: () => 'app/contexts',
    storePath: () => 'app/stores',
    typePath: () => 'app/types',
    featurePath: () => 'app/features',
  },

  'domain-driven': {
    folders: [
      'app/domains',
      'app/shared/components',
      'app/shared/hooks',
      'app/shared/contexts',
      'app/shared/stores',
      'app/shared/services',
      'app/shared/utils',
      'app/shared/types',
      'app/styles',
      'app/routes',
    ],
    componentPath: () => 'app/shared/components',
    hookPath: () => 'app/shared/hooks',
    pagePath: () => 'app/routes',
    servicePath: () => 'app/shared/services',
    contextPath: () => 'app/shared/contexts',
    storePath: () => 'app/shared/stores',
    typePath: () => 'app/shared/types',
    featurePath: () => 'app/domains',
  },

  'mvc-like': {
    folders: [
      'app/models',
      'app/views/components',
      'app/controllers',
      'app/services',
      'app/hooks',
      'app/contexts',
      'app/stores',
      'app/utils',
      'app/types',
      'app/styles',
      'app/routes',
    ],
    componentPath: () => 'app/views/components',
    hookPath: () => 'app/hooks',
    pagePath: () => 'app/routes',
    servicePath: () => 'app/services',
    contextPath: () => 'app/contexts',
    storePath: () => 'app/stores',
    typePath: () => 'app/types',
    featurePath: () => 'app/features',
  },
};

module.exports = structures;
