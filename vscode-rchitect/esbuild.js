const esbuild = require('esbuild');
const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],   // vscode is provided by the VS Code runtime — do not bundle
  platform: 'node',
  target: 'node16',
  format: 'cjs',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
};

if (isWatch) {
  esbuild.context(config).then(ctx => ctx.watch());
} else {
  esbuild.build(config).catch(() => process.exit(1));
}
