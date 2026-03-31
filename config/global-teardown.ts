import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log('\n✅ Roadtrippers Test Suite — Global Teardown complete');
}

export default globalTeardown;
