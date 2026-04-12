import { type Page } from 'playwright';
import { MapPage } from '../../pages/MapPage';

/**
 * BddMapPage — BDD-specific extension of MapPage.
 *
 * Auth is now handled the same way as Playwright spec tests:
 * steps check createTripButton.isVisible() and return 'skipped' if not present.
 * No cookies, no reCAPTCHA, no auth.json required.
 */
export class BddMapPage extends MapPage {
  constructor(page: Page) {
    super(page);
  }
}