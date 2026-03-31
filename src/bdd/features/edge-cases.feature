# ─────────────────────────────────────────────────────────────────────────────
# Feature: Trip Creation — Edge Cases
#
# Tests boundary conditions and non-standard inputs that should be handled
# gracefully without crashing the application or corrupting state.
# ─────────────────────────────────────────────────────────────────────────────

@edge @auth
Feature: Trip Creation — Edge Cases

  As a registered Roadtrippers user
  I want the app to handle unusual inputs gracefully
  So that I never lose my trip data due to edge-case failures

  Background:
    Given I am on the Roadtrippers map
    And the map canvas is fully loaded
    And I click "Create a trip"
    And the trip planner panel opens

  # ── Edge 1: Very long trip name ──────────────────────────────────────────────

  Scenario: Trip name with 200 characters is accepted or gracefully truncated
    When I name the trip with 200 characters
    Then the trip name field should not be empty
    And no error message should be shown

  # ── Edge 2: Special characters ───────────────────────────────────────────────

  Scenario: Trip name containing special characters is rendered safely
    When I name the trip "Road Trip with <special> & \"quotes\""
    Then the trip name field should contain "Road Trip with"
    And no error message should be shown

  # ── Edge 3: Add then remove a waypoint ───────────────────────────────────────

  Scenario: Adding and removing a waypoint returns the count to the original value
    Given the trip has 0 waypoints
    When I add the waypoint "Denver, Colorado"
    Then the trip should have 1 waypoint
    When I remove waypoint number 1
    Then the trip should have 0 waypoints

  # ── Edge 4: Nonexistent location ─────────────────────────────────────────────

  Scenario: Searching for a nonexistent location shows no suggestions
    When I type "ZZZZNOTAREALPLACEQQQQ" in the waypoint search
    And I wait for autocomplete to respond
    Then no autocomplete suggestions should be shown
    And the trip should have 0 waypoints

  # ── Edge 5: Empty search ─────────────────────────────────────────────────────

  Scenario: Searching with an empty query does not add a waypoint
    When I type "" in the waypoint search
    And I wait for autocomplete to respond
    Then no autocomplete suggestions should be shown
    And the trip should have 0 waypoints

  # ── Edge 6: Cancel trip creation ─────────────────────────────────────────────

  Scenario: Cancelling trip creation returns to the map without errors
    When I cancel the trip creation
    Then I should be on the Roadtrippers map
    And the map canvas should still be visible and have valid dimensions
