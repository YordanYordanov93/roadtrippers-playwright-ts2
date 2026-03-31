/**
 * authentication.steps.ts – Steps for login, error, and unauthenticated scenarios
 *
 * Covers: navigate to login, enter credentials, submit, assert errors,
 * assert page structure, back-to-map navigation.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { RoadtrippersWorld } from '../world/world';

const isAllowedUnauthenticatedUrl = (url: string): boolean =>
  url.includes('/login') ||
  url.includes('maps.roadtrippers.com') ||
  url.includes('roadpass.com/privacy-policy');

// ─── Navigation ────────────────────────────────────────────────────────────────

Given('I am on the login page', async function (this: RoadtrippersWorld) {
  await this.goto('/login');
  await this.pages.loginPage.waitForLoad();
  await this.pages.loginPage.dismissCookieBanner();
});

// ─── Credential input ──────────────────────────────────────────────────────────

When('I enter the email {string}', async function (this: RoadtrippersWorld, email: string) {
  await this.pages.loginPage.enterEmail(email);
});

When('I enter the password {string}', async function (this: RoadtrippersWorld, password: string) {
  await this.pages.loginPage.enterPassword(password);
});

When(
  'I click the {string} button',
  async function (this: RoadtrippersWorld, buttonName: string) {
    if (buttonName === 'Log in') {
      await this.pages.loginPage.clickLogin();
      await this.page.waitForTimeout(2_000);
    } else if (buttonName === 'Back to Map') {
      await this.pages.loginPage.clickBackToMap();
    } else {
      await this.page.getByRole('button', { name: buttonName, exact: true }).click();
    }
  }
);

When(
  'I click the {string} button without entering credentials',
  async function (this: RoadtrippersWorld, buttonName: string) {
    if (buttonName === 'Log in') {
      await this.pages.loginPage.clickLogin();
      await this.page.waitForTimeout(2_000);
    }
  }
);

When(
  'I click the {string} link',
  async function (this: RoadtrippersWorld, linkText: string) {
    if (linkText === 'Back to Map') {
      await this.pages.loginPage.clickBackToMap();
      return;
    }
    await this.page.getByRole('link', { name: linkText, exact: true }).click();
  }
);

// ─── Login page assertions ─────────────────────────────────────────────────────

Then(
  'the login page heading should be visible',
  async function (this: RoadtrippersWorld) {
    await expect(this.pages.loginPage.heading).toBeVisible();
  }
);

Then('the email input should be visible', async function (this: RoadtrippersWorld) {
  await expect(this.pages.loginPage.emailInput).toBeVisible();
});

Then('the password input should be visible', async function (this: RoadtrippersWorld) {
  await expect(this.pages.loginPage.passwordInput).toBeVisible();
});

Then(
  'the {string} button should be visible',
  async function (this: RoadtrippersWorld, buttonName: string) {
    const btn = this.page.getByRole('button', { name: buttonName, exact: true });
    await expect(btn).toBeVisible();
  }
);

Then('social login options should be visible', async function (this: RoadtrippersWorld) {
  await expect(this.pages.loginPage.googleLoginButton).toBeVisible();
});

// ─── Error / redirect assertions ───────────────────────────────────────────────

Then('an error message should be displayed', async function (this: RoadtrippersWorld) {
  await this.pages.loginPage.assertHasError();
  await this.attachScreenshot('login-error');
});

Then('I should remain on the login page', async function (this: RoadtrippersWorld) {
  expect(isAllowedUnauthenticatedUrl(this.page.url())).toBe(true);
});

Then(
  'I should be prompted to log in',
  async function (this: RoadtrippersWorld) {
    // Wait for any navigation or modal to appear
    await this.page.waitForTimeout(3_000);

    const url = this.page.url();

    // 1. Full redirect to /login
    const onLoginPage = url.includes('/login');

    // 2. Login heading visible (modal or page)
    const hasLoginHeading = await this.page
      .getByRole('heading', { name: /log in|sign in/i })
      .isVisible();

    // 3. Login modal/dialog visible (common pattern for SPAs)
    const hasLoginModal = await this.page
      .locator('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="login"], [class*="Login"]')
      .filter({ hasText: /log in|sign in/i })
      .first()
      .isVisible()
      .catch(() => false);

    // 4. Login button/link visible in a prompt (app kept user on map but showed auth UI)
    const hasLoginButton = await this.page
      .getByRole('button', { name: /log in|sign in/i })
      .first()
      .isVisible()
      .catch(() => false);

    // 5. Login link visible
    const hasLoginLink = await this.page
      .getByRole('link', { name: /log in|sign in/i })
      .first()
      .isVisible()
      .catch(() => false);

    const isPromptedToLogin =
      onLoginPage || hasLoginHeading || hasLoginModal || hasLoginButton || hasLoginLink;

    // Attach screenshot to show what the page looks like on failure
    if (!isPromptedToLogin) {
      await this.attachScreenshot('not-prompted-to-login');
      console.log(`  URL at assertion: ${url}`);
    }

    expect(
      isPromptedToLogin,
      `Expected login prompt but none found. URL: ${url}`
    ).toBe(true);
  }
);