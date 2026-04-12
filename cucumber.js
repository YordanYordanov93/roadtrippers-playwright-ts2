// cucumber.js  – Cucumber-JS configuration

const common = {
  require: [
    'src/bdd/support/env.ts',
    'src/bdd/world/world.ts',
    'src/bdd/hooks/hooks.ts',
    'src/bdd/steps/common.steps.ts',
    'src/bdd/steps/authentication.steps.ts',
    'src/bdd/steps/trip-creation.steps.ts',
    'src/bdd/steps/trip-management.steps.ts',
  ],
  requireModule: ['tsx/cjs'],
  format: [
    'progress-bar',
    'json:reports/cucumber/results.json',
    'html:reports/cucumber/report.html',
    'allure-cucumberjs/reporter',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
    resultsDir: 'reports/allure-results',
  },
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
  default: {
    ...headless,
    paths: [
      'src/bdd/features/authentication.feature',
      'src/bdd/features/edge-cases.feature',
      'src/bdd/features/trip-creation.feature',
      'src/bdd/features/trip-management.feature',
    ],
    parallel: 1,
    retry: 1,
  },

  headed: {
    ...headed,
    paths: [
      'src/bdd/features/authentication.feature',
      'src/bdd/features/edge-cases.feature',
      'src/bdd/features/trip-creation.feature',
      'src/bdd/features/trip-management.feature',
    ],
    parallel: 1,
  },

  smoke: {
    ...headless,
    paths: [
      'src/bdd/features/authentication.feature',
      'src/bdd/features/edge-cases.feature',
      'src/bdd/features/trip-creation.feature',
      'src/bdd/features/trip-management.feature',
    ],
    tags: '@smoke',
    parallel: 1,
  },

  ci: {
    ...headless,
    paths: [
      'src/bdd/features/authentication.feature',
      'src/bdd/features/edge-cases.feature',
      'src/bdd/features/trip-creation.feature',
      'src/bdd/features/trip-management.feature',
    ],
    parallel: 1,
    retry: 2,
    format: [
      'progress-bar',
      'json:reports/cucumber/results.json',
      'junit:reports/cucumber/junit.xml',
      'allure-cucumberjs/reporter',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
      resultsDir: 'reports/allure-results',
    },
  },
};