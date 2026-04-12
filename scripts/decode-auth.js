/**
 * decode-auth.js
 * Decodes AUTH_JSON_BASE64 secret back to auth.json in the pipeline.
 *
 * Add this as a pipeline step BEFORE running tests:
 *   node scripts/decode-auth.js
 *
 * Requires: AUTH_JSON_BASE64 environment variable to be set.
 */
const fs   = require('fs');
const path = require('path');

const encoded = process.env.AUTH_JSON_BASE64;

if (!encoded) {
  console.warn('⚠️  AUTH_JSON_BASE64 not set — tests will run without auth session.');
  console.warn('   @auth BDD scenarios will be skipped.');
  // Write empty state so playwright doesn't crash
  const authFile = path.resolve(process.cwd(), 'config/state/auth.json');
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, '{"cookies":[],"origins":[]}');
  process.exit(0);
}

const authFile = path.resolve(process.cwd(), 'config/state/auth.json');
fs.mkdirSync(path.dirname(authFile), { recursive: true });
fs.writeFileSync(authFile, Buffer.from(encoded, 'base64'));

const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
const hasSession = state.cookies?.some(c => c.name === '_session_id' || c.name === 'auth_token');

console.log(`✅ Auth session decoded (${state.cookies?.length ?? 0} cookies, session: ${hasSession})`);