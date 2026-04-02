import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import type { WaypointSuggestion } from '../types';

/**
 * TripPlannerPage
 *
 * Handles the trip creation and editing workflow within maps.roadtrippers.com.
 * After clicking "Create a trip", a left-panel slides in with:
 *   • Trip name input (editable title)
 *   • Waypoint search / "Add a stop" input
 *   • Waypoint list items with remove buttons
 *   • Save button
 *
 * The map canvas remains visible throughout.
 *
 * AskUI fallback: when dynamic class names make CSS selectors brittle,
 * AskUI visual element descriptors are used (see askui-helpers.ts).
 */
export class TripPlannerPage extends BasePage {
  // ─── Trip panel locators ───────────────────────────────────────────────────
  readonly tripNameInput: Locator;
  readonly tripNameDisplay: Locator;

  // ─── Waypoint search ──────────────────────────────────────────────────────
  readonly addStopInput: Locator;
  readonly suggestionList: Locator;
  readonly suggestionItems: Locator;

  // ─── Waypoint list ────────────────────────────────────────────────────────
  readonly waypointList: Locator;
  readonly waypointItems: Locator;

  // ─── Actions ──────────────────────────────────────────────────────────────
  readonly saveButton: Locator;
  readonly discardButton: Locator;

  // ─── Feedback / notifications ─────────────────────────────────────────────
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    super(page);

    // Trip name — Roadtrippers renders as contenteditable or an input
    // Multiple fallback selectors ordered by specificity
    this.tripNameInput = page.locator([
      'input[placeholder*="trip name" i]',
      'input[placeholder*="name your" i]',
      'input[aria-label*="trip name" i]',
      '[contenteditable="true"][class*="title"]',
      '[contenteditable="true"][class*="name"]',
      '[data-testid="trip-name"]',
    ].join(', ')).first();

    this.tripNameDisplay = page.locator([
      '[class*="TripName"]',
      '[class*="tripName"]',
      '[class*="trip-name"]',
      '[class*="TripTitle"]',
      '[data-testid="trip-name-display"]',
    ].join(', ')).first();

    // Waypoint search — "Add a stop" input inside the trip panel
    this.addStopInput = page.locator([
      'input[placeholder*="Add a stop" i]',
      'input[placeholder*="add stop" i]',
      'input[placeholder*="destination" i]',
      'input[aria-label*="stop" i]',
      '[data-testid="waypoint-search"]',
      // Final fallback: any search-like input in the sidebar
      '[class*="sidebar"] input[type="search"]',
      '[class*="panel"] input[type="search"]',
    ].join(', ')).first();

    // Autocomplete suggestions
    this.suggestionList  = page.locator('[role="listbox"], [class*="Suggestions"], [class*="suggestions"], .pac-container').first();
    this.suggestionItems = page.locator('[role="option"], [class*="SuggestionItem"], [class*="suggestion-item"], .pac-item');

    // Saved waypoints in the itinerary
    this.waypointList  = page.locator('[class*="Itinerary"], [class*="WaypointList"], [class*="StopList"]').first();
    this.waypointItems = page.locator([
      '[class*="WaypointItem"]',
      '[class*="waypoint-item"]',
      '[class*="StopItem"]',
      '[class*="ItineraryStop"]',
      '[data-testid="waypoint-item"]',
    ].join(', '));

    // Save/discard
    this.saveButton    = page.getByRole('button', { name: /save/i }).first();
    this.discardButton = page.getByRole('button', { name: /discard|cancel|delete/i }).first();

    // Toast / validation feedback
    this.successToast   = page.locator('[role="alert"][class*="success"], .toast-success, [class*="SaveSuccess"]').first();
    this.errorToast     = page.locator('[role="alert"][class*="error"], .toast-error, [class*="Error"]').first();
    this.validationError = page.locator('[class*="validation"], [class*="Validation"], [class*="required"]').first();
  }

  // ─── Navigation / state ───────────────────────────────────────────────────

  async waitForLoad(): Promise<this> {
    // Wait for the URL to confirm we're on the map domain
    const alreadyOnMap = /maps\.roadtrippers\.com/.test(this.page.url());
    if (!alreadyOnMap) {
      await this.page.waitForURL(/maps\.roadtrippers\.com/, { timeout: 10_000 });
    }
    // Map canvas must still be present
    await this.page.locator('canvas.mapboxgl-canvas').first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    return this;
  }

  // ─── Trip name actions ────────────────────────────────────────────────────

  /**
   * Sets the trip name — handles both <input> and contenteditable patterns.
   */
  async setTripName(name: string): Promise<this> {
    try {
      const input = this.tripNameInput;
      await input.waitFor({ state: 'visible', timeout: 10_000 });

      const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'input' || tagName === 'textarea') {
        await input.click({ clickCount: 3 }); // select all
        await input.fill(name);
      } else {
        // contenteditable
        await input.click();
        await this.page.keyboard.press('Control+a');
        await this.page.keyboard.type(name);
      }
    } catch {
      // Fallback: click the displayed title to activate inline edit
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
      if (await display.isVisible()) return (await display.textContent()) ?? '';
      return await this.tripNameInput.inputValue();
    } catch {
      return '';
    }
  }

  // ─── Waypoint actions ─────────────────────────────────────────────────────

  /**
   * Types a waypoint query and selects the specified suggestion.
   * Uses pressSequentially (slow typing) to trigger autocomplete.
   */
  async addWaypoint(waypoint: WaypointSuggestion): Promise<this> {
    const { text, index = 0 } = waypoint;

    // Locate the search input — prefer the dedicated "Add a stop" box
    const searchInput = await this.resolveSearchInput();

    await searchInput.click();
    await searchInput.clear();
    await searchInput.pressSequentially(text, { delay: 80 });

    // Wait for suggestions to appear
    await this.suggestionList.waitFor({ state: 'visible', timeout: 10_000 });

    // Wait for at least one suggestion item to be visible (list stabilised)
    await expect(this.suggestionItems.first()).toBeVisible({ timeout: 5_000 }).catch(() => {});

    const items = this.suggestionItems;
    const count = await items.count();
    if (count === 0) {
      throw new Error(`No autocomplete suggestions appeared for "${text}"`);
    }

    await items.nth(index).click();

    // Wait for the new waypoint item to appear in the list
    await this.waypointItems.nth(0).waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    return this;
  }

  /**
   * Types into the search box WITHOUT selecting any suggestion.
   * Used for negative tests (nonexistent location, empty search).
   */
  async typeInSearchWithoutSelecting(text: string): Promise<this> {
    const searchInput = await this.resolveSearchInput();
    await searchInput.click();
    await searchInput.clear();
    await searchInput.pressSequentially(text, { delay: 60 });
    return this;
  }

  async clearSearchInput(): Promise<this> {
    const searchInput = await this.resolveSearchInput();
    await searchInput.clear();
    return this;
  }

  /**
   * Removes the waypoint at the given 0-based index.
   */
  async removeWaypointAt(index: number): Promise<this> {
    const items = this.waypointItems;
    const item  = items.nth(index);
    await item.waitFor({ state: 'visible' });
    await item.scrollIntoViewIfNeeded();

    // Hover to reveal the remove button (some UIs hide it until hover)
    await item.hover();

    const removeBtn = item.getByRole('button', { name: /remove|delete|×|close/i }).first();
    await removeBtn.click();
    // Wait for the removed item to detach from the DOM
    await item.waitFor({ state: 'detached', timeout: 5_000 }).catch(() => {});
    return this;
  }

  /**
   * Saves the trip and waits for confirmation.
   */
  async saveTrip(): Promise<this> {
    await this.safeClick(this.saveButton);
    await this.waitForSaveConfirmation();
    return this;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Resolves the best available search input — tries trip-panel-specific
   * first, falls back to the global search bar.
   */
  private async resolveSearchInput(): Promise<Locator> {
    try {
      await this.addStopInput.waitFor({ state: 'visible', timeout: 3_000 });
      return this.addStopInput;
    } catch {
      // Fall back to the global search bar
      return this.page.getByRole('searchbox', { name: 'Search and Explore' });
    }
  }

  private async waitForSaveConfirmation(): Promise<void> {
    // Option A: success toast
    const toastPromise = this.successToast
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => 'toast');

    // Option B: URL changes to include /trips/{id}
    const urlPromise = this.page
      .waitForURL(/\/trips\/\d+/, { timeout: 15_000 })
      .then(() => 'url');

    const result = await Promise.race([toastPromise, urlPromise])
      .catch(() => 'timeout');

    if (result === 'timeout') {
      console.warn('⚠️  Could not confirm save — no toast or URL change detected');
    }
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async assertWaypointCount(count: number): Promise<void> {
    await expect(this.waypointItems).toHaveCount(count, { timeout: 10_000 });
  }

  async assertTripNameIs(expected: string): Promise<void> {
    const actual = await this.getTripName();
    expect(actual).toContain(expected);
  }

  async assertSuggestionsVisible(): Promise<void> {
    await expect(this.suggestionList).toBeVisible({ timeout: 10_000 });
  }

  async assertSuggestionsNotVisible(): Promise<void> {
    await expect(this.suggestionList).not.toBeVisible({ timeout: 5_000 });
  }

  async assertSaveSuccessful(): Promise<void> {
    // Either a success toast OR a /trips/{id} URL is acceptable
    const hasToast = await this.successToast.isVisible();
    const hasTripsUrl = this.page.url().includes('/trips/');
    expect(hasToast || hasTripsUrl).toBe(true);
  }

  async assertValidationErrorVisible(): Promise<void> {
    const hasError = await this.errorToast.isVisible() || await this.validationError.isVisible();
    expect(hasError).toBe(true);
  }

  // ─── State queries ─────────────────────────────────────────────────────────

  async getWaypointCount(): Promise<number> {
    return this.waypointItems.count();
  }
}