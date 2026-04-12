/**
 * world.ts — Cucumber World
 *
 * The World is Cucumber's version of a "shared context". Each scenario gets a
 * fresh World instance so browser state never bleeds between tests.
 *
 * Responsibilities:
 *   • Launch / close the Playwright browser
 *   • Instantiate every page object once per scenario
 *   • Expose page objects to step definitions via `this.pages`
 *   • Provide a `screenshot()` helper used by the After hook
 *
 * Integration with existing POM:
 *   All page objects are the same classes used by the Playwright `.spec.ts` tests.
 *   No duplication — BDD and non-BDD tests share identical page objects.
 */

import {
  setWorldConstructor,
  setDefaultTimeout,
  World,
  type IWorldOptions,
  type ITestStepHookParameter,
} from '@cucumber/cucumber';

// v10 alias → v11 name
type ITestCaseHookParameter = ITestStepHookParameter;
import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';
import * as dotenv from 'dotenv';
/// <reference types="node" />
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local → .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Page objects — same classes as the Playwright spec tests
import { LoginPage }       from '../../pages/LoginPage';
import { MapPage }         from '../../pages/MapPage';
import { BddMapPage }     from '../support/BddMapPage';
import { TripPlannerPage } from '../../pages/TripPlannerPage';
import { MyTripsPage }     from '../../pages/MyTripsPage';
import { AskUIHelper }     from '../../utils/askui-helper';

// ─── World parameter types ─────────────────────────────────────────────────────

export interface WorldParameters {
  headless?: boolean;
  browser?: 'chromium' | 'firefox' | 'webkit';
  baseURL?: string;
}

// ─── Page object container ────────────────────────────────────────────────────

export interface Pages {
  loginPage:       LoginPage;
  mapPage:         BddMapPage;  // BDD-specific subclass with avatar-based auth
  tripPlannerPage: TripPlannerPage;
  myTripsPage:     MyTripsPage;
  askUI:           AskUIHelper;
}

// ─── Scenario context ──────────────────────────────────────────────────────────
// Carries mutable state within a single scenario (shared between steps)

export interface ScenarioContext {
  tripName?:      string;
  waypointCount?: number;
  lastError?:     string;
  skipped?:       boolean;   // set true when scenario skips due to not being authenticated
}

// ─── Custom World class ───────────────────────────────────────────────────────

export class RoadtrippersWorld extends World {
  // Playwright objects
  browser!:  Browser;
  context!:  BrowserContext;
  page!:     Page;

  // Page object model
  pages!:    Pages;

  // Scenario-level mutable state
  scenario:  ScenarioContext = {};

  // World parameters (from cucumber.js profile)
  readonly params: WorldParameters;

  constructor(options: IWorldOptions) {
    super(options);
    this.params = (options.parameters as WorldParameters) ?? {};
  }

  // ─── Browser lifecycle ──────────────────────────────────────────────────────

  async openBrowser(): Promise<void> {
    const browserType = this.params.browser ?? 'chromium';
    const headless    = this.params.headless ?? (process.env.HEADLESS !== 'false');
    const baseURL     = this.params.baseURL
                     ?? process.env.BASE_URL
                     ?? 'https://maps.roadtrippers.com';

    // Launch browser
    const launcher =
      browserType === 'firefox' ? firefox :
      browserType === 'webkit'  ? webkit  :
      chromium;

    this.browser = await launcher.launch({
      headless,
      slowMo: headless ? 0 : 50,   // human-readable speed in headed mode
    });

    // Create context — load saved auth state only when it has real cookies.
    // An empty auth.json (no cookies) means reCAPTCHA blocked login — loading it
    // gives a guest context anyway, so we skip it to avoid silent auth failures.
    const authPath = path.resolve(process.cwd(), 'config/state/auth.json');

    const hasValidAuth = (() => {
      if (!fs.existsSync(authPath)) return false;
      try {
        const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        return Array.isArray(state.cookies) && state.cookies.length > 0;
      } catch {
        return false;
      }
    })();

    if (!hasValidAuth) {
      console.warn('\n  ⚠️  No valid auth session found in config/state/auth.json.');
      console.warn('  @auth scenarios will fail. Fix by running:');
      console.warn('    npx tsx scripts/capture-auth.ts\n');
    }

    this.context = await this.browser.newContext({
      baseURL,
      viewport:    { width: 1440, height: 900 },
      locale:      'en-US',
      colorScheme: 'light',
      ...(hasValidAuth ? { storageState: authPath } : {}),
    });

    this.page = await this.context.newPage();

    // Wire page objects
    this.pages = {
      loginPage:       new LoginPage(this.page),
      mapPage:         new BddMapPage(this.page),
      tripPlannerPage: new TripPlannerPage(this.page),
      myTripsPage:     new MyTripsPage(this.page),
      askUI:           new AskUIHelper(this.page),
    };
  }

  async closeBrowser(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Attaches a screenshot to the Cucumber report. */
  async attachScreenshot(label = 'screenshot'): Promise<void> {
    try {
      const buffer = await this.page.screenshot({ fullPage: false });
      await this.attach(buffer, 'image/png');
      console.log(`  📸 Screenshot attached: ${label}`);
    } catch {
      console.warn('  ⚠️  Could not capture screenshot');
    }
  }

  /** Convenience: navigate to a path on baseURL. */
  async goto(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }
}

// Register the custom World
setWorldConstructor(RoadtrippersWorld);