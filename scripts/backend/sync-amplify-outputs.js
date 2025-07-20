#!/usr/bin/env node
// Amplify outputs synchronization for monorepo - Cross-platform version

const fs = require('fs');
const path = require('path');

// Get repo root (2 levels up from this script)
const repoRoot = path.resolve(__dirname, '..', '..');
const backendConfig = path.join(repoRoot, 'packages', 'shared-backend', 'amplify_outputs.json');

// Check if backend config exists
if (!fs.existsSync(backendConfig)) {
  console.error('❌ Backend config not found:', backendConfig);
  console.error('   Run Amplify Sandbox first: npm run backend:dev');
  process.exit(1);
}

console.log('🔄 Syncing amplify_outputs.json...');

// Define target locations
const targets = [
  { path: path.join(repoRoot, 'packages', 'shared-amplify', 'amplify_outputs.json'), name: 'packages/shared-amplify' },
  { path: path.join(repoRoot, 'apps', 'admin', 'amplify_outputs.json'), name: 'apps/admin' },
  { path: path.join(repoRoot, 'apps', 'hedge-system', 'amplify_outputs.json'), name: 'apps/hedge-system' }
];

// Copy to each target
targets.forEach(target => {
  try {
    console.log(`📂 Updating ${target.name}/amplify_outputs.json...`);
    fs.copyFileSync(backendConfig, target.path);
    console.log('✅ Completed');
  } catch (error) {
    console.error(`❌ Failed to copy to ${target.name}:`, error.message);
    process.exit(1);
  }
});

console.log('🎉 Amplify outputs synced successfully!');