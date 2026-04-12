// Run this with: node debug-bdd.js
// It mimics exactly what cucumber.js does and shows any crash

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.message);
    console.error(err.stack);
  });
  
  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
  });
  
  try {
    console.log('Step 1: Loading tsx/cjs...');
    require('tsx/cjs');
    console.log('  OK');
  } catch(e) {
    console.error('  FAILED:', e.message);
    process.exit(1);
  }
  
  try {
    console.log('Step 2: Loading env.ts...');
    require('./src/bdd/support/env.ts');
    console.log('  OK');
  } catch(e) {
    console.error('  FAILED:', e.message);
    process.exit(1);
  }
  
  try {
    console.log('Step 3: Loading world.ts...');
    require('./src/bdd/world/world.ts');
    console.log('  OK');
  } catch(e) {
    console.error('  FAILED:', e.message);
    process.exit(1);
  }
  
  try {
    console.log('Step 4: Loading hooks.ts...');
    require('./src/bdd/hooks/hooks.ts');
    console.log('  OK');
  } catch(e) {
    console.error('  FAILED:', e.message);
    process.exit(1);
  }
  
  try {
    console.log('Step 5: Loading common.steps.ts...');
    require('./src/bdd/steps/common.steps.ts');
    console.log('  OK');
  } catch(e) {
    console.error('  FAILED:', e.message);
    process.exit(1);
  }
  
  try {
    console.log('Step 6: Loading authentication.steps.ts...');
    require('./src/bdd/steps/authentication.steps.ts');
    console.log('  OK');
  } catch(e) {
    console.error('  FAILED:', e.message);
    process.exit(1);
  }
  
  try {
    console.log('Step 7: Loading trip-creation.steps.ts...');
    require('./src/bdd/steps/trip-creation.steps.ts');
    console.log('  OK');
  } catch(e) {
    console.error('  FAILED:', e.message);
    process.exit(1);
  }
  
  try {
    console.log('Step 8: Loading trip-management.steps.ts...');
    require('./src/bdd/steps/trip-management.steps.ts');
    console.log('  OK');
  } catch(e) {
    console.error('  FAILED:', e.message);
    process.exit(1);
  }
  
  console.log('\nAll files loaded successfully!');