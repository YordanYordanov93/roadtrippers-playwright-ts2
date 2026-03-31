/// <reference types="node" />
/**
 * support/env.ts – Environment bootstrap for Cucumber runs
 *
 * Loaded first via the `require` array in cucumber.js.
 * Ensures dotenv is loaded and output directories exist before any test runs.
 */
import * as dotenv from 'dotenv';
import * as path   from 'path';
import * as fs     from 'fs';
import { setDefaultTimeout } from '@cucumber/cucumber';

// Set global step/hook timeout to 60 seconds. Some navigations (login, map load)
// can be slow depending on network and live site behaviour. 30s was causing
// intermittent "function timed out" failures such as the invalid-credentials
// scenario.
setDefaultTimeout(60_000);

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Guarantee output directories exist (BeforeAll may not run before format writers)
const dirs = [
  'reports/cucumber',
  'reports/allure-results',
  'reports/screenshots',
  'config/state',
];
for (const dir of dirs) {
  fs.mkdirSync(path.resolve(process.cwd(), dir), { recursive: true });
}

export {};