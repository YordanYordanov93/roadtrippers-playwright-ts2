# ─────────────────────────────────────────────────────────────────────────────
# Feature: Authentication & Error Scenarios
#
# Validates that the application handles authentication failures and
# unauthenticated access correctly, showing appropriate error feedback.
#
# @noauth tag: these scenarios run WITHOUT pre-loaded browser auth state.
# ─────────────────────────────────────────────────────────────────────────────

@error @noauth
Feature: Authentication & Error Handling

  As an unauthenticated visitor
  I want clear error messages when I provide wrong credentials
  So that I understand what went wrong and how to fix it

  # ── Scenario 1: Invalid credentials ─────────────────────────────────────────

  @smoke
  Scenario: Login with invalid credentials shows an error message
    Given I am on the login page
    When I enter the email "invalid@example.com"
    And I enter the password "WrongPassword123!"
    And I click the "Log in" button
    Then an error message should be displayed
    And I should remain on the login page

  # ── Scenario 2: Wrong password for valid email ───────────────────────────────

  Scenario: Login with correct email but wrong password shows authentication error
    Given I am on the login page
    When I enter the email "test@roadtrippers.com"
    And I enter the password "definitely-wrong-password"
    And I click the "Log in" button
    Then an error message should be displayed
    And I should remain on the login page

  # ── Scenario 3: Empty credentials ────────────────────────────────────────────

  Scenario: Submitting the login form with empty fields is blocked
    Given I am on the login page
    When I click the "Log in" button without entering credentials
    Then I should remain on the login page

  # ── Scenario 4: Invalid email format ─────────────────────────────────────────

  Scenario: An invalid email format is rejected
    Given I am on the login page
    When I enter the email "not-a-valid-email"
    And I enter the password "somePassword1!"
    And I click the "Log in" button
    Then I should remain on the login page

  # ── Scenario 5: Unauthenticated trip creation ──────────────────────────────

  Scenario: Creating a trip without being logged in redirects to login
    Given I am on the Roadtrippers map without being logged in
    When I attempt to create a trip
    Then I should be prompted to log in

  # ── Scenario 6: Login page structure ─────────────────────────────────────────

  @smoke
  Scenario: Login page contains all required elements
    Given I am on the login page
    Then the login page heading should be visible
    And the email input should be visible
    And the password input should be visible
    And the "Log in" button should be visible
    And the "Forgot password?" button should be visible
    And the "Create an account" button should be visible
    And social login options should be visible

  # ── Scenario 7: Back to map navigation ───────────────────────────────────────

  Scenario: "Back to Map" link returns to the map from the login page
    Given I am on the login page
    When I click the "Back to Map" link
    Then I should be on the Roadtrippers map

  # ── Data-driven: Multiple invalid credential combinations ─────────────────────

  Scenario Outline: Various invalid credential combinations are rejected
    Given I am on the login page
    When I enter the email "<email>"
    And I enter the password "<password>"
    And I click the "Log in" button
    Then I should remain on the login page

    Examples:
      | email                    | password             |
      | wrong@example.com        | WrongPass!           |
      | notanemail               | anypassword          |
      | test@test.com            | short                |
      | admin@roadtrippers.com   | incorrect_password   |
