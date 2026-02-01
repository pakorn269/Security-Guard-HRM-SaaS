#!/usr/bin/env node

/**
 * Translation Audit Script
 * Compares keys in th.json vs en.json and reports missing translations
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Load JSON file
 */
function loadJSON(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`${colors.red}Error loading ${filePath}:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Get all keys from nested object
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Find missing keys between two sets
 */
function findMissingKeys(sourceKeys, targetKeys) {
  return sourceKeys.filter((key) => !targetKeys.includes(key));
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.cyan}=== Translation Audit ===${colors.reset}\n`);

  // Load translation files
  const thPath = join(__dirname, '../src/i18n/locales/th.json');
  const enPath = join(__dirname, '../src/i18n/locales/en.json');

  console.log(`Loading translation files...`);
  console.log(`  - Thai: ${thPath}`);
  console.log(`  - English: ${enPath}\n`);

  const th = loadJSON(thPath);
  const en = loadJSON(enPath);

  // Get all keys
  const thKeys = getAllKeys(th);
  const enKeys = getAllKeys(en);

  console.log(`${colors.blue}Total keys:${colors.reset}`);
  console.log(`  - Thai: ${thKeys.length}`);
  console.log(`  - English: ${enKeys.length}\n`);

  // Find missing keys
  const missingInEn = findMissingKeys(thKeys, enKeys);
  const missingInTh = findMissingKeys(enKeys, thKeys);

  let hasErrors = false;

  // Report missing keys in English
  if (missingInEn.length > 0) {
    hasErrors = true;
    console.log(`${colors.red}✗ Missing in en.json (${missingInEn.length} keys):${colors.reset}`);
    missingInEn.forEach((key) => {
      console.log(`  - ${key}`);
    });
    console.log('');
  }

  // Report missing keys in Thai
  if (missingInTh.length > 0) {
    hasErrors = true;
    console.log(`${colors.red}✗ Missing in th.json (${missingInTh.length} keys):${colors.reset}`);
    missingInTh.forEach((key) => {
      console.log(`  - ${key}`);
    });
    console.log('');
  }

  // Summary
  if (!hasErrors) {
    console.log(`${colors.green}✓ All translation keys are in sync!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}Summary:${colors.reset}`);
    if (missingInEn.length > 0) {
      console.log(`  - ${colors.red}${missingInEn.length} keys missing in English${colors.reset}`);
    }
    if (missingInTh.length > 0) {
      console.log(`  - ${colors.red}${missingInTh.length} keys missing in Thai${colors.reset}`);
    }
    console.log('');
    console.log(`${colors.yellow}Please add the missing keys to maintain translation parity.${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
main();
