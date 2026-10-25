"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AmbitItem,
  MAX_INPUT_CHARS,
  RequestStatus,
  calculateAmbitSummary,
  clampNonNegative,
  flipItemStatus,
  formatHours,
  verifyClauseQuotes,
} from "@/lib/ambit";
import {
  SAMPLE_CONTRACT,
  SAMPLE_HOURLY_RATE,
  SAMPLE_MESSAGE,
  getSampleItems,
  isBuiltInSampleInput,
} from "@/lib/sample";

export default function AmbitPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [contract, setContract] = useState<string>(SAMPLE_CONTRACT);
  const [message, setMessage] = useState<string>(SAMPLE_MESSAGE);
  const [usingSample, setUsingSample] = useState<boolean>(true);
  const [rateStr, setRateStr] = useState<string>(String(SAMPLE_HOURLY_RATE));
  const [stage, setStage] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [items, setItems] = useState<AmbitItem[]>([]);
  const [hoursStrMap, setHoursStrMap] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<false | "yes" | "no">(false);
  const [inputNotice, setInputNotice] = useState<string>("");

  const contractRef = useRef<HTMLTextAreaElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const [billFlashKey, setBillFlashKey] = useState<number>(0);
  const [replyFlashKey, setReplyFlashKey] = useState<number>(0);
  const prevBillRef = useRef<string>("");
  const prevReplyRef = useRef<string>("");

  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        setTheme("dark");
      }
    } catch {
      // keep light
    }
  }, []);

  const contractOverLimit = contract.length > MAX_INPUT_CHARS;
  const messageOverLimit = message.length > MAX_INPUT_CHARS;
  const overCharLimit = contractOverLimit || messageOverLimit;

  const summary = calculateAmbitSummary(items, rateStr, usingSample);

  useEffect(() => {
    if (items.length === 0) return;
    if (prevBillRef.current && prevBillRef.current !== summary.billText) {
      setBillFlashKey((k) => k + 1);
    }
    prevBillRef.current = summary.billText;
  }, [summary.billText, items.length]);

  useEffect(() => {
    if (items.length === 0) return;
    if (prevReplyRef.current && prevReplyRef.current !== summary.replyText) {
      setReplyFlashKey((k) => k + 1);
    }
    prevReplyRef.current = summary.replyText;
  }, [summary.replyText, items.length]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const applyItems = (nextItems: AmbitItem[]) => {
    setItems(nextItems);
    const map: Record<number, string> = {};
    for (const it of nextItems) {
      map[it.id] = String(it.hours);
    }
    setHoursStrMap(map);
  };

  const handleAnalyze = async () => {
    if (running) return;
    setCopied(false);

    if (overCharLimit) {
      setInputNotice("Keep each box under 6,000 characters.");
      if (contractOverLimit) {
        contractRef.current?.focus();
      } else {
        messageRef.current?.focus();
      }
      return;
    }

    if (!contract.trim()) {
      setInputNotice(
        "Paste your contract deliverables above before running the analysis."
      );
      contractRef.current?.focus();
      return;
    }

    if (!message.trim()) {
      setInputNotice(
        "Paste your client's message above before running the analysis."
      );
      messageRef.current?.focus();
      return;
    }

    setInputNotice("");
    setRunning(true);
    setStage(1);
    setItems([]);

    await new Promise((r) => setTimeout(r, 260));
    setStage(2);
    await new Promise((r) => setTimeout(r, 260));

    const isSample = isBuiltInSampleInput(contract, message);
    setUsingSample(isSample);
    const verified = verifyClauseQuotes(contract, getSampleItems());
    applyItems(verified);
    prevBillRef.current = "";
    prevReplyRef.current = "";
    setStage(3);
    setRunning(false);
  };

  const handleLoadSample = () => {
    if (running) return;
    setContract(SAMPLE_CONTRACT);
    setMessage(SAMPLE_MESSAGE);
    setUsingSample(true);
    setRateStr(String(SAMPLE_HOURLY_RATE));
    setItems([]);
    setStage(0);
    setCopied(false);
    setInputNotice("");
  };

  const handleClear = () => {
    if (running) return;
    setContract("");
    setMessage("");
    setUsingSample(false);
    setItems([]);
    setStage(0);
    setCopied(false);
    setInputNotice("");
    setTimeout(() => {
      contractRef.current?.focus();
    }, 0);
  };

  const handleSetFlag = (id: number, nextFlag: RequestStatus) => {
    setCopied(false);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = flipItemStatus(it, nextFlag);
        setHoursStrMap((m) => ({ ...m, [id]: String(updated.hours) }));
        return updated;
      })
    );
  };

  const handleSetHours = (id: number, rawVal: string) => {
    setCopied(false);
    const num = Number(rawVal);
    const normalizedStr =
      rawVal.trim() !== "" && Number.isFinite(num) && num < 0 ? "0" : rawVal;
    setHoursStrMap((m) => ({ ...m, [id]: normalizedStr }));
    const clamped = clampNonNegative(rawVal, 999);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, hours: clamped } : it))
    );
  };

  const handleBlurHours = (id: number) => {
    const raw = hoursStrMap[id] ?? "";
    const clamped = clampNonNegative(raw, 999);
    setHoursStrMap((m) => ({ ...m, [id]: String(clamped) }));
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, hours: clamped } : it))
    );
  };

  const handleRateChange = (rawVal: string) => {
    setCopied(false);
    const num = Number(rawVal);
    if (rawVal.trim() !== "" && Number.isFinite(num) && num < 0) {
      setRateStr("0");
      return;
    }
    setRateStr(rawVal);
  };

  const handleRateBlur = () => {
    const clamped = clampNonNegative(rateStr, 99999);
    setRateStr(String(clamped));
  };

  const handleCopyReply = async () => {
    let ok = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary.replyText);
        ok = true;
      }
    } catch {
      ok = false;
    }
    setCopied(ok ? "yes" : "no");
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const isDark = theme === "dark";
  const hasItems = items.length > 0;
  const totalCount = Math.max(items.length, 1);
  const unitPct = 100 / totalCount;

  const covItems = items.filter((x) => x.status === "Covered");
  const extItems = items.filter((x) => x.status === "Extra");
  const uncItems = items.filter((x) => x.status === "Unclear");

  // Count-based bar geometry (PRD rule: each request occupies 1 / totalCount of the bar width)
  const laneA = covItems.map((x, idx) => ({
    key: `a-${x.id}`,
    leftPct: idx * unitPct,
    widthPct: unitPct,
    label: `${x.short} · 0 h`,
    title: `${x.short}: Covered (0 h)`,
  }));

  const laneB: Array<{
    key: string;
    leftPct: number;
    widthPct: number;
    isUnclear: boolean;
    label: string;
    title: string;
  }> = [];

  extItems.forEach((x, idx) => {
    laneB.push({
      key: `e-${x.id}`,
      leftPct: idx * unitPct,
      widthPct: unitPct,
      isUnclear: false,
      label: `${x.short} · ${formatHours(x.hours)} h`,
      title: `${x.short}: ${formatHours(x.hours)} h extra`,
    });
  });

  uncItems.forEach((x, idx) => {
    laneB.push({
      key: `u-${x.id}`,
      leftPct: (extItems.length + idx) * unitPct,
      widthPct: unitPct,
      isUnclear: true,
      label: "Unclear: not priced yet",
      title: `${x.short}: Unclear (${formatHours(x.hours)} h if added)`,
    });
  });

  const analyzeLabel = running
    ? stage === 1
      ? "Splitting the message…"
      : "Matching clauses…"
    : hasItems
      ? "Analyze again"
      : "Analyze message";

  const analyzePct = running ? Math.round((stage / 3) * 100) : 0;
  const visibleBanner = overCharLimit
    ? "Keep each box under 6,000 characters."
    : inputNotice;

  return (
    <div
      className="am-root"
      data-theme={theme}
      style={{
        color: "var(--ink)",
        backgroundColor: "var(--bg)",
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
        fontSize: "16px",
        lineHeight: 1.55,
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--glass)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            padding: "12px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
              <rect x="2" y="2" width="28" height="28" rx="9" fill="var(--ink)" />
              <path
                d="M9 21.5L16 9l7 12.5"
                fill="none"
                stroke="var(--brass)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 17.5h8"
                stroke="var(--bg)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <span
              className="am-display"
              style={{
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              Ambit
            </span>
          </div>

          <nav className="am-links" aria-label="Primary">
            <a className="am-link" href="#workbench">
              Your job
            </a>
            <a className="am-link" href="#results">
              What&apos;s covered
            </a>
            <a className="am-link" href="#reply">
              Reply
            </a>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "13px",
                padding: "6px 12px",
                border: "1px solid var(--rule)",
                borderRadius: "999px",
                color: "var(--muted)",
                whiteSpace: "nowrap",
              }}
            >
              Not legal advice
            </span>
            <button
              type="button"
              className="am-icon-btn"
              data-testid="theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                border: "1px solid var(--rule)",
                background: "transparent",
                color: "var(--ink)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isDark ? (
                <span key="dark" className="am-spin">
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  </svg>
                </span>
              ) : (
                <span key="light" className="am-spin">
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "0 28px 80px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "88px",
        }}
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "36px",
            paddingTop: "72px",
          }}
        >
          <h1
            className="am-display am-rise"
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: "clamp(46px, 8.4vw, 112px)",
              lineHeight: 0.96,
              letterSpacing: "-0.045em",
              maxWidth: "11em",
              textWrap: "balance",
            }}
          >
            Know what&apos;s covered before you say yes.
          </h1>
          <p
            className="am-rise"
            style={{
              animationDelay: ".12s",
              margin: 0,
              fontSize: "clamp(18px, 2vw, 22px)",
              lineHeight: 1.5,
              color: "var(--muted)",
              maxWidth: "34em",
              textWrap: "pretty",
            }}
          >
            Paste your contract and your client&apos;s message. Ambit sorts every
            request into covered, extra work or unclear, prices the extras, and
            writes your reply.
          </p>

          <div
            aria-hidden="true"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginTop: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", height: "84px" }}>
              <div
                className="am-g1"
                style={{
                  flex: 1,
                  background: "var(--cov)",
                  borderRadius: "18px",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "14px 18px",
                  boxSizing: "border-box",
                  color: "var(--onCov)",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
              >
                Covered
              </div>
              <div
                className="am-g2"
                style={{
                  flex: 3,
                  background: "var(--ext)",
                  borderRadius: "18px",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "14px 18px",
                  boxSizing: "border-box",
                  color: "var(--onExt)",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
              >
                Extra work
              </div>
              <div
                className="am-g3"
                style={{
                  flex: 1,
                  backgroundColor: "var(--uncSoft)",
                  backgroundImage:
                    "repeating-linear-gradient(135deg, var(--unc) 0 1px, transparent 1px 7px)",
                  border: "1.5px dashed var(--unc)",
                  borderRadius: "18px",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "12px 16px",
                  boxSizing: "border-box",
                  color: "var(--uncText)",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
              >
                Unclear
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px 48px",
              fontSize: "16px",
              color: "var(--muted)",
              maxWidth: "44em",
            }}
          >
            <div style={{ flex: "1 1 260px" }}>
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>
                The AI reads.
              </strong>{" "}
              It splits the message into requests and quotes the clause that
              matches.
            </div>
            <div style={{ flex: "1 1 260px" }}>
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>
                Plain code counts.
              </strong>{" "}
              Hours, rate, bar and reply numbers are calculated, never guessed.
            </div>
          </div>
        </section>

        <section
          id="workbench"
          aria-labelledby="inputs-title"
          style={{
            scrollMarginTop: "84px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h2
              id="inputs-title"
              className="am-display"
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: "clamp(32px, 4.4vw, 52px)",
                letterSpacing: "-0.035em",
                lineHeight: 1.04,
              }}
            >
              Start with your job
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "17px" }}>
              A sample architectural visualization job is loaded. Edit it, or
              paste your own.
            </p>
          </div>

          <div
            style={{
              background: "var(--panel)",
              borderRadius: "28px",
              boxShadow: "var(--lift)",
              padding: "clamp(16px, 3vw, 32px)",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
              <div
                style={{
                  flex: "1 1 440px",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="contract"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    Contract deliverables
                  </label>
                  <span
                    className="am-num"
                    style={{
                      fontSize: "13px",
                      color: contractOverLimit ? "var(--extText)" : "var(--muted)",
                      fontWeight: contractOverLimit ? 600 : 400,
                    }}
                  >
                    {contract.length.toLocaleString()} /{" "}
                    {MAX_INPUT_CHARS.toLocaleString()}
                  </span>
                </div>
                <textarea
                  ref={contractRef}
                  id="contract"
                  data-testid="contract"
                  className="am-field"
                  value={contract}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setContract(nextVal);
                    setUsingSample(isBuiltInSampleInput(nextVal, message));
                    if (inputNotice) setInputNotice("");
                  }}
                  rows={9}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    minHeight: "250px",
                    padding: "18px 20px",
                    border: contractOverLimit ? "1.5px solid var(--ext)" : 0,
                    borderRadius: "18px",
                    background: "var(--well)",
                    color: "var(--ink)",
                    fontFamily: "inherit",
                    fontSize: "16px",
                    lineHeight: 1.6,
                    resize: "vertical",
                  }}
                />
              </div>
              <div
                style={{
                  flex: "1 1 440px",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="message"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    Client&apos;s WhatsApp or email message
                  </label>
                  <span
                    className="am-num"
                    style={{
                      fontSize: "13px",
                      color: messageOverLimit ? "var(--extText)" : "var(--muted)",
                      fontWeight: messageOverLimit ? 600 : 400,
                    }}
                  >
                    {message.length.toLocaleString()} /{" "}
                    {MAX_INPUT_CHARS.toLocaleString()}
                  </span>
                </div>
                <textarea
                  ref={messageRef}
                  id="message"
                  data-testid="message"
                  className="am-field"
                  value={message}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setMessage(nextVal);
                    setUsingSample(isBuiltInSampleInput(contract, nextVal));
                    if (inputNotice) setInputNotice("");
                  }}
                  rows={9}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    minHeight: "250px",
                    padding: "18px 20px",
                    border: messageOverLimit ? "1.5px solid var(--ext)" : 0,
                    borderRadius: "18px",
                    background: "var(--well)",
                    color: "var(--ink)",
                    fontFamily: "inherit",
                    fontSize: "16px",
                    lineHeight: 1.6,
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            {visibleBanner && (
              <div
                role="alert"
                data-testid="input-notice"
                style={{
                  padding: "12px 18px",
                  borderRadius: "14px",
                  background: "var(--extSoft)",
                  color: "var(--extText)",
                  fontSize: "15px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span>{visibleBanner}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  height: "60px",
                  padding: "0 20px",
                  borderRadius: "999px",
                  background: "var(--well)",
                  boxSizing: "border-box",
                }}
              >
                <label
                  htmlFor="rate"
                  style={{ fontSize: "15px", color: "var(--muted)" }}
                >
                  Hourly rate
                </label>
                <span
                  className="am-num"
                  style={{ fontSize: "20px", color: "var(--muted)" }}
                >
                  $
                </span>
                <input
                  id="rate"
                  data-testid="rate"
                  type="number"
                  min="0"
                  step="1"
                  value={rateStr}
                  onChange={(e) => handleRateChange(e.target.value)}
                  onBlur={handleRateBlur}
                  style={{
                    width: "70px",
                    border: 0,
                    background: "transparent",
                    color: "var(--ink)",
                    fontFamily:
                      "'Bricolage Grotesque', 'Instrument Sans', sans-serif",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: "24px",
                    fontWeight: 600,
                    outlineOffset: "6px",
                  }}
                />
              </div>

              <button
                type="button"
                className="am-btn"
                data-testid="analyze"
                onClick={handleAnalyze}
                disabled={running}
                style={{
                  height: "60px",
                  padding: "0 34px",
                  border: 0,
                  borderRadius: "999px",
                  background: "var(--ink)",
                  color: "var(--bg)",
                  fontSize: "18px",
                  fontWeight: 600,
                  cursor: running ? "progress" : "pointer",
                  opacity: running ? 0.85 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span>{analyzeLabel}</span>
                <svg
                  className="am-arrow"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    height: "3px",
                    background: "var(--brass)",
                    transition: "width .6s ease",
                    width: `${analyzePct}%`,
                  }}
                />
              </button>

              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  marginLeft: "auto",
                }}
              >
                <button
                  type="button"
                  className="am-text-btn"
                  data-testid="load-sample"
                  onClick={handleLoadSample}
                  disabled={running}
                  style={{
                    minHeight: "44px",
                    padding: "0 16px",
                    border: 0,
                    borderRadius: "999px",
                    background: "transparent",
                    color: "var(--muted)",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Load architecture sample
                </button>
                <button
                  type="button"
                  className="am-text-btn"
                  data-testid="clear"
                  onClick={handleClear}
                  disabled={running}
                  style={{
                    minHeight: "44px",
                    padding: "0 16px",
                    border: 0,
                    borderRadius: "999px",
                    background: "transparent",
                    color: "var(--muted)",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Clear and paste your own
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          id="results"
          aria-labelledby="results-title"
          aria-live="polite"
          style={{
            scrollMarginTop: "84px",
            display: "flex",
            flexDirection: "column",
            gap: "32px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h2
              id="results-title"
              className="am-display"
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: "clamp(32px, 4.4vw, 52px)",
                letterSpacing: "-0.035em",
                lineHeight: 1.04,
              }}
            >
              What&apos;s covered
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "17px" }}>
              Change any flag or the hours. Everything recalculates at once,
              with no AI call.
            </p>
          </div>

          {!hasItems && (
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "28px",
                padding: "72px 24px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "17px",
                background: "var(--panel)",
                boxShadow: "var(--lift)",
              }}
            >
              {running && <div className="am-scan" />}
              <span className={running ? "am-breathe" : ""}>
                {running
                  ? stage === 1
                    ? "Splitting the message into separate requests…"
                    : "Matching each request to a contract clause…"
                  : visibleBanner
                    ? visibleBanner
                    : message.trim() && contract.trim()
                      ? "Run the analysis to see what is covered. Your job is ready above."
                      : "Paste a contract and a client message above, then run the analysis."}
              </span>
            </div>
          )}

          {hasItems && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "32px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: "24px 48px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontSize: "16px", color: "var(--muted)" }}>
                    Extra work to bill
                  </div>
                  <div
                    key={billFlashKey}
                    className={`am-num ${billFlashKey > 0 ? (billFlashKey % 2 === 1 ? "am-fa" : "am-fb") : ""}`}
                    data-testid="bill"
                    style={{
                      fontSize: "clamp(72px, 12vw, 148px)",
                      fontWeight: 700,
                      lineHeight: 0.95,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {summary.billText}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    flex: "1 1 320px",
                    maxWidth: "520px",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <span
                      data-testid="stat-covered"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 14px",
                        borderRadius: "999px",
                        background: "var(--covSoft)",
                        color: "var(--covText)",
                        fontSize: "15px",
                        fontWeight: 600,
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 8.5l3.2 3.2L13 4.8" />
                      </svg>
                      {summary.tallyCov}
                    </span>

                    <span
                      data-testid="stat-extra"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 14px",
                        borderRadius: "999px",
                        background: "var(--extSoft)",
                        color: "var(--extText)",
                        fontSize: "15px",
                        fontWeight: 600,
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                      {summary.tallyExt}
                    </span>

                    <span
                      data-testid="stat-unclear"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 14px",
                        borderRadius: "999px",
                        background: "var(--uncSoft)",
                        color: "var(--uncText)",
                        fontSize: "15px",
                        fontWeight: 600,
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M6 6a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.5M8 12v.1" />
                      </svg>
                      {summary.tallyUnc}
                    </span>
                  </div>

                  <div
                    data-testid="formula"
                    style={{
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: "14px",
                      color: "var(--ink)",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      background: "var(--panel)",
                      boxShadow: "var(--lift)",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {summary.formulaText}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "var(--muted)",
                      minHeight: "20px",
                    }}
                  >
                    {summary.billNote}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "var(--panel)",
                  borderRadius: "28px",
                  boxShadow: "var(--lift)",
                  padding: "clamp(18px, 3vw, 32px)",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
                data-testid="bar"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginBottom: "14px",
                  }}
                >
                  <h3
                    className="am-display"
                    style={{
                      margin: 0,
                      fontSize: "22px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Scope, by request count
                  </h3>
                  <span style={{ fontSize: "14px", color: "var(--muted)" }}>
                    Each block is one request ({Math.round(unitPct)}% of{" "}
                    {summary.totalCount} requests) · {summary.coveredPct}% covered /{" "}
                    {summary.extraPct}% extra / {summary.unclearPct}% unclear
                  </span>
                </div>

                {/* Lane A: In contract (Covered) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "96px",
                      flex: "none",
                      fontSize: "14px",
                      color: "var(--muted)",
                      lineHeight: 1.3,
                    }}
                  >
                    In contract
                  </div>
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      height: "64px",
                      background: "var(--well)",
                      borderRadius: "16px",
                      overflow: "hidden",
                    }}
                  >
                    {laneA.map((a) => (
                      <div
                        key={a.key}
                        className="am-stamp"
                        title={a.title}
                        style={{
                          position: "absolute",
                          top: "6px",
                          bottom: "6px",
                          left: `${a.leftPct}%`,
                          width: `${a.widthPct}%`,
                          background: "var(--cov)",
                          color: "var(--onCov)",
                          borderRadius: "11px",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          boxSizing: "border-box",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          fontSize: "14px",
                          fontWeight: 600,
                          transition: "left .5s ease, width .5s ease",
                        }}
                      >
                        {a.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "14px", height: "34px" }}>
                  <div style={{ width: "96px", flex: "none" }} />
                  <div style={{ flex: 1, position: "relative" }}>
                    {summary.coveredCount > 0 && (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            top: "3px",
                            left: "0%",
                            width: `${summary.coveredPct}%`,
                            height: "9px",
                            borderLeft: "1.5px solid var(--covText)",
                            borderRight: "1.5px solid var(--covText)",
                            borderBottom: "1.5px solid var(--covText)",
                            boxSizing: "border-box",
                            transition: "width .5s ease",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "15px",
                            left: "0%",
                            width: `${summary.coveredPct}%`,
                            textAlign: "center",
                            fontSize: "13px",
                            color: "var(--covText)",
                            whiteSpace: "nowrap",
                            overflow: "visible",
                          }}
                        >
                          Covered: {summary.coveredCount} ({summary.coveredPct}%) · 0 h
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Lane B: Extra and Unclear */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "96px",
                      flex: "none",
                      fontSize: "14px",
                      color: "var(--muted)",
                      lineHeight: 1.3,
                    }}
                  >
                    Extra and unclear
                  </div>
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      height: "64px",
                      background: "var(--well)",
                      borderRadius: "16px",
                      overflow: "hidden",
                    }}
                  >
                    {laneB.map((b) => (
                      <div
                        key={b.key}
                        className="am-stamp"
                        title={b.title}
                        style={{
                          position: "absolute",
                          top: "6px",
                          bottom: "6px",
                          left: `${b.leftPct}%`,
                          width: `${b.widthPct}%`,
                          borderRadius: "11px",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          boxSizing: "border-box",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          fontSize: "14px",
                          fontWeight: 600,
                          transition: "left .5s ease, width .5s ease",
                          ...(b.isUnclear
                            ? {
                                backgroundColor: "var(--uncSoft)",
                                backgroundImage:
                                  "repeating-linear-gradient(135deg, var(--unc) 0 1px, transparent 1px 7px)",
                                border: "1.5px dashed var(--unc)",
                                color: "var(--uncText)",
                              }
                            : {
                                background: "var(--ext)",
                                color: "var(--onExt)",
                              }),
                        }}
                      >
                        {b.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "14px", height: "34px" }}>
                  <div style={{ width: "96px", flex: "none" }} />
                  <div style={{ flex: 1, position: "relative" }}>
                    {summary.extraCount > 0 && (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            top: "3px",
                            left: "0%",
                            width: `${summary.extraPct}%`,
                            height: "9px",
                            borderLeft: "1.5px solid var(--extText)",
                            borderRight: "1.5px solid var(--extText)",
                            borderBottom: "1.5px solid var(--extText)",
                            boxSizing: "border-box",
                            transition: "width .5s ease, left .5s ease",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "15px",
                            left: "0%",
                            width: `${summary.extraPct}%`,
                            textAlign: "center",
                            fontSize: "13px",
                            color: "var(--extText)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Billable: {summary.extraCount} ({summary.extraPct}%) ·{" "}
                          {formatHours(summary.totalExtraHours)} h = {summary.billText}
                        </div>
                      </>
                    )}
                    {summary.unclearCount > 0 && (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            top: "3px",
                            left: `${summary.extraPct}%`,
                            width: `${summary.unclearPct}%`,
                            height: "9px",
                            borderLeft: "1.5px solid var(--uncText)",
                            borderRight: "1.5px solid var(--uncText)",
                            borderBottom: "1.5px dashed var(--uncText)",
                            boxSizing: "border-box",
                            transition: "width .5s ease, left .5s ease",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "15px",
                            left: `${summary.extraPct}%`,
                            width: `${summary.unclearPct}%`,
                            textAlign: "center",
                            fontSize: "13px",
                            color: "var(--uncText)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Unclear: not priced yet ({summary.unclearPct}%)
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "96px",
                      flex: "none",
                      fontSize: "13px",
                      color: "var(--muted)",
                    }}
                  >
                    Requests
                  </div>
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      height: "24px",
                      borderTop: "1px solid var(--rule)",
                    }}
                  >
                    {Array.from({ length: summary.totalCount }, (_, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: `${idx * unitPct}%`,
                          borderLeft: "1px solid var(--rule)",
                          padding: "4px 0 0 5px",
                          fontSize: "12px",
                          color: "var(--muted)",
                        }}
                      >
                        #{idx + 1} ({Math.round((idx + 1) * unitPct)}%)
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px 22px",
                    fontSize: "14px",
                    color: "var(--muted)",
                    marginTop: "14px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        background: "var(--cov)",
                        borderRadius: "5px",
                        display: "inline-block",
                      }}
                    />
                    Covered by the contract
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        background: "var(--ext)",
                        borderRadius: "5px",
                        display: "inline-block",
                      }}
                    />
                    Extra work, billable
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        border: "1.5px dashed var(--unc)",
                        backgroundImage:
                          "repeating-linear-gradient(135deg, var(--unc) 0 1px, transparent 1px 5px)",
                        borderRadius: "5px",
                        boxSizing: "border-box",
                        display: "inline-block",
                      }}
                    />
                    Unclear: not priced yet
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <h3
                  className="am-display"
                  style={{
                    margin: "0 0 10px",
                    fontSize: "28px",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Requests found in the message
                </h3>

                <div
                  style={{
                    background: "var(--panel)",
                    borderRadius: "28px",
                    boxShadow: "var(--lift)",
                    padding: "10px",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {items.map((r, idx) => {
                    const n = idx + 1;
                    const isCov = r.status === "Covered";
                    const isExt = r.status === "Extra";
                    const isUnc = r.status === "Unclear";
                    const hasQuote =
                      Boolean(r.clauseQuote) &&
                      r.clauseQuote !== "No matching clause found";

                    const chipStyle = isCov
                      ? { background: "var(--covSoft)", color: "var(--covText)" }
                      : isExt
                        ? { background: "var(--extSoft)", color: "var(--extText)" }
                        : { background: "var(--uncSoft)", color: "var(--uncText)" };

                    const segStyle = (on: boolean, kind: RequestStatus) => {
                      if (!on)
                        return { background: "transparent", color: "var(--muted)" };
                      if (kind === "Covered")
                        return { background: "var(--cov)", color: "var(--onCov)" };
                      if (kind === "Extra")
                        return { background: "var(--ext)", color: "var(--onExt)" };
                      return { background: "var(--unc)", color: "var(--bg)" };
                    };

                    return (
                      <article
                        key={r.id}
                        className="am-row"
                        data-testid={`req-${n}`}
                        style={{
                          borderRadius: "20px",
                          padding: "22px 22px",
                          boxSizing: "border-box",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "20px 32px",
                          ...(idx < items.length - 1
                            ? {
                                borderBottom: "1px solid var(--rule)",
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0,
                              }
                            : {}),
                        }}
                      >
                        <div
                          style={{
                            flex: "1 1 420px",
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "12px",
                            }}
                          >
                            <span
                              style={{
                                ...chipStyle,
                                flex: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 11px",
                                borderRadius: "999px",
                                fontSize: "13px",
                                fontWeight: 600,
                                marginTop: "4px",
                              }}
                            >
                              {isCov && (
                                <svg
                                  viewBox="0 0 16 16"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M3 8.5l3.2 3.2L13 4.8" />
                                </svg>
                              )}
                              {isExt && (
                                <svg
                                  viewBox="0 0 16 16"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  aria-hidden="true"
                                >
                                  <path d="M8 3v10M3 8h10" />
                                </svg>
                              )}
                              {isUnc && (
                                <svg
                                  viewBox="0 0 16 16"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  aria-hidden="true"
                                >
                                  <path d="M6 6a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.5M8 12v.1" />
                                </svg>
                              )}
                              {isCov
                                ? "Covered"
                                : isExt
                                  ? "Extra work"
                                  : "Unclear"}
                            </span>
                            <p
                              className="am-display"
                              style={{
                                margin: 0,
                                fontSize: "24px",
                                fontWeight: 600,
                                lineHeight: 1.25,
                                letterSpacing: "-0.02em",
                                textWrap: "pretty",
                              }}
                            >
                              &ldquo;{r.requestText}&rdquo;
                            </p>
                          </div>

                          <div
                            style={{
                              fontSize: "15px",
                              color: "var(--muted)",
                              textWrap: "pretty",
                              maxWidth: "40em",
                            }}
                          >
                            <span
                              style={{ fontWeight: 600, color: "var(--ink)" }}
                            >
                              {hasQuote ? `${r.clauseTag}. ` : "No matching clause found. "}
                            </span>
                            {hasQuote && (
                              <span style={{ fontStyle: "italic" }}>
                                &ldquo;{r.clauseQuote}&rdquo;{" "}
                              </span>
                            )}
                            {r.reason}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "14px 20px",
                          }}
                        >
                          <div
                            role="group"
                            aria-label={`Flag for request ${n}`}
                            style={{
                              display: "inline-flex",
                              padding: "4px",
                              gap: "4px",
                              borderRadius: "999px",
                              background: "var(--well)",
                            }}
                          >
                            <button
                              type="button"
                              className="am-seg-btn"
                              data-testid={`flag-${n}-covered`}
                              onClick={() => handleSetFlag(r.id, "Covered")}
                              aria-pressed={isCov}
                              style={{
                                minHeight: "44px",
                                padding: "0 18px",
                                border: 0,
                                borderRadius: "999px",
                                fontSize: "15px",
                                fontWeight: 600,
                                cursor: "pointer",
                                ...segStyle(isCov, "Covered"),
                              }}
                            >
                              Covered
                            </button>
                            <button
                              type="button"
                              className="am-seg-btn"
                              data-testid={`flag-${n}-extra`}
                              onClick={() => handleSetFlag(r.id, "Extra")}
                              aria-pressed={isExt}
                              style={{
                                minHeight: "44px",
                                padding: "0 18px",
                                border: 0,
                                borderRadius: "999px",
                                fontSize: "15px",
                                fontWeight: 600,
                                cursor: "pointer",
                                ...segStyle(isExt, "Extra"),
                              }}
                            >
                              Extra
                            </button>
                            <button
                              type="button"
                              className="am-seg-btn"
                              data-testid={`flag-${n}-unclear`}
                              onClick={() => handleSetFlag(r.id, "Unclear")}
                              aria-pressed={isUnc}
                              style={{
                                minHeight: "44px",
                                padding: "0 18px",
                                border: 0,
                                borderRadius: "999px",
                                fontSize: "15px",
                                fontWeight: 600,
                                cursor: "pointer",
                                ...segStyle(isUnc, "Unclear"),
                              }}
                            >
                              Unclear
                            </button>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <label
                              htmlFor={`hours-${r.id}`}
                              style={{ fontSize: "14px", color: "var(--muted)" }}
                            >
                              {isCov
                                ? "Included"
                                : isExt
                                  ? "Time needed"
                                  : "If added"}
                            </label>
                            <input
                              id={`hours-${r.id}`}
                              data-testid={`hours-${n}`}
                              type="number"
                              min="0"
                              step="0.5"
                              value={hoursStrMap[r.id] ?? String(r.hours)}
                              onChange={(e) =>
                                handleSetHours(r.id, e.target.value)
                              }
                              onBlur={() => handleBlurHours(r.id)}
                              disabled={isCov}
                              style={{
                                width: "76px",
                                height: "44px",
                                boxSizing: "border-box",
                                padding: "0 12px",
                                border: 0,
                                borderRadius: "12px",
                                background: "var(--well)",
                                color: "var(--ink)",
                                fontFamily:
                                  "'Bricolage Grotesque', 'Instrument Sans', sans-serif",
                                fontVariantNumeric: "tabular-nums",
                                fontSize: "18px",
                                fontWeight: 600,
                                opacity: isCov ? 0.5 : 1,
                              }}
                            />
                            <span
                              style={{ fontSize: "14px", color: "var(--muted)" }}
                            >
                              h
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div
                id="reply"
                style={{
                  scrollMarginTop: "84px",
                  background: "var(--ink)",
                  color: "var(--bg)",
                  borderRadius: "28px",
                  boxShadow: "var(--lift)",
                  padding: "clamp(22px, 4vw, 44px)",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: "22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <h3
                    className="am-display"
                    style={{
                      margin: 0,
                      fontSize: "clamp(26px, 3.4vw, 38px)",
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                    }}
                  >
                    Your reply to the client
                  </h3>
                  <span style={{ fontSize: "15px", opacity: 0.7 }}>
                    Three sentences. The numbers come from the flags above.
                  </span>
                </div>

                <div
                  key={replyFlashKey}
                  className={
                    replyFlashKey > 0
                      ? replyFlashKey % 2 === 1
                        ? "am-fa"
                        : "am-fb"
                      : ""
                  }
                  data-testid="reply"
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "clamp(18px, 2.1vw, 22px)",
                    lineHeight: 1.6,
                    padding: "4px 0 4px 22px",
                    borderLeft: "3px solid var(--brass)",
                    maxWidth: "44em",
                    textWrap: "pretty",
                  }}
                >
                  {summary.replyText}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <button
                    type="button"
                    className="am-brass"
                    data-testid="copy"
                    onClick={handleCopyReply}
                    style={{
                      height: "56px",
                      padding: "0 30px",
                      border: 0,
                      borderRadius: "999px",
                      background: "var(--brass)",
                      color: "var(--onBrass)",
                      fontSize: "17px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
                    </svg>
                    <span>{copied === "yes" ? "Copied" : "Copy reply"}</span>
                  </button>
                  <span style={{ fontSize: "14px", opacity: 0.7 }}>
                    {copied === "no"
                      ? "Copy was blocked here. Select the text above and copy it."
                      : "Change a flag or the hours and the reply updates."}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "10px 32px",
            paddingTop: "8px",
            fontSize: "14px",
            color: "var(--muted)",
          }}
        >
          <span>
            Not legal advice. Ambit helps you spot extra work; read your
            contract and decide for yourself.
          </span>
          <span>
            How AI is used here: it reads and suggests. Every number is computed
            by code you can read. When you analyze your own text, it is sent to
            the Anthropic API.
          </span>
        </footer>
      </div>
    </div>
  );
}
