export type RequestStatus = "Covered" | "Extra" | "Unclear";

export interface RawAiItem {
  requestText?: unknown;
  clauseQuote?: unknown;
  status?: unknown;
  hours?: unknown;
  shortLabel?: unknown;
  clauseTag?: unknown;
  reason?: unknown;
  [key: string]: unknown;
}

export interface AmbitItem {
  id: number;
  short: string;
  requestText: string;
  clauseTag: string;
  clauseQuote: string;
  reason: string;
  status: RequestStatus;
  hours: number; // Stored on Extra and Unclear (default 2h if missing/invalid); Covered is 0h; only Extra counts in totals
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
  totalCoveredHours: number;
  totalExtraHours: number;
  totalUnclearStoredHours: number;
  totalExtraDollars: number;
  billText: string;
  formulaText: string;
  billNote: string;
  tallyCov: string;
  tallyExt: string;
  tallyUnc: string;
  replyText: string;
}

export const MAX_INPUT_CHARS = 6000;
export const MAX_AI_ITEMS = 8;
export const DEFAULT_UNCLEAR_HOURS = 2;

/**
 * Clamps any blank, NaN, or negative value to 0, and caps at a safe upper bound.
 */
export function clampNonNegative(value: unknown, max = 100000): number {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return Math.min(Math.round(num * 100) / 100, max);
}

/**
 * Preserves valid positive hours (> 0) for Unclear items, falling back to 2h only when missing or invalid.
 */
export function preserveOrDefaultUnclearHours(value: unknown): number {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(num) || num <= 0) {
    return DEFAULT_UNCLEAR_HOURS;
  }
  return Math.min(Math.round(num * 100) / 100, 999);
}

/**
 * Normalizes text before word-for-word quote comparison:
 * - Trims leading/trailing whitespace
 * - Converts curly single quotes/apostrophes and double quotes to straight ASCII quotes
 * - Collapses repeated whitespace (including newlines) into a single space
 */
export function normalizeQuoteText(text: string): string {
  return String(text ?? "")
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function makeShortLabel(requestText: string): string {
  const cleaned = requestText
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/^can you\s+/i, "")
    .replace(/^please\s+/i, "")
    .replace(/[.,!?🙏]+$/g, "")
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 4).join(" ").toLowerCase();
  return words || "request";
}

function normalizeStatus(raw: unknown): RequestStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "covered") return "Covered";
  if (s === "extra" || s === "extra work") return "Extra";
  return "Unclear";
}

/**
 * Strictly validates an AI response array:
 * - Must be a JSON array
 * - Caps at MAX_AI_ITEMS (8)
 * - Keeps ONLY the 4 core validated fields (requestText, clauseQuote, status, hours),
 *   dropping any injected totals, dollar amounts, rates, or extra fields.
 */
export function validateAiItems(rawPayload: unknown): AmbitItem[] {
  if (!Array.isArray(rawPayload)) {
    throw new Error("AI response must be a JSON array of request items.");
  }

  const sliced = rawPayload.slice(0, MAX_AI_ITEMS);
  const validated: AmbitItem[] = [];

  for (let i = 0; i < sliced.length; i++) {
    const entry = sliced[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Item at index ${i} is not a valid object.`);
    }
    const obj = entry as RawAiItem;
    if (typeof obj.requestText !== "string" || !obj.requestText.trim()) {
      throw new Error(`Item at index ${i} is missing requestText.`);
    }

    const requestText = obj.requestText.trim();
    const clauseQuote = typeof obj.clauseQuote === "string" ? obj.clauseQuote.trim() : "";
    const status = normalizeStatus(obj.status);

    let hours = 0;
    if (status === "Covered") {
      hours = 0;
    } else if (status === "Unclear") {
      hours = preserveOrDefaultUnclearHours(obj.hours);
    } else {
      hours = preserveOrDefaultUnclearHours(obj.hours);
    }

    validated.push({
      id: i + 1,
      short: makeShortLabel(requestText),
      requestText,
      clauseTag: clauseQuote ? "Matched clause" : "No matching clause found",
      clauseQuote,
      reason:
        status === "Covered"
          ? "Covered by the quoted contract clause."
          : status === "Extra"
            ? "Falls outside the agreed deliverables."
            : "The contract does not clearly settle this item. You decide.",
      status,
      hours,
    });
  }

  return validated;
}

/**
 * Checks in plain code that each item's clauseQuote appears word-for-word inside contractText
 * after normalizing whitespace and curly quotes/apostrophes.
 * If a quote is empty or does not appear word-for-word in contractText:
 * - Sets clauseQuote = "No matching clause found"
 * - Sets clauseTag = "No clause"
 * - Forces status = "Unclear"
 * - Preserves the item's suggested hours if valid (> 0), using 2h only when missing or invalid.
 */
export function verifyClauseQuotes(contractText: string, items: AmbitItem[]): AmbitItem[] {
  const normalizedContract = normalizeQuoteText(contractText);

  return items.map((item) => {
    const rawQuote = item.clauseQuote ?? "";
    const normalizedQuote = normalizeQuoteText(rawQuote);

    const isMissingOrSentinel =
      !normalizedQuote ||
      normalizedQuote.toLowerCase() === "no matching clause found" ||
      normalizedQuote.toLowerCase() === "none";

    const existsWordForWord =
      !isMissingOrSentinel &&
      normalizedContract.length > 0 &&
      normalizedContract.includes(normalizedQuote);

    if (!existsWordForWord) {
      return {
        ...item,
        clauseTag: "No clause",
        clauseQuote: "No matching clause found",
        status: "Unclear",
        hours: preserveOrDefaultUnclearHours(item.hours),
      };
    }

    if (item.status === "Covered") {
      return {
        ...item,
        hours: 0,
      };
    }

    if (item.status === "Unclear") {
      return {
        ...item,
        hours: preserveOrDefaultUnclearHours(item.hours),
      };
    }

    return {
      ...item,
      hours: clampNonNegative(item.hours, 999),
    };
  });
}

/**
 * Updates an item's status flag according to PRD rules:
 * - Covered -> hours = 0
 * - Unclear -> preserves positive hours or defaults to 2h (counts as 0 in totals while Unclear)
 * - Extra -> preserves positive hours or defaults to 2h when flipping from Unclear/Covered with 0h
 */
export function flipItemStatus(item: AmbitItem, nextStatus: RequestStatus): AmbitItem {
  if (nextStatus === "Covered") {
    return { ...item, status: "Covered", hours: 0 };
  }
  if (nextStatus === "Unclear") {
    return {
      ...item,
      status: "Unclear",
      hours: preserveOrDefaultUnclearHours(item.hours),
    };
  }
  return {
    ...item,
    status: "Extra",
    hours: item.hours > 0 ? clampNonNegative(item.hours, 999) : DEFAULT_UNCLEAR_HOURS,
  };
}

export function formatHours(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export function formatMoney(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function joinNatural(list: string[]): string {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
}

/**
 * Builds the deterministic 3-sentence change-order reply from the current items and totals.
 */
export function buildChangeOrderReply(
  items: AmbitItem[],
  hourlyRate: number,
  usingSample = true
): string {
  const rate = clampNonNegative(hourlyRate);
  const cov = items.filter((x) => x.status === "Covered");
  const ext = items.filter((x) => x.status === "Extra");
  const unc = items.filter((x) => x.status === "Unclear");

  const sumExt = ext.reduce((acc, x) => acc + clampNonNegative(x.hours, 999), 0);
  const dollars = Math.round(sumExt * rate * 100) / 100;
  const billText = formatMoney(dollars);
  const rateText = formatMoney(rate);

  const hi = usingSample ? "Hi Daniel, " : "Hi, ";

  const s1 =
    cov.length > 0
      ? `${hi}thanks for the great feedback, and the ${joinNatural(cov.map((x) => x.short))}${cov.length === 1 ? " fits" : " fit"} within your agreed revision rounds, so I will include ${cov.length === 1 ? "it" : "them"} at no extra cost.`
      : `${hi}thanks for the great feedback.`;

  const s2 =
    ext.length > 0
      ? `The ${joinNatural(ext.map((x) => x.short))}${ext.length === 1 ? " falls" : " fall"} outside the agreed deliverables and would take about ${formatHours(sumExt)} h, which comes to ${billText} at ${rateText}/h.`
      : "Nothing else in this message falls outside the agreed scope.";

  const s3 =
    unc.length > 0
      ? `Could you confirm whether you want the ${joinNatural(unc.map((x) => x.short))}, so I can price ${unc.length === 1 ? "it" : "them"} before I start?`
      : ext.length > 0
        ? "If that works for you, I will send a short change order for your approval before I start."
        : "I will go ahead with the covered changes as agreed.";

  return `${s1} ${s2} ${s3}`;
}

/**
 * Pure deterministic calculator for all numbers, bar counts/percentages, formula text, and reply.
 */
export function calculateAmbitSummary(
  items: AmbitItem[],
  rawHourlyRate: unknown,
  usingSample = true
): AmbitSummary {
  const hourlyRate = clampNonNegative(rawHourlyRate);
  const totalCount = items.length;

  const cov = items.filter((x) => x.status === "Covered");
  const ext = items.filter((x) => x.status === "Extra");
  const unc = items.filter((x) => x.status === "Unclear");

  const coveredCount = cov.length;
  const extraCount = ext.length;
  const unclearCount = unc.length;

  // Bar sizing by request COUNT per PRD and UI-HANDOFF.md
  const coveredPct = totalCount > 0 ? Math.round((coveredCount / totalCount) * 10000) / 100 : 0;
  const extraPct = totalCount > 0 ? Math.round((extraCount / totalCount) * 10000) / 100 : 0;
  const unclearPct = totalCount > 0 ? Math.round((unclearCount / totalCount) * 10000) / 100 : 0;

  // Covered and Unclear always count 0h and $0 in totals
  const totalCoveredHours = 0;
  const totalExtraHours =
    Math.round(ext.reduce((acc, x) => acc + clampNonNegative(x.hours, 999), 0) * 100) / 100;
  const totalUnclearStoredHours =
    Math.round(unc.reduce((acc, x) => acc + preserveOrDefaultUnclearHours(x.hours), 0) * 100) / 100;

  const totalExtraDollars = Math.round(totalExtraHours * hourlyRate * 100) / 100;
  const billText = formatMoney(totalExtraDollars);
  const rateText = formatMoney(hourlyRate);

  const formulaText = `Calculated in code: ${formatHours(totalExtraHours)} h x ${rateText} = ${billText}`;

  const billNote =
    unclearCount > 0
      ? `${unclearCount} ${unclearCount === 1 ? "unclear request is" : "unclear requests are"} not priced yet (${formatHours(totalUnclearStoredHours)} h if you add ${unclearCount === 1 ? "it" : "them"}).`
      : "";

  const tallyCov = `${coveredCount} covered, 0 h`;
  const tallyExt = `${extraCount} extra${extraCount > 0 ? `, ${formatHours(totalExtraHours)} h` : ", 0 h"}`;
  const tallyUnc = `${unclearCount} unclear`;

  const replyText = buildChangeOrderReply(items, hourlyRate, usingSample);

  return {
    totalCount,
    coveredCount,
    extraCount,
    unclearCount,
    coveredPct,
    extraPct,
    unclearPct,
    hourlyRate,
    totalCoveredHours,
    totalExtraHours,
    totalUnclearStoredHours,
    totalExtraDollars,
    billText,
    formulaText,
    billNote,
    tallyCov,
    tallyExt,
    tallyUnc,
    replyText,
  };
}
