/**
 * Formats dashboard count comparisons in plain, unambiguous human language.
 *
 * Rules:
 * - If previous is 0 and current is 0: "No change vs <period>"
 * - If previous is 0 and current > 0: "New vs <period>" (or "+N new")
 * - If previous < 20 (small base): use plain words, e.g. "10 more than <period>",
 *   "same as <period>", "5 fewer than <period>" (never raw large percentages like +2900%)
 * - If previous >= 20: use percentages capped at "100%+" or "-100%"
 */

export interface ComparisonDisplay {
  caption: string;
  type: "positive" | "negative" | "neutral";
  badgeText?: string;
}

export function formatComparisonCaption(
  current: number,
  previous: number | undefined | null,
  periodLabel: string = "prev period"
): ComparisonDisplay {
  const safeCurrent = Math.max(0, current ?? 0);
  const safePrevious = previous == null ? null : Math.max(0, previous);

  if (safePrevious === null || safePrevious === undefined) {
    return {
      caption: `vs ${periodLabel}`,
      type: "neutral",
    };
  }

  // Previous is 0
  if (safePrevious === 0) {
    if (safeCurrent === 0) {
      return {
        caption: `Same as ${periodLabel}`,
        type: "neutral",
      };
    }
    return {
      caption: `+${safeCurrent} new vs ${periodLabel}`,
      type: "positive",
      badgeText: "New",
    };
  }

  const diff = safeCurrent - safePrevious;

  // Equal
  if (diff === 0) {
    return {
      caption: `Same as ${periodLabel}`,
      type: "neutral",
    };
  }

  // Small previous value (< 20): Use plain language count difference
  if (safePrevious < 20) {
    if (diff > 0) {
      return {
        caption: `${diff} more than ${periodLabel}`,
        type: "positive",
        badgeText: `+${diff}`,
      };
    } else {
      return {
        caption: `${Math.abs(diff)} fewer than ${periodLabel}`,
        type: "negative",
        badgeText: `-${Math.abs(diff)}`,
      };
    }
  }

  // Large previous value (>= 20): Use percentage with cap
  const rawPct = (diff / safePrevious) * 100;
  if (rawPct >= 100) {
    return {
      caption: `100%+ vs ${periodLabel}`,
      type: "positive",
      badgeText: "+100%+",
    };
  }
  if (rawPct <= -100) {
    return {
      caption: `-100% vs ${periodLabel}`,
      type: "negative",
      badgeText: "-100%",
    };
  }

  const sign = rawPct > 0 ? "+" : "";
  const formattedPct = `${sign}${rawPct.toFixed(1)}%`;
  return {
    caption: `${formattedPct} vs ${periodLabel}`,
    type: diff > 0 ? "positive" : "negative",
    badgeText: formattedPct,
  };
}

export function formatIndianNumber(num: number): string {
  return Number(num || 0).toLocaleString("en-IN");
}
