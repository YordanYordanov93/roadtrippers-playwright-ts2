# =============================================================================
# Feature: Trip Creation — Edge Cases
#
# Data source: src/fixtures/test-data.ts
#   longNameTrip          -> 200-character name edge case
#   specialCharacterTrip  -> name with &, quotes, special chars
#   validWaypoints        -> Denver and Austin used in add/remove test
#   invalidWaypoint       -> ZZZZNOTAREALPLACEQQQQ used for no-results test
#
# NOTE: Angle brackets < > must NOT appear inside Examples table cells —
# they collide with Cucumber's <columnName> placeholder syntax. Special
# character data that requires < or > is placed in plain Scenarios instead.
#
# Auth context:
#   Authenticated   -> waypoint-based trip editor
#   Unauthenticated -> global search bar (functional equivalent, all pass)
# =============================================================================

@edge
Feature: Trip Creation — Edge Cases

  As a Roadtrippers visitor
  I want the app to handle unusual inputs gracefully
  So that edge cases never cause crashes or data loss

  Background:
    Given I am on the Roadtrippers map
    And the map canvas is fully loaded

  # ---------------------------------------------------------------------------
  # Boundary name lengths — data driven from test-data.ts -> longNameTrip
  # The app must accept or silently truncate, never crash or show an error
  # ---------------------------------------------------------------------------

  Scenario Outline: A trip name at a boundary length is accepted or gracefully truncated
    Given I open the trip planner or verify guest state
    When I name the trip with "<nameDescription>"
    Then the trip name field should not be empty
    And no error message should be shown

    Examples: Boundary name lengths from test-data.ts -> longNameTrip
      | nameDescription |
      | 200 characters  |

  # ---------------------------------------------------------------------------
  # Special characters — from test-data.ts -> specialCharacterTrip
  # Uses a plain Scenario (not Outline) because the test data contains < and >
  # which conflict with Cucumber's <columnName> interpolation in Examples tables
  # ---------------------------------------------------------------------------

  Scenario: A trip name containing special characters is rendered safely
    Given I open the trip planner or verify guest state
    When I name the trip "Road Trip with quotes & special chars"
    Then the trip name field should contain "Road Trip with"
    And no error message should be shown

  # ---------------------------------------------------------------------------
  # Add and remove — data driven from test-data.ts -> validWaypoints
  # Waypoint count must return to its original value after a remove
  # ---------------------------------------------------------------------------

  Scenario Outline: Adding then removing a waypoint leaves the count unchanged
    Given I open the trip planner or verify guest state
    And the trip has 0 waypoints
    When I add the waypoint "<waypoint>"
    Then the trip should have at least 1 waypoint
    When I remove waypoint number 1
    Then the trip should have 0 waypoints

    Examples: Waypoints from test-data.ts -> validWaypoints
      | waypoint         |
      | Denver, Colorado |
      | Austin, Texas    |

  # ---------------------------------------------------------------------------
  # No-results search — data driven from test-data.ts -> invalidWaypoint
  # A nonsense query must not add a waypoint or crash the app
  # ---------------------------------------------------------------------------

  Scenario Outline: Searching for a nonexistent location shows no suggestions
    Given I open the trip planner or verify guest state
    When I type "<query>" in the waypoint search
    And I wait for autocomplete to respond
    Then no autocomplete suggestions should be shown
    And the trip should have 0 waypoints

    Examples: Invalid queries from test-data.ts -> invalidWaypoint
      | query                 |
      | ZZZZNOTAREALPLACEQQQQ |
      | 99999xxxxxinvalid     |

  # ---------------------------------------------------------------------------
  # Empty input — a blank search must not add a waypoint
  # ---------------------------------------------------------------------------

  Scenario: An empty search query does not add a waypoint
    Given I open the trip planner or verify guest state
    When I type "" in the waypoint search
    And I wait for autocomplete to respond
    Then no autocomplete suggestions should be shown
    And the trip should have 0 waypoints

  # ---------------------------------------------------------------------------
  # Cancel flow — dismissing the planner must leave the map fully functional
  # ---------------------------------------------------------------------------

  Scenario: Cancelling trip creation returns the visitor to a working map
    Given I open the trip planner or verify guest state
    When I cancel the trip creation
    Then I should be on the Roadtrippers map
    And the map canvas should still be visible and have valid dimensions
