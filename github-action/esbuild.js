const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'src', 'index.js')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.join(__dirname, 'dist', 'index.js'),
  external: [],
  minify: false,
}).then(() => {
  console.log('Build complete: dist/index.js');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
