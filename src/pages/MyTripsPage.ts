import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyTripsPage extends BasePage {
  readonly myTripsPanel: Locator;
  readonly tripCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.myTripsPanel = page.locator(
      '[data-testid="my-trips-panel"], [class*="MyTrips"], [class*="my-trips"], [class*="TripsPanel"]'
    ).first();
    this.tripCards = page.locator(
      '[data-testid="trip-card"], [class*="TripCard"], [class*="trip-card"]'
    );
    this.emptyState = page.locator(
      'text=/no trips yet|no saved trips|start planning/i'
    ).first();
  }

  async waitForLoad(): Promise<this> {
    await this.page.waitForURL(/maps\.roadtrippers\.com/, { timeout: 20_000 });
    return this;
  }

  async openFromToolbar(): Promise<this> {
    await this.page.getByRole('button', { name: 'My trips', exact: true }).click();
    return this;
  }

  async assertPanelVisible(): Promise<void> {
    const panelVisible = await this.myTripsPanel.isVisible().catch(() => false);
    const cardsVisible = (await this.tripCards.count()) > 0;
    const emptyVisible = await this.emptyState.isVisible().catch(() => false);
    expect(panelVisible || cardsVisible || emptyVisible).toBe(true);
  }
}
