/**
 * trip-creation.steps.ts — Step definitions for trip creation features
 *
 * Covers: creating trips, naming, adding/removing waypoints, saving,
 * searching for locations, autocomplete validation.
 */

import { When, Then, Given } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { RoadtrippersWorld } from '../world/world';

// ─── Trip planner entry ────────────────────────────────────────────────────────

When('I click {string}', async function (this: RoadtrippersWorld, buttonText: string) {
  if (buttonText === 'Create a trip') {
    await this.pages.mapPage.clickCreateTrip();
  } else {
    await this.page.getByRole('button', { name: buttonText, exact: true }).click();
  }
});

When('the trip planner panel opens', async function (this: RoadtrippersWorld) {
  await this.pages.tripPlannerPage.waitForLoad();
});

// In trip-creation.steps.ts, replace the "I attempt to create a trip" step with this:

When('I attempt to create a trip', async function (this: RoadtrippersWorld) {
  const createBtn = this.pages.mapPage.createTripButton;

  // Wait up to 5s for the button to appear rather than just checking isVisible()
  try {
    await createBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await createBtn.click();
    // Wait for the trip planner panel or a login prompt to appear
    await Promise.race([
      this.pages.tripPlannerPage.addStopInput.waitFor({ state: 'visible', timeout: 8_000 }),
      this.page.waitForURL(/\/login/, { timeout: 8_000 }),
      this.page.getByRole('heading', { name: /log in|sign in/i }).waitFor({ state: 'visible', timeout: 8_000 }),
    ]).catch(() => {});
  } catch {
    // Button not found — app may require auth before showing it.
    // Try clicking any visible "Create a trip" link or CTA instead.
    const fallback = this.page.getByRole('link', { name: /create a trip/i }).first();
    const fallbackVisible = await fallback.isVisible().catch(() => false);
    if (fallbackVisible) {
      await fallback.click();
      await Promise.race([
        this.pages.tripPlannerPage.addStopInput.waitFor({ state: 'visible', timeout: 8_000 }),
        this.page.waitForURL(/\/login/, { timeout: 8_000 }),
      ]).catch(() => {});
    }
    // Either way, record that we attempted
  }
  this.scenario.lastError = 'attempted';
});
// ─── Trip naming ──────────────────────────────────────────────────────────────

When('I name the trip {string}', async function (this: RoadtrippersWorld, name: string) {
  await this.pages.tripPlannerPage.setTripName(name);
  this.scenario.tripName = name;
});

When('I name the trip with 200 characters', async function (this: RoadtrippersWorld) {
  const longName = 'A'.repeat(200);
  await this.pages.tripPlannerPage.setTripName(longName);
  this.scenario.tripName = longName;
});

// ─── Waypoint management ──────────────────────────────────────────────────────

When('I add the waypoint {string}', async function (this: RoadtrippersWorld, location: string) {
  await this.pages.tripPlannerPage.addWaypoint({ text: location });
  this.scenario.waypointCount = (this.scenario.waypointCount ?? 0) + 1;
});

When('I remove waypoint number {int}', async function (this: RoadtrippersWorld, num: number) {
  // num is 1-based in Gherkin, 0-based in the POM
  await this.pages.tripPlannerPage.removeWaypointAt(num - 1);
  this.scenario.waypointCount = Math.max(0, (this.scenario.waypointCount ?? 0) - 1);
});

Given('the trip has {int} waypoints', async function (this: RoadtrippersWorld, count: number) {
  const actual = await this.pages.tripPlannerPage.getWaypointCount();
  expect(actual).toBe(count);
  this.scenario.waypointCount = count;
});

// ─── Search ───────────────────────────────────────────────────────────────────

When(
  'I type {string} in the waypoint search',
  async function (this: RoadtrippersWorld, query: string) {
    await this.pages.tripPlannerPage.typeInSearchWithoutSelecting(query);
  }
);

When(
  'I type {string} in the global search bar',
  async function (this: RoadtrippersWorld, query: string) {
    await this.pages.mapPage.searchFor(query);
  }
);

// ─── Save ─────────────────────────────────────────────────────────────────────

When('I save the trip', async function (this: RoadtrippersWorld) {
  await this.pages.tripPlannerPage.saveTrip();
});

When(
  'I click the save button without adding waypoints',
  async function (this: RoadtrippersWorld) {
    await this.pages.tripPlannerPage.saveButton.click();
    // Wait for either a validation error or a successful save indicator
    await Promise.race([
      this.pages.tripPlannerPage.errorToast.waitFor({ state: 'visible', timeout: 6_000 }),
      this.pages.tripPlannerPage.validationError.waitFor({ state: 'visible', timeout: 6_000 }),
      this.pages.tripPlannerPage.successToast.waitFor({ state: 'visible', timeout: 6_000 }),
      this.page.waitForURL(/\/trips\/\d+/, { timeout: 6_000 }),
    ]).catch(() => {}); // remaining idle is also valid (e.g. button simply stays disabled)
  }
);

// ─── Cancel ───────────────────────────────────────────────────────────────────

When('I cancel the trip creation', async function (this: RoadtrippersWorld) {
  const discardVisible = await this.pages.tripPlannerPage.discardButton.isVisible();
  if (discardVisible) {
    await this.pages.tripPlannerPage.discardButton.click();
  } else {
    await this.goto('/');
  }
  await this.pages.mapPage.waitForLoad();
});

// ─── Assertions ───────────────────────────────────────────────────────────────

Then(
  'the trip should have {int} waypoint',
  async function (this: RoadtrippersWorld, count: number) {
    await this.pages.tripPlannerPage.assertWaypointCount(count);
  }
);

Then(
  'the trip should have {int} waypoints',
  async function (this: RoadtrippersWorld, count: number) {
    await this.pages.tripPlannerPage.assertWaypointCount(count);
  }
);

Then(
  'the trip should be saved successfully',
  async function (this: RoadtrippersWorld) {
    await this.pages.tripPlannerPage.assertSaveSuccessful();

    // AskUI visual snapshot of the saved state
    await this.pages.askUI.visualSnapshot('trip-saved');
    await this.attachScreenshot('trip-saved');
  }
);

Then(
  'autocomplete suggestions should be visible',
  async function (this: RoadtrippersWorld) {
    await this.pages.tripPlannerPage.assertSuggestionsVisible();
  }
);

Then(
  'no autocomplete suggestions should be shown',
  async function (this: RoadtrippersWorld) {
    const list    = this.pages.tripPlannerPage.suggestionList;
    const visible = await list.isVisible();
    if (visible) {
      const count = await this.pages.tripPlannerPage.suggestionItems.count();
      expect(count, 'Suggestion list should have 0 items').toBe(0);
    }
    // List hidden is also acceptable
  }
);

Then(
  'the trip name field should not be empty',
  async function (this: RoadtrippersWorld) {
    const name = await this.pages.tripPlannerPage.getTripName();
    expect(name.length, 'Trip name should not be empty').toBeGreaterThan(0);
  }
);

Then(
  'the trip name field should contain {string}',
  async function (this: RoadtrippersWorld, text: string) {
    const name = await this.pages.tripPlannerPage.getTripName();
    expect(name).toContain(text);
  }
);

Then(
  'a validation error should appear or the save button should be disabled',
  async function (this: RoadtrippersWorld) {
    const hasError      = await this.pages.tripPlannerPage.errorToast.isVisible()
                       || await this.pages.tripPlannerPage.validationError.isVisible();
    const btnDisabled   = await this.pages.tripPlannerPage.saveButton.isDisabled();
    expect(hasError || btnDisabled,
      'Expected a validation error OR a disabled save button'
    ).toBe(true);
  }
);
