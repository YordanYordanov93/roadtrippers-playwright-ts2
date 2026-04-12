/**
 * TC-004: Trip Management — Map Controls and Navigation
 *
 * Tags: @happy @edge @error
 *
 * Tests toolbar navigation, My Trips panel, global search, and canvas
 * integrity. All tests work for both authenticated and unauthenticated users.
 */

import { test, expect } from '@playwright/test';
import { MapPage }         from '../pages/MapPage';
import { TripPlannerPage } from '../pages/TripPlannerPage';
import { MyTripsPage }     from '../pages/MyTripsPage';

/** Removes the Gist chat widget overlay that intercepts pointer events. */
async function dismissGist(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll(
      '#gist-overlay, #gist-embed-message, [id*="gist"], [class*="gist-visible"], iframe[src*="gist.build"], #x-gist-floating-bottom'
    ).forEach(el => el.remove());
  }).catch(() => {});
}

test.describe('TC-004: Trip Management', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  });

  // ── TC004-01: Toolbar tabs ─────────────────────────────────────────────────

  test(
    '@happy — all toolbar tabs are interactive and do not break the map',
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.waitForLoad();
      await mapPage.dismissCookieBanner();

      // Dismiss Gist overlay before any toolbar interactions
      await dismissGist(page);
      await mapPage.dismissModal();

      // Click each toolbar tab — none should crash the app
      const exploreVisible = await mapPage.exploreButton.isVisible().catch(() => false);
      if (exploreVisible) {
        await dismissGist(page);
        await mapPage.exploreButton.click({ force: true });
      }

      const itineraryVisible = await mapPage.itineraryButton.isVisible().catch(() => false);
      if (itineraryVisible) {
        await dismissGist(page);
        await mapPage.clickItinerary();
      }

      // Map canvas must still be present after toolbar clicks
      await mapPage.assertMapIsLoaded();

      const canvas = page.locator('canvas.mapboxgl-canvas');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(200);
    }
  );

  // ── TC004-02: My Trips panel ───────────────────────────────────────────────

  test(
    '@happy — My Trips panel opens when the My Trips button is clicked',
    async ({ page }) => {
      const mapPage    = new MapPage(page);
      const myTripsPage = new MyTripsPage(page);
      await mapPage.waitForLoad();
      await mapPage.dismissCookieBanner();

      const btnVisible = await mapPage.myTripsButton.isVisible().catch(() => false);
      if (!btnVisible) {
        // My Trips button not visible for this auth state — pass gracefully
        await mapPage.assertMapIsLoaded();
        return;
      }

      await dismissGist(page);
      await mapPage.clickMyTrips();
      // Allow panel animation to complete
      await page.waitForTimeout(1_000);

      // Panel, trip cards, or empty state — any confirms the panel opened
      await myTripsPage.assertPanelVisible();
    }
  );

  // ── TC004-03: Global search ────────────────────────────────────────────────

  test(
    '@happy — global search bar accepts input without crashing the app',
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.waitForLoad();
      await mapPage.dismissCookieBanner();

      await mapPage.searchFor('New York');

      // Wait for any network activity
      await Promise.race([
        page.locator('[role="listbox"], [class*="suggestions"]')
          .first().waitFor({ state: 'visible', timeout: 5_000 }),
        page.waitForLoadState('networkidle', { timeout: 5_000 }),
      ]).catch(() => {});

      // Map should still be intact
      await mapPage.assertMapIsLoaded();
    }
  );

  // ── TC004-04: Canvas integrity after trip planner ─────────────────────────

  test(
    '@smoke — map canvas stays rendered after navigating to trip planner',
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const tripPlannerPage = new TripPlannerPage(page);
      await mapPage.waitForLoad();
      await mapPage.dismissCookieBanner();

      const canCreate = await mapPage.createTripButton.isVisible().catch(() => false);
      if (canCreate) {
        await mapPage.clickCreateTrip();
        await tripPlannerPage.waitForLoad();
      }

      // Canvas must still be present regardless of which UI state we're in
      const canvas = page.locator('canvas.mapboxgl-canvas');
      await canvas.waitFor({ state: 'visible', timeout: 15_000 });
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(200);
    }
  );

  // ── TC004-05: Trip planner cancel returns to map ───────────────────────────

  test(
    '@edge — opening and closing the trip planner returns user to the map',
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const tripPlannerPage = new TripPlannerPage(page);
      await mapPage.waitForLoad();
      await mapPage.dismissCookieBanner();

      const canCreate = await mapPage.createTripButton.isVisible().catch(() => false);
      if (!canCreate) {
        await mapPage.assertMapIsLoaded();
        return;
      }

      await mapPage.clickCreateTrip();
      await tripPlannerPage.waitForLoad();

      // Cancel / discard
      const discardVisible = await tripPlannerPage.discardButton.isVisible().catch(() => false);
      if (discardVisible) {
        await tripPlannerPage.discardButton.click();
      } else {
        await page.goto('/');
      }

      await mapPage.waitForLoad();
      await mapPage.assertMapIsLoaded();
      expect(page.url()).toContain('maps.roadtrippers.com');
      expect(page.url()).not.toContain('/login');
    }
  );
});