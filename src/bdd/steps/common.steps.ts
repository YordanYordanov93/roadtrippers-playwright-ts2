/**
 * common.steps.ts — Shared step definitions used across multiple features
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { RoadtrippersWorld } from '../world/world';

// ─── Map navigation ───────────────────────────────────────────────────────────

Given('I am on the Roadtrippers map', async function (this: RoadtrippersWorld) {
  await this.goto('/');
  await this.pages.mapPage.waitForLoad();
  await this.pages.mapPage.dismissCookieBanner();
});

Given('I am on the Roadtrippers map without being logged in',
  async function (this: RoadtrippersWorld) {
    await this.goto('/');
    await this.pages.mapPage.waitForLoad();
    await this.pages.mapPage.dismissCookieBanner();
    await this.pages.mapPage.assertLoginLinkVisible();
  }
);

Given('the map canvas is fully loaded', async function (this: RoadtrippersWorld) {
  await this.pages.mapPage.waitForLoad();
});

// ─── Map canvas assertion ─────────────────────────────────────────────────────

Then('the map canvas should still be visible and have valid dimensions',
  async function (this: RoadtrippersWorld) {
    await this.pages.mapPage.assertMapIsLoaded();
    const canvas = this.page.locator('canvas.mapboxgl-canvas');
    const box    = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(200);
  }
);

Then('I should be on the Roadtrippers map', async function (this: RoadtrippersWorld) {
  await this.pages.mapPage.waitForLoad();
  await this.pages.mapPage.assertMapIsLoaded();
  expect(this.page.url()).toContain('maps.roadtrippers.com');
  expect(this.page.url()).not.toContain('/login');
});

// ─── Toolbar tabs ─────────────────────────────────────────────────────────────

When('I click the {string} tab', async function (this: RoadtrippersWorld, tabName: string) {
  if (tabName === 'Explore')   { await this.pages.mapPage.exploreButton.click(); return; }
  if (tabName === 'Itinerary') { await this.pages.mapPage.clickItinerary(); return; }
  if (tabName === 'My trips')  { await this.pages.myTripsPage.openFromToolbar(); return; }
  await this.page.getByRole('button', { name: tabName, exact: true }).click();
});

Then('no error message should be shown', async function (this: RoadtrippersWorld) {
  // Only assert in waypoint editor mode — in global search mode there is no error toast
  const editorMode = (this.scenario as any).editorMode;
  if (editorMode === 'waypoint') {
    const isVisible = await this.pages.tripPlannerPage.errorToast.isVisible();
    expect(isVisible, 'No error message should be visible').toBe(false);
  }
  // Search mode or unset mode: no error toast exists — passes silently
});

Then('the My Trips panel should be visible', async function (this: RoadtrippersWorld) {
  await this.pages.myTripsPage.assertPanelVisible();
});

// ─── Timing ──────────────────────────────────────────────────────────────────

When('I wait {int} seconds for search to respond',
  async function (this: RoadtrippersWorld, seconds: number) {
    await Promise.race([
      this.pages.tripPlannerPage.suggestionList.waitFor({ state: 'visible', timeout: seconds * 1_000 }),
      this.page.waitForLoadState('networkidle', { timeout: seconds * 1_000 }),
    ]).catch(() => {});
  }
);

When('I wait for autocomplete to respond', async function (this: RoadtrippersWorld) {
  // Wait for either the trip planner suggestions or the global search suggestions
  await Promise.race([
    this.pages.tripPlannerPage.suggestionList.waitFor({ state: 'visible', timeout: 5_000 }),
    this.page.locator('[role="listbox"]').first().waitFor({ state: 'visible', timeout: 5_000 }),
    this.page.waitForLoadState('networkidle', { timeout: 5_000 }),
  ]).catch(() => {});
});