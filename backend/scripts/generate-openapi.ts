/**
 * OpenAPI Spec Generator Script
 * Generates and exports the OpenAPI specification to a JSON file
 *
 * Usage: npm run generate:openapi
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openApiSpec } from '../src/docs/openapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output directory and file
const outputDir = path.join(__dirname, '..', 'docs');
const outputFile = path.join(outputDir, 'openapi.json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✓ Created directory: ${outputDir}`);
}

// Write OpenAPI spec to JSON file
try {
  fs.writeFileSync(outputFile, JSON.stringify(openApiSpec, null, 2), 'utf-8');

  console.log('✓ OpenAPI specification generated successfully!');
  console.log(`✓ Output: ${outputFile}`);
  console.log(`✓ File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('You can now:');
  console.log('  1. Import this file into Postman or Insomnia');
  console.log('  2. Use it with API testing tools');
  console.log('  3. Generate API client code');
  console.log('  4. Share it with frontend developers');
  console.log('');
  console.log('API Documentation URL: http://localhost:3001/api-docs');

  process.exit(0);
} catch (error) {
  console.error('✗ Error generating OpenAPI specification:', error);
  process.exit(1);
}
