import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup – runs ONCE before the entire test suite.
 *
 * Creates the output directories needed for reports and screenshots.
 * The auth state file is created by auth.setup.ts (the 'setup' project).
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('\n🚀 Roadtrippers Test Suite — Global Setup');
  console.log(`   Base URL: ${config.projects[0]?.use?.baseURL ?? 'https://maps.roadtrippers.com'}`);

  // Ensure output directories exist
  const dirs = [
    'reports/html',
    'reports/json',
    'reports/junit',
    'reports/screenshots',
    'config/state',
    'test-results',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.resolve(process.cwd(), dir), { recursive: true });
  }

  // Ensure auth.json exists with empty state so Playwright doesn't crash
  // before auth.setup.ts runs and populates it with real credentials.
  const authFile = path.resolve(process.cwd(), 'config/state/auth.json');
  if (!fs.existsSync(authFile)) {
    fs.writeFileSync(authFile, '{"cookies":[],"origins":[]}');
    console.log('   ✅ Created empty auth.json (will be populated by setup project)');
  }

  console.log('   ✅ Output directories created');
}

export default globalSetup;