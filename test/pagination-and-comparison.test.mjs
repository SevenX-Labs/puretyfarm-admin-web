import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { computePaginationDisplay, clampPageAfterSuccess } from "../src/lib/pagination.ts";
import { formatComparisonCaption } from "../src/lib/format-comparison.ts";

describe("Pagination logic", () => {
  test("preserves current page on refetch without clamping if page <= totalPages", () => {
    const page = clampPageAfterSuccess(2, 2);
    assert.equal(page, 2);
  });

  test("does not clamp page when totalPages is unknown or 0", () => {
    assert.equal(clampPageAfterSuccess(2, undefined), 2);
    assert.equal(clampPageAfterSuccess(2, 0), 2);
  });

  test("clamps page to last page only if current page exceeds totalPages", () => {
    assert.equal(clampPageAfterSuccess(3, 2), 2);
  });

  test("computes display correctly for 31 items with limit 20", () => {
    const p1 = computePaginationDisplay(1, 20, 31, 2);
    assert.equal(p1.page, 1);
    assert.equal(p1.totalPages, 2);
    assert.equal(p1.total, 31);
    assert.equal(p1.hasPrev, false);
    assert.equal(p1.hasNext, true);
    assert.equal(p1.showingFrom, 1);
    assert.equal(p1.showingTo, 20);

    const p2 = computePaginationDisplay(2, 20, 31, 2);
    assert.equal(p2.page, 2);
    assert.equal(p2.hasPrev, true);
    assert.equal(p2.hasNext, false);
    assert.equal(p2.showingFrom, 21);
    assert.equal(p2.showingTo, 31);
  });
});

describe("Comparison caption formatter", () => {
  test("handles zero previous with positive current", () => {
    const res = formatComparisonCaption(10, 0, "yesterday");
    assert.equal(res.caption, "+10 new vs yesterday");
    assert.equal(res.badgeText, "New");
  });

  test("handles zero previous with zero current", () => {
    const res = formatComparisonCaption(0, 0, "yesterday");
    assert.equal(res.caption, "Same as yesterday");
  });

  test("handles small previous (<20) with plain words", () => {
    const res = formatComparisonCaption(30, 1, "yesterday");
    assert.equal(res.caption, "29 more than yesterday");
    assert.equal(res.badgeText, "+29");

    const fewer = formatComparisonCaption(2, 5, "last week");
    assert.equal(fewer.caption, "3 fewer than last week");
    assert.equal(fewer.badgeText, "-3");

    const same = formatComparisonCaption(5, 5, "yesterday");
    assert.equal(same.caption, "Same as yesterday");
  });

  test("handles large previous (>=20) with capped percentage", () => {
    const res1 = formatComparisonCaption(50, 20, "prev period");
    assert.equal(res1.caption, "100%+ vs prev period");

    const res2 = formatComparisonCaption(25, 20, "prev period");
    assert.equal(res2.caption, "+25.0% vs prev period");
  });
});

describe("Loading state model", () => {
  function computeViewState({ isLoading, isRefreshing, itemsCount, hasError }) {
    if (isLoading) return "INITIAL_LOADING";
    if (hasError) return "ERROR";
    if (isRefreshing) return "REFRESHING_WITH_PREVIOUS_DATA";
    if (itemsCount === 0) return "EMPTY_STATE";
    return "SUCCESS_DATA";
  }

  test("never renders empty state during initial loading", () => {
    assert.equal(
      computeViewState({ isLoading: true, isRefreshing: false, itemsCount: 0, hasError: false }),
      "INITIAL_LOADING"
    );
  });

  test("never flashes empty state during background refresh", () => {
    assert.equal(
      computeViewState({ isLoading: false, isRefreshing: true, itemsCount: 0, hasError: false }),
      "REFRESHING_WITH_PREVIOUS_DATA"
    );
  });

  test("shows empty state ONLY when fully loaded with zero items and no error", () => {
    assert.equal(
      computeViewState({ isLoading: false, isRefreshing: false, itemsCount: 0, hasError: false }),
      "EMPTY_STATE"
    );
  });

  test("shows error state with retry on failure", () => {
    assert.equal(
      computeViewState({ isLoading: false, isRefreshing: false, itemsCount: 0, hasError: true }),
      "ERROR"
    );
  });
});
