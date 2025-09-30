#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

// Import path mappings for NX monorepo
const importMappings = {
  // Client imports - keep as relative or use NX workspace paths
  '@/': './',
  '@/components/': './components/',
  '@/lib/': './lib/',
  '@/hooks/': './hooks/',
  '@/pages/': './pages/',
  '@/services/': './services/',
  '@/styles/': './styles/',

  // Shared imports - update to use workspace package
  '@shared/': '@shinobi/shared/',
};

// Files to process
const patterns = [
  'client/src/**/*.{ts,tsx}',
  'server/**/*.{ts,js}',
  'shared/**/*.{ts,js}'
];

async function updateImports() {
  console.log('🔄 Updating import paths for NX monorepo...');

  for (const pattern of patterns) {
    const files = await glob(pattern);

    for (const file of files) {
      try {
        let content = readFileSync(file, 'utf8');
        let updated = false;

        // Update import statements
        for (const [from, to] of Object.entries(importMappings)) {
          const regex = new RegExp(`from ['"]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
          if (regex.test(content)) {
            content = content.replace(regex, `from '${to}`);
            updated = true;
          }
        }

        if (updated) {
          writeFileSync(file, content);
          console.log(`✅ Updated: ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${file}:`, error.message);
      }
    }
  }

  console.log('🎉 Import path updates complete!');
}

updateImports().catch(console.error);
