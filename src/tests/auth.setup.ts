/// <reference types="node" />
/**
 * auth.setup.ts
 *
 * Playwright setup project — runs once before authenticated test projects.
 *
 * This file does NOT attempt automated login. Roadtrippers uses reCAPTCHA
 * which blocks headless browsers. Instead:
 *
 *   1. Run once manually:  npx tsx scripts/capture-auth.ts
 *   2. That saves config/state/auth.json with a real session
 *   3. This setup file reuses it — no re-login until it expires
 *
 * When the session expires (usually weeks later), just run capture-auth again.
 */
import { test as setup } from '@playwright/test';
import * as fs   from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(process.cwd(), 'config/state/auth.json');

function hasValidSession(): boolean {
  if (!fs.existsSync(AUTH_FILE)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    return Array.isArray(state.cookies) && state.cookies.length > 0 &&
      state.cookies.some((c: any) => c.name === '_session_id' || c.name === 'auth_token');
  } catch {
    return false;
  }
}

setup('load saved auth session', async ({ page }) => {
  if (hasValidSession()) {
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const sessionOk = state.cookies.some((c: any) => c.name === '_session_id');
    console.log(`\n✅ Auth session loaded (${state.cookies.length} cookies, _session_id: ${sessionOk ? 'present' : 'missing'})`);
    console.log('   If tests fail with auth errors, re-run:  npx tsx scripts/capture-auth.ts\n');
    return;
  }

  // No valid session — write empty state so Playwright doesn't crash,
  // and print clear instructions.
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, '{"cookies":[],"origins":[]}');

  console.log('\n❌ No auth session found in config/state/auth.json');
  console.log('   Authenticated tests will be skipped.');
  console.log('\n   To fix, run once:');
  console.log('     npx tsx scripts/capture-auth.ts\n');
});