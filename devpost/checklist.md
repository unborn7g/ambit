<!-- status: approved -->
# Ambit Build Checklist (5-build)

**Project:** Ambit — Scope Creep & Change-Order Calculator for Freelancers
**Build mode:** fast
**Architecture reference:** `devpost/spec.md`, `devpost/prd.md`, `devpost/scope.md`, `docs/design/ambit-ui.dc.html`

---

## Slices

- [x] **Slice 1 — Built-in Sample Flow, Pure Scope Math Engine, Quote Verifier, Prototype UI & Unit Tests:**
  - **What gets built:**
    - `src/lib/ambit.ts`: pure deterministic math engine (`calculateAmbitSummary`, `flipItemStatus`, `clampNonNegative`, `buildChangeOrderReply`), quote normalizer and substring verifier (`normalizeQuoteText`, `verifyClauseQuotes`), and 4-field / 8-item AI validator (`validateAiItems`).
    - `src/lib/sample.ts`: built-in architectural visualization contract, 5-part WhatsApp message, `$25` hourly rate, and 5 pre-verified sample request items (`15 h x $25 = $375`; flipping Request #4 from `Unclear` to `Extra` uses its stored `2 h` default to produce `17 h x $25 = $425`).
    - `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`: full `ambit-ui.dc.html` + `UI-HANDOFF.md` visual implementation (`Bricolage Grotesque`, `Instrument Sans`, `IBM Plex Mono`, light/dark mode toggle, `data-testid` attributes) with PRD rules strictly enforced (`Covered` and `Unclear` count as `0 h` and `$0` in totals, and the scope bar is sized by request **count** `20% / 60% / 20%`, not hours).
    - `test/ambit.test.ts`: 8 runnable unit tests covering all required math, quote verification, clamping, 4-field / 8-item validation, and zero-Extra reply phrasing.
  - **How we know it works:**
    - `npm test` (`npx tsx --test test/ambit.test.ts`) passes all 8 unit tests with real output captured below.
    - `npm run build` succeeds cleanly.
    - Clicking `Analyze message` on the pre-loaded sample renders 5 items (`1 covered · 0 h`, `3 extra · 15 h`, `1 unclear · 0 h`), `$375` (`15 h × $25/h = $375`), count-sized bar (`20% / 60% / 20%`), and the 3-sentence reply; flipping Request #4 (`Unclear`) to `Extra` immediately updates to `17 h × $25/h = $425` and `20% / 80% / 0%`.

- [x] **Slice 2 — Input Validation Guards, 6,000-Character Limit Notice, Empty-Box Validation & Copy Confirmation:**
  - **What gets built:**
    - Empty-box validation (`Contract deliverables` and `Client's WhatsApp or email message`) with inline accessible notice when clicking `Analyze message` with either box empty.
    - 6,000-character limit guard per input box with live character count warning and exact visible message `"Keep each box under 6,000 characters."` when exceeded.
    - Negative/blank/NaN clamping on `Hourly rate` (`data-testid="rate"`) and per-row `hours` (`data-testid="hours-N"`), keeping `Covered` hours input disabled (`0 h`).
    - `Copy reply` (`data-testid="copy"`) clipboard confirmation (`"Copied"` for 2 seconds, or clear fallback notice if clipboard access is blocked) and `Clear and paste your own` (`data-testid="clear"`) + `Load architecture sample` (`data-testid="load-sample"`).
  - **How we know it works:**
    - `npm test` (`npx tsx --test test/ambit.test.ts`) passes all 8 unit tests.
    - Pasting > 6,000 characters in either box displays `"Keep each box under 6,000 characters."` and prevents analysis until shortened.
    - Clicking `Clear and paste your own` empties both boxes and clears results; clicking `Analyze message` while empty shows a clear prompt; clicking `Load architecture sample` restores the sample job.
    - **Hands-on Checkpoint (after Slice 2):** Passed — user verified the live sample flow, flag overrides, hours/rate clamping, 6,000-char guard, light/dark toggle, and Copy button.

- [x] **Slice 3 — Server `/api/analyze` Route (Server-Only Env Key + 4-Field/8-Item Validator), Honest Missing-Key Fallback & Final Check:**
  - **What gets built:**
    - `src/app/api/analyze/route.ts`: `POST /api/analyze` server route reading `process.env.ANTHROPIC_API_KEY` and `process.env.ANTHROPIC_MODEL` (default `claude-haiku-5-5`, untested with a live key) on the server only, enforcing the 6,000-character limit per box (`HTTP 400` with `"Keep each box under 6,000 characters."`), validating AI JSON output through `validateAiItems` (max 8 items, only `requestText`, `clauseQuote`, `status`, `hours` kept, all totals/dollar fields dropped), and running `verifyClauseQuotes` before returning.
    - Honest missing-key fallback: when `ANTHROPIC_API_KEY` is not set in the server environment, `/api/analyze` returns `HTTP 503` (`missingKey: true`) and the UI shows `"Analyzing your own text needs an Anthropic API key, and this demo doesn’t have one set. You can still see how Ambit works on the built-in architecture sample."` with a one-click `Load architecture sample` button (no fake local keyword fallback).
    - Privacy & non-advice copy in the footer (`"When you analyze your own text, it is sent to the Anthropic API."` and `"Not legal advice"`).
    - `.env.example`, `LICENSE` (MIT), `README.md` (with run steps, actual `npx tsx --test test/ambit.test.ts` output, and honest `"How AI was used"` section), and `devpost/app-map.html`.
  - **How we know it works:**
    - `npm test` (`npx tsx --test test/ambit.test.ts`) passes all 8 unit tests and `npm run build` succeeds.
    - Custom text without an API key returns `HTTP 503` with the exact honest missing-key message and one-click `Load architecture sample` button.

---

## Final Review

- **Status:** Completed.
- **Verified against `devpost/prd.md` and `devpost/spec.md`:**
  - Sample flow (`15 h x $25 = $375`, `20% / 60% / 20%` count-based bar, 3-sentence reply) and status override (`Unclear` -> `Extra` uses stored `2 h` default -> `17 h x $25 = $425`, `20% / 80% / 0%`) work end to end.
  - Word-for-word quote verifier (`verifyClauseQuotes`) normalizes whitespace and curly quotes/apostrophes, forces unmatched quotes to `Unclear` with `"No matching clause found"`, and preserves valid AI hours (defaulting to `2 h` only when missing or invalid).
  - Server route (`src/app/api/analyze/route.ts`) enforces the 6,000-character limit per box, caps items at 8, strips extra fields via `validateAiItems`, and returns the honest missing-key notice when `ANTHROPIC_API_KEY` is absent (live AI analysis is documented in `README.md` as built, not tested with a real key).

---

## Code Tour and App Map

- **Activity type:** Evidence-based recap and reference route (`devpost/app-map.html`).
- **Evidence & route recorded in `devpost/app-map.html`:**
  - Stop 1: `src/app/page.tsx` (`handleAnalyze`, `handleSetFlag`, `calculateAmbitSummary`) — UI entry point and state updates.
  - Stop 2: `src/lib/ambit.ts` (`verifyClauseQuotes`, `calculateAmbitSummary`, `buildChangeOrderReply`) — deterministic quote verification and scope math kernel.
  - Stop 3: `src/app/api/analyze/route.ts` (`POST`, `validateAiItems`) — server-only API key boundary and 4-field / 8-item schema filter.
- **Edit outcome:** Not applicable (revisions from `UI-HANDOFF.md` and PRD rules already applied in Slice 1 and Slice 2).
- **Reflection:** Already covered during planning (`3-prd` and `4-spec` learning moments on separating AI classification from deterministic substring quote verification and pure TypeScript math).

---

## Latest Test Output (Slice 3)

```text
> ambit@1.0.0 test
> tsx --test test/ambit.test.ts

TAP version 13
# Subtest: Ambit pure scope math, quote verifier, and validator
    # Subtest: 1. computes sample initial math: 15 h x $25 = $375 with Covered and Unclear counting as 0
    ok 1 - 1. computes sample initial math: 15 h x $25 = $375 with Covered and Unclear counting as 0
      ---
      duration_ms: 41.076382
      type: 'test'
      ...
    # Subtest: 2. flipping Request 4 from Unclear to Extra uses its stored 2 h default to produce 17 h x $25 = $425
    ok 2 - 2. flipping Request 4 from Unclear to Extra uses its stored 2 h default to produce 17 h x $25 = $425
      ---
      duration_ms: 0.477512
      type: 'test'
      ...
    # Subtest: 3. sizes bar segments by request count (20% / 60% / 20% initially, then 20% / 80% / 0%)
    ok 3 - 3. sizes bar segments by request count (20% / 60% / 20% initially, then 20% / 80% / 0%)
      ---
      duration_ms: 0.547239
      type: 'test'
      ...
    # Subtest: 4. clamps negative, blank, and NaN values for hours and hourly rate to 0
    ok 4 - 4. clamps negative, blank, and NaN values for hours and hourly rate to 0
      ---
      duration_ms: 0.249007
      type: 'test'
      ...
    # Subtest: 5. normalizes whitespace and curly quotes/apostrophes, forces failed quotes to Unclear, and preserves valid AI hours (defaulting to 2 h only when invalid)
    ok 5 - 5. normalizes whitespace and curly quotes/apostrophes, forces failed quotes to Unclear, and preserves valid AI hours (defaulting to 2 h only when invalid)
      ---
      duration_ms: 0.201806
      type: 'test'
      ...
    # Subtest: 6. verifies all 5 built-in sample items against the sample contract and keeps Request 4 Unclear
    ok 6 - 6. verifies all 5 built-in sample items against the sample contract and keeps Request 4 Unclear
      ---
      duration_ms: 0.150776
      type: 'test'
      ...
    # Subtest: 7. route validator drops extra injected fields (totals, dollars, rate) and caps list at 8 items
    ok 7 - 7. route validator drops extra injected fields (totals, dollars, rate) and caps list at 8 items
      ---
      duration_ms: 0.595581
      type: 'test'
      ...
    # Subtest: 8. builds a natural 3-sentence reply when there are zero Extra items
    ok 8 - 8. builds a natural 3-sentence reply when there are zero Extra items
      ---
      duration_ms: 0.259561
      type: 'test'
      ...
    # Subtest: 9. verifies all quotes in the second built-in Web Design sample against its contract and computes 14 h x $40 = $560
    ok 9 - 9. verifies all quotes in the second built-in Web Design sample against its contract and computes 14 h x $40 = $560
      ---
      duration_ms: 0.365582
      type: 'test'
      ...
    1..9
ok 1 - Ambit pure scope math, quote verifier, and validator
  ---
  duration_ms: 21.005306
  type: 'suite'
  ...
1..1
# tests 9
# suites 1
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 806.024101
```
