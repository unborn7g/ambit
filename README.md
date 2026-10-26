# Ambit

**Know what's covered before you say yes.**

- **Demo Video (2m 21s):** [https://youtu.be/dpUvbXVXh-k](https://youtu.be/dpUvbXVXh-k)
- **Public GitHub Repository:** [https://github.com/unborn7g/ambit](https://github.com/unborn7g/ambit)

Ambit is a scope-creep and change-order calculator for freelancers. Paste your contract deliverables and a client's WhatsApp or email message, set your hourly rate, and Ambit separates every ask into **Covered**, **Extra work**, or **Unclear**, verifies every quoted clause word-for-word against your contract, prices the extra hours in pure TypeScript, and writes a polite three-sentence change-order reply you can copy in one click.

Built using the **Devpost Learn Skill Pack** (`1-start`, `2-scope`, `3-prd`, `4-spec`, `5-build`, `6-ship`). Planning artifacts live in [`devpost/`](./devpost):
- [`devpost/scope.md`](./devpost/scope.md)
- [`devpost/prd.md`](./devpost/prd.md)
- [`devpost/spec.md`](./devpost/spec.md)
- [`devpost/checklist.md`](./devpost/checklist.md)
- [`devpost/app-map.html`](./devpost/app-map.html)

---

## How It Works

1. **Two Built-In Samples (Saved Analysis — Works Without an API Key):**
   - **Sample 1 — Architecture sample (`$25/hr`, pre-loaded on arrival; no results shown until you click `Analyze message`):**
     - Contract (`src/lib/sample.ts`):
       - `1. Three exterior renders, 4K resolution, daytime lighting.`
       - `2. Up to two revision rounds covering materials, colours and camera angle. Changes to the building's layout or massing count as new work.`
       - `3. Delivery within 7 days of receiving the 3D model.`
       - `4. Additional work is billed at the agreed hourly rate.`
     - Client message (`5` requests) analyzed into:
       1. **"Can you change the facade to brick?"** — **Covered (`0 h`)**, Clause 2 (`"Up to two revision rounds covering materials, colours and camera angle."`)
       2. **"Add a night version of render 2."** — **Extra (`3 h`)**, Clause 1 (`"Three exterior renders, 4K resolution, daytime lighting."`)
       3. **"Do a 30-second walkthrough video."** — **Extra (`8 h`)**, Clause 1 (`"Three exterior renders, 4K resolution, daytime lighting."`)
       4. **"Put the client's logo on every image."** — **Unclear (`0 h` in totals, `2 h` stored default if added)**, `"No matching clause found"`
       5. **"Move the entrance to the other side of the building, should be quick"** — **Extra (`4 h`)**, Clause 2 (`"Changes to the building's layout or massing count as new work."`)
     - Computes **`15 h × $25/h = $375`**, sizes the scope bar by request count (**`20% Covered / 60% Extra / 20% Unclear`**), and writes a 3-sentence reply.
     - Flipping Request #4 from **Unclear** to **Extra** immediately applies its stored `2 h` default and recalculates **`17 h × $25/h = $425`** and **`20% Covered / 80% Extra`** with zero network calls.
   - **Sample 2 — Web design sample (`$40/hr`, switchable via `Load web design sample`):**
     - Contract: 4-page bakery Webflow site (`Home, Menu, About, Contact`), 2 rounds of copy and colour revisions (`Custom illustrations or logo redesigns count as new work`), basic on-page SEO.
     - Client message (`4` requests):
       1. **"Can we swap the hero button colour to warm terracotta?"** — **Covered (`0 h`)**, Clause 2 (`"Up to two rounds of copy and colour revisions before launch."`)
       2. **"Add a custom illustrated map of our neighbourhood on the Contact page."** — **Extra (`4 h`)**, Clause 2 (`"Custom illustrations or logo redesigns count as new work."`)
       3. **"Build an online cake-ordering checkout page with Stripe."** — **Extra (`10 h`)**, Clause 1 (`"Four responsive pages: Home, Menu, About, and Contact."`)
       4. **"Upload our 12 seasonal pastry photos to the Menu page."** — **Unclear (`0 h` in totals, `2 h` stored default)**, `"No matching clause found"`
     - Computes **`14 h × $40/h = $560`** (`25% Covered / 50% Extra / 25% Unclear`).
2. **Word-for-Word Quote Verifier (`verifyClauseQuotes` in `src/lib/ambit.ts`):**
   - Trims, collapses repeated whitespace, and normalizes curly quotes/apostrophes to straight ones on both the contract text and every candidate `clauseQuote`, then checks exact word-for-word substring containment.
   - If a quote is empty or does not appear verbatim in the contract, Ambit replaces it with `"No matching clause found"` and forces the item's status to **Unclear**.
3. **Optional Live AI Route (`/api/analyze` in `src/app/api/analyze/route.ts` — Built, Not Tested with a Live Key):**
   - Reads `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (default `claude-haiku-5-5`) on the server only.
   - Uses `AbortSignal.timeout(10000)` on the Anthropic `fetch` call and returns `"Analysis didn’t finish. Try again, or use the sample."` if the request times out or fails.
   - Enforces a 6,000-character limit per box (`"Keep each box under 6,000 characters."`), validates model output to at most 8 items and only the 4 allowed fields (`requestText`, `clauseQuote`, `status`, `hours`), drops any injected dollar/total fields, and runs `verifyClauseQuotes` before returning.
   - **Honest no-key behavior (built, not tested with a real API key):** Live `/api/analyze` and its default model string (`claude-haiku-5-5`, overridable via `ANTHROPIC_MODEL`) are built in `src/app/api/analyze/route.ts` but are untested with a real `ANTHROPIC_API_KEY` either way. When no key is configured, analyzing custom text shows the honest notice (`"Analyzing your own text needs an Anthropic API key, and this demo doesn’t have one set. You can still see how Ambit works on the built-in architecture sample."`) with a one-click **Load architecture sample** button rather than faking AI classification with local keyword rules.

---

## Local Setup & Run Instructions

### Prerequisites
- Node.js 20+ and npm

### 1. Install dependencies
```bash
npm install
```

### 2. Run the unit test suite (9 tests)
```bash
npm test
```

Actual output from `npx tsx --test test/ambit.test.ts`:
```text
> ambit@1.0.0 test
> tsx --test test/ambit.test.ts

TAP version 13
# Subtest: Ambit pure scope math, quote verifier, and validator
    # Subtest: 1. computes sample initial math: 15 h x $25 = $375 with Covered and Unclear counting as 0
    ok 1 - 1. computes sample initial math: 15 h x $25 = $375 with Covered and Unclear counting as 0
      ---
      duration_ms: 17.159734
      type: 'test'
      ...
    # Subtest: 2. flipping Request 4 from Unclear to Extra uses its stored 2 h default to produce 17 h x $25 = $425
    ok 2 - 2. flipping Request 4 from Unclear to Extra uses its stored 2 h default to produce 17 h x $25 = $425
      ---
      duration_ms: 0.620961
      type: 'test'
      ...
    # Subtest: 3. sizes bar segments by request count (20% / 60% / 20% initially, then 20% / 80% / 0%)
    ok 3 - 3. sizes bar segments by request count (20% / 60% / 20% initially, then 20% / 80% / 0%)
      ---
      duration_ms: 0.404616
      type: 'test'
      ...
    # Subtest: 4. clamps negative, blank, and NaN values for hours and hourly rate to 0
    ok 4 - 4. clamps negative, blank, and NaN values for hours and hourly rate to 0
      ---
      duration_ms: 0.288762
      type: 'test'
      ...
    # Subtest: 5. normalizes whitespace and curly quotes/apostrophes, forces failed quotes to Unclear, and preserves valid AI hours (defaulting to 2 h only when invalid)
    ok 5 - 5. normalizes whitespace and curly quotes/apostrophes, forces failed quotes to Unclear, and preserves valid AI hours (defaulting to 2 h only when invalid)
      ---
      duration_ms: 0.235253
      type: 'test'
      ...
    # Subtest: 6. verifies all 5 built-in sample items against the sample contract and keeps Request 4 Unclear
    ok 6 - 6. verifies all 5 built-in sample items against the sample contract and keeps Request 4 Unclear
      ---
      duration_ms: 0.156448
      type: 'test'
      ...
    # Subtest: 7. route validator drops extra injected fields (totals, dollars, rate) and caps list at 8 items
    ok 7 - 7. route validator drops extra injected fields (totals, dollars, rate) and caps list at 8 items
      ---
      duration_ms: 0.470924
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

### 3. Configure optional environment variables (only needed for custom text)
```bash
cp .env.example .env.local
```
Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`, which defaults to `claude-haiku-5-5`; both the live route and default model string are untested with a live API key).

### 4. Start the development server
```bash
npm run dev
```
Open `http://localhost:3000`.

---

## Project Structure

- `src/lib/ambit.ts` — Pure scope math (`calculateAmbitSummary`, `flipItemStatus`, `clampNonNegative`), quote normalizer and verifier (`normalizeQuoteText`, `verifyClauseQuotes`), 4-field AI validator (`validateAiItems`), and 3-sentence reply generator (`buildChangeOrderReply`).
- `src/lib/sample.ts` — Two built-in saved samples (`Architecture sample` at `$25/hr` and `Web design sample` at `$40/hr`).
- `src/app/page.tsx` — Single-screen Next.js App Router workbench with Dark/Light mode toggle, sample selector, count-proportional bar, status toggles, and one-click reply copy.
- `src/app/api/analyze/route.ts` — Server-only Anthropic endpoint with `AbortSignal.timeout(10000)` and 6,000-character input guard.
- `test/ambit.test.ts` — 9 TypeScript unit tests run via `npx tsx --test test/ambit.test.ts`.
- `devpost/` — Devpost Learn Skill Pack artifacts (`scope.md`, `prd.md`, `spec.md`, `checklist.md`, `app-map.html`).

---

## License

MIT License — see [`LICENSE`](./LICENSE).
