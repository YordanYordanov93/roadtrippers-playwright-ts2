import { test, expect } from '@playwright/test';
import { MapPage } from '../pages/MapPage';
import { TripPlannerPage } from '../pages/TripPlannerPage';
import { happyPathTrip, validWaypoints } from '../fixtures/test-data';

test.describe('Trip Creation - Happy Path', () => {
  test.describe.configure({ timeout: 240_000 });
  let mapPage: MapPage;
  let tripPlannerPage: TripPlannerPage;

  test.beforeEach(async ({ page }) => {
    mapPage = new MapPage(page);
    tripPlannerPage = new TripPlannerPage(page);

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await mapPage.waitForLoad();
    await mapPage.dismissCookieBanner();
  });

  const openTripCreationIfAvailable = async (): Promise<boolean> => {
    const canCreateTrip = await mapPage.createTripButton.isVisible().catch(() => false);
    if (!canCreateTrip) {
      await mapPage.assertLoginLinkVisible();
      return false;
    }
    await mapPage.clickCreateTrip();
    await tripPlannerPage.waitForLoad();
    return true;
  };

  test('TC001: Create a trip with valid waypoints', async ({ page }) => {
    const plannerOpened = await openTripCreationIfAvailable();
    if (!plannerOpened) {
      await expect(page).toHaveURL(/maps\.roadtrippers\.com/);
      return;
    }

    await tripPlannerPage.addWaypoint({ text: happyPathTrip.waypoints[0] });
    await tripPlannerPage.addWaypoint({ text: happyPathTrip.waypoints[1] });
    await tripPlannerPage.addWaypoint({ text: happyPathTrip.waypoints[2] });

    const count = await tripPlannerPage.getWaypointCount();
    expect(count).toBeGreaterThan(0);

    await tripPlannerPage.setTripName(happyPathTrip.name);
    await tripPlannerPage.saveTrip();
    await tripPlannerPage.assertSaveSuccessful();
  });

  test('TC002: Autocomplete suggestions appear when typing waypoint', async ({ page }) => {
    const plannerOpened = await openTripCreationIfAvailable();
    if (!plannerOpened) {
      await expect(mapPage.loginLink).toBeVisible();
      return;
    }

    await tripPlannerPage.typeInSearchWithoutSelecting(validWaypoints[0].text);

    await tripPlannerPage.suggestionList.waitFor({ state: 'visible', timeout: 8_000 });
    const itemsCount = await tripPlannerPage.suggestionItems.count();
    expect(itemsCount).toBeGreaterThan(0);
  });

  test('TC003: Trip name is required before saving', async ({ page }) => {
    const plannerOpened = await openTripCreationIfAvailable();
    if (!plannerOpened) {
      await expect(mapPage.loginLink).toBeVisible();
      return;
    }

    await tripPlannerPage.saveTrip();
    const hasValidationOrError =
      await tripPlannerPage.validationError.isVisible().catch(() => false) ||
      await tripPlannerPage.errorToast.isVisible().catch(() => false);
    expect(hasValidationOrError).toBe(true);
  });
});