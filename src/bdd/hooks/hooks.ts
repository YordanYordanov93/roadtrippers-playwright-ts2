/// <reference types="node" />
/**
 * hooks.ts – Cucumber Before / After hooks
 *
 * Execution order:
 *   BeforeAll  → create output directories once
 *   Before     → launch browser, navigate to baseURL, dismiss cookie banner
 *   After      → screenshot on failure, close browser
 *   AfterAll   → summary log
 *
 * Tagged hooks allow fine-grained control:
 *   @noauth   → skip loading saved auth state (error/unauthenticated scenarios)
 *   @auth     → assert page is authenticated before the scenario runs
 */

import {
  Before,
  After,
  BeforeAll,
  AfterAll,
  Status,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import * as fs   from 'fs';
import * as path from 'path';
import type { RoadtrippersWorld } from '../world/world';

// ─── BeforeAll – create output directories ─────────────────────────────────────

BeforeAll(async function () {
  const rootDir = path.resolve('.');
  const dirs = [
    'reports/cucumber',
    'reports/allure-results',
    'reports/screenshots',
    'config/state',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.resolve(rootDir, dir), { recursive: true });
  }
  console.log('\n🚀  Roadtrippers BDD Suite starting…\n');
});

// ─── AfterAll ──────────────────────────────────────────────────────────────────

AfterAll(async function () {
  console.log('\n✅  Roadtrippers BDD Suite complete.\n');
});

// ─── Before (default – all non-noauth scenarios) ───────────────────────────────

Before({ tags: 'not @noauth', timeout: 30000 }, async function (this: RoadtrippersWorld, scenario: ITestCaseHookParameter) {
  const name = scenario.pickle.name;
  const tags = scenario.pickle.tags.map((t) => t.name).join(', ');
  console.log(`\n▶  Scenario: "${name}"  [${tags || 'no tags'}]`);

  await this.openBrowser();
  await this.goto('/');

  // Dismiss cookie / GDPR banner if present
  await this.pages.mapPage.dismissCookieBanner();
});

// ─── Before @noauth – open browser WITHOUT pre-loaded auth state ───────────────
// Renames auth.json before opening browser so context starts fresh.

Before({ tags: '@noauth', timeout: 30000 }, async function (this: RoadtrippersWorld, scenario: ITestCaseHookParameter) {
  const name = scenario.pickle.name;
  const tags = scenario.pickle.tags.map((t) => t.name).join(', ');
  console.log(`\n▶  Scenario: "${name}"  [${tags || 'no tags'}]`);

  const rootDir    = path.resolve('.');
  const authPath   = path.resolve(rootDir, 'config/state/auth.json');
  const backupPath = authPath + '.bak';

  // Temporarily hide auth.json so openBrowser() starts a fresh context
  if (fs.existsSync(authPath)) {
    fs.renameSync(authPath, backupPath);
    (this as RoadtrippersWorld & { _authBackup: string })._authBackup = backupPath;
  }

  await this.openBrowser();
  await this.goto('/');

  // Dismiss cookie / GDPR banner if present
  await this.pages.mapPage.dismissCookieBanner();
});

// ─── After @noauth – restore auth.json ────────────────────────────────────────

After({ tags: '@noauth', timeout: 30000 }, async function (this: RoadtrippersWorld & { _authBackup?: string }) {
  if (this._authBackup) {
    const authPath = path.resolve(path.resolve('.'), 'config/state/auth.json');
    fs.renameSync(this._authBackup, authPath);
  }
});

// ─── Before @auth – assert authentication before scenario runs ─────────────────

Before({ tags: '@auth', timeout: 30000 }, async function (this: RoadtrippersWorld) {
  const isAuth = await this.pages.mapPage.isAuthenticated();
  if (!isAuth) {
    throw new Error(
      '[@auth] Scenario requires authentication but browser is not logged in.\n' +
      'Run: npx playwright test --project=setup  to create config/state/auth.json'
    );
  }
});

// ─── After (default – all scenarios) ──────────────────────────────────────────

After({ timeout: 30000 }, async function (this: RoadtrippersWorld, scenario: ITestCaseHookParameter) {
  const name   = scenario.pickle.name;
  const status = scenario.result?.status;

  if (status === Status.FAILED) {
    console.warn(`\n✖  FAILED: "${name}"`);
    await this.attachScreenshot(`FAIL-${name.replace(/\s+/g, '-')}`);

    // Also save to disk for easy access
    const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    await this.page?.screenshot({
      path: `reports/screenshots/fail-${safeName}-${Date.now()}.png`,
      fullPage: false,
    });
  } else if (status === Status.PASSED) {
    console.log(`\n✔  PASSED: "${name}"`);
  }

  await this.closeBrowser();
});