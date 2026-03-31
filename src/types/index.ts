export interface TestCredentials {
  email: string;
  password: string;
}

export interface WaypointSuggestion {
  text: string;
  index?: number;
}

export interface TripData {
  name: string;
  waypoints: string[];
}

export type TripExpectedResult = 'success' | 'validation-error' | 'auth-required';

export interface TripTestScenario {
  tag: string;
  description: string;
  trip: TripData;
  expectedResult: TripExpectedResult;
}
