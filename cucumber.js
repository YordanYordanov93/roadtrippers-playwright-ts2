// cucumber.js  – Cucumber-JS configuration
// Docs: https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
const common = {
  require: [
    'src/bdd/world/world.ts',     // World (browser + page objects)
    'src/bdd/hooks/hooks.ts',     // Before / After hooks
    'src/bdd/steps/**/*.ts',      // All step definitions
    'src/bdd/support/**/*.ts',    // Support utilities
  ],
  requireModule: ['ts-node/register'],
  timeout: 30000,                 // 30 s default for all steps and hooks
  format: [
    'progress-bar',                                     // compact progress bar
    '@cucumber/pretty-formatter',                       // readable step output
    'json:reports/cucumber/results.json',               // JSON for post-processing
    'html:reports/cucumber/report.html',                // built-in HTML report
  ],
  formatOptions: {
    snippetInterface: 'async-await',
  },
  plugins: [
    {
      plugin: 'allure-cucumberjs/reporter',             // Allure rich report
      options: {
        resultsDir: 'reports/allure-results',
      },
    },
  ],
};

const headless = {
  ...common,
  worldParameters: { headless: true },
};

const headed = {
  ...common,
  worldParameters: { headless: false },
};

module.exports = {
  // Default profile – headless
  default: {
    ...headless,
    paths: ['src/bdd/features/**/*.feature'],
    parallel: 1,          // sequential – auth session is shared
    retry: 1,             // retry once on flaky network
  },
  // Headed profile for local debugging
  headed: {
    ...headed,
    paths: ['src/bdd/features/**/*.feature'],
    parallel: 1,
  },
  // Smoke only
  smoke: {
    ...headless,
    paths: ['src/bdd/features/**/*.feature'],
    tags: '@smoke',
    parallel: 1,
  },
  // CI profile – fail fast + JUnit output
  ci: {
    ...headless,
    paths: ['src/bdd/features/**/*.feature'],
    parallel: 1,
    retry: 2,
    format: [
      'progress-bar',
      'json:reports/cucumber/results.json',
      'junit:reports/cucumber/junit.xml',              // Jenkins / GitHub Actions
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    plugins: [
      {
        plugin: 'allure-cucumberjs/reporter',           // Allure rich report
        options: {
          resultsDir: 'reports/allure-results',
        },
      },
    ],
  },
};