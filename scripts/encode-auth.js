/**
 * encode-auth.js
 * Encodes auth.json as base64 for storage as a CI/CD secret.
 *
 * Run locally after capture-auth.ts:
 *   node scripts/encode-auth.js
 *
 * Copy the printed string and store it as AUTH_JSON_BASE64
 * in your GitHub Actions / GitLab CI / Azure DevOps secrets.
 */
const fs   = require('fs');
const path = require('path');

const AUTH_FILE = path.resolve(process.cwd(), 'config/state/auth.json');

if (!fs.existsSync(AUTH_FILE)) {
  console.error('❌ auth.json not found. Run capture-auth.ts first.');
  process.exit(1);
}

const content = fs.readFileSync(AUTH_FILE);
const encoded = content.toString('base64');

console.log('\n✅ Copy this value and store it as secret AUTH_JSON_BASE64:\n');
console.log(encoded);
console.log('\n');