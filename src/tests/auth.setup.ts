/// <reference types="node" />
import { test as setup, expect } from '@playwright/test';
import * as fs   from 'fs';
import * as path from 'path';
import { validCredentials } from '../fixtures/test-data';

const AUTH_FILE = path.join(process.cwd(), 'config/state/auth.json');

setup('authenticate and save state', async ({ page }) => {
  const credentials = validCredentials();

  if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
    console.warn('\n⚠️  TEST_EMAIL / TEST_PASSWORD not set — saving empty auth state.\n');
    fs.writeFileSync(AUTH_FILE, '{"cookies":[],"origins":[]}');
    return;
  }

  if (fs.existsSync(AUTH_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      if (state.cookies && state.cookies.length > 0) {
        console.log('\n✅ Auth state already exists and contains cookies, skipping authentication');
        return;
      }
    } catch (e) {
      console.log('   ⚠️  Could not parse existing auth state, proceeding with authentication');
    }
  }

  console.log(`\n🔐 Authenticating as: ${credentials.email}`);

  try {
    await page.goto('https://maps.roadtrippers.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Wait for the page to reach a stable interactive state
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[type="text"], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 20_000 });

    await page.evaluate(() => {
      document.getElementById('onetrust-consent-sdk')?.remove();
      document.getElementById('gist-overlay')?.remove();
    }).catch(() => {});

    // Wait for reCAPTCHA iframe to be present (or skip if absent)
    console.log('   ⏳ Waiting for reCAPTCHA initialization...');
    await page
      .locator('iframe[src*="recaptcha"], iframe[src*="recaptcha-test"]')
      .first()
      .waitFor({ state: 'attached', timeout: 5_000 })
      .catch(() => console.log('   ℹ️  reCAPTCHA not detected (may not be required)'));

    // Ensure the password input is ready before typing
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });

    console.log('   📝 Entering credentials...');

    // Fill email — wait for value to be set before moving on
    await emailInput.fill(credentials.email);
    await expect(emailInput).toHaveValue(credentials.email, { timeout: 5_000 });

    // Fill password — wait for value to be set before moving on
    await passwordInput.fill(credentials.password);
    await expect(passwordInput).not.toHaveValue('', { timeout: 5_000 });

    await page.evaluate(() => { document.getElementById('gist-overlay')?.remove(); }).catch(() => {});

    console.log('   🚀 Submitting login form...');
    await passwordInput.press('Enter');

    // Wait for the page to react: either redirect away from /login or show an error
    await Promise.race([
      page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15_000 }),
      page.locator('[role="alert"], .error-message, [class*="error"], [class*="Error"]')
        .first().waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => {});

    const urlAfterEnter = page.url();
    console.log(`   URL after Enter key: ${urlAfterEnter}`);

    if (urlAfterEnter.includes('/login')) {
      console.log('   Still on login page, trying force click...');
      await page.getByRole('button', { name: /log in/i }).first().click({ force: true });
      // Wait again for redirect or error
      await Promise.race([
        page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15_000 }),
        page.locator('[role="alert"], .error-message, [class*="error"], [class*="Error"]')
          .first().waitFor({ state: 'visible', timeout: 15_000 }),
      ]).catch(() => {});
      console.log(`   URL after force click: ${page.url()}`);
    }

    const errorEl  = page.locator('[role="alert"],.error-message,[class*="error"],[class*="Error"]').first();
    const hasError = await errorEl.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasError) {
      let errorText = await errorEl.textContent().catch(() => 'unknown') ?? 'unknown';
      console.error(`   ❌ Login error: ${errorText.substring(0, 100)}`);
      if (errorText.toLowerCase().includes('security')) {
        console.warn('   ⚠️  reCAPTCHA rate limiting detected. Tests will run with guest access.');
        fs.writeFileSync(AUTH_FILE, '{"cookies":[],"origins":[]}');
        return;
      }
      throw new Error(`Login failed: ${errorText.substring(0, 100)}`);
    }

    if (page.url().includes('/login')) {
      console.log('   ⏳ Waiting for redirect...');
      await page.waitForURL(/maps\.roadtrippers\.com(?!.*\/login)/, { timeout: 60_000 });
    }

    console.log(`   ✅ Redirected to: ${page.url()}`);
    console.log('   ✅ Authentication successful');
    await page.context().storageState({ path: AUTH_FILE });
    console.log('   ✅ Auth state saved');

  } catch (error) {
    console.error(`   ❌ Setup error: ${error}`);
    console.warn('   ⚠️  Saving guest auth state to allow tests to proceed');
    fs.writeFileSync(AUTH_FILE, '{"cookies":[],"origins":[]}');
  }
});