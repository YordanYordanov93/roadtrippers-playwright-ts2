import { test as base, expect, type Page } from '@playwright/test';
import { LoginPage, MapPage, TripPlannerPage, MyTripsPage } from '../pages';
import { AskUIHelper } from '../utils/askui-helper';

/**
 * Custom fixture types — extend Playwright's built-in fixtures.
 */
interface RoadtrippersFixtures {
  loginPage:       LoginPage;
  mapPage:         MapPage;
  tripPlannerPage: TripPlannerPage;
  myTripsPage:     MyTripsPage;
  askUI:           AskUIHelper;
  authenticatedPage: Page;  // page with pre-loaded auth state
}

/**
 * Extended test object with all page objects pre-instantiated.
 *
 * Usage in tests:
 *   import { test } from '../fixtures/page-fixtures';
 *
 *   test('my test', async ({ mapPage, tripPlannerPage }) => {
 *     await mapPage.navigate();
 *     ...
 *   });
 */
export const test = base.extend<RoadtrippersFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  mapPage: async ({ page }, use) => {
    await use(new MapPage(page));
  },

  tripPlannerPage: async ({ page }, use) => {
    await use(new TripPlannerPage(page));
  },

  myTripsPage: async ({ page }, use) => {
    await use(new MyTripsPage(page));
  },

  askUI: async ({ page }, use) => {
    const helper = new AskUIHelper(page);
    await use(helper);
    // AskUI cleanup would go here (close inference client)
  },

  authenticatedPage: async ({ page }, use) => {
    // storageState is already applied via playwright.config.ts
    // This fixture just confirms auth state is valid
    await page.goto('/');
    await page.locator('canvas.mapboxgl-canvas').waitFor({ state: 'visible', timeout: 20_000 });
    await use(page);
  },
});

export { expect };
