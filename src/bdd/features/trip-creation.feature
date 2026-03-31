# ─────────────────────────────────────────────────────────────────────────────
# Feature: Trip Creation — Happy Path
#
# Business value: Users can plan a road trip by creating a named itinerary,
# adding multiple waypoints, and saving it to their account.
#
# Verified against: https://maps.roadtrippers.com (live DOM, 2026-02-18)
# ─────────────────────────────────────────────────────────────────────────────

@happy @auth
Feature: Trip Creation — Happy Path

  As a registered Roadtrippers user
  I want to create a trip with multiple waypoints
  So that I can plan and save my road trip itinerary

  Background:
    Given I am on the Roadtrippers map
    And the map canvas is fully loaded

  # ── Scenario 1: Full trip creation flow ─────────────────────────────────────

  @smoke
  Scenario: Create and save a multi-waypoint trip
    When I click "Create a trip"
    And the trip planner panel opens
    And I name the trip "Chicago to Nashville Adventure"
    And I add the waypoint "Chicago, Illinois"
    And I add the waypoint "Springfield, Illinois"
    And I add the waypoint "Nashville, Tennessee"
    Then the trip should have 3 waypoints
    When I save the trip
    Then the trip should be saved successfully

  # ── Scenario 2: Autocomplete provides suggestions ───────────────────────────

  @smoke
  Scenario: Autocomplete suggestions appear for a valid location
    When I click "Create a trip"
    And the trip planner panel opens
    And I type "Chicago" in the waypoint search
    Then autocomplete suggestions should be visible

  # ── Scenario 3: Add a single waypoint ───────────────────────────────────────

  Scenario: Create a trip with a single destination
    When I click "Create a trip"
    And the trip planner panel opens
    And I name the trip "Day Trip to Nashville"
    And I add the waypoint "Nashville, Tennessee"
    Then the trip should have 1 waypoint
    And no error message should be shown

  # ── Scenario 4: Verify map remains visible during trip creation ──────────────

  @smoke
  Scenario: Map canvas stays rendered throughout the trip creation workflow
    When I click "Create a trip"
    And the trip planner panel opens
    Then the map canvas should still be visible and have valid dimensions

  # ── Scenario 5: Data-driven — multiple trip configurations ──────────────────

  Scenario Outline: Create a trip with different waypoint combinations
    When I click "Create a trip"
    And the trip planner panel opens
    And I name the trip "<tripName>"
    And I add the waypoint "<waypoint1>"
    And I add the waypoint "<waypoint2>"
    Then the trip should have 2 waypoints
    And no error message should be shown

    Examples:
      | tripName                     | waypoint1           | waypoint2             |
      | West Coast Drive             | Los Angeles, CA     | San Francisco, CA     |
      | Rocky Mountain Road Trip     | Denver, Colorado    | Salt Lake City, Utah  |
      | Texas to Arizona             | Austin, Texas       | Phoenix, Arizona      |
