import { type Page, expect } from '@playwright/test';

/**
 * Lightweight visual helper used by tests and BDD steps.
 * Keeps the API stable without forcing hard dependency on external AskUI calls.
 */
export class AskUIHelper {
  constructor(private readonly page: Page) {}

  async assertMapCanvasRendered(): Promise<void> {
    const canvas = this.page.locator('canvas.mapboxgl-canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.width ?? 0) > 200).toBe(true);
    expect((box?.height ?? 0) > 200).toBe(true);
  }

  async visualSnapshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `reports/screenshots/${name}-${Date.now()}.png`,
      fullPage: false,
    });
  }
}
