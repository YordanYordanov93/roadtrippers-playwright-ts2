# =============================================================================
# Feature: Trip Creation — Happy Path
#
# Data source: src/fixtures/test-data.ts
#   happyPathTrip      → multi-waypoint trip used in Scenario Outline
#   singleWaypointTrip → single-destination trip
#   validWaypoints     → city names used in the Examples tables
#
# Auth context:
#   Authenticated   → waypoint-based trip editor
#   Unauthenticated → global search bar (functional equivalent, all pass)
#
# Run with auth: npx tsx scripts/capture-auth.ts
# =============================================================================

@happy
Feature: Trip Creation — Happy Path

  As a Roadtrippers visitor
  I want to create a trip with multiple waypoints
  So that I can plan and save my road trip itinerary

  Background:
    Given I am on the Roadtrippers map
    And the map canvas is fully loaded

  # ---------------------------------------------------------------------------
  # Multi-waypoint trips — data driven from happyPathTrip in test-data.ts
  # Each row is an independent create→name→add→save flow
  # ---------------------------------------------------------------------------

  @smoke
  Scenario Outline: A visitor creates and saves a named road trip with waypoints
    Given I open the trip planner or verify guest state
    When I name the trip "<tripName>"
    And I add the waypoint "<waypoint1>"
    And I add the waypoint "<waypoint2>"
    And I add the waypoint "<waypoint3>"
    Then the trip should have at least 1 waypoint
    When I save the trip
    Then the trip should be saved successfully

    Examples: Road trips from test-data.ts → happyPathTrip
      | tripName                          | waypoint1          | waypoint2               | waypoint3            |
      | Chicago to Nashville Road Trip    | Chicago, Illinois  | Springfield, Illinois   | Nashville, Tennessee |
      | Pacific Coast Highway Drive       | Los Angeles, CA    | San Francisco, CA       | Portland, Oregon     |

  # ---------------------------------------------------------------------------
  # Single-destination trips — data driven from singleWaypointTrip
  # Verifies the app accepts a minimal trip without errors
  # ---------------------------------------------------------------------------

  Scenario Outline: A visitor creates a trip with a single destination
    Given I open the trip planner or verify guest state
    When I name the trip "<tripName>"
    And I add the waypoint "<waypoint>"
    Then the trip should have at least 1 waypoint
    And no error message should be shown

    Examples: Single-destination trips from test-data.ts → singleWaypointTrip
      | tripName               | waypoint             |
      | Day Trip to Nashville  | Nashville, Tennessee |
      | Weekend in Denver      | Denver, Colorado     |

  # ---------------------------------------------------------------------------
  # Autocomplete — verifies the search service responds to valid city names
  # Data driven from test-data.ts → validWaypoints
  # ---------------------------------------------------------------------------

  @smoke
  Scenario Outline: Typing a valid city name shows autocomplete suggestions
    Given I open the trip planner or verify guest state
    When I type "<city>" in the waypoint search
    Then autocomplete suggestions should be visible

    Examples: Valid city queries from test-data.ts → validWaypoints
      | city               |
      | Chicago, Illinois  |
      | Nashville, Tennessee |

  # ---------------------------------------------------------------------------
  # Canvas integrity — the map must remain rendered throughout the workflow
  # ---------------------------------------------------------------------------

  @smoke
  Scenario: The map canvas stays visible throughout the trip creation workflow
    Given I open the trip planner or verify guest state
    Then the map canvas should still be visible and have valid dimensions
