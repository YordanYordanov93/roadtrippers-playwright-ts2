/// <reference types="node" />
/**
 * hooks.ts — Cucumber Before/After hooks
 *
 * No @auth hook. Auth is handled inside steps exactly like Playwright spec tests:
 * check createTripButton.isVisible(), proceed if available, skip gracefully if not.
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

// ─── BeforeAll ────────────────────────────────────────────────────────────────

BeforeAll(async function () {
  const dirs = ['reports/cucumber', 'reports/allure-results', 'reports/screenshots', 'config/state'];
  for (const dir of dirs) {
    fs.mkdirSync(path.resolve('.', dir), { recursive: true });
  }
  console.log('\n🚀  Roadtrippers BDD Suite starting…\n');
});

// ─── AfterAll ─────────────────────────────────────────────────────────────────

AfterAll(async function () {
  console.log('\n✅  Roadtrippers BDD Suite complete.\n');
});

// ─── Before (all scenarios) ───────────────────────────────────────────────────

Before({ timeout: 60000 }, async function (this: RoadtrippersWorld, scenario: ITestCaseHookParameter) {
  const name = scenario.pickle.name;
  const tags = scenario.pickle.tags.map(t => t.name).join(', ');
  console.log(`\n▶  Scenario: "${name}"  [${tags || 'no tags'}]`);

  await this.openBrowser();
  await this.goto('/');
  await this.pages.mapPage.dismissCookieBanner().catch(() => {});
  await this.pages.mapPage.dismissModal().catch(() => {});
});

// ─── Before @noauth — open browser WITHOUT auth state ─────────────────────────

Before({ tags: '@noauth', timeout: 30000 }, async function (this: RoadtrippersWorld, scenario: ITestCaseHookParameter) {
  const authPath   = path.resolve('.', 'config/state/auth.json');
  const backupPath = authPath + '.bak';

  if (fs.existsSync(authPath)) {
    fs.renameSync(authPath, backupPath);
    (this as any)._authBackup = backupPath;
  }

  await this.openBrowser();
  await this.goto('/');
  await this.pages.mapPage.dismissCookieBanner();
});

// ─── After @noauth — restore auth state ──────────────────────────────────────

After({ tags: '@noauth', timeout: 30000 }, async function (this: RoadtrippersWorld & { _authBackup?: string }) {
  if (this._authBackup) {
    const authPath = path.resolve('.', 'config/state/auth.json');
    fs.renameSync(this._authBackup, authPath);
  }
});

// ─── After (all scenarios) ────────────────────────────────────────────────────

After({ timeout: 30000 }, async function (this: RoadtrippersWorld, scenario: ITestCaseHookParameter) {
  const name   = scenario.pickle.name;
  const status = scenario.result?.status;

  if (status === Status.FAILED) {
    console.warn(`\n✖  FAILED: "${name}"`);
    await this.attachScreenshot(`FAIL-${name.replace(/\s+/g, '-')}`).catch(() => {});
    await this.page?.screenshot({
      path: `reports/screenshots/fail-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.png`,
      fullPage: false,
    }).catch(() => {});
  } else if (status === Status.PASSED) {
    console.log(`\n✔  PASSED: "${name}"`);
  } else if (status === Status.SKIPPED) {
    console.log(`\n-  SKIPPED: "${name}"`);
  }

  await this.closeBrowser();
});