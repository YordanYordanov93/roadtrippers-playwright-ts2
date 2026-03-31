# Roadtrippers — Playwright + TypeScript + AskUI + Cucumber BDD

End-to-end test suite for [maps.roadtrippers.com](https://maps.roadtrippers.com)  
using **Playwright**, **TypeScript**, **AskUI** (visual AI), and **Cucumber BDD**.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Setup and Installation](#setup-and-installation)
5. [Configuration](#configuration)
6. [Executing Tests — Complete Guide](#executing-tests--complete-guide)
   - [Playwright Tests](#playwright-tests-spec-files)
   - [BDD Tests (Cucumber)](#bdd-tests-cucumber)
   - [Execution Matrix](#execution-matrix)
7. [Test Cases](#test-cases)
8. [BDD Layer](#bdd-layer)
9. [Page Object Model](#page-object-model)
10. [AskUI Integration](#askui-integration)
11. [Reports](#reports)
12. [CI/CD](#cicd)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Two Test Entry Points                            │
│                                                                          │
│   Playwright Specs (.spec.ts)         BDD Scenarios (.feature)          │
│   tc001-happy-path.spec.ts      ←→   trip-creation.feature              │
│   tc002-edge-cases.spec.ts      ←→   edge-cases.feature                 │
│   tc003-error.noauth.spec.ts    ←→   authentication.feature             │
│   tc004-trip-mgmt.spec.ts       ←→   trip-management.feature            │
└────────────────────┬───────────────────────────────┬────────────────────┘
                     │ both use identical             │
┌────────────────────▼───────────────────────────────▼────────────────────┐
│                       Page Object Model (POM)                            │
│              BasePage → LoginPage / MapPage / TripPlannerPage            │
│                              MyTripsPage                                 │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │ visual checks delegated to
┌────────────────────▼─────────────────────────────────────────────────────┐
│                   AskUI Visual Testing Bridge                             │
│     Canvas validation  •  Visual regression  •  AI element detection     │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │ controls
┌────────────────────▼─────────────────────────────────────────────────────┐
│                  Playwright Browser Engine                                │
│               Chromium  │  Firefox  │  WebKit                            │
└──────────────────────────────────────────────────────────────────────────┘
```

Both layers use **identical page object classes** — zero code duplication.

| | Playwright Specs | Cucumber BDD |
|---|---|---|
| **Audience** | Developers | Developers + QA + Business |
| **Syntax** | TypeScript | Gherkin (plain English) |
| **Run command** | `npm test` | `npm run bdd` |
| **Reports** | HTML + Trace | HTML + JSON + Allure |
| **Tag filter** | `--grep @smoke` | `--tags @smoke` |

---

## Project Structure

```
roadtrippers-playwright/
│
├── src/
│   ├── pages/                        # Page Object Model (shared by both layers)
│   │   ├── BasePage.ts               # Abstract base: waits, cookie banner, utils
│   │   ├── LoginPage.ts              # /login — email, password, submit, errors
│   │   ├── MapPage.ts                # Map shell — toolbar, create trip, search
│   │   ├── TripPlannerPage.ts        # Trip name, waypoints, save/discard
│   │   ├── MyTripsPage.ts            # My Trips panel
│   │   └── index.ts
│   │
│   ├── tests/                        # Playwright spec files
│   │   ├── auth.setup.ts             # Login once → save browser session
│   │   ├── tc001-happy-path.spec.ts
│   │   ├── tc002-edge-cases.spec.ts
│   │   ├── tc003-error-scenarios.noauth.spec.ts
│   │   └── tc004-trip-management.spec.ts
│   │
│   ├── bdd/                          # ★ Cucumber BDD layer
│   │   ├── features/                 # Gherkin scenarios
│   │   │   ├── trip-creation.feature
│   │   │   ├── edge-cases.feature
│   │   │   ├── authentication.feature
│   │   │   └── trip-management.feature
│   │   │
│   │   ├── steps/                    # Step definitions (Given/When/Then)
│   │   │   ├── common.steps.ts           # Map, canvas, timing
│   │   │   ├── trip-creation.steps.ts    # Trip, waypoint, save
│   │   │   ├── authentication.steps.ts   # Login, errors, redirects
│   │   │   └── trip-management.steps.ts  # Toolbar, My Trips panel
│   │   │
│   │   ├── world/world.ts            # Cucumber World: browser + page objects
│   │   ├── hooks/hooks.ts            # Before/After: launch, teardown, screenshots
│   │   └── support/env.ts            # dotenv bootstrap
│   │
│   ├── fixtures/
│   │   ├── page-fixtures.ts          # Custom Playwright test() with POM
│   │   └── test-data.ts              # Trip data, credentials
│   │
│   ├── utils/askui-helper.ts         # AskUI visual testing bridge
│   └── types/index.ts                # Shared TypeScript interfaces
│
├── config/
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   └── state/auth.json               # Saved session (gitignored)
│
├── reports/                          # Generated (gitignored)
│   ├── html/                         # Playwright HTML
│   ├── cucumber/report.html          # Cucumber HTML
│   ├── cucumber/results.json
│   ├── cucumber/junit.xml
│   ├── allure-results/
│   └── screenshots/
│
├── cucumber.js                       # Cucumber configuration
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | >= 18.x LTS | `node --version` |
| npm | >= 9.x | `npm --version` |
| Roadtrippers account | Free | roadtrippers.com |
| AskUI account | Optional | app.askui.com |

---

## Setup and Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd roadtrippers-playwright
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Playwright browsers

```bash
# All browsers
npx playwright install --with-deps

# Chromium only (faster)
npx playwright install --with-deps chromium
```

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required — create a test account at roadtrippers.com
TEST_EMAIL=your-test@example.com
TEST_PASSWORD=your-test-password

# Optional — AskUI visual AI (tests gracefully degrade without it)
ASKUI_WORKSPACE_ID=your-workspace-id
ASKUI_TOKEN=your-token

# Browser settings
HEADLESS=true
BASE_URL=https://maps.roadtrippers.com
```

### 5. Save authentication state

```bash
npx playwright test --project=setup
```

Logs in once and saves the browser session to `config/state/auth.json`.  
All subsequent tests reuse this session — no redundant logins.

### 6. Verify the setup

```bash
npm run type-check        # TypeScript check — no browser
npm run bdd:dry-run       # Gherkin validation — no browser
```

---

## Configuration

### Playwright (`playwright.config.ts`)

| Setting | Value | Purpose |
|---|---|---|
| `baseURL` | `https://maps.roadtrippers.com` | Resolves all `goto('/')` calls |
| `storageState` | `config/state/auth.json` | Pre-loaded session for all tests |
| `timeout` | 60 000 ms | Map SPA slow on first load |
| `retries` | 2 (CI) / 1 (local) | Handles transient network issues |

### Cucumber (`cucumber.js`) — profiles

| Profile | Purpose |
|---|---|
| `default` | Headless, all features, progress bar output |
| `headed` | Headed browser, human-readable output |
| `smoke` | `@smoke` tags only |
| `ci` | JUnit + Allure output, 2 retries |

---

## Executing Tests — Complete Guide

### Prerequisites checklist before running

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install --with-deps chromium

# 3. Configure credentials
cat .env.local | grep TEST_EMAIL        # must show your email

# 4. Create auth session (required for @auth tests)
npx playwright test --project=setup
ls config/state/auth.json              # must exist
```

---

### Playwright Tests (`.spec` files)

#### Run all tests

```bash
npm test
```

#### Run on a specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```WW

#### Run by tag

```bash
npm run test:smoke          # @smoke — fastest, critical path
npm run test:happy          # @happy — all success flows
npm run test:edge           # @edge  — boundary conditions
npm run test:error          # @error — failure scenarios
```

#### Run a single spec file

```bash
npx playwright test src/tests/tc001-happy-path.spec.ts
npx playwright test src/tests/tc002-edge-cases.spec.ts
npx playwright test src/tests/tc003-error-scenarios.noauth.spec.ts
npx playwright test src/tests/tc004-trip-management.spec.ts
```

#### Run a specific test by title

```bash
npx playwright test --grep "create trip, add waypoints"
npx playwright test --grep "canvas dimensions"
```

#### Headed mode (watch the browser)

```bash
npm run test:headed
```

#### Interactive UI mode (test picker and trace viewer)

```bash
npm run test:ui
```

#### Debug mode (step through with DevTools)

```bash
npm run test:debug
npx playwright test src/tests/tc001-happy-path.spec.ts --debug
```

#### Re-run only failed tests

```bash
npx playwright test --last-failed
```

#### View HTML report after a run

```bash
npm run report
```

---

### BDD Tests (Cucumber)

#### Run all BDD scenarios

```bash
npm run bdd
```

#### Run with a profile

```bash
npm run bdd:smoke           # @smoke scenarios only
npm run bdd:happy           # @happy scenarios only
npm run bdd:edge            # @edge scenarios only
npm run bdd:error           # @error scenarios only
npm run bdd:headed          # headed browser, human-readable output

# CI profile (JUnit + Allure output)
npx cucumber-js --profile ci
```

#### Filter by tag

```bash
npx cucumber-js --tags @smoke
npx cucumber-js --tags @happy
npx cucumber-js --tags @edge
npx cucumber-js --tags @error
npx cucumber-js --tags "@auth"
npx cucumber-js --tags "@noauth"

# Combine tags
npx cucumber-js --tags "@happy and @smoke"
npx cucumber-js --tags "@happy or @edge"
npx cucumber-js --tags "not @auth"
```

#### Run a single feature file

```bash
npx cucumber-js src/bdd/features/trip-creation.feature
npx cucumber-js src/bdd/features/authentication.feature
npx cucumber-js src/bdd/features/edge-cases.feature
npx cucumber-js src/bdd/features/trip-management.feature
```

#### Run a specific scenario by name

```bash
npx cucumber-js --name "Create and save a multi-waypoint trip"
npx cucumber-js --name "Login with invalid credentials"
npx cucumber-js --name "Adding and removing a waypoint"
```

#### Run a scenario by file and line number

```bash
# Scenario at line 24 in the feature file
npx cucumber-js src/bdd/features/trip-creation.feature:24
```

#### Dry run — validate steps without a browser

```bash
npm run bdd:dry-run
```

Shows any Gherkin steps that have no matching step definition.

#### Debug mode — PWDEBUG pauses Playwright on each action

```bash
npm run bdd:debug
PWDEBUG=1 npx cucumber-js --tags @smoke
```

#### Headed + single scenario

```bash
HEADLESS=false npx cucumber-js --profile headed --name "Create and save a multi-waypoint trip"
```

#### Generate and view Allure report

```bash
npm run bdd:report
# or step by step:
npx allure generate reports/allure-results --clean -o reports/allure-report
npx allure open reports/allure-report
```

---

### Execution Matrix

| Goal | Command | Approx. time |
|---|---|---|
| Run everything | `npm test && npm run bdd` | ~10 min |
| Smoke — Playwright | `npm run test:smoke` | ~2 min |
| Smoke — BDD | `npm run bdd:smoke` | ~3 min |
| Happy path — BDD | `npm run bdd:happy` | ~4 min |
| Error scenarios — BDD | `npm run bdd:error` | ~2 min |
| Single feature | `npx cucumber-js src/bdd/features/trip-creation.feature` | ~3 min |
| Validate steps only | `npm run bdd:dry-run` | ~5 sec |
| Auth setup | `npx playwright test --project=setup` | ~30 sec |

### Useful flag combinations

```bash
# BDD headed, smoke only, pretty output
HEADLESS=false npx cucumber-js --profile headed --tags @smoke

# BDD with all report formats + retry
npx cucumber-js --profile ci --tags "@happy or @smoke"

# Playwright: chromium only, verbose, no retries
npx playwright test --project=chromium --retries=0 --reporter=line

# Playwright: run then open report
npx playwright test && npx playwright show-report reports/html
```

---

## Test Cases

### Playwright Specs

| TC | File | Tags | Scenarios |
|---|---|---|---|
| TC-001 | `tc001-happy-path.spec.ts` | `@happy @smoke` | Create trip, autocomplete, canvas dimensions |
| TC-002 | `tc002-edge-cases.spec.ts` | `@edge` | Long name, special chars, add/remove, no results, cancel |
| TC-003 | `tc003-error-scenarios.noauth.spec.ts` | `@error` | Wrong password, empty form, unauthenticated access |
| TC-004 | `tc004-trip-management.spec.ts` | `@happy @edge @error` | Save validation, toolbar nav, canvas integrity |

### BDD Scenarios

| Feature | Tag | Scenarios |
|---|---|---|
| `trip-creation.feature` | `@happy @auth` | 5 scenarios + 3 data-driven rows |
| `edge-cases.feature` | `@edge @auth` | 6 scenarios |
| `authentication.feature` | `@error @noauth` | 7 scenarios + 4 data-driven rows |
| `trip-management.feature` | `@auth` | 5 scenarios |

---

## BDD Layer

### Cucumber World

Each scenario gets a fresh `RoadtrippersWorld` instance with:

```typescript
this.page                    // Playwright Page
this.pages.loginPage         // LoginPage POM
this.pages.mapPage           // MapPage POM
this.pages.tripPlannerPage   // TripPlannerPage POM
this.pages.myTripsPage       // MyTripsPage POM
this.pages.askUI             // AskUIHelper
this.scenario                // Mutable context: { tripName, waypointCount, lastError }
```

### Tags

| Tag | Meaning |
|---|---|
| `@smoke` | Fast, critical path — run on every commit |
| `@happy` | Successful user flows |
| `@edge` | Boundary and non-standard inputs |
| `@error` | Failure and validation scenarios |
| `@auth` | Requires saved login session — auto-asserted in `Before @auth` |
| `@noauth` | Must run without auth — hooks strip session before scenario |

### Hooks execution order

```
BeforeAll  → create output directories
Before     → launch browser, goto '/', dismiss cookie banner
Before @noauth (order 1) → strip auth state from context
Before @auth   → assert browser is authenticated
  [scenario steps run]
After      → screenshot on failure, close browser
After @noauth (order 1) → restore auth state
AfterAll   → summary log
```

### Step definitions

```
common.steps.ts           → Map load, canvas check, timing, error absence
trip-creation.steps.ts    → Create trip, name it, add/remove waypoints, save
authentication.steps.ts   → Navigate to login, enter creds, submit, assert errors
trip-management.steps.ts  → Toolbar tabs, My Trips panel
```

---

## Page Object Model

All pages extend `BasePage`:

```typescript
await this.safeClick(locator);               // wait visible, scroll, click
await this.typeSlowly(locator, 'Chicago');   // pressSequentially — triggers autocomplete
await this.dismissCookieBanner();            // GDPR alertdialog pattern
await this.screenshot('my-step');            // save PNG to reports/screenshots/
```

### Locator priority

1. Semantic role — `getByRole('button', { name: 'Create a trip' })`
2. Accessible name — `getByRole('searchbox', { name: 'Search and Explore' })`
3. ARIA label — `locator('[aria-label*="stop" i]')`
4. Data test ID — `locator('[data-testid="waypoint-item"]')`
5. CSS class pattern — `locator('[class*="TripCard"]')` — last resort

Selectors verified against the live site on **2026-02-18**.

---

## AskUI Integration

| Use Case | Why AskUI |
|---|---|
| Mapbox GL canvas validation | Canvas pixels not visible to DOM inspection |
| Visual regression | Baseline-vs-current screenshot comparison |
| Image-only buttons | No accessible text to target |

Without credentials, all AskUI calls fall back to Playwright automatically.

### Setup

```bash
# 1. Register at app.askui.com
# 2. Add to .env.local:
ASKUI_WORKSPACE_ID=your-workspace-id
ASKUI_TOKEN=your-token
```

---

## Reports

### Playwright

```bash
npm run report                          # open HTML report
npx playwright show-trace test-results/**/trace.zip
```

### Cucumber / BDD

```bash
open reports/cucumber/report.html       # built-in HTML report

# Rich interactive Allure report
npm run bdd:report
```

| Report | Path | Format |
|---|---|---|
| Playwright HTML | `reports/html/` | HTML + trace viewer |
| Cucumber HTML | `reports/cucumber/report.html` | HTML |
| Cucumber JSON | `reports/cucumber/results.json` | JSON |
| Cucumber JUnit | `reports/cucumber/junit.xml` | XML |
| Allure HTML | `reports/allure-report/` | Interactive HTML |
| Screenshots | `reports/screenshots/` | PNG |

---

## CI/CD

GitHub Actions runs on every push to `main` and `develop`:

```
push → lint
     → Playwright tests (chromium + firefox)
     → BDD tests (cucumber, chromium)
     → artifact upload (reports + screenshots)

nightly 02:00 UTC → smoke tests only
```

### GitHub Secrets

`Settings → Secrets and variables → Actions`

| Secret | Required |
|---|---|
| `TEST_EMAIL` | Yes |
| `TEST_PASSWORD` | Yes |
| `ASKUI_WORKSPACE_ID` | Optional |
| `ASKUI_TOKEN` | Optional |

---

## Troubleshooting

### "Auth state not found" — tests redirect to /login

```bash
npx playwright test --project=setup
ls config/state/auth.json              # must exist
```

### Cucumber step not found / Undefined

```bash
npm run bdd:dry-run                    # shows which steps are missing
```

Output for missing steps:
```
Undefined. Implement with the following snippet:
  When('my missing step', async function () { ... });
```

### Cookie banner blocks tests

`BasePage.dismissCookieBanner()` handles this. If the banner structure changes:

```typescript
// In BasePage.ts — update the locator
const acceptBtn = banner.getByRole('button', { name: /accept all cookies/i });
```

### Autocomplete does not appear

Increase the typing delay in `TripPlannerPage.ts`:

```typescript
await input.pressSequentially(text, { delay: 150 });  // default: 80ms
```

### TypeScript errors

```bash
npm run type-check
npm run lint:fix
```

### Scenarios hang / time out

```bash
# Step through with DevTools
PWDEBUG=1 npx cucumber-js --tags @smoke

# Or watch in headed mode
HEADLESS=false npx cucumber-js --profile headed --name "my scenario"
```

### AskUI credentials missing

Tests continue with Playwright fallbacks — no failures. To enable AskUI:

```bash
echo $ASKUI_WORKSPACE_ID    # must print a value
echo $ASKUI_TOKEN           # must print a value
```

---

## Contributing

1. Branch: `git checkout -b feat/new-scenario`
2. Add a Gherkin scenario in `src/bdd/features/`
3. Add step definitions in `src/bdd/steps/` — reuse existing steps
4. Tag with at least one of: `@smoke` `@happy` `@edge` `@error`
5. Run `npm run bdd:dry-run` — all steps must be defined
6. Run `npm run type-check && npm run lint` before committing
7. PR description: what is tested, why, and expected outcome

---

*Selectors verified against live production site: 2026-02-18*  
*Playwright 1.41+ · TypeScript 5.3+ · Cucumber 10.3+ · AskUI 0.20+*
