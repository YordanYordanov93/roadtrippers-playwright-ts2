import { type Page, type Locator, expect } from '@playwright/test';


/**
 * BasePage
 *
 * Abstract base class for all Page Objects.
 * Provides:
 *   • Playwright locator helpers with built-in waits
 *   • Cookie / GDPR banner dismissal
 *   • Screenshot capture
 *   • AskUI-compatible element resolution bridge
 *
 * Design principles:
 *   • Every public action returns `this` or the next page — enables fluent chaining
 *   • Waits are explicit and intentional — no arbitrary sleeps
 *   • Assertions are self-contained — pages validate their own loaded state
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Abstract contract ─────────────────────────────────────────────────────

  /** Each page must declare how it confirms it is fully loaded. */
  abstract waitForLoad(): Promise<this>;

  // ─── Navigation ───────────────────────────────────────────────────────────

  protected async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  get url(): string {
    return this.page.url();
  }

  // ─── Cookie banner ────────────────────────────────────────────────────────

  /**
   * Dismisses the OneTrust / custom GDPR consent banner if it appears.
   * Verified locator from live site: alertdialog → "Accept All Cookies" button.
   */
  async dismissCookieBanner(): Promise<void> {
    const banner = this.page.getByRole('alertdialog', { name: 'Privacy' });
    const acceptBtn = banner.getByRole('button', { name: /accept all cookies/i });

    try {
      await acceptBtn.waitFor({ state: 'visible', timeout: 6_000 });
      await acceptBtn.click();
      await acceptBtn.waitFor({ state: 'hidden', timeout: 5_000 });
    } catch {
      // Banner not present — that's fine, continue
    }
  }

  // ─── Locator helpers ──────────────────────────────────────────────────────

  /** Waits for element to be visible, then returns it. */
  protected async waitForVisible(locator: Locator, timeout = 15_000): Promise<Locator> {
    await locator.waitFor({ state: 'visible', timeout });
    return locator;
  }

  /** Waits for element to be visible, scrolls into view, then clicks. */
  protected async safeClick(locator: Locator, timeout = 15_000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.scrollIntoViewIfNeeded();
    await locator.click();
  }

  /** Clears the field and types text. */
  protected async safeFill(locator: Locator, text: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(text);
  }

  /** Types text character-by-character — triggers autocomplete debounce. */
  protected async typeSlowly(locator: Locator, text: string, delay = 80): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.click();
    await locator.clear();
    await locator.pressSequentially(text, { delay });
  }

  // ─── Screenshot ───────────────────────────────────────────────────────────

  async screenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({
      path: `reports/screenshots/${name}-${Date.now()}.png`,
      fullPage: false,
    });
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  async assertTitle(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(pattern);
  }
}
