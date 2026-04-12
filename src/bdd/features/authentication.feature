# =============================================================================
# Feature: Authentication & Error Handling
#
# Data source: src/fixtures/test-data.ts
#   invalidCredentials       → wrong email + wrong password
#   validEmailBadPassword    → correct email format, wrong password
#   invalidFormatCredentials → malformed email (not-an-email)
#   emptyCredentials         → blank email + blank password
#
# Auth context: @noauth — all scenarios run WITHOUT a pre-loaded session.
# The browser has no cookies and no stored auth state.
# =============================================================================

@error @noauth
Feature: Authentication & Error Handling

  As an unauthenticated visitor
  I want clear feedback when my login attempt fails
  So that I understand what went wrong and how to correct it

  # ---------------------------------------------------------------------------
  # Invalid credentials — data driven from test-data.ts → invalidCredentials
  # Wrong email + wrong password must show an error and stay on the login page
  # ---------------------------------------------------------------------------

  @smoke
  Scenario Outline: Logging in with invalid credentials shows an error message
    Given I am on the login page
    When I enter the email "<email>"
    And I enter the password "<password>"
    And I click the "Log in" button
    Then an error message should be displayed
    And I should remain on the login page

    Examples: Invalid credentials from test-data.ts → invalidCredentials
      | email                    | password         |
      | invalid@example.com      | WrongPassword!   |
      | test@roadtrippers.com    | definitely-wrong-password |

  # ---------------------------------------------------------------------------
  # Malformed email — data driven from test-data.ts → invalidFormatCredentials
  # A non-email string must be rejected before or at submission
  # ---------------------------------------------------------------------------

  Scenario Outline: A malformed email address is rejected
    Given I am on the login page
    When I enter the email "<email>"
    And I enter the password "<password>"
    And I click the "Log in" button
    Then I should remain on the login page

    Examples: Malformed emails from test-data.ts → invalidFormatCredentials
      | email          | password     |
      | not-an-email   | somepassword |
      | @nodomain      | somepassword |
      | missing@.com   | somepassword |

  # ---------------------------------------------------------------------------
  # Empty form — data driven from test-data.ts → emptyCredentials
  # Submitting with no credentials must be blocked by validation
  # ---------------------------------------------------------------------------

  Scenario: Submitting the login form without any credentials is blocked
    Given I am on the login page
    When I click the "Log in" button without entering credentials
    Then I should remain on the login page

  # ---------------------------------------------------------------------------
  # Unauthenticated trip creation — must prompt the visitor to log in
  # ---------------------------------------------------------------------------

  Scenario: Attempting to create a trip without being logged in prompts login
    Given I am on the Roadtrippers map without being logged in
    When I attempt to create a trip
    Then I should be prompted to log in

  # ---------------------------------------------------------------------------
  # Login page structure — all required UI elements must be present
  # ---------------------------------------------------------------------------

  @smoke
  Scenario: The login page contains all required elements
    Given I am on the login page
    Then the login page heading should be visible
    And the email input should be visible
    And the password input should be visible
    And the "Log in" button should be visible
    And the "Forgot password?" button should be visible
    And the "Create an account" button should be visible
    And social login options should be visible

  # ---------------------------------------------------------------------------
  # Back navigation — the login page must provide a route back to the map
  # ---------------------------------------------------------------------------

  Scenario: The "Back to Map" link returns the visitor to the map
    Given I am on the login page
    When I click the "Back to Map" link
    Then I should be on the Roadtrippers map

  # ---------------------------------------------------------------------------
  # Comprehensive rejection matrix — data driven from test-data.ts
  # Multiple credential combinations that must all be rejected
  # ---------------------------------------------------------------------------

  Scenario Outline: Various invalid credential combinations are all rejected
    Given I am on the login page
    When I enter the email "<email>"
    And I enter the password "<password>"
    And I click the "Log in" button
    Then I should remain on the login page

    Examples: Rejection matrix from test-data.ts credential fixtures
      | email                    | password            |
      | wrong@example.com        | WrongPass!          |
      | notanemail               | anypassword         |
      | test@test.com            | short               |
      | admin@roadtrippers.com   | incorrect_password  |
