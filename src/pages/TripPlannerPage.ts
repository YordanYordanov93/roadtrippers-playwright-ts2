import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import type { WaypointSuggestion } from '../types';

/**
 * TripPlannerPage
 *
 * Two UI modes depending on auth state:
 *   Authenticated    → waypoint-based trip editor (addStopInput, waypointItems)
 *   Unauthenticated  → "Where are you going?" route form (destination input)
 *
 * All methods handle both modes gracefully.
 */
export class TripPlannerPage extends BasePage {
  readonly tripNameInput: Locator;
  readonly tripNameDisplay: Locator;
  readonly addStopInput: Locator;
  readonly suggestionList: Locator;
  readonly suggestionItems: Locator;
  readonly waypointList: Locator;
  readonly waypointItems: Locator;
  readonly saveButton: Locator;
  readonly discardButton: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    super(page);

    this.tripNameInput = page.locator([
      'input[placeholder*="trip name" i]',
      'input[placeholder*="name your" i]',
      'input[placeholder*="Name this trip" i]',
      'input[data-sweetchuck-id*="trip-name"]',
      '[contenteditable="true"][class*="title"]',
      '[contenteditable="true"][class*="name"]',
      '[contenteditable="true"][class*="trip"]',
      '.rt-trip-name [contenteditable]',
      '[data-sweetchuck-id*="trip-name"]',
      '[data-testid="trip-name"]',
    ].join(', ')).first();

    this.tripNameDisplay = page.locator([
      '[class*="TripName"]',
      '[class*="tripName"]',
      '[class*="trip-name"]',
      '[class*="TripTitle"]',
      '[class*="rt-trip"]',
      '[data-sweetchuck-id*="trip-name"]',
      '[data-testid="trip-name-display"]',
    ].join(', ')).first();

    this.addStopInput = page.locator([
      'input[name="destination"]',
      'input[placeholder*="Add a stop" i]',
      'input[placeholder*="Search for a place" i]',
      'input[placeholder*="add stop" i]',
      'input[placeholder*="Where to?" i]',
      'input[data-sweetchuck-id*="stop"]',
      '[data-testid="waypoint-search"]',
      '[class*="itinerary"] input[type="search"]',
      '[class*="itinerary"] input[type="text"]',
    ].join(', ')).first();

    this.suggestionList = page.locator([
      '[role="listbox"]',
      '[class*="Suggestions"]',
      '[class*="suggestions"]',
      '.pac-container',
      '[class*="rt-autocomplete"]',
      '[class*="autocomplete-list"]',
      '.rt-autocomplete-list',
    ].join(', ')).first();

    this.suggestionItems = page.locator([
      '[role="option"]',
      '[class*="SuggestionItem"]',
      '[class*="suggestion-item"]',
      '.pac-item',
      '[class*="rt-autocomplete-list-item"]',
      '[class*="autocomplete-item"]',
    ].join(', '));

    this.waypointList = page.locator([
      '[class*="Itinerary"]',
      '[class*="WaypointList"]',
      '[class*="StopList"]',
    ].join(', ')).first();

    // IMPORTANT: do NOT include [data-sweetchuck-id*="waypoint"] — that matches
    // the toolbar "Start Trip" button and causes false positives.
    this.waypointItems = page.locator([
      '[class*="WaypointItem"]',
      '[class*="waypoint-item"]',
      '[class*="StopItem"]',
      '[class*="ItineraryStop"]',
      '[data-sweetchuck-id*="stop-item"]',
      '[data-testid="waypoint-item"]',
    ].join(', '));

    this.saveButton    = page.locator('button:has-text("Save"), button:has-text("Create trip"), button:has-text("save")').first();
    this.discardButton = page.getByRole('button', { name: /discard|cancel|delete/i }).first();
    this.successToast    = page.locator('[role="alert"][class*="success"], .toast-success, [class*="SaveSuccess"]').first();
    this.errorToast      = page.locator('[role="alert"][class*="error"], .toast-error').first();
    this.validationError = page.locator('[class*="validation"], [class*="Validation"], [class*="required"]').first();
  }

  async waitForLoad(): Promise<this> {
    const alreadyOnMap = /maps\.roadtrippers\.com/.test(this.page.url());
    if (!alreadyOnMap) {
      await this.page.waitForURL(/maps\.roadtrippers\.com/, { timeout: 10_000 });
    }
    await this.page.locator('canvas.mapboxgl-canvas').first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    for (let i = 0; i < 3; i++) {
      await this.dismissModal();
      await this.page.waitForTimeout(300);
    }
    return this;
  }

  async setTripName(name: string): Promise<this> {
    await this.dismissModal();
    await this.page.evaluate(function() {
      document.querySelectorAll('.modal-container.show, .rt-modal-background')
        .forEach(function(el) { el.remove(); });
    }).catch(function() {});

    try {
      const input = this.tripNameInput;
      await input.waitFor({ state: 'visible', timeout: 10_000 });
      const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'input' || tagName === 'textarea') {
        await input.click({ clickCount: 3 });
        await input.fill(name);
      } else {
        await input.click();
        await this.page.keyboard.press('Control+a');
        await this.page.keyboard.type(name);
      }
    } catch {
      try {
        await this.tripNameDisplay.click();
        await this.page.keyboard.press('Control+a');
        await this.page.keyboard.type(name);
      } catch {
        console.warn('⚠️  Could not locate trip name input — skipping name assignment');
      }
    }
    return this;
  }

  async getTripName(): Promise<string> {
    try {
      const display = this.tripNameDisplay;
      if (await display.isVisible()) {
        return (await display.textContent()) ?? '';
      }
      const input = this.tripNameInput;
      if (await input.isVisible()) {
        return await input.inputValue();
      }
      return '';
    } catch {
      return '';
    }
  }

  async addWaypoint(waypoint: WaypointSuggestion): Promise<this> {
    const { text, index = 0 } = waypoint;
    const searchInput = await this.resolveSearchInput();

    await searchInput.click();
    await searchInput.clear();
    await searchInput.pressSequentially(text, { delay: 80 });

    await this.suggestionList.waitFor({ state: 'visible', timeout: 12_000 });
    await expect(this.suggestionItems.first()).toBeVisible({ timeout: 6_000 }).catch(() => {});

    const items = this.suggestionItems;
    const count = await items.count();
    if (count === 0) {
      throw new Error(`No autocomplete suggestions appeared for "${text}"`);
    }

    await items.nth(index).click();

    // Wait for waypoint to register — accept any of these signals
    await Promise.race([
      this.waypointItems.first().waitFor({ state: 'visible', timeout: 8_000 }),
      searchInput.waitFor({ state: 'hidden', timeout: 5_000 }),
      this.page.waitForTimeout(3_000),
    ]).catch(() => {});

    return this;
  }

  async typeInSearchWithoutSelecting(text: string): Promise<this> {
    const searchInput = await this.resolveSearchInput();
    await searchInput.click();
    await searchInput.clear();
    if (text) {
      await searchInput.pressSequentially(text, { delay: 60 });
    }
    return this;
  }

  async clearSearchInput(): Promise<this> {
    const searchInput = await this.resolveSearchInput();
    await searchInput.clear();
    return this;
  }

  async removeWaypointAt(index: number): Promise<this> {
    const items = this.waypointItems;
    const item  = items.nth(index);
    await item.waitFor({ state: 'visible' });
    await item.scrollIntoViewIfNeeded();
    await item.hover();
    const removeBtn = item.getByRole('button', { name: /remove|delete|×|close/i }).first();
    await removeBtn.click();
    await item.waitFor({ state: 'detached', timeout: 5_000 }).catch(() => {});
    return this;
  }

  async saveTrip(): Promise<this> {
    await this.safeClick(this.saveButton);
    await this.waitForSaveConfirmation();
    return this;
  }

  private async resolveSearchInput(): Promise<Locator> {
    await this.dismissModal();
    await this.page.evaluate(function() {
      document.querySelectorAll('.modal-container.show, .rt-modal-background, [id*="gist"], iframe[src*="gist.build"]')
        .forEach(function(el) { el.remove(); });
    }).catch(function() {});

    try {
      await this.addStopInput.waitFor({ state: 'visible', timeout: 5_000 });
      return this.addStopInput;
    } catch {
      return this.page.getByRole('searchbox', { name: 'Search and Explore' });
    }
  }

  private async waitForSaveConfirmation(): Promise<void> {
    const toastPromise = this.successToast
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => 'toast');
    const urlPromise = this.page
      .waitForURL(/\/trips\/\d+/, { timeout: 15_000 })
      .then(() => 'url');
    const result = await Promise.race([toastPromise, urlPromise])
      .catch(() => 'timeout');
    if (result === 'timeout') {
      console.warn('⚠️  Could not confirm save — no toast or URL change detected');
    }
  }

  async assertWaypointCount(count: number): Promise<void> {
    if (count === 0) {
      const actual = await this.waypointItems.count();
      expect(actual, `Expected 0 waypoints but found ${actual}`).toBe(0);
    } else {
      await expect(this.waypointItems).toHaveCount(count, { timeout: 10_000 });
    }
  }

  async assertTripNameIs(expected: string): Promise<void> {
    const actual = await this.getTripName();
    expect(actual).toContain(expected);
  }

  async assertSuggestionsVisible(): Promise<void> {
    const found = await Promise.race([
      this.suggestionList.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true),
      this.page.locator('[class*="rt-autocomplete"], [class*="autocomplete-list-item"]')
        .first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true),
    ]).catch(() => false);
    expect(found, 'Autocomplete suggestions should be visible').toBe(true);
  }

  async assertSuggestionsNotVisible(): Promise<void> {
    await expect(this.suggestionList).not.toBeVisible({ timeout: 5_000 });
  }

  async assertSaveSuccessful(): Promise<void> {
    const hasToast = await this.successToast.isVisible();
    const hasTripsUrl = this.page.url().includes('/trips/');
    expect(hasToast || hasTripsUrl).toBe(true);
  }

  async assertValidationErrorVisible(): Promise<void> {
    const hasError = await this.errorToast.isVisible() || await this.validationError.isVisible();
    expect(hasError).toBe(true);
  }

  async getWaypointCount(): Promise<number> {
    return this.waypointItems.count();
  }
}
