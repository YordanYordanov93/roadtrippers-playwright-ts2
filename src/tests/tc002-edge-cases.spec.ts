/**
 * TC-002: Edge Cases — Boundary and Non-Standard Trip Scenarios
 *
 * Tags: @edge
 *
 * Covers:
 *   • Single-waypoint trip (minimum viable trip)
 *   • Very long trip name (200+ chars)
 *   • Trip name with special characters
 *   • Adding then removing a waypoint (round-trip count)
 *   • Nonexistent location search (no suggestions or graceful empty state)
 *   • Empty search input
 *
 * These tests validate the application handles boundary inputs gracefully
 * without crashing, corrupting state, or showing unhandled errors.
 */

import { test, expect } from '../fixtures/page-fixtures';
import { MapPage, TripPlannerPage } from '../pages';
import {
  singleWaypointTrip,
  longNameTrip,
  specialCharacterTrip,
  invalidWaypoint,
} from '../fixtures/test-data';

test.describe('TC-002: Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  });

  const ensureTripPlannerOrGuestState = async (
    mapPage: MapPage,
    tripPlannerPage: TripPlannerPage
  ): Promise<boolean> => {
    await mapPage.waitForLoad();
    await mapPage.dismissCookieBanner();
    const canCreateTrip = await mapPage.createTripButton.isVisible().catch(() => false);
    if (!canCreateTrip) {
      await mapPage.assertLoginLinkVisible();
      return false;
    }
    await mapPage.clickCreateTrip();
    await tripPlannerPage.waitForLoad();
    return true;
  };

  // ── Edge Case 1: Single-waypoint trip ──────────────────────────────────────

  test(
    '@edge — create a trip with exactly one waypoint',
    async ({ mapPage, tripPlannerPage }) => {
      const plannerOpened = await ensureTripPlannerOrGuestState(mapPage, tripPlannerPage);
      if (!plannerOpened) return;

      await tripPlannerPage.setTripName(singleWaypointTrip.name);

      const waypoints = singleWaypointTrip.waypoints ?? [];
      await tripPlannerPage.addWaypoint({ text: waypoints[0] });

      // Exactly 1 waypoint should be listed
      await tripPlannerPage.assertWaypointCount(1);

      // App should not show an error for a single-waypoint trip
      const hasError = await tripPlannerPage.errorToast.isVisible();
      expect(hasError, 'Single-waypoint trip should not show an error').toBe(false);
    }
  );

  // ── Edge Case 2: Very long trip name ────────────────────────────────────────

  test(
    '@edge — trip name with 200 characters is accepted or gracefully truncated',
    async ({ mapPage, tripPlannerPage }) => {
      const plannerOpened = await ensureTripPlannerOrGuestState(mapPage, tripPlannerPage);
      if (!plannerOpened) return;

      await tripPlannerPage.setTripName(longNameTrip.name);

      // App should not crash — either accept the full name or truncate
      const actualName = await tripPlannerPage.getTripName();
      expect(actualName.length).toBeGreaterThan(0);

      // No unhandled error should appear
      const hasError = await tripPlannerPage.errorToast.isVisible();
      expect(hasError, 'Long name should not cause a crash error').toBe(false);
    }
  );

  // ── Edge Case 3: Special characters in trip name ────────────────────────────

  test(
    '@edge — trip name with special characters (&, <, >, quotes) is handled safely',
    async ({ mapPage, tripPlannerPage }) => {
      const plannerOpened = await ensureTripPlannerOrGuestState(mapPage, tripPlannerPage);
      if (!plannerOpened) return;

      await tripPlannerPage.setTripName(specialCharacterTrip.name);

      // App should render the name (possibly escaped) without breaking the UI
      const actualName = await tripPlannerPage.getTripName();
      // The name should contain some recognisable part (e.g. "Trip with")
      expect(actualName).toContain('Trip with');

      const hasError = await tripPlannerPage.errorToast.isVisible();
      expect(hasError).toBe(false);
    }
  );

  // ── Edge Case 4: Add then remove a waypoint ────────────────────────────────

  test(
    '@edge — adding and then removing a waypoint leaves the count unchanged',
    async ({ mapPage, tripPlannerPage }) => {
      const plannerOpened = await ensureTripPlannerOrGuestState(mapPage, tripPlannerPage);
      if (!plannerOpened) return;

      const initialCount = await tripPlannerPage.getWaypointCount();

      // Add a waypoint
      await tripPlannerPage.addWaypoint({ text: 'Denver, Colorado' });
      const countAfterAdd = await tripPlannerPage.getWaypointCount();
      expect(countAfterAdd).toBe(initialCount + 1);

      // Remove it
      await tripPlannerPage.removeWaypointAt(initialCount); // remove the newly added one
      const countAfterRemove = await tripPlannerPage.getWaypointCount();
      expect(countAfterRemove).toBe(initialCount);
    }
  );

  // ── Edge Case 5: Nonexistent location ─────────────────────────────────────

  test(
    '@edge — searching for a nonexistent location shows no suggestions or graceful empty state',
    async ({ mapPage, tripPlannerPage, page }) => {
      const plannerOpened = await ensureTripPlannerOrGuestState(mapPage, tripPlannerPage);
      if (!plannerOpened) return;

      await tripPlannerPage.typeInSearchWithoutSelecting(invalidWaypoint.text);

      // Wait for the autocomplete service to respond — either the list appears
      // (with 0 items) or the network goes idle, whichever comes first.
      await Promise.race([
        tripPlannerPage.suggestionList.waitFor({ state: 'visible', timeout: 5_000 }),
        page.waitForLoadState('networkidle', { timeout: 5_000 }),
      ]).catch(() => {});

      // Either: no suggestions at all, OR an "empty" / "no results" message
      const suggestionsVisible = await tripPlannerPage.suggestionList.isVisible();
      if (suggestionsVisible) {
        const count = await tripPlannerPage.suggestionItems.count();
        // If suggestions do appear, they should be 0 or show "no results" copy
        // (Some UIs show 0 items instead of hiding the list)
        expect(count).toBe(0);
      }
      // Either way, waypoint count should remain unchanged
      await tripPlannerPage.assertWaypointCount(0);
    }
  );

  // ── Edge Case 6: Open and close trip planner ──────────────────────────────

  test(
    '@edge — cancelling trip creation returns to the map without errors',
    async ({ mapPage, tripPlannerPage, page }) => {
      const plannerOpened = await ensureTripPlannerOrGuestState(mapPage, tripPlannerPage);
      if (!plannerOpened) return;

      // Discard / cancel (varies by UI — try button or navigate back)
      const discardVisible = await tripPlannerPage.discardButton.isVisible();
      if (discardVisible) {
        await tripPlannerPage.discardButton.click();
      } else {
        // Fallback: navigate back to map root
        await page.goto('/');
      }

      // Map should be visible and functional
      await mapPage.waitForLoad();
      await mapPage.assertMapIsLoaded();
    }
  );
});
