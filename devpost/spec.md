---
doc: spec
status: approved
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# Ambit — Technical Spec

## How This Works, In Plain Language
Ambit has three small pieces that each do one job:

1. **The Reader (`/api/analyze` + Built-In Sample Fixture):** When you click **"Analyze message"** on the built-in architecture sample, Ambit loads the pre-verified 5-request list directly from a local file (`src/lib/sample.ts`) with no API key or network call needed. When you paste your own contract and client message, the browser sends them to a server route (`/api/analyze`) that calls Claude on the server (`ANTHROPIC_API_KEY` never leaves the server, and the model is read from `process.env.ANTHROPIC_MODEL` with a documented default in `.env.example`). Because text inside a pasted contract or client message might contain prompt-injection instructions aimed at the AI, the server validator (`validateAiItems` in `src/lib/ambit.ts`) restricts the AI output strictly to a JSON list of at most 8 items containing only four validated fields (`requestText`, `clauseQuote`, `status`, `hours`) and drops any other fields such as totals, rates, or dollar amounts.
2. **The Quote Verifier (`verifyClauseQuotes` in `src/lib/ambit.ts`):** Before any AI result is trusted, plain code normalizes both the pasted contract text and each item's `clauseQuote` (trimming, collapsing repeated whitespace to a single space, and converting curly quotes `‘’“”` and apostrophes to straight `' "` characters) and checks that the quote appears word for word inside the contract text—with no fuzzy matching and no paraphrase accepted. If the quote is empty or does not appear word for word in the contract, code replaces it with `"No matching clause found"`, forces that item's status to `Unclear`, and preserves the AI's suggested hours if they are valid (`> 0`), using `2 h` only when suggested hours are missing or invalid.
3. **The Calculator (`calculateAmbitSummary` & `buildChangeOrderReply` in `src/lib/ambit.ts`):** Every number on screen is computed in the browser by plain TypeScript code. `Covered` items always count as `0 h` and `$0`. `Unclear` items keep their valid suggested hours stored on the item (defaulting to `2 h` only if missing or invalid) so those hours are ready when the user flips the item to `Extra`, while counting as `0 h` and `$0` in every total while marked `Unclear`. `Extra` items sum into `totalExtraHours`, multiply by `hourlyRate` to produce `totalExtraDollars`, size the bar segments by request count, and populate the 3-sentence change-order reply template immediately whenever the user flips a flag or edits a number.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Arrival:** Opening `/` renders `src/app/page.tsx` with the 4 architectural visualization contract clauses, the 5-part WhatsApp message, and `hourlyRate = 25` loaded from `src/lib/sample.ts` in an unanalyzed state (`items = null`).
2. **Input Check & Sample Detection:** Clicking **"Analyze message"** first checks in client code:
   - That neither textarea is empty (if empty, it sets the inline message `"Add your contract and your client's message first."` and focuses the first empty box while keeping any existing text).
   - That neither textarea exceeds `6,000` characters (if over `6,000` characters, it shows a visible inline message `"Keep each box under 6,000 characters."` and makes no API call).
   - Whether the trimmed contract and message match the built-in architecture sample.
3. **Sample Path (Zero API Key):** When the inputs match the built-in sample, the page loads the 5 cached sample items (`#1 Covered 0 h`, `#2 Extra 3 h`, `#3 Extra 8 h`, `#4 Unclear 2 h stored`, `#5 Extra 4 h`), passes them through `verifyClauseQuotes(contractText, items)` and `calculateAmbitSummary(items, hourlyRate)`, and renders the result immediately.
4. **Custom Text Path (`POST /api/analyze`):** When the user analyzes custom text, the browser posts `{ contractText, messageText }` to `/api/analyze`.
   - If `process.env.ANTHROPIC_API_KEY` is not set on the server, `/api/analyze` returns `{ ok: false, code: "NO_API_KEY" }`, and the UI displays `"Analyzing your own text needs an Anthropic API key, and this demo doesn't have one set. You can still see how Ambit works on the built-in architecture sample."` alongside a button that loads and analyzes the sample.
   - If `ANTHROPIC_API_KEY` is set, `/api/analyze` calls Anthropic (`process.env.ANTHROPIC_MODEL || "claude-haiku-5-5"`) with a 10-second timeout (`AbortSignal.timeout(10000)`), runs `validateAiItems(rawParsed)` (accepting only a JSON array of objects, keeping only the 4 allowed fields, dropping any extra fields like totals or dollar amounts, and capping at `8` items), runs `verifyClauseQuotes(contractText, items)`, and returns the verified items. If the list is empty, the UI shows `"No requests found in this message"`. If the API times out, fails, or returns an invalid shape, the UI shows `"Analysis didn’t finish. Try again, or use the sample."` while preserving the user's text.
5. **Live Overrides in Plain Code:** When the user flips Request #4 from `Unclear` to `Extra` (or edits any item's hours or the hourly rate), React updates local state and calls `calculateAmbitSummary(items, hourlyRate)` synchronously in the browser—updating Request #4 to `Extra (2 h)`, shifting the bar counts from `20% / 60% / 20%` to `20% / 80% / 0%`, updating the formula line to `"Calculated in code: 17 h x $25 = $425"`, and updating the 3-sentence change-order reply with zero network calls.

## Stack
- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/docs) with React 19 and TypeScript — provides the single-page UI (`src/app/page.tsx`) and the server-only API route (`src/app/api/analyze/route.ts`) in one project so `ANTHROPIC_API_KEY` stays strictly on the server.
- **Styling:** [Tailwind CSS v3](https://tailwindcss.com/docs) — implements the light/dark theme tokens, tabular numerals (`tabular-nums`), responsive stacking, and tactile hover/press states from the learner's design prototype.
- **AI Provider (Optional at runtime):** [Anthropic Messages API (`https://api.anthropic.com/v1/messages`)](https://docs.anthropic.com/en/api/messages) called via native `fetch` with `AbortSignal.timeout(10000)` on the server, reading `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` from environment variables.
- **Testing:** [tsx](https://tsx.is/) + Node.js built-in test runner (`npx tsx --test test/ambit.test.ts`) — executes TypeScript unit tests directly against `src/lib/ambit.ts` and `src/lib/sample.ts` across all Node versions, with real test runner output pasted into `devpost/checklist.md` and `README.md`.

## Where It Runs and How Someone Tries It
- **Main Path (Local Development):**
  - Requires Node.js 18+ and npm.
  - Copy `.env.example` to `.env.local` (leave `ANTHROPIC_API_KEY=` blank to use the built-in sample, or set `ANTHROPIC_API_KEY` and optional `ANTHROPIC_MODEL` to test custom text).
  - Run `npm install` then `npm run dev` and open `http://localhost:3000`.
  - Run `npm test` (`npx tsx --test test/ambit.test.ts`) to execute the 8 unit tests.
- **Optional Public Deployment:**
  - Can be deployed to [Vercel](https://vercel.com/docs) with `ANTHROPIC_API_KEY` left unset by default so the built-in sample works reliably for judges and no API key is exposed on a public link without a spend limit.

## Look and Feel
PRD ref: `prd.md > Look and Feel`, `scope.md > Inspiration & Identity`.

- Follow the learner's supplied design prototype for visual styling, typography, spacing, light and dark mode palette, tabular numerals (`font-variant-numeric: tabular-nums`), and tactile hover and press states.
- **PRD Rule Precedence:** The supplied prototype is a visual reference only; where it differs from the PRD, the PRD rules win. Specifically, the scope bar segment widths are sized by **request count** (`Covered` count / `Extra` count / `Unclear` count divided by total request count), never by hours, so a `0 h` `Covered` request always has a visible green segment.
- Every status (`Covered`, `Extra`, `Unclear`) pairs color/pattern with explicit text and vector icons; no emoji icons appear in the UI chrome.

## Components

### 1. Pure Scope Engine, Input Sanitizer & Quote Verifier (`src/lib/ambit.ts`)
Implements `prd.md > 2. Scope Bar and Deterministic Code Math`, `prd.md > 3. Clause-Matched Request Cards and Flag Overrides`, `prd.md > 4. Deterministic 3-Sentence Change-Order Reply`, `prd.md > States and Boundaries`.
- Exports pure functions with zero DOM or network dependencies:
  - `normalizeQuoteText(text)`: trims, converts curly single/double quotes and apostrophes (`‘’‚‛“”„‟`) to straight `' "` characters, and collapses repeated whitespace (`/\s+/g`) to a single space.
  - `clampNonNegative(value)`: parses numbers and clamps blank, `NaN`, or negative numbers to `0`.
  - `preserveOrDefaultUnclearHours(hours)`: keeps the AI's suggested hours if valid (`typeof hours === "number" && Number.isFinite(hours) && hours > 0`), and uses `2` only when missing or invalid (`<= 0` or `NaN`).
  - `validateAiItems(rawPayload)`: validates that `rawPayload` is a JSON array, caps the list at `8` items, extracts only the four allowed fields (`requestText`, `clauseQuote`, `status`, `hours`), and drops any other fields (including totals, rates, or dollar amounts) to defend against prompt injection inside pasted contracts or messages.
  - `verifyClauseQuotes(contractText, items)`: normalizes `contractText` and each item's `clauseQuote` via `normalizeQuoteText` and checks exact word-for-word substring containment. If a quote is empty, `"No matching clause found"`, or does not appear word for word in `contractText`, sets `clauseQuote = "No matching clause found"`, forces `status = "Unclear"`, and sets `hours = preserveOrDefaultUnclearHours(item.hours)`. If `status === "Covered"`, sets `hours = 0`.
  - `flipItemStatus(item, nextStatus)`: updates an item's status; when flipping to `Extra`, keeps `item.hours` if `> 0` or sets `item.hours = 2` if `<= 0`.
  - `calculateAmbitSummary(items, hourlyRate)`: computes `coveredCount`, `extraCount`, `unclearCount`, count-based percentages (`coveredPct`, `extraPct`, `unclearPct`), `totalExtraHours` (summing `clampNonNegative(item.hours)` only where `status === "Extra"`), `totalExtraDollars` (`totalExtraHours * clampNonNegative(hourlyRate)`), and `formulaText` (`"Calculated in code: <totalExtraHours> h x $<rate> = $<totalExtraDollars>"`).
  - `buildChangeOrderReply(items, hourlyRate, summary)`: returns the deterministic 3-sentence change-order reply string, handling both positive Extra totals and the `0 Extra items` case cleanly.

### 2. Built-In Samples (`src/lib/sample.ts`)
Implements `prd.md > 1. Sample Pre-load, Clear, and Input Validation`.
- Stores two built-in saved samples (`Architecture sample` at `$25/hr` and `Web design sample` at `$40/hr`), clearly labeled in the UI as saved sample analyses, whose quotes are exact word-for-word substrings of their contracts:
  - **Architecture sample (`$25/hr`):**
    1. `"Can you change the facade to brick?"` -> `Covered`, `0 h`, quote: `"Up to two revision rounds covering materials, colours and camera angle."`
    2. `"Add a night version of render 2."` -> `Extra`, `3 h`, quote: `"Three exterior renders, 4K resolution, daytime lighting."`
    3. `"Do a 30-second walkthrough video."` -> `Extra`, `8 h`, quote: `"Three exterior renders, 4K resolution, daytime lighting."`
    4. `"Put the client's logo on every image."` -> `Unclear`, `2 h` (stored default, priced at `0` while Unclear), quote: `"No matching clause found"` (stays `Unclear` through `verifyClauseQuotes`)
    5. `"Move the entrance to the other side of the building, should be quick"` -> `Extra`, `4 h`, quote: `"Changes to the building's layout or massing count as new work."`
  - **Web design sample (`$40/hr`):**
    1. `"Can we swap the hero button colour to warm terracotta?"` -> `Covered`, `0 h`, quote: `"Up to two rounds of copy and colour revisions before launch."`
    2. `"Add a custom illustrated map of our neighbourhood on the Contact page."` -> `Extra`, `4 h`, quote: `"Custom illustrations or logo redesigns count as new work."`
    3. `"Build an online cake-ordering checkout page with Stripe."` -> `Extra`, `10 h`, quote: `"Four responsive pages: Home, Menu, About, and Contact."`
    4. `"Upload our 12 seasonal pastry photos to the Menu page."` -> `Unclear`, `2 h` (stored default, priced at `0` while Unclear), quote: `"No matching clause found"`

### 3. Server Analysis Endpoint (`src/app/api/analyze/route.ts`)
Implements `prd.md > States and Boundaries`.
- Accepts `POST { contractText, messageText }`.
- Validates non-empty strings and enforces a maximum length of `6,000` characters per field (`MAX_INPUT_CHARS = 6000`).
- Never logs or stores user text.
- Reads `process.env.ANTHROPIC_API_KEY` and `process.env.ANTHROPIC_MODEL` (default `"claude-haiku-5-5"`) on the server only. If `ANTHROPIC_API_KEY` is unset, returns `HTTP 503` with `missingKey: true`.
- When set, requests structured JSON from Anthropic with `signal: AbortSignal.timeout(10000)`, returns `"Analysis didn’t finish. Try again, or use the sample."` if the request times out or fails, runs `validateAiItems` (stripping any extra fields and capping at 8 items), runs `verifyClauseQuotes(contractText, items)` on the server, and returns `{ items }`.

### 4. Single-Screen Workspace UI (`src/app/page.tsx`)
Implements `prd.md > Screens and Layout`, `prd.md > Features and Behavior`, `prd.md > States and Boundaries`.
- Renders the 7 sections in exact PRD order, shows a visible inline message if either box exceeds `6,000` characters, and wires every button, flag toggle, and hours/rate input to `src/lib/ambit.ts`.

## Data Model
All state lives in browser memory during the active session (`React.useState`):

```ts
export type RequestStatus = "Covered" | "Extra" | "Unclear";

export interface AmbitItem {
  id: string;
  requestText: string;
  clauseQuote: string; // Word-for-word substring of contractText, or "No matching clause found"
  status: RequestStatus;
  hours: number;       // Stored on Extra and Unclear (keeps valid AI hours or defaults to 2h); only Extra counts in totals
}

export interface AmbitSummary {
  totalCount: number;
  coveredCount: number;
  extraCount: number;
  unclearCount: number;
  coveredPct: number;
  extraPct: number;
  unclearPct: number;
  hourlyRate: number;
  totalExtraHours: number;
  totalExtraDollars: number;
  formulaText: string;
  replyText: string;
}
```

## File Structure
```
hackathon/ambit/
├── .env.example                 # Placeholders only: ANTHROPIC_API_KEY= and ANTHROPIC_MODEL=claude-haiku-5-5
├── .gitignore                   # Ignores /devpost/learner-profile.md, .env, .env.*, node_modules, .next
├── LICENSE                      # MIT License
├── README.md                    # Setup/run steps, real test output, architecture boundary, honest "How AI was used"
├── package.json                 # Next.js, React, Tailwind, tsx test runner (`npm test`)
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── devpost/
│   ├── scope.md                 # Approved project scope
│   ├── prd.md                   # Approved product requirements
│   ├── spec.md                  # Approved technical specification (this file)
│   ├── checklist.md             # Created and updated in 5-build
│   └── app-map.html             # Created in 5-build
├── src/
│   ├── app/
│   │   ├── globals.css          # Theme variables & tabular numeral utilities
│   │   ├── layout.tsx           # Root layout & fonts
│   │   ├── page.tsx             # Single-screen Ambit interface
│   │   └── api/
│   │       └── analyze/
│   │           └── route.ts     # Server-only Anthropic endpoint + strict 4-field validator
│   └── lib/
│       ├── ambit.ts             # Pure math, bar sizing, quote normalization & verification, 3-sentence template
│       └── sample.ts            # Built-in architectural visualization sample & cached items
└── test/
    └── ambit.test.ts            # 8 TypeScript unit tests run via `npx tsx --test test/ambit.test.ts`
```

## Spec Test List (`test/ambit.test.ts`)
1. **Sample Initial Math (`$375`):** Verifies the 5 sample items at `$25/hr` compute `15 h` of Extra work (`3 + 8 + 4`), `totalExtraDollars = 375`, and `formulaText = "Calculated in code: 15 h x $25 = $375"`, with Request #1 (`Covered`) and Request #4 (`Unclear`, `2 h` stored) contributing `0` to the totals.
2. **Flipping Request #4 from `Unclear` to `Extra` (`$425`):** Verifies flipping Request #4 to `Extra` uses its stored `2 h` default, updating `totalExtraHours` to `17`, `totalExtraDollars` to `425`, `formulaText` to `"Calculated in code: 17 h x $25 = $425"`, and updating the 3-sentence reply text.
3. **Bar Count Sizing (`20% / 60% / 20%` -> `20% / 80% / 0%`):** Verifies segment percentages are based on request counts (`1/5 = 20%` Covered, `3/5 = 60%` Extra, `1/5 = 20%` Unclear initially; `20% / 80% / 0%` after flipping Request #4 to Extra).
4. **Negative and Blank Clamping:** Verifies negative, blank, or `NaN` values for item hours or `hourlyRate` clamp to `0` and never produce negative numbers or `NaN`.
5. **Quote Verification Normalization & Hours Preservation:** Verifies that curly quotes/apostrophes and line-break whitespace differences pass `verifyClauseQuotes`, whereas a paraphrased or invented quote not present in the contract is replaced with `"No matching clause found"`, forces `status = "Unclear"`, **keeps the AI's suggested hours when valid (e.g., `5 h` stays `5 h`)**, and defaults to `2 h` only when missing or invalid.
6. **Built-In Sample Passes `verifyClauseQuotes`:** Verifies all 5 built-in sample items pass `verifyClauseQuotes` against the sample contract text, with Request #4 remaining `Unclear` with `"No matching clause found"`.
7. **Route Validator Drops Extra Fields & Caps at 8 Items:** Verifies `validateAiItems` strips injected or extra fields (`totalDollars`, `totalHours`, `rate`, `promptInjection`) and caps a 10-item array at `8` items.
8. **Zero Extra Items Reply:** Verifies `buildChangeOrderReply` reads naturally and accurately when `0` items are marked `Extra` (`0 h`, `$0`).
9. **Second Built-In Sample (`Web Design`) Quote Verification & Math:** Verifies all 4 items in the built-in Web Design sample pass `verifyClauseQuotes` against `WEB_DESIGN_SAMPLE_CONTRACT` and compute `14 h x $40 = $560`.

## External Services and Dependencies
- **Anthropic Messages API (`https://api.anthropic.com/v1/messages`):**
  - **Keys & Env:** `ANTHROPIC_API_KEY` (server-side only) and `ANTHROPIC_MODEL` (optional, defaults to `"claude-haiku-5-5"`; both the live route and default model string are untested with a live API key).
  - **Input Caps & Prompt-Injection Defense:** Max `6,000` characters per box; output restricted to the 4 validated fields (`requestText`, `clauseQuote`, `status`, `hours`) and capped at `8` items because untrusted contract or message text could contain instructions aimed at the AI.
  - **Privacy & Logging:** Requests are sent to the Anthropic API only when analyzing custom text with a configured key (disclosed in the page footer); Ambit never logs or stores the text.

## Important Failure Modes
- **Input over `6,000` characters** -> Client shows visible inline message `"Keep each box under 6,000 characters."` and makes no API call.
- **Missing `ANTHROPIC_API_KEY` on custom text** -> Server returns `NO_API_KEY`; UI shows `"Analyzing your own text needs an Anthropic API key, and this demo doesn't have one set. You can still see how Ambit works on the built-in architecture sample."` with a one-click button to load and analyze the sample.
- **API timeout (>10s), network error, or invalid JSON shape** -> Server returns an error code; UI shows `"Analysis didn't finish. Try again, or use the sample."` and preserves the user's text.
- **AI invents or paraphrases a contract clause** -> `verifyClauseQuotes` detects that the normalized quote is not a word-for-word substring of `contractText`, replaces the quote with `"No matching clause found"`, forces `status = "Unclear"`, and preserves valid suggested hours (or defaults to `2 h`).
- **AI returns an empty array (`[]`)** -> UI shows `"No requests found in this message"` and renders no result cards.

## What Was Simplified and Why
- **Cached fixture for the built-in architecture sample** instead of calling Anthropic on the sample — guarantees 100% deterministic demo behavior, zero API cost, and full functionality even when `ANTHROPIC_API_KEY` is not set.
- **Normalized word-for-word substring check in code for clause quotes** instead of a second LLM verification pass — handles curly apostrophes and line wraps while guaranteeing every displayed quote genuinely exists in the contract.
- **In-memory React state** instead of a database — matches the single-session proof-of-concept boundary and keeps client contract text private.

## Decisions and Open Issues
- **Learner Decision — Normalize before quote comparison:** Trim, collapse whitespace, and normalize curly quotes/apostrophes before checking exact word-for-word containment in `contractText`.
- **Learner Decision — Preserve valid AI hours on failed quotes / `Unclear` items:** Only fall back to `2 h` when suggested hours are missing or invalid (`<= 0`).
- **Learner Decision — `tsx --test` TypeScript test runner with real output:** Run `npx tsx --test test/ambit.test.ts` and paste real terminal output into `devpost/checklist.md` and `README.md`.
- **Learner Decision — Prompt-injection defense & `ANTHROPIC_MODEL` env var:** Restrict AI output strictly to the 4 validated fields (`<= 8` items), show a visible message over `6,000` characters, and read `ANTHROPIC_MODEL` from env.

## Sharing and Verification (6-ship)
- **Public GitHub Repository:** `https://github.com/unborn7g/ambit` (verified unauthenticated; includes `devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`, `devpost/checklist.md`, `devpost/app-map.html`, `LICENSE`, `README.md`, and `.env.example`, with `devpost/learner-profile.md` and `.env` excluded).
- **Demo Video (YouTube, 2m 48s):** `https://youtu.be/7atZzsdPHU8` (shows the built-in architecture sample producing `15 h x $25 = $375`, flipping Request #4 from `Unclear` to `Extra` to produce `17 h x $25 = $425` and `20% / 80%`, copying the 3-sentence reply, the AI-vs-code boundary, the honest missing-key notice on custom text, and all 8 unit tests passing).

