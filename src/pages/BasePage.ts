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
  readonly page: Page;

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
    const banner    = this.page.getByRole('alertdialog', { name: 'Privacy' });
    const acceptBtn = banner.getByRole('button', { name: /accept all cookies/i });

    try {
      await acceptBtn.waitFor({ state: 'visible', timeout: 6_000 });

      // Remove the Gist overlay before clicking — it intercepts pointer events
      // on the cookie banner button (#gist-overlay confirmed in failure logs).
      await this.page.evaluate(() => {
        document.querySelectorAll(
          '#gist-overlay, #gist-embed-message, [id*="gist"], iframe[src*="gist.build"], [class*="gist-visible"], #x-gist-floating-bottom'
        ).forEach(el => el.remove());
      }).catch(() => {});

      await acceptBtn.click({ force: true });
      await acceptBtn.waitFor({ state: 'hidden', timeout: 5_000 });
    } catch {
      // Banner not present — that's fine, continue
    }
  }

  /**
   * Dismisses any blocking modal overlay (membership upsell, promo popups, etc).
   *
   * Roadtrippers shows `.modal-container.show` modals with `.rt-modal-background`
   * that intercept all pointer events. These must be closed before interacting
   * with the trip planner panel or map controls.
   *
   * Tries in order:
   *   1. Clicks the × / Close / Dismiss button inside the modal
   *   2. Clicks the backdrop (rt-modal-background) to close
   *   3. Presses Escape
   *   4. Removes the modal from the DOM via JS (last resort)
   */
  async dismissModal(): Promise<void> {
    const modal = this.page.locator('.modal-container.show, .rt-modal.show, [class*="modal"][class*="show"]').first();
    try {
      await modal.waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
      return; // no modal visible — nothing to do
    }

    // Try close button first
    const closeBtn = modal.locator([
      'button[aria-label*="close" i]',
      'button[aria-label*="dismiss" i]',
      'button.close',
      '.rt-modal-close',
      '[class*="modal-close"]',
      '[class*="ModalClose"]',
      'button:has-text("×")',
      'button:has-text("✕")',
      'button:has-text("Close")',
      'button:has-text("No thanks")',
      'button:has-text("Maybe later")',
      'button:has-text("Not now")',
      'button:has-text("Skip")',
    ].join(', ')).first();

    try {
      await closeBtn.waitFor({ state: 'visible', timeout: 1_500 });
      await closeBtn.click({ force: true });
      await modal.waitFor({ state: 'hidden', timeout: 3_000 });
      return;
    } catch { /* try next */ }

    // Try clicking the backdrop
    const backdrop = this.page.locator('.rt-modal-background, .modal-backdrop, [class*="modal-background"]').first();
    try {
      await backdrop.click({ force: true });
      await modal.waitFor({ state: 'hidden', timeout: 2_000 });
      return;
    } catch { /* try next */ }

    // Try Escape key
    try {
      await this.page.keyboard.press('Escape');
      await modal.waitFor({ state: 'hidden', timeout: 2_000 });
      return;
    } catch { /* try next */ }

    // Last resort: remove from DOM including Gist chat widget
    await this.page.evaluate(() => {
      document.querySelectorAll([
        '.modal-container.show',
        '.rt-modal-background',
        '#gist-overlay',
        '#gist-embed-message',
        '[id*="gist"]',
        '[class*="gist-visible"]',
        'iframe[src*="gist.build"]',
        '#x-gist-floating-bottom',
      ].join(', ')).forEach(el => el.remove());
    }).catch(() => {});
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