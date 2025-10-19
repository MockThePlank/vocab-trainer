#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outdir = path.join(__dirname, '..', 'dist', 'public');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

esbuild.build({
  entryPoints: [path.join(__dirname, '..', 'src', 'public', 'main.ts')],
  bundle: true,
  sourcemap: true,
  minify: false,
  format: 'esm',
  target: ['es2020'],
  outfile: path.join(outdir, 'main.js'),
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production') },
  loader: { '.ts': 'ts' },
}).then(() => {
  console.log('esbuild: frontend bundle written to', path.join(outdir, 'main.js'));
}).catch(err => {
  console.error('esbuild error', err);
  process.exit(1);
});
