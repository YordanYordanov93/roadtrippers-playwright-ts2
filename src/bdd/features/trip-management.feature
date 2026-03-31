# ─────────────────────────────────────────────────────────────────────────────
# Feature: Trip Management & Validation
#
# Covers post-creation validation (save without waypoints),
# toolbar navigation, and the My Trips panel.
# ─────────────────────────────────────────────────────────────────────────────

@auth
Feature: Trip Management & Validation

  As a registered Roadtrippers user
  I want the application to validate my trip before saving
  So that I don't save incomplete or invalid trips

  Background:
    Given I am on the Roadtrippers map
    And the map canvas is fully loaded

  # ── Validation: no waypoints ───────────────────────────────────────────────

  @error
  Scenario: Attempting to save a trip with no waypoints shows a validation error
    When I click "Create a trip"
    And the trip planner panel opens
    And I name the trip "Empty Waypoints Trip"
    And I click the save button without adding waypoints
    Then a validation error should appear or the save button should be disabled

  # ── Navigation: toolbar tabs ───────────────────────────────────────────────

  @happy @smoke
  Scenario: All toolbar tabs are interactive and do not break the map
    When I click the "Explore" tab
    And I click the "Itinerary" tab
    And I click the "My trips" tab
    Then the map canvas should still be visible and have valid dimensions

  # ── Navigation: My Trips panel ──────────────────────────────────────────────

  @happy
  Scenario: My trips panel opens when the "My trips" button is clicked
    When I click the "My trips" tab
    Then the My Trips panel should be visible

  # ── Search: global search bar ──────────────────────────────────────────────

  @happy
  Scenario: Global search bar accepts input without crashing the app
    When I type "New York" in the global search bar
    And I wait 2 seconds for search to respond
    Then the map canvas should still be visible and have valid dimensions

  # ── Map canvas integrity ───────────────────────────────────────────────────

  @smoke
  Scenario: Map canvas remains rendered throughout a complete trip workflow
    When I click "Create a trip"
    And the trip planner panel opens
    Then the map canvas should still be visible and have valid dimensions
    When I type "Los Angeles" in the waypoint search
    Then the map canvas should still be visible and have valid dimensions
    When I cancel the trip creation
    Then the map canvas should still be visible and have valid dimensions
