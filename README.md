# Ambit

**Know what's covered before you say yes.**

Ambit is a scope-creep and change-order calculator for freelancers. Paste your contract deliverables and a client's WhatsApp or email message, set your hourly rate, and Ambit separates every ask into **Covered**, **Extra work**, or **Unclear**, verifies every quoted clause word-for-word against your contract, prices the extra hours in pure TypeScript, and writes a polite three-sentence change-order reply you can copy in one click.

Built using the **Devpost Learn Skill Pack** (`1-start`, `2-scope`, `3-prd`, `4-spec`, `5-build`, `6-ship`). Planning artifacts live in [`devpost/`](./devpost):
- [`devpost/scope.md`](./devpost/scope.md)
- [`devpost/prd.md`](./devpost/prd.md)
- [`devpost/spec.md`](./devpost/spec.md)
- [`devpost/checklist.md`](./devpost/checklist.md)
- [`devpost/app-map.html`](./devpost/app-map.html)

---

## How It Works

1. **Pre-loaded Sample (Works Immediately Without an API Key):**
   - Opens with a realistic architectural visualization contract (`2 exterior renders, 2 revision rounds,brick/concrete/glass palette, daytime sun study`), a 5-part client WhatsApp message, and a `$25/hr` rate.
   - Clicking **Analyze message** sorts the 5 requests into:
     - **Covered (`0 h`):** brick facade material tweak (Clause 2)
     - **Extra (`3 h`):** evening dusk mood render (Clause 1)
     - **Extra (`8 h`):** 15-second walkthrough video (Clause 1)
     - **Unclear (`0 h` in totals, `2 h` stored default if added):** STEP file export for 3D printing (`"No matching clause found"`)
     - **Extra (`4 h`):** moving the main entrance to the north wall (Clause 2)
   - Computes **`15 h × $25/h = $375`**, sizes the scope bar by request count (**`20% Covered / 60% Extra / 20% Unclear`**), and writes a 3-sentence reply.
   - Flipping Request #4 from **Unclear** to **Extra** immediately applies its stored `2 h` default and recalculates **`17 h × $25/h = $425`** and **`20% Covered / 80% Extra`** with zero network calls.
2. **Word-for-Word Quote Verifier (`verifyClauseQuotes` in `src/lib/ambit.ts`):**
   - Trims, collapses repeated whitespace, and normalizes curly quotes/apostrophes to straight ones on both the contract text and every candidate `clauseQuote`, then checks exact word-for-word substring containment.
   - If a quote is empty or does not appear verbatim in the contract, Ambit replaces it with `"No matching clause found"` and forces the item's status to **Unclear**.
3. **Optional Live AI Route (`/api/analyze` in `src/app/api/analyze/route.ts` — Built, Not Tested with a Live Key):**
   - Reads `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (default `claude-3-5-haiku-latest`) on the server only.
   - Enforces a 6,000-character limit per box (`"Keep each box under 6,000 characters."`), validates model output to at most 8 items and only the 4 allowed fields (`requestText`, `clauseQuote`, `status`, `hours`), drops any injected dollar/total fields, and runs `verifyClauseQuotes` before returning.
   - **Honest no-key behavior (built, not tested with a real API key):** Live `/api/analyze` is built in `src/app/api/analyze/route.ts` but was not tested against a live `ANTHROPIC_API_KEY`. When no key is present in `.env.local`, analyzing custom text returns an honest notice (`"Live AI analysis needs an ANTHROPIC_API_KEY in .env.local — click Load Sample to try the full calculator flow"`) with a one-click **Load Sample** button rather than faking AI classification with local keyword rules.

---

## Local Setup & Run Instructions

### Prerequisites
- Node.js 20+ and npm

### 1. Install dependencies
```bash
npm install
```

### 2. Run the unit test suite
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
      duration_ms: 0.430761
      type: 'test'
      ...
    1..8
ok 1 - Ambit pure scope math, quote verifier, and validator
  ---
  duration_ms: 44.831392
  type: 'suite'
  ...
1..1
# tests 8
# suites 1
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 366.273419
```

### 3. Optional environment configuration
The built-in architectural visualization sample works without any environment variables. If you want to test live custom-text analysis with your own Anthropic key, copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`, which defaults to `claude-3-5-haiku-latest`).

### 4. Start the development server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## How AI Was Used

- **Inside the product at runtime:**
  - AI is strictly limited to **reading and suggesting**: when a server `ANTHROPIC_API_KEY` is configured, `/api/analyze` asks Claude to split a client message into up to 8 individual requests and copy the matching contract clause verbatim.
  - AI **never** calculates hours totals, hourly rates, dollar totals, or bar percentages. `validateAiItems` strips everything except `requestText`, `clauseQuote`, `status`, and `hours`, `verifyClauseQuotes` checks word-for-word substring containment against the contract text, and `calculateAmbitSummary` computes all numbers deterministically in TypeScript.
- **During development:**
  - Built step-by-step using the **Devpost Learn Skill Pack** (`1-start` through `6-ship`) to scope the proof of concept, define the acceptance criteria in `devpost/prd.md`, specify the quote verifier and server validation boundary in `devpost/spec.md`, implement and test the 3 vertical slices in `devpost/checklist.md`, and generate `devpost/app-map.html`.

---

## Privacy & Non-Advice Notice

- **Not legal advice:** Ambit is a scope-estimation calculator to help freelancers spot extra work and draft a polite change-order reply. Always read your contract and decide for yourself.
- **Privacy:** When you analyze custom text with an API key configured, your contract deliverables and client message are sent to the Anthropic API. Ambit does not log or store your text.

---

## License

MIT — see [`LICENSE`](./LICENSE).
