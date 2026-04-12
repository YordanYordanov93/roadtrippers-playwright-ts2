# Roadtrippers — Playwright + TypeScript + Cucumber BDD

End-to-end test suite for [maps.roadtrippers.com](https://maps.roadtrippers.com) using **Playwright**, **TypeScript**, and **Cucumber BDD**, with optional **AskUI** visual AI integration.

---

## Quick Start

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env.local        # add TEST_EMAIL and TEST_PASSWORD
npx playwright test --project=setup
npm test                           # Playwright specs
npm run bdd                        # Cucumber BDD
```

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Setup](#setup)
5. [Running Tests](#running-tests)
6. [Test Coverage](#test-coverage)
7. [BDD Layer](#bdd-layer)
8. [Page Object Model](#page-object-model)
9. [Test Data](#test-data)
10. [Reports](#reports)
11. [CI/CD](#cicd)
12. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Two Test Entry Points                       │
│                                                               │
│   Playwright Specs (.spec.ts)     BDD Scenarios (.feature)   │
│   tc001-happy-path           ←→   trip-creation              │
│   tc002-edge-cases           ←→   edge-cases                 │
│   tc003-error.noauth         ←→   authentication             │
│   tc004-trip-management      ←→   trip-management            │
└─────────────────────┬──────────────────────┬─────────────────┘
                      │  shared POM classes  │
┌─────────────────────▼──────────────────────▼─────────────────┐
│              Page Object Model (POM)                          │
│   BasePage → LoginPage / MapPage / TripPlannerPage            │
│                        MyTripsPage                            │
└─────────────────────┬─────────────────────────────────────────┘
                      │ visual checks
┌─────────────────────▼─────────────────────────────────────────┐
│   AskUI Visual Bridge (optional — degrades to Playwright)     │
└─────────────────────┬─────────────────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────────────────┐
│         Playwright Browser Engine                             │
│              Chromium │ Firefox │ WebKit                      │
└───────────────────────────────────────────────────────────────┘
```

Both test layers share **identical page object classes** — zero code duplication.

| | Playwright Specs | Cucumber BDD |
|---|---|---|
| Audience | Developers | Developers + QA + Business |
| Syntax | TypeScript | Gherkin |
| Command | `npm test` | `npm run bdd` |
| Reports | HTML + Trace | HTML + JSON + Allure |
| Tag filter | `--grep @smoke` | `--tags @smoke` |

---

## Project Structure

```
roadtrippers-playwright/
├── src/
│   ├── pages/                      # Page Object Model
│   │   ├── BasePage.ts             # Shared utilities, cookie/overlay dismissal
│   │   ├── LoginPage.ts            # /login — credentials, errors, navigation
│   │   ├── MapPage.ts              # Map shell — toolbar, trip button, search
│   │   ├── TripPlannerPage.ts      # Trip editor — name, waypoints, save
│   │   ├── MyTripsPage.ts          # My Trips panel
│   │   └── index.ts
│   │
│   ├── tests/                      # Playwright spec files
│   │   ├── auth.setup.ts           # Reuses saved session — no re-login
│   │   ├── tc001-happy-path.spec.ts
│   │   ├── tc002-edge-cases.spec.ts
│   │   ├── tc003-error-scenarios.noauth.spec.ts
│   │   └── tc004-trip-management.spec.ts
│   │
│   ├── bdd/
│   │   ├── features/               # Gherkin feature files
│   │   │   ├── trip-creation.feature
│   │   │   ├── edge-cases.feature
│   │   │   ├── authentication.feature
│   │   │   └── trip-management.feature
│   │   ├── steps/                  # Step definitions
│   │   │   ├── common.steps.ts
│   │   │   ├── trip-creation.steps.ts
│   │   │   ├── authentication.steps.ts
│   │   │   └── trip-management.steps.ts
│   │   ├── world/world.ts          # Browser + page objects per scenario
│   │   ├── hooks/hooks.ts          # Before/After lifecycle
│   │   └── support/env.ts          # Environment bootstrap
│   │
│   ├── fixtures/
│   │   ├── test-data.ts            # Trips, credentials, waypoints
│   │   └── page-fixtures.ts        # Custom test() with pre-built POM
│   │
│   ├── utils/askui-helper.ts       # AskUI visual testing bridge
│   └── types/index.ts              # Shared TypeScript interfaces
│
├── config/
│   └── state/auth.json             # Saved browser session (gitignored)
│
├── reports/                        # Generated output (gitignored)
│   ├── cucumber/                   # HTML, JSON, JUnit
│   ├── allure-results/
│   └── screenshots/
│
├── cucumber.js                     # Cucumber profiles
├── playwright.config.ts
├── tsconfig.json
└── .env.example
```

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | >= 18 LTS | `node --version` |
| npm | >= 9 | `npm --version` |
| Roadtrippers account | Free | roadtrippers.com |
| AskUI account | Optional | app.askui.com |

---

## Setup

### 1. Install dependencies

```bash
npm install
npx playwright install --with-deps     # all browsers
npx playwright install --with-deps chromium  # chromium only (faster)
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

```env
# Required
TEST_EMAIL=your-test@example.com
TEST_PASSWORD=your-test-password

# Optional — AskUI visual AI
ASKUI_WORKSPACE_ID=your-workspace-id
ASKUI_TOKEN=your-token

# Browser
HEADLESS=true
BASE_URL=https://maps.roadtrippers.com
```

### 3. Save auth session

```bash
npx playwright test --project=setup
```

Logs in once and saves the session to `config/state/auth.json`. All subsequent tests reuse it. Re-run this command when the session expires.

### 4. Verify setup

```bash
npm run type-check       # TypeScript — no browser needed
npm run lint             # ESLint
npm run bdd:dry-run      # Gherkin step validation — no browser needed
```

---

## Running Tests

### Playwright

```bash
# All tests (all browsers)
npm test

# Single browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# By tag
npm run test:smoke        # @smoke — critical path
npm run test:happy        # @happy — success flows
npm run test:edge         # @edge  — boundary conditions
npm run test:error        # @error — failure scenarios

# Single file or test
npx playwright test src/tests/tc001-happy-path.spec.ts
npx playwright test --grep "create trip"

# Debug modes
npm run test:headed       # watch the browser
npm run test:ui           # interactive test picker
npm run test:debug        # step-through with DevTools
npx playwright test --last-failed

# View report
npm run report
```

### Cucumber BDD

```bash
# All scenarios
npm run bdd

# By profile
npm run bdd:smoke         # @smoke only
npm run bdd:happy         # @happy only
npm run bdd:edge          # @edge only
npm run bdd:error         # @error only
npm run bdd:headed        # headed browser
npx cucumber-js --profile ci   # JUnit + Allure output

# By tag (advanced)
npx cucumber-js --tags "@happy and @smoke"
npx cucumber-js --tags "@happy or @edge"
npx cucumber-js --tags "not @noauth"

# Single feature or scenario
npx cucumber-js src/bdd/features/trip-creation.feature
npx cucumber-js --name "A visitor creates and saves a named road trip"
npx cucumber-js src/bdd/features/trip-creation.feature:24

# Utilities
npm run bdd:dry-run       # validate steps without browser
npm run bdd:debug         # PWDEBUG step-through

# Allure report
npm run bdd:report
```

### Execution matrix

| Goal | Command | Time |
|---|---|---|
| Full suite | `npm test && npm run bdd` | ~10 min |
| Playwright smoke | `npm run test:smoke` | ~2 min |
| BDD smoke | `npm run bdd:smoke` | ~3 min |
| BDD happy path | `npm run bdd:happy` | ~4 min |
| Step validation | `npm run bdd:dry-run` | ~5 sec |
| Auth setup | `npx playwright test --project=setup` | ~30 sec |

---

## Test Coverage

### Playwright specs

| File | Tags | What it covers |
|---|---|---|
| `tc001-happy-path.spec.ts` | `@happy @smoke` | Create trip, add waypoints, autocomplete, save |
| `tc002-edge-cases.spec.ts` | `@edge` | Long name, special chars, add/remove waypoint, no results, cancel |
| `tc003-error-scenarios.noauth.spec.ts` | `@error` | Invalid credentials, empty form, unauthenticated trip creation |
| `tc004-trip-management.spec.ts` | `@happy @edge` | Toolbar tabs, My Trips panel, global search, canvas integrity |

### BDD features

| Feature | Tags | Scenarios |
|---|---|---|
| `trip-creation.feature` | `@happy` | Multi-waypoint trip, single destination, autocomplete, canvas — data-driven via `Scenario Outline` |
| `edge-cases.feature` | `@edge` | Boundary name length, special characters, add/remove, no-results search, cancel |
| `authentication.feature` | `@error @noauth` | Invalid credentials, malformed email, empty form, unauthenticated access, page structure — data-driven |
| `trip-management.feature` | `@happy` | Toolbar tabs, My Trips panel, global search, canvas after planner |

### Tags reference

| Tag | Meaning | Run command |
|---|---|---|
| `@smoke` | Critical path — run on every commit | `--tags @smoke` |
| `@happy` | Full success flows | `--tags @happy` |
| `@edge` | Boundary and unusual inputs | `--tags @edge` |
| `@error` | Failure and validation scenarios | `--tags @error` |
| `@noauth` | Runs without browser auth state | `--tags @noauth` |

---

## BDD Layer

### Dual-mode execution

BDD scenarios work in two modes without any skipping:

- **Authenticated** — uses the waypoint-based trip editor (`addStopInput`, `tripNameInput`, `waypointItems`)
- **Unauthenticated** — uses the global search bar as a functional equivalent

`this.scenario.editorMode` is set by the `I open the trip planner or verify guest state` step and read by every subsequent step to route behaviour accordingly.

### Cucumber World

Each scenario gets a fresh `RoadtrippersWorld` instance:

```typescript
this.page                    // Playwright Page
this.pages.loginPage         // LoginPage POM
this.pages.mapPage           // MapPage POM
this.pages.tripPlannerPage   // TripPlannerPage POM
this.pages.myTripsPage       // MyTripsPage POM
this.scenario                // { tripName, waypointCount, editorMode, lastError }
```

### Step definitions

| File | Covers |
|---|---|
| `common.steps.ts` | Map load, canvas, toolbar tabs, error absence, wait steps |
| `trip-creation.steps.ts` | Trip planner entry, naming, waypoints, search, save, cancel, all assertions |
| `authentication.steps.ts` | Login navigation, credential input, submit, error/redirect assertions |
| `trip-management.steps.ts` | Empty — all steps shared via `common.steps.ts` and `trip-creation.steps.ts` |

### Hook execution order

```
BeforeAll        → create report directories
Before           → launch browser, navigate to /, dismiss cookie banner + Gist overlay
Before @noauth   → temporarily remove auth.json
  [ scenario steps ]
After            → screenshot on failure, close browser
After @noauth    → restore auth.json
AfterAll         → print summary
```

---

## Page Object Model

All page classes extend `BasePage` which provides:

```typescript
await this.dismissCookieBanner();         // OneTrust GDPR banner
await this.dismissModal();                // membership upsell modals + Gist overlay
await this.safeClick(locator);            // wait → scroll → click
await this.typeSlowly(locator, 'text');   // pressSequentially — triggers autocomplete
await this.screenshot('label');           // saves PNG to reports/screenshots/
```

### Locator strategy (priority order)

1. Semantic role — `getByRole('button', { name: 'Start Trip' })`
2. Accessible name — `getByRole('searchbox', { name: 'Search and Explore' })`
3. Data attribute — `[data-sweetchuck-id="map-action-bar__button--explore"]`
4. ARIA label — `[aria-label*="stop" i]`
5. CSS class pattern — `[class*="WaypointItem"]` — last resort only

### Known overlay: Gist chat widget

The Gist chat widget (`#gist-overlay`, `#gist-embed-message`) renders after page load and intercepts pointer events on all toolbar buttons. `BasePage.dismissModal()` and `MapPage.clickCreateTrip()` both remove it via `page.evaluate()` before any interaction.

---

## Test Data

All test fixtures are centralised in `src/fixtures/test-data.ts`:

```typescript
// Credentials
validCredentials()          // from TEST_EMAIL / TEST_PASSWORD env vars
invalidCredentials          // wrong email + wrong password
validEmailBadPassword       // correct email, wrong password
invalidFormatCredentials    // malformed email

// Trip data
happyPathTrip               // Chicago → Springfield → Nashville
singleWaypointTrip          // Nashville only
longNameTrip                // 200-character name
specialCharacterTrip        // name with quotes and special chars

// Waypoints
validWaypoints[]            // Chicago, Nashville, Denver, Austin
invalidWaypoint             // ZZZZNOTAREALPLACEQQQQ
```

BDD `Examples` tables reference these constants by name in comments so changes stay in sync:

```gherkin
Examples: from test-data.ts → happyPathTrip
  | tripName                       | waypoint1         | waypoint2             | waypoint3            |
  | Chicago to Nashville Road Trip | Chicago, Illinois | Springfield, Illinois | Nashville, Tennessee |
```

> **Note:** Do not use `<` or `>` inside Examples table cells — they conflict with Cucumber's `<columnName>` placeholder syntax. Test data containing angle brackets belongs in a plain `Scenario`, not a `Scenario Outline`.

---

## Reports

### Playwright

```bash
npm run report                               # open HTML report
npx playwright show-trace test-results/**/trace.zip
```

### Cucumber / BDD

```bash
# Built-in HTML report
open reports/cucumber/report.html

# Interactive Allure report
npm run bdd:report
```

| Report | Location | Format |
|---|---|---|
| Playwright HTML | `playwright-report/` | HTML + trace viewer |
| Cucumber HTML | `reports/cucumber/report.html` | HTML |
| Cucumber JSON | `reports/cucumber/results.json` | JSON |
| Cucumber JUnit | `reports/cucumber/junit.xml` | XML (CI integration) |
| Allure | `reports/allure-report/` | Interactive HTML |
| Screenshots | `reports/screenshots/` | PNG (failures only) |

---

## CI/CD

GitHub Actions runs on every push to `main` and `develop`:

```
push → lint + type-check
     → Playwright tests (chromium + firefox)
     → BDD tests (chromium)
     → upload reports + screenshots

nightly 02:00 UTC → smoke tests only
```

### Required GitHub Secrets

`Settings → Secrets and variables → Actions`

| Secret | Required |
|---|---|
| `TEST_EMAIL` | Yes |
| `TEST_PASSWORD` | Yes |
| `ASKUI_WORKSPACE_ID` | Optional |
| `ASKUI_TOKEN` | Optional |

---

## Troubleshooting

### Auth session not found — tests redirect to /login

```bash
npx playwright test --project=setup
ls config/state/auth.json          # must exist and be non-empty
```

### Gist overlay blocks button clicks

The Gist chat widget intercepts pointer events. `BasePage.dismissModal()` removes it automatically. If you encounter timeouts on toolbar or trip buttons, call `dismissModal()` before the interaction or use `click({ force: true })`.

### Cucumber step not found / Undefined

```bash
npm run bdd:dry-run    # lists all unmatched steps with snippet suggestions
```

### Autocomplete does not appear

Increase the typing delay in `TripPlannerPage.ts`:

```typescript
await input.pressSequentially(text, { delay: 150 });  // default: 80ms
```

### Tests hang or time out

```bash
PWDEBUG=1 npx cucumber-js --tags @smoke          # step-through DevTools
HEADLESS=false npx cucumber-js --profile headed  # watch the browser
```

### TypeScript or lint errors

```bash
npm run type-check
npm run lint:fix
```

### AskUI not working

Tests degrade to Playwright automatically when AskUI credentials are missing — no failures. To enable:

```bash
echo $ASKUI_WORKSPACE_ID    # must print a value
echo $ASKUI_TOKEN           # must print a value
```

---

## Contributing

1. `git checkout -b feat/my-scenario`
2. Add a Gherkin scenario to the relevant `.feature` file in `src/bdd/features/`
3. Add or reuse step definitions in `src/bdd/steps/`
4. Add test data to `src/fixtures/test-data.ts` if the scenario uses new inputs
5. Tag with at least one of `@smoke` `@happy` `@edge` `@error`
6. Run `npm run bdd:dry-run` — all steps must resolve
7. Run `npm run type-check && npm run lint` before committing
8. PR description: what is tested, why, and the expected outcome

---

*Selectors verified against live site: 2026-04-08 · Playwright 1.41+ · TypeScript 5.4+ · Cucumber 11+*