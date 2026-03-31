/**
 * common.steps.ts — Shared step definitions used across multiple features
 *
 * Steps defined here:
 *   • Map navigation and load confirmation
 *   • Map canvas validation (with AskUI visual check)
 *   • Cookie banner handling
 *   • Generic timing steps
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { RoadtrippersWorld } from '../world/world';

// ─── Map navigation ────────────────────────────────────────────────────────────

Given('I am on the Roadtrippers map', async function (this: RoadtrippersWorld) {
  await this.goto('/');
  await this.pages.mapPage.waitForLoad();
  await this.pages.mapPage.dismissCookieBanner();
});

Given(
  'I am on the Roadtrippers map without being logged in',
  async function (this: RoadtrippersWorld) {
    await this.goto('/');
    await this.pages.mapPage.waitForLoad();
    await this.pages.mapPage.dismissCookieBanner();
    // Confirm not authenticated
    await this.pages.mapPage.assertLoginLinkVisible();
  }
);

Given('the map canvas is fully loaded', async function (this: RoadtrippersWorld) {
  await this.pages.mapPage.waitForLoad();
});

// ─── Map canvas assertions ─────────────────────────────────────────────────────

Then(
  'the map canvas should still be visible and have valid dimensions',
  async function (this: RoadtrippersWorld) {
    // DOM check
    await this.pages.mapPage.assertMapIsLoaded();

    // AskUI visual check — confirms canvas has real pixel dimensions
    await this.pages.askUI.assertMapCanvasRendered();

    const canvas = this.page.locator('canvas.mapboxgl-canvas');
    const box    = await canvas.boundingBox();
    expect(box, 'Canvas bounding box must not be null').not.toBeNull();
    expect(box!.width,  'Canvas width must be > 200px').toBeGreaterThan(200);
    expect(box!.height, 'Canvas height must be > 200px').toBeGreaterThan(200);
  }
);

Then('I should be on the Roadtrippers map', async function (this: RoadtrippersWorld) {
  await this.pages.mapPage.waitForLoad();
  await this.pages.mapPage.assertMapIsLoaded();
  expect(this.page.url()).toContain('maps.roadtrippers.com');
  expect(this.page.url()).not.toContain('/login');
});

// ─── Timing ───────────────────────────────────────────────────────────────────

When('I wait {int} seconds for search to respond', async function (this: RoadtrippersWorld, seconds: number) {
  await this.page.waitForTimeout(seconds * 1_000);
});

When('I wait for autocomplete to respond', async function (this: RoadtrippersWorld) {
  await this.page.waitForTimeout(2_000);
});

When('I click the {string} tab', async function (this: RoadtrippersWorld, tabName: string) {
  if (tabName === 'Explore') {
    await this.pages.mapPage.exploreButton.click();
    return;
  }
  if (tabName === 'Itinerary') {
    await this.pages.mapPage.clickItinerary();
    return;
  }
  if (tabName === 'My trips') {
    await this.pages.myTripsPage.openFromToolbar();
    return;
  }
  await this.page.getByRole('button', { name: tabName, exact: true }).click();
});

// ─── Error message assertions ─────────────────────────────────────────────────

Then('no error message should be shown', async function (this: RoadtrippersWorld) {
  const errorToast = this.pages.tripPlannerPage.errorToast;
  const isVisible  = await errorToast.isVisible();
  expect(isVisible, 'No error message should be visible').toBe(false);
});

Then('the My Trips panel should be visible', async function (this: RoadtrippersWorld) {
  await this.pages.myTripsPage.assertPanelVisible();
});
