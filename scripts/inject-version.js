#!/usr/bin/env node

/**
 * Injects the version from package.json into HTML files
 * Replaces {{VERSION}} placeholder with actual version number
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
const version = packageJson.version;

console.log(`📦 Injecting version ${version} into HTML files...`);

// Prefer Vite output (dist/vocab.html), fall back to legacy dist/public/vocab.html
const candidateFiles = [
  join(projectRoot, 'dist', 'vocab.html'),
  join(projectRoot, 'dist', 'public', 'vocab.html'),
];

const files = candidateFiles.filter(fp => {
  try { readFileSync(fp); return true; } catch { return false; }
});

if (files.length === 0) {
  console.error('❌ No HTML files found to inject version into (checked dist/vocab.html and dist/public/vocab.html)');
}

files.forEach(filePath => {
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Replace {{VERSION}} placeholder with actual version
    content = content.replace(/\{\{VERSION\}\}/g, version);
    
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
  }
});

console.log('✨ Version injection complete!');
