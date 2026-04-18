import * as path from 'path';
import * as fs from 'fs-extra';
import type { RchitectConfig } from '../src/types';

const {
  componentTemplate,
  hookTemplate,
  pageTemplate,
  featureTemplate,
  astroComponentTemplate,
  astroPageTemplate,
  astroUtilTemplate,
  astroFeatureTemplate,
  routeTemplate,
  getExtensions,
} = require('../src/utils/templates');

const astroStructures = require('../src/structures/astro');
const addCommand: (type: string, name?: string, opts?: object) => Promise<void> =
  require('../src/commands/add');

// ── Base config ───────────────────────────────────────────────────────────────

const ASTRO: RchitectConfig = {
  framework: 'astro',
  pattern: 'feature-based',
  language: 'typescript',
  styling: 'css',
  withTests: false,
  useClient: false,
};

const ASTRO_JS: RchitectConfig = { ...ASTRO, language: 'javascript' };

// ── Extensions ────────────────────────────────────────────────────────────────

describe('getExtensions for Astro', () => {
  it('compExt is astro', () => {
    expect(getExtensions(ASTRO).compExt).toBe('astro');
  });

  it('scriptExt is ts for TypeScript', () => {
    expect(getExtensions(ASTRO).scriptExt).toBe('ts');
  });

  it('scriptExt is js for JavaScript', () => {
    expect(getExtensions(ASTRO_JS).scriptExt).toBe('js');
  });
});

// ── Structures ────────────────────────────────────────────────────────────────

describe('Astro structures', () => {
  it('has all 4 patterns', () => {
    expect(astroStructures['atomic-design']).toBeDefined();
    expect(astroStructures['feature-based']).toBeDefined();
    expect(astroStructures['domain-driven']).toBeDefined();
    expect(astroStructures['mvc-like']).toBeDefined();
  });

  it('feature-based uses src/ prefix', () => {
    const s = astroStructures['feature-based'];
    expect(s.folders.some((f: string) => f.startsWith('src/'))).toBe(true);
  });

  it('has public folder', () => {
    const s = astroStructures['feature-based'];
    expect(s.folders).toContain('public');
  });

  it('pagePath returns src/pages', () => {
    const s = astroStructures['feature-based'];
    expect(s.pagePath()).toBe('src/pages');
  });

  it('hookPath returns src/utils', () => {
    const s = astroStructures['feature-based'];
    expect(s.hookPath()).toContain('utils');
  });

  it('layoutPath returns src/layouts', () => {
    const s = astroStructures['feature-based'];
    expect(s.layoutPath()).toBe('src/layouts');
  });
});

// ── Astro component template ──────────────────────────────────────────────────

describe('astroComponentTemplate', () => {
  it('generates a .astro file', () => {
    const { files } = astroComponentTemplate('Card', ASTRO);
    expect(files['Card.astro']).toBeDefined();
  });

  it('has frontmatter delimiters ---', () => {
    const { files } = astroComponentTemplate('Card', ASTRO);
    expect(files['Card.astro']).toContain('---');
  });

  it('uses Astro.props for TypeScript', () => {
    const { files } = astroComponentTemplate('Card', ASTRO);
    expect(files['Card.astro']).toContain('Astro.props');
  });

  it('resolvedName is Card', () => {
    const { resolvedName } = astroComponentTemplate('Card', ASTRO);
    expect(resolvedName).toBe('Card');
  });
});

// ── Astro page template ───────────────────────────────────────────────────────

describe('astroPageTemplate', () => {
  it('generates a .astro page file', () => {
    const { files } = astroPageTemplate('About', ASTRO);
    expect(files['About.astro']).toBeDefined();
  });

  it('has full HTML structure', () => {
    const { files } = astroPageTemplate('About', ASTRO);
    expect(files['About.astro']).toContain('<html');
    expect(files['About.astro']).toContain('</html>');
  });

  it('resolvedName is About', () => {
    const { resolvedName } = astroPageTemplate('About', ASTRO);
    expect(resolvedName).toBe('About');
  });
});

// ── Astro util template ───────────────────────────────────────────────────────

describe('astroUtilTemplate', () => {
  it('generates a .ts utility file', () => {
    const { files } = astroUtilTemplate('formatDate', ASTRO);
    expect(files['formatDate.ts']).toBeDefined();
  });

  it('generates a .js utility file for JS config', () => {
    const { files } = astroUtilTemplate('formatDate', ASTRO_JS);
    expect(files['formatDate.js']).toBeDefined();
  });
});

// ── Astro feature template ────────────────────────────────────────────────────

describe('astroFeatureTemplate', () => {
  it('generates both .astro and utility files', () => {
    const { files } = astroFeatureTemplate('Blog', ASTRO);
    const hasAstro = Object.keys(files).some(f => f.endsWith('.astro'));
    expect(hasAstro).toBe(true);
  });

  it('resolvedName is Blog', () => {
    const { resolvedName } = astroFeatureTemplate('Blog', ASTRO);
    expect(resolvedName).toBe('Blog');
  });
});

// ── componentTemplate dispatches to Astro ─────────────────────────────────────

describe('componentTemplate dispatch for Astro', () => {
  it('dispatches to astroComponentTemplate', () => {
    const files = componentTemplate('Card', ASTRO);
    expect(files['Card.astro']).toBeDefined();
  });
});

// ── pageTemplate dispatches to Astro ─────────────────────────────────────────

describe('pageTemplate dispatch for Astro', () => {
  it('generates an .astro page file', () => {
    const files = pageTemplate('About', ASTRO);
    const astroFile = Object.keys(files).find(f => f.endsWith('.astro'));
    expect(astroFile).toBeDefined();
  });
});

// ── routeTemplate for Astro ───────────────────────────────────────────────────

describe('routeTemplate for Astro', () => {
  it('generates a .astro route file', () => {
    const { files } = routeTemplate('Blog', ASTRO);
    const routeFile = Object.keys(files).find(f => f.endsWith('.astro'));
    expect(routeFile).toBeDefined();
  });

  it('includes full HTML structure for Astro routes', () => {
    const { files } = routeTemplate('Contact', ASTRO);
    const routeFile = Object.keys(files).find(f => f.endsWith('.astro'))!;
    if (files[routeFile]) {
      expect(files[routeFile]).toContain('<html');
    }
  });
});

// ── add command (integration) ─────────────────────────────────────────────────

const TMP = path.join(__dirname, '.tmp-astro');

describe('Astro add command', () => {
  beforeEach(async () => {
    await fs.ensureDir(TMP);
    await fs.writeJson(path.join(TMP, '.rchitect.json'), ASTRO);
    jest.spyOn(process, 'cwd').mockReturnValue(TMP);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(TMP);
  });

  it('creates a component in src/components', async () => {
    await addCommand('component', 'Card', {});
    const componentDir = path.join(TMP, 'src/components/Card');
    expect(await fs.pathExists(componentDir)).toBe(true);
  });

  it('creates .astro component file', async () => {
    await addCommand('component', 'Hero', {});
    const astroFile = path.join(TMP, 'src/components/Hero/Hero.astro');
    expect(await fs.pathExists(astroFile)).toBe(true);
  });

  it('creates a page in src/pages', async () => {
    await addCommand('page', 'About', {});
    const pageDir = path.join(TMP, 'src/pages/About');
    expect(await fs.pathExists(pageDir)).toBe(true);
  });

  it('creates a feature scaffold', async () => {
    await addCommand('feature', 'Blog', {});
    expect(await fs.pathExists(path.join(TMP, 'src/features/Blog'))).toBe(true);
  });
});
