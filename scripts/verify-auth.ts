/**
 * verify-auth.ts
 * Loads auth.json into a headless browser and checks rt_bootstrap.current_user.
 * Run: npx tsx scripts/verify-auth.ts
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.resolve(process.cwd(), 'config/state/auth.json');

(async () => {
  if (!fs.existsSync(AUTH_FILE)) {
    console.error('❌ auth.json not found'); process.exit(1);
  }

  const saved = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  const sessionCookie = saved.cookies.find((c: any) => c.name === '_session_id');
  const authToken    = saved.cookies.find((c: any) => c.name === 'auth_token');
  console.log(`\nCookies in auth.json: ${saved.cookies.length}`);
  console.log(`  _session_id : ${sessionCookie ? '✅' : '❌'}`);
  console.log(`  auth_token  : ${authToken    ? '✅' : '❌'}`);

  console.log('\nLaunching headless browser to verify session...');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page    = await context.newPage();

  await page.goto('https://maps.roadtrippers.com', {
    waitUntil: 'domcontentloaded', timeout: 30_000,
  });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const rb = (window as any).rt_bootstrap;
    return {
      current_user : rb?.current_user ?? null,
      anonymous_user: rb?.anonymous_user ?? null,
    };
  });

  console.log(`\n  rt_bootstrap.current_user : ${result.current_user
    ? `✅ logged in (id=${(result.current_user as any).id})`
    : '❌ null — session not recognised by server'}`);

  if (!result.current_user) {
    console.log('\n  The server is not recognising the _session_id.');
    console.log('  Most likely cause: reCAPTCHA flagged the login attempt as a bot,');
    console.log('  so the session was created but marked as unverified/guest.');
    console.log('\n  Solution: run capture-auth.ts again, but this time:');
    console.log('  - Wait for the page to fully load PAST login (you should see the map)');
    console.log('  - Confirm the URL is maps.roadtrippers.com (not /login) before pressing Enter');
  }

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });