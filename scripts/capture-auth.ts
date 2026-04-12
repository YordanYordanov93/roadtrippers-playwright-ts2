/**
 * capture-auth.ts
 *
 * Fully automated session capture for CI/CD pipelines.
 *
 * PIPELINE USAGE:
 *   1. Run once locally to capture auth.json:
 *        TEST_EMAIL=you@example.com TEST_PASSWORD=yourpassword npx tsx scripts/capture-auth.ts
 *   2. Base64-encode and store as a CI secret:
 *        base64 -w 0 config/state/auth.json   (Linux/Mac)
 *        [Convert]::ToBase64String([IO.File]::ReadAllBytes("config\state\auth.json"))  (PowerShell)
 *   3. In your pipeline, decode it before running tests:
 *        echo "$AUTH_JSON_BASE64" | base64 -d > config/state/auth.json
 *        npm run bdd
 *
 * LOCAL USAGE (when CI secret has expired):
 *   npx tsx scripts/capture-auth.ts
 *   → Opens a browser. Log in manually. Press Enter. Done.
 *
 * The script tries automated login first. If reCAPTCHA blocks it,
 * it falls back to a headed browser for manual login.
 */

import { chromium } from 'playwright';
import * as fs   from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const AUTH_FILE = path.resolve(process.cwd(), 'config/state/auth.json');
const EMAIL    = process.env.TEST_EMAIL    ?? '';
const PASSWORD = process.env.TEST_PASSWORD ?? '';
const CI       = process.env.CI === 'true' || process.env.CI === '1';
const HEADLESS = process.env.HEADLESS !== 'false';

function ask(prompt: string): Promise<void> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

async function isAuthenticated(page: any): Promise<boolean> {
  return page.evaluate(() => {
    const rb = (window as any).rt_bootstrap;
    if (rb && rb.current_user) return true;
    try {
      const user = (window as any).redux?.getState()?.currentUser;
      if (user && typeof user === 'object') return true;
    } catch {}
    return false;
  }).catch(() => false);
}

async function dismissOverlays(page: any): Promise<void> {
  // Remove any blocking modals/overlays via JS (most reliable in automation)
  await page.evaluate(() => {
    // Promo modals, cookie banners, gist overlays
    document.querySelectorAll([
      '.modal-container.show',
      '.rt-modal-background',
      '#gist-overlay',
      '#gist-embed-message',
      'iframe[src*="gist.build"]',
    ].join(', ')).forEach((el: Element) => el.remove());
  }).catch(() => {});

  // Try close buttons
  const closeSelectors = [
    'button[aria-label*="close" i]',
    'button[aria-label*="dismiss" i]',
    'button.close',
    '.rt-modal-close',
  ];
  for (const sel of closeSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ force: true });
        await page.waitForTimeout(300);
      }
    } catch {}
  }

  // Dismiss cookie banner
  try {
    const acceptBtn = page.getByRole('button', { name: /accept all cookies/i });
    if (await acceptBtn.isVisible({ timeout: 1000 })) {
      await acceptBtn.click();
    }
  } catch {}
}

async function tryAutomatedLogin(page: any, email: string, password: string): Promise<boolean> {
  console.log('  Attempting automated login...');

  await page.goto('https://maps.roadtrippers.com/login', {
    waitUntil: 'domcontentloaded', timeout: 30_000,
  });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  // Fill credentials
  try {
    await page.locator('input[name="login"]').waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('input[name="login"]').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
  } catch {
    console.log('  Could not find login form inputs.');
    return false;
  }

  // Remove overlays again before clicking
  await dismissOverlays(page);
  await page.getByRole('button', { name: /^log in$/i }).click({ force: true });

  // Wait for either success (redirect off /login) or failure (error message)
  await Promise.race([
    page.waitForURL((url: string) => !url.includes('/login'), { timeout: 15_000 }),
    page.locator('[role="alert"], [class*="error"], [class*="Error"]')
      .first().waitFor({ state: 'visible', timeout: 15_000 }),
  ]).catch(() => {});

  await page.waitForTimeout(2000);

  // Check if reCAPTCHA blocked us
  const errorEl = page.locator('[role="alert"], [class*="error"], [class*="Error"]').first();
  const hasError = await errorEl.isVisible().catch(() => false);
  if (hasError) {
    const errorText = (await errorEl.textContent().catch(() => '')) ?? '';
    if (/security|captcha|verification|robot/i.test(errorText)) {
      console.log('  reCAPTCHA blocked automated login.');
      return false;
    }
  }

  const authed = await isAuthenticated(page);
  if (authed) {
    console.log('  ✅ Automated login succeeded.');
  }
  return authed;
}

async function manualLogin(page: any): Promise<void> {
  await page.goto('https://maps.roadtrippers.com/login', {
    waitUntil: 'domcontentloaded', timeout: 30_000,
  });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  console.log('\n  ┌──────────────────────────────────────────────────┐');
  console.log('  │  Browser is open. Please:                        │');
  console.log('  │  1. Close any popups                             │');
  console.log('  │  2. Enter your email and password                │');
  console.log('  │  3. Solve reCAPTCHA if it appears                │');
  console.log('  │  4. Wait until you can SEE THE MAP               │');
  console.log('  └──────────────────────────────────────────────────┘\n');

  await ask('  Press Enter here ONLY after the MAP is visible → ');

  if (page.url().includes('/login')) {
    console.log('\n  Still on login page.');
    await ask('  Press Enter again once the map is visible → ');
  }
}

(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Roadtrippers Auth Capture');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Reuse existing valid session
  if (fs.existsSync(AUTH_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      const hasSession = state.cookies?.some((c: any) =>
        c.name === '_session_id' || c.name === 'auth_token'
      );
      if (hasSession && state.cookies.length > 0) {
        console.log(`\n✅ Valid session already exists (${state.cookies.length} cookies).`);
        console.log('   Delete config/state/auth.json to force re-capture.\n');
        process.exit(0);
      }
    } catch {}
  }

  const canAutomate = EMAIL && PASSWORD;
  const headless = CI ? true : HEADLESS;

  if (CI && !canAutomate) {
    console.error('\n❌ CI mode requires TEST_EMAIL and TEST_PASSWORD env vars.');
    console.error('   Set them as pipeline secrets and try again.\n');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      ...(headless ? [] : ['--start-maximized']),
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const context = await browser.newContext({
    viewport: headless ? { width: 1280, height: 900 } : null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    (window as any).chrome = { runtime: {} };
  });

  const page = await context.newPage();
  let authenticated = false;

  if (canAutomate) {
    authenticated = await tryAutomatedLogin(page, EMAIL, PASSWORD);
  }

  if (!authenticated && !CI) {
    // Fall back to manual login in headed browser
    if (headless) {
      await browser.close();
      const headedBrowser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
        ignoreDefaultArgs: ['--enable-automation'],
      });
      const headedCtx = await headedBrowser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      });
      await headedCtx.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        (window as any).chrome = { runtime: {} };
      });
      const headedPage = await headedCtx.newPage();
      await manualLogin(headedPage);
      fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
      await headedCtx.storageState({ path: AUTH_FILE });
      await headedBrowser.close();
    } else {
      await manualLogin(page);
      fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
      await context.storageState({ path: AUTH_FILE });
      await browser.close();
    }
  } else if (!authenticated && CI) {
    await browser.close();
    console.error('\n❌ Automated login failed in CI mode.');
    console.error('   reCAPTCHA is blocking the login form.');
    console.error('\n   Solution: capture auth.json locally and store as a CI secret:');
    console.error('   1. Run locally:  npx tsx scripts/capture-auth.ts');
    console.error('   2. Encode:       node scripts/encode-auth.js');
    console.error('   3. Store the output as secret AUTH_JSON_BASE64 in your pipeline');
    console.error('   4. In pipeline:  node scripts/decode-auth.js\n');
    process.exit(1);
  } else {
    // Automated login succeeded
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    await context.storageState({ path: AUTH_FILE });
    await browser.close();
  }

  // Report results
  const saved = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  const hasSession = saved.cookies?.some((c: any) => c.name === '_session_id');
  const hasToken   = saved.cookies?.some((c: any) => c.name === 'auth_token');

  console.log(`\n✅ Saved ${saved.cookies.length} cookies to config/state/auth.json`);
  console.log(`   _session_id : ${hasSession ? '✅' : '❌'}`);
  console.log(`   auth_token  : ${hasToken   ? '✅' : '❌'}`);
  console.log('\n   Verify:  npx tsx scripts/verify-auth.ts');
  console.log('   Tests:   npm run bdd\n');
})().catch(e => {
  console.error('\n❌', e.message);
  process.exit(1);
});