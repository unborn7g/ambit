---
doc: scope
status: approved
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# Ambit

A scope-creep guard for freelancers that turns a signed contract and a client's WhatsApp or email message into clause-matched request flags (`Covered`, `Extra`, `Unclear`), deterministic extra-hour and dollar math, a two-lane scope bar, and a ready-to-send 3-sentence change-order reply.

## The Unique Kernel
Ambit separates subjective language parsing from financial math: the AI (or cached sample parser) only splits a client message into discrete requests, matches each one to a quoted contract clause, and suggests `Covered`, `Extra`, or `Unclear` with editable hours—while plain deterministic code computes every total (`hours × rate = dollars`), drives the two-lane green/red scope bar, and updates the 3-sentence change-order reply instantly whenever a freelancer overrides a flag or edits an hour estimate.

## Who It's For
Independent freelancers—such as architectural visualization artists, designers, and student freelancers—who agree on a fixed set of deliverables (renders, drawing sets, presentation boards) and then receive casual follow-up messages on WhatsApp or email treating new work as "quick changes." Today, they often absorb unpaid extra hours to avoid an uncomfortable boundary conversation or underprice the added work.

## The Core Loop
1. The freelancer pastes their signed contract deliverables on the left, pastes the client's follow-up WhatsApp or email message on the right, and sets their hourly rate (or loads the built-in architectural visualization sample).
2. Ambit breaks the client message into separate requests, quotes the matching contract clause for each, and labels each `Covered`, `Extra`, or `Unclear` alongside a two-lane green/red bar.
3. The freelancer reviews the flags, overrides any classification (e.g., flipping `Unclear` to `Extra` or `Covered`) or edits the hours on any extra item—watching the bar segments, extra-hours total, dollar total, formula line (`Calculated in code: 15 h × $25 = $375`), and 3-sentence change-order reply recalculate immediately with no AI call—then copies the reply to send to the client.

## Inspiration & Identity
Calm, premium, high-craft studio tool with both light and dark modes, a single signature visual (the two-lane green/red scope bar), tactile button hover/press states, no emoji icons in the UI, and red/green states always paired with explicit text labels and vector icons. Displays a clear "Not legal advice" disclaimer on the page.

## Why This Matters to the Learner
As an Architecture student who has freelanced extensively producing renders, drawing sets, and presentation boards, the learner has experienced firsthand how casual WhatsApp revision requests quietly expand fixed-scope jobs—and wants both to build a practical boundary-setting tool for freelancers and to understand how the code strictly separates AI text classification from trustworthy, deterministic math.

## What "Working" Looks Like
Opening Ambit and running the built-in architectural visualization job (4 contract clauses covering three 4K daytime exterior renders and two material/colour/camera revision rounds vs. a 5-part client WhatsApp message asking for a brick facade, a night render, a 30-second walkthrough video, logo watermarks, and moving the building entrance):
- Within seconds, Ambit flags Request 1 as `Covered` (material change under Clause 2, 0 h), Request 2 as `Extra` (night version, 3 h), Request 3 as `Extra` (walkthrough video, 8 h), Request 4 as `Unclear` (logo placement not mentioned, shown as a third neutral hatched segment in the bar labelled `"Unclear: not priced yet"` and excluded from hours/dollars until resolved), and Request 5 as `Extra` (entrance layout change under Clause 2, 4 h), totaling `15 h × $25 = $375`.
- Flipping Request 4 from `Unclear` to `Extra` assigns it a default of `2 h` (editable) and immediately updates the bar segments, the extra-hours total (`17 h`), the dollar total (`$425`), the visible formula (`Calculated in code: 17 h × $25 = $425`), and the numbers inside the 3-sentence change-order reply—with zero AI calls.

## The POC Boundary
- Single-page Next.js + Tailwind web app (`no login`, `no database`).
- Built-in architectural visualization sample contract + WhatsApp message with cached results so the demo works with no API key.
- Live analysis via the Anthropic API when `ANTHROPIC_API_KEY` is set, returning structured request items (`Covered` / `Extra` / `Unclear`, quoted clause, suggested hours).
- Pure TypeScript calculation module that computes all totals (`hours × rate`), bar segments, and change-order reply numbers client-side on every override or hour edit.
- Visible "Not legal advice" disclaimer.

## Later
- Multi-currency formatting and PDF/DOCX contract file upload.
- Saving project history across multiple client revision rounds.
- Shareable read-only quote link for the client.

## Explicitly Cut
- **User accounts and login:** Unnecessary friction for a single-session proof of concept and demo video.
- **Database persistence:** All state for the PoC lives in the active session plus the built-in cached sample.
- **AI-generated math:** The AI is never allowed to calculate hours totals or dollar totals; plain code owns every calculation so the numbers are 100% auditable.
- **Guessing when a contract is silent:** Ambiguous requests are marked `Unclear` rather than forced into `Covered` or `Extra`.
