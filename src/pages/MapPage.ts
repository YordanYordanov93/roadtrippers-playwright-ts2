import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * MapPage — https://maps.roadtrippers.com
 *
 * Locators source-verified from live DOM + JS bundle inspection (2026-04-02).
 *
 * Auth state — MUTUALLY EXCLUSIVE elements inside .rt-top-bar-auth:
 *   • Unauthenticated: .rt-top-bar-sign-in-link  (data-sweetchuck-id="top-bar__button--log-in")
 *   • Authenticated:   .rt-top-bar-avatar-button  (data-sweetchuck-id="header__image--user-profile-auth")
 *
 * NOTE: loginLink is kept as the primary auth locator for backward compatibility
 * with the Playwright spec tests (tc001–tc004). The BDD layer uses the subclass
 * BddMapPage (src/bdd/support/BddMapPage.ts) which overrides isAuthenticated()
 * to use the avatar button as a positive signal instead.
 */
export class MapPage extends BasePage {
  readonly mapRegion: Locator;
  readonly searchInput: Locator;
  readonly loginLink: Locator;       // visible when NOT authenticated
  readonly avatarButton: Locator;    // visible when authenticated

  readonly exploreButton: Locator;
  readonly itineraryButton: Locator;
  readonly myTripsButton: Locator;
  readonly startTripButton: Locator;

  readonly createTripButton: Locator;
  readonly createTripCTA: Locator;

  constructor(page: Page) {
    super(page);

    this.mapRegion    = page.getByRole('region', { name: 'Map' });
    this.searchInput  = page.getByRole('searchbox', { name: 'Search and Explore' });

    // Spec-compatible: role-based login link locator (works for unauthenticated checks)
    this.loginLink    = page.getByRole('link', { name: 'Log in' });
    // Avatar button: positive auth signal used by BDD layer
    this.avatarButton = page.locator('.rt-top-bar-avatar-button, [data-sweetchuck-id="header__image--user-profile-auth"]').first();

    this.exploreButton   = page.getByRole('button', { name: 'Explore', exact: true });
    this.itineraryButton = page.getByRole('button', { name: 'Itinerary', exact: true });
    this.myTripsButton   = page.getByRole('button', { name: 'My trips', exact: true });
    this.startTripButton = page.getByRole('button', { name: 'Start Trip', exact: true });

    // createTripButton: covers both the authenticated "Start Trip" toolbar button
    // and the unauthenticated "Create a trip" CTA — whichever is present.
    this.createTripButton = page.locator([
      '[data-sweetchuck-id="map-action-bar__button--add-waypoint"]',
      'button:has-text("Start Trip")',
      'button:has-text("Create a trip")',
      'button:has-text("New trip")',
    ].join(', ')).first();
    this.createTripCTA = page.locator('text=Adventure is on the horizon').locator('..');
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  async navigate(): Promise<this> {
    await this.goto('/');
    return this.waitForLoad();
  }

  async waitForLoad(): Promise<this> {
    const alreadyOnMap = /maps\.roadtrippers\.com/.test(this.page.url());
    if (!alreadyOnMap) {
      await this.page.waitForURL(/maps\.roadtrippers\.com/, { timeout: 30_000 });
    }
    const canvas      = this.page.locator('canvas.mapboxgl-canvas').first();
    const createTrip  = this.createTripButton;
    const loginLink   = this.loginLink;
    const searchInput = this.searchInput;

    await Promise.race([
      canvas.waitFor({ state: 'visible', timeout: 20_000 }),
      createTrip.waitFor({ state: 'visible', timeout: 20_000 }),
      loginLink.waitFor({ state: 'visible', timeout: 20_000 }),
      searchInput.waitFor({ state: 'visible', timeout: 20_000 }),
    ]).catch(async () => {
      const hasFallbackUi =
        await canvas.isVisible().catch(() => false) ||
        await createTrip.isVisible().catch(() => false) ||
        await loginLink.isVisible().catch(() => false) ||
        await searchInput.isVisible().catch(() => false);
      expect(hasFallbackUi).toBe(true);
    });
    return this;
  }

  /**
   * Waits for the SPA to fully resolve auth state.
   * Used by the BDD layer only — spec tests don't need this.
   * Polls for the avatar button (positive auth signal) up to 15 s.
   */
  async waitForAuthState(): Promise<void> {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (await this.avatarButton.isVisible().catch(() => false)) return;
      await this.page.waitForTimeout(300);
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  async clickCreateTrip(): Promise<this> {
    // Remove Gist/chat widget that intercepts pointer events over the toolbar.
    // Target both the generic id*="gist" pattern AND the specific overlay IDs
    // (#gist-overlay, #gist-embed-message) confirmed in failure logs.
    await this.page.evaluate(() => {
      document.querySelectorAll(
        '#gist-overlay, #gist-embed-message, [id*="gist"], iframe[src*="gist.build"], [class*="gist-visible"], #x-gist-floating-bottom'
      ).forEach(el => el.remove());
    }).catch(() => {});

    // Brief settle — let the DOM repaint after overlay removal
    await this.page.waitForTimeout(300);

    // Always use force: true — avoids timeout if any residual overlay remains
    await this.createTripButton.click({ force: true });
    return this;
  }

  async clickMyTrips(): Promise<this> {
    await this.safeClick(this.myTripsButton);
    return this;
  }

  async clickItinerary(): Promise<this> {
    await this.safeClick(this.itineraryButton);
    return this;
  }

  async searchFor(query: string): Promise<this> {
    await this.typeSlowly(this.searchInput, query);
    return this;
  }

  async clearSearch(): Promise<this> {
    await this.searchInput.clear();
    return this;
  }

  // ─── Assertions ──────────────────────────────────────────────────────────

  async assertMapIsLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/maps\.roadtrippers\.com/, { timeout: 10_000 });
    const canvas = this.page.locator('canvas.mapboxgl-canvas').first();
    const hasCanvas = await canvas.waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true).catch(() => false);
    if (!hasCanvas) {
      await expect(this.createTripButton.or(this.loginLink)).toBeVisible({ timeout: 10_000 });
    }
  }

  async assertIsAuthenticated(): Promise<void> {
    // Spec tests use the avatar button as the positive auth signal
    await expect(this.avatarButton).toBeVisible({ timeout: 15_000 });
    await expect(this.page.url()).not.toContain('/login');
  }

  async assertLoginLinkVisible(): Promise<void> {
    await expect(this.loginLink).toBeVisible({ timeout: 8_000 });
  }

  async assertCreateTripButtonVisible(): Promise<void> {
    await expect(this.createTripButton).toBeVisible({ timeout: 10_000 });
  }

  // ─── State queries ────────────────────────────────────────────────────────

  async isAuthenticated(): Promise<boolean> {
    // Used by spec tests — checks avatar button (positive signal)
    return this.avatarButton.isVisible().catch(() => false);
  }

  async isMapLoaded(): Promise<boolean> {
    try {
      await this.page.locator('canvas.mapboxgl-canvas').first()
        .waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }
}