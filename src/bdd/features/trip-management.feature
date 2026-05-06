# Feature: Trip Management & Validation
#
# Toolbar navigation and search work for all visitors (no auth needed).
# Trip planner scenarios skip gracefully when not authenticated.

@happy
Feature: Trip Management & Validation

  As a Roadtrippers visitor
  I want the map controls to work correctly
  So that I can navigate the app without errors

  Background:
    Given I am on the Roadtrippers map
    And the map canvas is fully loaded

  @error
  Scenario: Attempting to save a trip with no waypoints shows a validation error
    Given I open the trip planner or verify guest state
    When I name the trip "Empty Waypoints Trip"
    And I click the save button without adding waypoints
    Then a validation error should appear or the save button should be disabled

  @smoke
  Scenario: All toolbar tabs are interactive and do not break the map
    When I click the "Explore" tab
    And I click the "Itinerary" tab
    And I click the "My trips" tab
    Then the map canvas should still be visible and have valid dimensions

  @happy
  Scenario: My trips panel opens when the "My trips" button is clicked
    When I click the "My trips" tab
    Then the My Trips panel should be visible

  @happy
  Scenario: Global search bar accepts input without crashing the app
    When I type "New York" in the global search bar
    And I wait 2 seconds for search to respond
    Then the map canvas should still be visible and have valid dimensions

  @smoke
  Scenario: Map canvas remains rendered throughout a complete trip workflow
    Given I open the trip planner or verify guest state
    Then the map canvas should still be visible and have valid dimensions
    When I type "Los Angeles" in the waypoint search
    Then the map canvas should still be visible and have valid dimensions
    When I cancel the trip creation
    Then the map canvas should still be visible and have valid dimensions
