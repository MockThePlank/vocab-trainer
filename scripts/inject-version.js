#!/usr/bin/env node

/**
 * Injects the version from package.json into HTML file
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

const target = join(projectRoot, 'dist', 'frontend', 'index.html');

console.log(`📦 Injecting version ${version} into ${target}...`);

try {
  let content = readFileSync(target, 'utf-8');
  content = content.replace(/\{\{VERSION\}\}/g, version);
  writeFileSync(target, content, 'utf-8');
  console.log(`✅ Updated: ${target}`);
} catch (error) {
  console.error(`❌ Failed to update ${target}:`, error.message);
}

console.log('✨ Version injection complete!');