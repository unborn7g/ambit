import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAmbitSummary,
  flipItemStatus,
  clampNonNegative,
  verifyClauseQuotes,
  validateAiItems,
  buildChangeOrderReply,
  AmbitItem,
} from "../src/lib/ambit";
import {
  SAMPLE_CONTRACT,
  SAMPLE_HOURLY_RATE,
  getSampleItems,
} from "../src/lib/sample";

describe("Ambit pure scope math, quote verifier, and validator", () => {
  it("1. computes sample initial math: 15 h x $25 = $375 with Covered and Unclear counting as 0", () => {
    const items = verifyClauseQuotes(SAMPLE_CONTRACT, getSampleItems());
    const summary = calculateAmbitSummary(items, SAMPLE_HOURLY_RATE);

    assert.equal(summary.totalExtraHours, 15);
    assert.equal(summary.totalExtraDollars, 375);
    assert.equal(summary.totalCoveredHours, 0);
    assert.equal(summary.formulaText, "Calculated in code: 15 h x $25 = $375");
    assert.equal(items[3].status, "Unclear");
    assert.equal(items[3].hours, 2); // Stored default 2h, not counted in totalExtraHours
  });

  it("2. flipping Request 4 from Unclear to Extra uses its stored 2 h default to produce 17 h x $25 = $425", () => {
    const items = verifyClauseQuotes(SAMPLE_CONTRACT, getSampleItems());
    items[3] = flipItemStatus(items[3], "Extra");

    const summary = calculateAmbitSummary(items, SAMPLE_HOURLY_RATE);
    assert.equal(items[3].status, "Extra");
    assert.equal(items[3].hours, 2);
    assert.equal(summary.totalExtraHours, 17);
    assert.equal(summary.totalExtraDollars, 425);
    assert.equal(summary.formulaText, "Calculated in code: 17 h x $25 = $425");
    assert.match(summary.replyText, /17 h/);
    assert.match(summary.replyText, /\$425/);
  });

  it("3. sizes bar segments by request count (20% / 60% / 20% initially, then 20% / 80% / 0%)", () => {
    const items = verifyClauseQuotes(SAMPLE_CONTRACT, getSampleItems());
    const initial = calculateAmbitSummary(items, SAMPLE_HOURLY_RATE);

    assert.equal(initial.coveredCount, 1);
    assert.equal(initial.extraCount, 3);
    assert.equal(initial.unclearCount, 1);
    assert.equal(initial.coveredPct, 20);
    assert.equal(initial.extraPct, 60);
    assert.equal(initial.unclearPct, 20);

    items[3] = flipItemStatus(items[3], "Extra");
    const updated = calculateAmbitSummary(items, SAMPLE_HOURLY_RATE);
    assert.equal(updated.coveredPct, 20);
    assert.equal(updated.extraPct, 80);
    assert.equal(updated.unclearPct, 0);
  });

  it("4. clamps negative, blank, and NaN values for hours and hourly rate to 0", () => {
    assert.equal(clampNonNegative(-12), 0);
    assert.equal(clampNonNegative(""), 0);
    assert.equal(clampNonNegative("not-a-number"), 0);

    const items = getSampleItems();
    items[1].hours = -5;
    const summaryNegRate = calculateAmbitSummary(items, -50);
    assert.equal(summaryNegRate.hourlyRate, 0);
    assert.equal(summaryNegRate.totalExtraHours, 12); // 0 + 8 + 4
    assert.equal(summaryNegRate.totalExtraDollars, 0);
  });

  it("5. normalizes whitespace and curly quotes/apostrophes, forces failed quotes to Unclear, and preserves valid AI hours (defaulting to 2 h only when invalid)", () => {
    const contractWithCurlyAndLineBreaks =
      "Clause 2:\nChanges to the\n  building’s layout or “massing” count as new work.";

    const candidateItems: AmbitItem[] = [
      {
        id: 1,
        short: "layout change",
        requestText: "Move the staircase",
        clauseTag: "Clause 2",
        clauseQuote: "Changes to the building's layout or \"massing\" count as new work.",
        reason: "Layout change.",
        status: "Extra",
        hours: 6,
      },
      {
        id: 2,
        short: "invented quote with valid hours",
        requestText: "Add a rooftop pool",
        clauseTag: "Clause 9",
        clauseQuote: "Rooftop pools are included in the base fee.",
        reason: "Invented quote.",
        status: "Extra",
        hours: 5,
      },
      {
        id: 3,
        short: "invented quote with invalid hours",
        requestText: "Add VR headset support",
        clauseTag: "Clause 10",
        clauseQuote: "Paraphrased clause that does not exist verbatim.",
        reason: "Invented quote with 0 hours.",
        status: "Covered",
        hours: 0,
      },
    ];

    const verified = verifyClauseQuotes(contractWithCurlyAndLineBreaks, candidateItems);

    // Item 1 matches after curly apostrophe/quote & whitespace normalization
    assert.equal(verified[0].status, "Extra");
    assert.equal(verified[0].hours, 6);
    assert.NotEqual?.(verified[0].clauseQuote, "No matching clause found");

    // Item 2 fails verification -> forced to Unclear, keeps valid 5 h
    assert.equal(verified[1].clauseQuote, "No matching clause found");
    assert.equal(verified[1].status, "Unclear");
    assert.equal(verified[1].hours, 5);

    // Item 3 fails verification with 0 h -> forced to Unclear, defaults to 2 h
    assert.equal(verified[2].clauseQuote, "No matching clause found");
    assert.equal(verified[2].status, "Unclear");
    assert.equal(verified[2].hours, 2);
  });

  it("6. verifies all 5 built-in sample items against the sample contract and keeps Request 4 Unclear", () => {
    const verified = verifyClauseQuotes(SAMPLE_CONTRACT, getSampleItems());

    assert.equal(verified.length, 5);
    assert.equal(verified[0].status, "Covered");
    assert.equal(verified[0].clauseQuote, "Up to two revision rounds covering materials, colours and camera angle.");
    assert.equal(verified[1].status, "Extra");
    assert.equal(verified[1].hours, 3);
    assert.equal(verified[2].status, "Extra");
    assert.equal(verified[2].hours, 8);
    assert.equal(verified[3].status, "Unclear");
    assert.equal(verified[3].clauseQuote, "No matching clause found");
    assert.equal(verified[3].hours, 2);
    assert.equal(verified[4].status, "Extra");
    assert.equal(verified[4].hours, 4);
  });

  it("7. route validator drops extra injected fields (totals, dollars, rate) and caps list at 8 items", () => {
    const rawTenItems = Array.from({ length: 10 }, (_, idx) => ({
      requestText: `Request item ${idx + 1}`,
      clauseQuote: "Three exterior renders, 4K resolution, daytime lighting.",
      status: "Extra",
      hours: 3,
      totalDollars: 999999,
      hourlyRate: 5000,
      injectedHtml: "<script>alert(1)</script>",
    }));

    const sanitized = validateAiItems(rawTenItems);
    assert.equal(sanitized.length, 8);
    for (const item of sanitized) {
      assert.equal("totalDollars" in item, false);
      assert.equal("hourlyRate" in item, false);
      assert.equal("injectedHtml" in item, false);
    }
  });

  it("8. builds a natural 3-sentence reply when there are zero Extra items", () => {
    const onlyCovered: AmbitItem[] = [
      {
        id: 1,
        short: "brick facade",
        requestText: "Can you change the facade to brick?",
        clauseTag: "Clause 2",
        clauseQuote: "Up to two revision rounds covering materials, colours and camera angle.",
        reason: "Covered revision.",
        status: "Covered",
        hours: 0,
      },
    ];

    const reply = buildChangeOrderReply(onlyCovered, 25, true);
    assert.match(reply, /within your agreed revision rounds/);
    assert.match(reply, /Nothing else in this message falls outside the agreed scope\./);
    assert.match(reply, /I will go ahead with the covered changes as agreed\./);
  });
});
