import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * MapPage — https://maps.roadtrippers.com (authenticated state)
 *
 * This is the primary application shell. After login, all interactions happen
 * here — trip creation, search, itinerary management.
 *
 * Verified locators from live DOM inspection (2026-02-18):
 *   • Map canvas:     region[aria-label="Map"] / canvas.mapboxgl-canvas
 *   • Create a trip:  button "Create a trip"
 *   • Bottom toolbar: button "Explore", "Itinerary", "My trips", "Start Trip"
 *   • Search:         searchbox "Search and Explore"
 *   • Log in link:    link "Log in" (shown when not authenticated)
 */
export class MapPage extends BasePage {
  // ─── Layout / navigation locators ─────────────────────────────────────────
  readonly mapRegion: Locator;
  readonly searchInput: Locator;
  readonly loginLink: Locator;

  // ─── Bottom toolbar ────────────────────────────────────────────────────────
  readonly exploreButton: Locator;
  readonly itineraryButton: Locator;
  readonly myTripsButton: Locator;
  readonly startTripButton: Locator;

  // ─── Trip creation CTA ────────────────────────────────────────────────────
  readonly createTripButton: Locator;
  readonly createTripCTA: Locator;      // The "Adventure is on the horizon" panel

  constructor(page: Page) {
    super(page);

    this.mapRegion        = page.getByRole('region', { name: 'Map' });
    this.searchInput      = page.getByRole('searchbox', { name: 'Search and Explore' });
    this.loginLink        = page.getByRole('link', { name: 'Log in' });

    this.exploreButton    = page.getByRole('button', { name: 'Explore', exact: true });
    this.itineraryButton  = page.getByRole('button', { name: 'Itinerary', exact: true });
    this.myTripsButton    = page.getByRole('button', { name: 'My trips', exact: true });
    this.startTripButton  = page.getByRole('button', { name: 'Start Trip', exact: true });

    this.createTripButton = page.getByRole('button', { name: 'Create a trip', exact: true });
    this.createTripCTA    = page.locator('text=Adventure is on the horizon').locator('..');
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  async navigate(): Promise<this> {
    await this.goto('/');
    return this.waitForLoad();
  }

  async waitForLoad(): Promise<this> {
    // Only wait for URL navigation if we are NOT already on the map domain.
    // waitForURL times out when the URL already matches at call time in some
    // browser/Playwright combinations (notably Firefox).
    const alreadyOnMap = /maps\.roadtrippers\.com/.test(this.page.url());
    if (!alreadyOnMap) {
      await this.page.waitForURL(/maps\.roadtrippers\.com/, { timeout: 30_000 });
    }

    // Wait for a visible UI element — canvas, create-trip button, login link,
    // or search box — whichever appears first. This replaces waitForFunction
    // which is less reliable across browsers.
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
      // Final fallback: assert at least one element is visible
      const hasFallbackUi =
        await canvas.isVisible().catch(() => false) ||
        await createTrip.isVisible().catch(() => false) ||
        await loginLink.isVisible().catch(() => false) ||
        await searchInput.isVisible().catch(() => false);
      expect(hasFallbackUi).toBe(true);
    });

    return this;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async clickCreateTrip(): Promise<this> {
    await this.safeClick(this.createTripButton);
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

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertMapIsLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/maps\.roadtrippers\.com/, { timeout: 10_000 });
    const canvas = this.page.locator('canvas.mapboxgl-canvas').first();
    const hasCanvas = await canvas.waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasCanvas) {
      await expect(this.createTripButton.or(this.loginLink)).toBeVisible({ timeout: 10_000 });
    }
  }

  async assertIsAuthenticated(): Promise<void> {
    // Authenticated state: "Log in" link is NOT visible
    await expect(this.loginLink).not.toBeVisible({ timeout: 8_000 });
    await expect(this.page.url()).not.toContain('/login');
  }

  async assertLoginLinkVisible(): Promise<void> {
    await expect(this.loginLink).toBeVisible({ timeout: 8_000 });
  }

  async assertCreateTripButtonVisible(): Promise<void> {
    await expect(this.createTripButton).toBeVisible({ timeout: 10_000 });
  }

  // ─── State queries ─────────────────────────────────────────────────────────

  async isAuthenticated(): Promise<boolean> {
    return !(await this.loginLink.isVisible());
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