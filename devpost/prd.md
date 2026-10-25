---
doc: prd
status: approved
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# Ambit — Product Requirements

A scope-creep guard for freelancers that splits a client's WhatsApp or email message into discrete requests, matches each to a quoted clause from the freelancer's signed contract (`Covered`, `Extra`, or `Unclear`), computes all hours and dollar totals in plain deterministic code, visualizes the split on a three-segment scope bar, and drafts a live 3-sentence change-order reply.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`, `scope.md > The Core Loop`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **Arrival (Pre-filled, Unanalyzed Story):** The user opens Ambit and sees the built-in freelance architectural visualization job pre-loaded: 4 signed contract clauses on the left, the client's 5-part WhatsApp message on the right, and the hourly rate set to `$25`. No results are shown yet so the viewer reads the before-state first.
2. **Analyze:** The user clicks the primary button **"Analyze message"**.
3. **Scope Bar & Code Formula:** Below the inputs, the result section appears with the **Scope Bar** showing `1 Covered` (green, 20%), `3 Extra` (red, 60%), and `1 Unclear` (neutral hatched, 20%, labelled `"Unclear: not priced yet"`), paired with the explicit formula line `"Calculated in code: 15 h x $25 = $375"`.
4. **Clause-Matched Request Cards:** Five request cards appear—one per client request—each showing the client's words, the matched contract clause quoted verbatim, a `Covered` / `Extra` / `Unclear` toggle, and an editable hours field (`0 h` for Request 1 Covered; `3 h` for Request 2 night render; `8 h` for Request 3 walkthrough video; unpriced for Request 4 Unclear logo placement; `4 h` for Request 5 entrance layout change).
5. **Live Override in Plain Code:** The user flips Request 4 (`Put the client's logo on every image`) from `Unclear` to `Extra` (or edits an item's hours or the hourly rate). With zero AI calls, Request 4 receives a default of `2 h`, the bar segments update to `1 Covered` (20%) and `4 Extra` (80%), the formula line updates to `"Calculated in code: 17 h x $25 = $425"`, and the 3-sentence change-order reply updates its item list, hours, and dollar total immediately.
6. **Copy Reply:** The user clicks **"Copy"** on the 3-sentence change-order reply panel to paste the response back into WhatsApp or email.

## Screens and Layout
Source: `scope.md > The Core Loop`, `scope.md > The POC Boundary`.

Ambit is a single-screen web application with seven vertical sections that stack cleanly on mobile:

1. **Header:** `Ambit` wordmark/name, light/dark mode toggle, and a `"Not legal advice"` status chip.
2. **Hero Headline:** `"Know what's covered before you say yes"` with one plain subline explaining what to paste and what comes back.
3. **Input Workbench:** Two side-by-side panels on desktop (`Signed contract deliverables` on the left | `Client message` on the right, stacked on mobile), an editable `Hourly rate ($)` field (default `$25`), the primary **"Analyze message"** button, and a small **"Clear and paste your own"** link (which reveals **"Load architecture sample"** whenever the inputs differ from the built-in sample).
4. **Scope Bar & Formula Panel:** The signature horizontal bar with `Covered` (green), `Extra` (red), and `Unclear` (neutral hatched `"Unclear: not priced yet"`) segments sized by request count, plus the bold extra-hours/dollar summary and the `"Calculated in code: 15 h x $25 = $375"` formula line.
5. **Request Cards List:** One card per parsed client request displaying the client's words, the quoted contract clause, the interactive `Covered` / `Extra` / `Unclear` segmented control, and the editable hours input.
6. **Change-Order Reply Panel:** Deterministic 3-sentence reply with live-updating numbers and a **"Copy"** button with confirmation state.
7. **Footer:** `"Not legal advice"` disclaimer, a concise `"How AI is used here"` explanation stating that AI only reads text and classifies requests while plain code calculates all hours and dollars, and the privacy disclosure line: `"When you analyze your own text, it is sent to the Anthropic API."`

## Look and Feel
Source: `scope.md > Inspiration & Identity`.

- **Visual Direction:** Follow the supplied design prototype. Calm, premium, light and dark modes, tabular numerals, tactile hover and press states. *(The supplied prototype is a visual reference only; where it differs from the PRD, the PRD rules win—in particular, the scope bar is sized by request count rather than hours so `Covered` at `0 h` never renders as a zero-width green segment.)*
- **Signature Visual:** The horizontal scope bar where `Covered` (green with check/label), `Extra` (red with plus/alert label), and `Unclear` (neutral diagonal hatch with question/label `"Unclear: not priced yet"`) are sized by request count and never rely on color alone.
- **Interaction Craft:** Tactile hover and press states on buttons and flag toggles; no emoji icons anywhere in the UI (Client's original WhatsApp message text may contain the client's `🙏` character, but UI chrome uses only text and clean vector icons).

## Features and Behavior

### 1. Sample Pre-load, Clear, and Input Validation
Source: `scope.md > What "Working" Looks Like`, `scope.md > The POC Boundary`.

- On initial load, the contract textarea contains the 4 architectural visualization clauses, the client message textarea contains the 5-part WhatsApp message, the hourly rate is `25`, and no analysis result is rendered yet.
- Clicking **"Clear and paste your own"** clears both textareas and hides any previous result while keeping a small **"Load architecture sample"** link visible near the buttons so the sample can be restored at any time.
- Clicking **"Analyze message"** when the inputs match the built-in architecture sample loads the cached 5-item classification immediately with no API key required.
- Acceptance criteria:
  - [ ] Initial page load displays the 4-clause architecture contract, 5-part WhatsApp message, and `$25` rate in an unanalyzed state.
  - [ ] Clicking **"Clear and paste your own"** empties both text boxes and displays the **"Load architecture sample"** link.
  - [ ] Clicking **"Analyze message"** on the built-in sample renders all 5 classified requests, the scope bar, and the 3-sentence reply without needing `ANTHROPIC_API_KEY`.

### 2. Scope Bar and Deterministic Code Math
Source: `scope.md > The Unique Kernel`, `scope.md > Explicitly Cut`.

- Segment widths on the bar are proportional to the **count of requests** in each status (e.g., 1 `Covered` = 20%, 3 `Extra` = 60%, 1 `Unclear` = 20%).
- `Covered` items always contribute `0 h` and `$0` to the extra total.
- `Unclear` items appear in the third neutral hatched bar segment labelled `"Unclear: not priced yet"` and contribute `0 h` and `$0` until resolved.
- `Extra` items contribute their editable `hours` value to `totalExtraHours`, and plain code computes `totalExtraDollars = totalExtraHours * hourlyRate`.
- The formula line visibly reads `"Calculated in code: <totalExtraHours> h x $<hourlyRate> = $<totalExtraDollars>"` (for the default sample: `"Calculated in code: 15 h x $25 = $375"`).
- Acceptance criteria:
  - [ ] On the default sample, the bar shows 1 Covered (20%), 3 Extra (60%), and 1 Unclear (20%), and the formula line reads `"Calculated in code: 15 h x $25 = $375"`.
  - [ ] Changing the hourly rate or any Extra item's hours updates `totalExtraHours`, `totalExtraDollars`, and the formula line immediately with zero network requests.

### 3. Clause-Matched Request Cards and Flag Overrides
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

- Each card displays:
  1. The request number and the client's exact words.
  2. The matched contract clause quoted verbatim (or `"Not mentioned in contract"` when the contract is silent).
  3. A 3-way status control (`Covered` | `Extra` | `Unclear`).
  4. An hours input field (enabled and contributing to totals when status is `Extra`; `0 h` when `Covered`; `"Not priced yet"` when `Unclear`).
- When the user flips an `Unclear` item to `Extra`, if its hours were `0` or unset, it automatically receives a default of `2 h` (which remains editable) and the totals update immediately.
- When the user flips an `Extra` item to `Covered` or `Unclear`, its hours are excluded from `totalExtraHours` and `totalExtraDollars` immediately.
- Acceptance criteria:
  - [ ] Built-in sample cards default to: #1 Covered (`0 h`, Clause 2), #2 Extra (`3 h`, Clause 1), #3 Extra (`8 h`, Clause 1), #4 Unclear (`not priced yet`, no clause match), #5 Extra (`4 h`, Clause 2).
  - [ ] Flipping Request #4 from `Unclear` to `Extra` sets its hours to `2 h` and updates the formula line to `"Calculated in code: 17 h x $25 = $425"`.

### 4. Deterministic 3-Sentence Change-Order Reply
Source: `scope.md > The Core Loop`.

- Built from a plain-code template so numbers and item lists stay 100% synchronized with the request cards:
  - **Sentence 1 (Covered items):** Acknowledges the client's message and confirms which requests are included under the current agreement (or notes that all requested items fall outside the current scope if 0 items are Covered).
  - **Sentence 2 (Extra items & quote):** Lists the `Extra` items and states the total additional hours, hourly rate, and total dollar amount (`<totalExtraHours> hours at $<hourlyRate>/hr = $<totalExtraDollars>`) required as a change order before starting them.
  - **Sentence 3 (Unclear items & confirmation):** If any items are marked `Unclear`, asks the client to clarify those specific items before pricing them and asks for approval on the change order; if no items are `Unclear`, asks the client to reply with a quick confirmation to proceed with the extra work.
- Includes a **"Copy"** button that copies the 3-sentence reply to the clipboard and briefly shows `"Copied"`.
- Acceptance criteria:
  - [ ] Editing any flag, hour field, or hourly rate updates the 3-sentence reply text immediately without calling the AI.
  - [ ] Clicking **"Copy"** copies the current 3-sentence text to the clipboard.

## States and Boundaries

- **First Use (Unanalyzed Sample):** Sample contract, sample WhatsApp message, and `$25` rate are filled in; results section is hidden until **"Analyze message"** is clicked.
- **Empty Input Validation:** If the user clicks **"Analyze message"** while either the contract box or the client message box is empty, no API call is made and no result is shown. An inline message appears under the button: `"Add your contract and your client's message first."` Focus moves to the first empty box, and any text already entered in the other box is preserved.
- **Invalid Rate or Hours Input:** Negative or blank values in the hourly rate or hours fields are clamped to `0` in calculation so `NaN` or negative dollars never appear on screen.
- **Custom Text Without `ANTHROPIC_API_KEY`:** If the user modifies the contract or client message away from the built-in sample and clicks **"Analyze message"** when no `ANTHROPIC_API_KEY` is configured on the server, the app shows the honest message: `"Analyzing your own text needs an Anthropic API key, and this demo doesn't have one set. You can still see how Ambit works on the built-in architecture sample."` alongside a button that loads and analyzes the built-in architecture sample in one click.
- **API Failure or Timeout:** If the API call fails or times out, show `"Analysis didn't finish. Try again, or use the sample."` and keep the user's text.
- **No Requests Found in Message:** If the AI finds no requests in the message, show `"No requests found in this message"` and no results.
- **Session Persistence Boundary:** Nothing is stored in a database or across browser sessions; refreshing returns to the clean pre-filled architecture sample.

## Product Decisions

- **Pre-filled but unanalyzed sample on arrival:** Lets judges and viewers read the contract and WhatsApp message first so clicking **"Analyze message"** creates a clear before-and-after reveal.
- **Bar width sized by request count, with hours/dollars as a bold label:** Avoids inventing fake hour estimates for `Covered` or `Unclear` items while keeping the visual ratio truthful.
- **Third neutral hatched bar segment for `Unclear` (`"Unclear: not priced yet"`):** Shows unresolved scope ambiguity visually without inflating the dollar quote; defaults to `2 h` when flipped to `Extra`.
- **No keyword/rule-based fallback for custom text when API key is missing:** A naive keyword matcher would misclassify real contracts and undermine the core premise that AI handles language reading while code handles math. Showing an honest message with a 1-click button to run the cached sample is safer and more transparent for judges.
- **3-sentence reply generated by a deterministic code template:** Guarantees that overriding a flag or editing hours updates the drafted reply instantaneously with zero AI latency or hallucinated numbers.

## What We're Building
- Single-page Next.js + Tailwind web app (`/`).
- Pre-loaded architectural visualization sample (4 contract clauses + 5-request WhatsApp message + `$25/hr` rate) with cached analysis results (`Covered` #1, `Extra` #2 `3h`, `Extra` #3 `8h`, `Unclear` #4, `Extra` #5 `4h` = `15 h x $25 = $375`).
- Live custom analysis endpoint using Anthropic when `ANTHROPIC_API_KEY` is set, and returning a clear no-key notice when unset.
- Pure TypeScript calculation and reply-template engine driving the 3-segment scope bar, formula line, request card overrides, and 3-sentence change-order reply.
- Light/dark mode toggle, `"Not legal advice"` chip + footer, and `"How AI is used here"` explanation.

## Deferred From the POC
- **Local rule-based fallback parser:** Deliberately excluded so custom analysis never fakes comprehension without an LLM.
- **Multi-session storage / accounts:** Out of scope for a single-session proof of concept.
- **File uploads (PDF/DOCX/screenshots):** Pasting text directly proves the core loop without file-parsing edge cases.

## Possible Later Enhancements
- Exporting an itemized PDF change-order sheet for the client to sign.
- Supporting multi-currency symbols (`₦`, `£`, `€`, `$`) and fixed-fee deliverable add-ons.

## Non-Goals
- Providing legal advice or legally binding contract interpretation (explicitly disclaimed in header and footer).
- Allowing AI to compute or format hour sums or dollar totals.

## Open Questions
- **UI Design Prototype (For `5-build`):** The learner will supply the visual design prototype when we reach the UI build step in `5-build`.
