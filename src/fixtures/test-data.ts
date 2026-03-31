import type { TripData, TestCredentials, TripTestScenario } from '../types';

// ─── Test credentials ──────────────────────────────────────────────────────────
// Real values come from environment variables — never hardcode.

export const validCredentials = (): TestCredentials => ({
  email:    process.env.TEST_EMAIL    ?? 'test@example.com',
  password: process.env.TEST_PASSWORD ?? 'Test@12345',
});

export const invalidCredentials: TestCredentials = {
  email:    'invalid@example.com',
  password: 'WrongPassword!',
};

export const emptyCredentials: TestCredentials = {
  email:    '',
  password: '',
};

export const validEmailBadPassword: TestCredentials = {
  email:    process.env.TEST_EMAIL ?? 'test@example.com',
  password: 'definitely-wrong-password',
};

// ─── Trip data ────────────────────────────────────────────────────────────────

export const happyPathTrip: TripData = {
  name:      'Chicago to Nashville Road Trip',
  waypoints: ['Chicago, Illinois', 'Springfield, Illinois', 'Nashville, Tennessee'],
};

export const singleWaypointTrip: TripData = {
  name:      'Day Trip to Nashville',
  waypoints: ['Nashville, Tennessee'],
};

export const tripWithoutName: TripData = {
  name:      '',    // intentionally blank — tests validation
  waypoints: ['Denver, Colorado'],
};

export const longNameTrip: TripData = {
  name:      'A'.repeat(200),   // edge case: very long name
  waypoints: ['Phoenix, Arizona'],
};

export const specialCharacterTrip: TripData = {
  name:      'Trip with "quotes" & <special> chars',
  waypoints: ['Austin, Texas'],
};

// ─── Waypoint queries ─────────────────────────────────────────────────────────

export const validWaypoints = [
  { text: 'Chicago, Illinois',    index: 0 },
  { text: 'Nashville, Tennessee', index: 0 },
  { text: 'Denver, Colorado',     index: 0 },
  { text: 'Austin, Texas',        index: 0 },
];

export const invalidWaypoint = {
  text:  'ZZZZNOTAREALPLACEQQQQ',
  index: 0,
};

// ─── Test scenarios matrix ────────────────────────────────────────────────────

export const tripScenarios: TripTestScenario[] = [
  {
    tag:            '@happy @smoke',
    description:    'Create a trip with multiple waypoints and save',
    trip:           happyPathTrip,
    expectedResult: 'success',
  },
  {
    tag:            '@edge',
    description:    'Create a trip with a single waypoint',
    trip:           singleWaypointTrip,
    expectedResult: 'success',
  },
  {
    tag:            '@error',
    description:    'Attempt to save a trip without a name',
    trip:           tripWithoutName,
    expectedResult: 'validation-error',
  },
];
