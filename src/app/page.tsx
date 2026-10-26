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
  BUILT_IN_SAMPLES,
  BuiltInSampleId,
  SAMPLE_CONTRACT,
  SAMPLE_HOURLY_RATE,
  SAMPLE_MESSAGE,
  getSampleItems,
  matchBuiltInSample,
} from "@/lib/sample";

function formatDollars(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString("en-US")
    : rounded.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export default function AmbitPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activeSampleId, setActiveSampleId] =
    useState<BuiltInSampleId | null>("architecture");
  const [contractText, setContractText] = useState<string>(SAMPLE_CONTRACT);
  const [messageText, setMessageText] = useState<string>(SAMPLE_MESSAGE);
  const [rateStr, setRateStr] = useState<string>(String(SAMPLE_HOURLY_RATE));

  // No results show until "Analyze message" is clicked
  const [items, setItems] = useState<AmbitItem[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [stage, setStage] = useState<number>(0);

  const [validationNotice, setValidationNotice] = useState<string | null>(null);
  const [missingKeyNotice, setMissingKeyNotice] = useState<boolean>(false);
  const [apiErrorNotice, setApiErrorNotice] = useState<string | null>(null);
  const [emptyRequestsNotice, setEmptyRequestsNotice] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);
  const [clipboardFallbackNotice, setClipboardFallbackNotice] = useState<boolean>(false);
  const [flashTick, setFlashTick] = useState<number>(0);

  const contractRef = useRef<HTMLTextAreaElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const contractLen = contractText.length;
  const messageLen = messageText.length;
  const isOverCharLimit =
    contractLen > MAX_INPUT_CHARS || messageLen > MAX_INPUT_CHARS;

  const matchedSample = matchBuiltInSample(contractText, messageText);
  const parsedRate = clampNonNegative(rateStr, 100000);
  const summary = calculateAmbitSummary(items, parsedRate);

  useEffect(() => {
    setFlashTick((t) => t + 1);
  }, [summary.totalExtraDollars, summary.replyText]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function handleContractChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContractText(val);
    const matched = matchBuiltInSample(val, messageText);
    setActiveSampleId(matched ? matched.id : null);
    setMissingKeyNotice(false);
    setApiErrorNotice(null);
    if (
      val.length <= MAX_INPUT_CHARS &&
      messageText.length <= MAX_INPUT_CHARS
    ) {
      setValidationNotice(null);
    }
  }

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setMessageText(val);
    const matched = matchBuiltInSample(contractText, val);
    setActiveSampleId(matched ? matched.id : null);
    setMissingKeyNotice(false);
    setApiErrorNotice(null);
    if (
      contractText.length <= MAX_INPUT_CHARS &&
      val.length <= MAX_INPUT_CHARS
    ) {
      setValidationNotice(null);
    }
  }

  function handleRateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRateStr(e.target.value);
    setCopied(false);
  }

  function selectSample(sampleId: BuiltInSampleId, analyzeImmediately = false) {
    if (running) return;
    const sample = BUILT_IN_SAMPLES[sampleId];
    setActiveSampleId(sample.id);
    setContractText(sample.contract);
    setMessageText(sample.message);
    setRateStr(String(sample.hourlyRate));
    setValidationNotice(null);
    setMissingKeyNotice(false);
    setApiErrorNotice(null);
    setEmptyRequestsNotice(false);
    setCopied(false);
    setClipboardFallbackNotice(false);

    if (analyzeImmediately) {
      const verified = verifyClauseQuotes(sample.contract, sample.getItems());
      setItems(verified);
      setHasAnalyzed(true);
      setStage(3);
    } else {
      setItems([]);
      setHasAnalyzed(false);
      setStage(0);
    }
  }

  function handleLoadSample() {
    selectSample("architecture", false);
  }

  function handleLoadWebSample() {
    selectSample("web-design", false);
  }

  function handleLoadAndAnalyzeArchitectureSample() {
    selectSample("architecture", true);
  }

  function handleClear() {
    if (running) return;
    setActiveSampleId(null);
    setContractText("");
    setMessageText("");
    setItems([]);
    setHasAnalyzed(false);
    setStage(0);
    setValidationNotice(null);
    setMissingKeyNotice(false);
    setApiErrorNotice(null);
    setEmptyRequestsNotice(false);
    setCopied(false);
    setClipboardFallbackNotice(false);
  }

  async function handleAnalyze() {
    if (running) return;

    setValidationNotice(null);
    setMissingKeyNotice(false);
    setApiErrorNotice(null);
    setEmptyRequestsNotice(false);
    setCopied(false);
    setClipboardFallbackNotice(false);

    if (!contractText.trim() || !messageText.trim()) {
      setValidationNotice(
        "Add both your contract deliverables and the client's message before analyzing."
      );
      if (!contractText.trim()) {
        contractRef.current?.focus();
      } else {
        messageRef.current?.focus();
      }
      return;
    }

    if (
      contractText.length > MAX_INPUT_CHARS ||
      messageText.length > MAX_INPUT_CHARS
    ) {
      setValidationNotice("Keep each box under 6,000 characters.");
      return;
    }

    setRunning(true);
    setStage(1);

    const sampleMatch = matchBuiltInSample(contractText, messageText);
    if (sampleMatch) {
      await new Promise((r) => setTimeout(r, 220));
      setStage(2);
      await new Promise((r) => setTimeout(r, 220));
      const verified = verifyClauseQuotes(
        contractText,
        sampleMatch.getItems()
      );
      setActiveSampleId(sampleMatch.id);
      setItems(verified);
      setHasAnalyzed(true);
      setStage(3);
      setRunning(false);
      return;
    }

    try {
      setStage(2);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractText,
          messageText,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 503 && data?.missingKey) {
        setMissingKeyNotice(true);
        setItems([]);
        setHasAnalyzed(false);
        setStage(0);
        setRunning(false);
        return;
      }

      if (!res.ok) {
        setApiErrorNotice(
          data?.error || "Analysis didn’t finish. Try again, or use the sample."
        );
        setItems([]);
        setHasAnalyzed(false);
        setStage(0);
        setRunning(false);
        return;
      }

      const rawItems: AmbitItem[] = Array.isArray(data?.items)
        ? data.items
        : [];
      const verified = verifyClauseQuotes(contractText, rawItems);

      if (verified.length === 0) {
        setEmptyRequestsNotice(true);
        setItems([]);
        setHasAnalyzed(true);
      } else {
        setItems(verified);
        setHasAnalyzed(true);
      }
      setStage(3);
      setRunning(false);
    } catch {
      setApiErrorNotice(
        "Analysis didn’t finish. Try again, or use the sample."
      );
      setItems([]);
      setHasAnalyzed(false);
      setStage(0);
      setRunning(false);
    }
  }

  function handleSetFlag(id: number, nextStatus: RequestStatus) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? flipItemStatus(item, nextStatus) : item
      )
    );
    setCopied(false);
  }

  function handleSetHours(id: number, rawVal: string) {
    const clamped = clampNonNegative(rawVal, 999);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, hours: clamped } : item
      )
    );
    setCopied(false);
  }

  async function handleCopy() {
    if (!summary.replyText) return;
    try {
      await navigator.clipboard.writeText(summary.replyText);
      setCopied(true);
      setClipboardFallbackNotice(false);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setClipboardFallbackNotice(true);
    }
  }

  const analyzeLabel = running
    ? stage === 1
      ? "Reading contract..."
      : "Matching clauses..."
    : "Analyze message";

  const showResults = hasAnalyzed && items.length > 0 && !running;

  return (
    <div
      className="am-root"
      data-theme={theme}
      style={{
        color: "var(--ink)",
        fontFamily: "var(--font-instrument), system-ui, sans-serif",
        fontSize: "16px",
        lineHeight: 1.55,
        minHeight: "100vh",
      }}
    >
      <div className="am-backdrop-rings" aria-hidden="true" />

      {/* Top Sticky Glass Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "var(--glass-header)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div
          style={{
            maxWidth: "1260px",
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--mint-soft)",
                border: "1px solid var(--rule-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 18px var(--mint-glow)",
              }}
            >
              <svg
                viewBox="0 0 32 32"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path
                  d="M8 23L16 7l8 16"
                  fill="none"
                  stroke="var(--mint)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.2 17.5h9.6"
                  stroke="var(--ink)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span
              className="am-display"
              style={{
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              Ambit
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {matchedSample && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  padding: "7px 14px",
                  border: "1px solid var(--rule)",
                  borderRadius: "999px",
                  background: "var(--well)",
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                Saved sample ({matchedSample.label} — no API key required)
              </span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 600,
                padding: "7px 14px",
                border: "1px solid var(--rule)",
                borderRadius: "999px",
                background: "var(--well)",
                color: "var(--muted)",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--mint)",
                  boxShadow: "0 0 8px var(--mint)",
                }}
              />
              Not legal advice
            </span>
            <button
              className="am-ghost-pill"
              data-testid="theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              style={{
                width: "42px",
                height: "42px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {theme === "dark" ? (
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1260px",
          margin: "0 auto",
          padding: "28px 24px 72px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Hero Banner (No Eyebrow, No Green Single-Word Highlight, No 3 Feature Cards) */}
        <section
          className="am-glass-card"
          style={{
            padding: "24px 28px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "16px 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxWidth: "680px",
            }}
          >
            <h1
              className="am-display"
              style={{
                margin: 0,
                fontWeight: 800,
                fontSize: "clamp(30px, 4.2vw, 46px)",
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                color: "var(--ink)",
              }}
            >
              Know what&apos;s covered before you say yes.
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "16px",
                color: "var(--muted)",
                maxWidth: "62ch",
              }}
            >
              Paste your contract deliverables and your client&apos;s message.
              Ambit sorts every request into covered, extra work, or unclear,
              prices the extras in code, and writes your reply.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <button
              className="am-ghost-pill"
              data-testid="load-sample"
              onClick={handleLoadSample}
              disabled={running}
              aria-pressed={activeSampleId === "architecture"}
              style={{
                height: "42px",
                padding: "0 16px",
                fontSize: "14px",
                borderColor:
                  activeSampleId === "architecture"
                    ? "var(--mint)"
                    : undefined,
              }}
            >
              Load architecture sample
            </button>
            <button
              className="am-ghost-pill"
              data-testid="load-web-sample"
              onClick={handleLoadWebSample}
              disabled={running}
              aria-pressed={activeSampleId === "web-design"}
              style={{
                height: "42px",
                padding: "0 16px",
                fontSize: "14px",
                borderColor:
                  activeSampleId === "web-design" ? "var(--mint)" : undefined,
              }}
            >
              Load web design sample
            </button>
            <button
              className="am-ghost-pill"
              data-testid="clear"
              onClick={handleClear}
              disabled={running}
              style={{
                height: "42px",
                padding: "0 16px",
                fontSize: "14px",
              }}
            >
              Clear and paste your own
            </button>
          </div>
        </section>

        {/* Split-Screen Top Workbench: Left = Inputs | Right = Live Verdict & Scope Bar */}
        <section
          id="workbench"
          className="am-split-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(0, 0.92fr)",
            gap: "20px",
            alignItems: "stretch",
          }}
        >
          {/* Left Panel: Contract & Client Message Input Checker */}
          <div
            className="am-glass-card"
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "18px",
            }}
          >
            <div>
              <h2
                id="inputs-title"
                className="am-display"
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                Your job
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "15px",
                  color: "var(--muted)",
                }}
              >
                Signed contract deliverables and the client&apos;s incoming
                message.
              </p>
            </div>

            {/* Contract Field (Taller so built-in sample has no inner scroll) */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label
                  htmlFor="contract"
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "2px",
                      background: "var(--cov)",
                    }}
                  />
                  Contract deliverables
                </label>
                <span
                  className="am-mono"
                  style={{
                    fontSize: "13px",
                    color:
                      contractLen > MAX_INPUT_CHARS
                        ? "var(--extText)"
                        : "var(--muted)",
                  }}
                >
                  {contractLen.toLocaleString()} /{" "}
                  {MAX_INPUT_CHARS.toLocaleString()}
                </span>
              </div>
              <textarea
                id="contract"
                ref={contractRef}
                data-testid="contract"
                className="am-input-well"
                value={contractText}
                onChange={handleContractChange}
                rows={8}
                placeholder="Paste the scope or deliverables section of your signed contract..."
                style={{
                  width: "100%",
                  minHeight: "220px",
                  padding: "14px 16px",
                  fontSize: "15px",
                  lineHeight: 1.55,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Client Message Field (Taller so built-in sample has no inner scroll) */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label
                  htmlFor="message"
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "2px",
                      background: "var(--ext)",
                    }}
                  />
                  Client&apos;s WhatsApp or email message
                </label>
                <span
                  className="am-mono"
                  style={{
                    fontSize: "13px",
                    color:
                      messageLen > MAX_INPUT_CHARS
                        ? "var(--extText)"
                        : "var(--muted)",
                  }}
                >
                  {messageLen.toLocaleString()} /{" "}
                  {MAX_INPUT_CHARS.toLocaleString()}
                </span>
              </div>
              <textarea
                id="message"
                ref={messageRef}
                data-testid="message"
                className="am-input-well"
                value={messageText}
                onChange={handleMessageChange}
                rows={8}
                placeholder="Paste the client's revision request message..."
                style={{
                  width: "100%",
                  minHeight: "220px",
                  padding: "14px 16px",
                  fontSize: "15px",
                  lineHeight: 1.55,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Rate + Analyze Action Bar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                paddingTop: "8px",
                borderTop: "1px solid var(--rule)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  height: "48px",
                  padding: "0 16px",
                  borderRadius: "999px",
                  background: "var(--well)",
                  border: "1px solid var(--rule)",
                }}
              >
                <label
                  htmlFor="rate"
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--muted)",
                  }}
                >
                  Hourly rate
                </label>
                <span
                  className="am-num"
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--mint)",
                  }}
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
                  onChange={handleRateChange}
                  style={{
                    width: "64px",
                    border: 0,
                    background: "transparent",
                    color: "var(--ink)",
                    fontFamily:
                      "var(--font-bricolage), var(--font-instrument), sans-serif",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: "19px",
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: "14px", color: "var(--muted)" }}>
                  / hr
                </span>
              </div>

              <button
                className="am-cta-mint"
                data-testid="analyze"
                onClick={handleAnalyze}
                disabled={running}
                style={{
                  height: "48px",
                  padding: "0 26px",
                  fontSize: "16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  opacity: running ? 0.75 : 1,
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
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            {(isOverCharLimit || validationNotice) && (
              <div
                role="alert"
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "var(--extSoft)",
                  color: "var(--extText)",
                  border: "1px solid var(--extBorder)",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {isOverCharLimit
                  ? "Keep each box under 6,000 characters."
                  : validationNotice}
              </div>
            )}
          </div>

          {/* Right Panel: Live Change-Order Verdict & Count-Based Scope Bar */}
          <div
            id="results"
            className="am-glass-card-strong"
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {running && <div className="am-scan" />}

            {/* Notices when custom text is run without API key or fails */}
            {missingKeyNotice && (
              <div
                role="region"
                aria-label="API key required for custom text"
                style={{
                  padding: "18px",
                  borderRadius: "14px",
                  background: "var(--well)",
                  border: "1px solid var(--rule-strong)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "15px",
                    color: "var(--ink)",
                    lineHeight: 1.55,
                  }}
                >
                  Analyzing your own text needs an Anthropic API key, and this
                  demo doesn&rsquo;t have one set. You can still see how Ambit
                  works on the built-in architecture sample.
                </div>
                <div>
                  <button
                    className="am-cta-mint"
                    onClick={handleLoadAndAnalyzeArchitectureSample}
                    style={{
                      height: "42px",
                      padding: "0 20px",
                      fontSize: "14px",
                    }}
                  >
                    Load architecture sample
                  </button>
                </div>
              </div>
            )}

            {apiErrorNotice && (
              <div
                role="alert"
                style={{
                  padding: "18px",
                  borderRadius: "14px",
                  background: "var(--extSoft)",
                  border: "1px solid var(--extBorder)",
                  color: "var(--extText)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  fontSize: "15px",
                }}
              >
                <div style={{ fontWeight: 600 }}>{apiErrorNotice}</div>
                <div>
                  <button
                    className="am-cta-mint"
                    onClick={handleLoadAndAnalyzeArchitectureSample}
                    style={{
                      height: "42px",
                      padding: "0 18px",
                      fontSize: "14px",
                    }}
                  >
                    Load architecture sample
                  </button>
                </div>
              </div>
            )}

            {emptyRequestsNotice && (
              <div
                style={{
                  padding: "28px 18px",
                  borderRadius: "14px",
                  background: "var(--well)",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                No requests found in this message
              </div>
            )}

            {!showResults &&
              !missingKeyNotice &&
              !apiErrorNotice &&
              !emptyRequestsNotice && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "var(--muted)",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: "var(--mint-soft)",
                      border: "1px solid var(--rule-strong)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--mint)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </div>
                  <div
                    className="am-display"
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    {running
                      ? analyzeLabel
                      : "Click Analyze message to check scope"}
                  </div>
                  <div style={{ fontSize: "15.5px", maxWidth: "40ch" }}>
                    {matchedSample ? (
                      <>
                        The{" "}
                        <strong style={{ color: "var(--ink)" }}>
                          {matchedSample.label.toLowerCase()}
                        </strong>{" "}
                        is loaded on the left (saved analysis — no API key
                        required). Click{" "}
                        <strong style={{ color: "var(--ink)" }}>
                          Analyze message
                        </strong>{" "}
                        to verify every clause quote and calculate the change
                        order.
                      </>
                    ) : (
                      <>
                        Paste your contract and client message on the left and
                        click{" "}
                        <strong style={{ color: "var(--ink)" }}>
                          Analyze message
                        </strong>
                        , or choose one of the two built-in samples above.
                      </>
                    )}
                  </div>
                </div>
              )}

            {showResults && (
              <>
                {/* Top Verdict Header (Plain-English Title, High Contrast) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "var(--muted)",
                      }}
                    >
                      Extra work to bill
                    </div>
                    <div
                      key={`bill-${flashTick}`}
                      className="am-num am-flash"
                      data-testid="bill"
                      style={{
                        fontSize: "clamp(56px, 6.4vw, 84px)",
                        fontWeight: 800,
                        lineHeight: 0.96,
                        letterSpacing: "-0.045em",
                        color: "var(--mint)",
                        marginTop: "6px",
                      }}
                    >
                      {summary.billText}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        padding: "7px 14px",
                        borderRadius: "999px",
                        background: "var(--mint-soft)",
                        border: "1px solid var(--covBorder)",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--mint-text)",
                      }}
                    >
                      {summary.extraCount} billable{" "}
                      {summary.extraCount === 1 ? "item" : "items"}
                    </div>
                    {matchedSample && (
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--muted)",
                          fontWeight: 600,
                        }}
                      >
                        Saved sample analysis
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Tally Chips + Formula Box */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <span
                      data-testid="stat-covered"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        padding: "6px 13px",
                        borderRadius: "999px",
                        background: "var(--covSoft)",
                        border: "1px solid var(--covBorder)",
                        color: "var(--covText)",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
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
                        gap: "7px",
                        padding: "6px 13px",
                        borderRadius: "999px",
                        background: "var(--extSoft)",
                        border: "1px solid var(--extBorder)",
                        color: "var(--extText)",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
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
                        gap: "7px",
                        padding: "6px 13px",
                        borderRadius: "999px",
                        background: "var(--uncSoft)",
                        border: "1px solid var(--uncBorder)",
                        color: "var(--uncText)",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
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
                      {summary.tallyUnc}
                    </span>
                  </div>

                  <div
                    data-testid="formula"
                    className="am-mono"
                    style={{
                      fontSize: "14px",
                      color: "var(--ink)",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: "var(--well)",
                      border: "1px solid var(--rule)",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {summary.formulaText}
                  </div>
                </div>

                {/* Count-Proportional Scope Bar (Unclear Label Never Clipped) */}
                <div
                  data-testid="bar"
                  style={{
                    background: "var(--well)",
                    border: "1px solid var(--rule)",
                    borderRadius: "16px",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
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
                    <h3
                      className="am-display"
                      style={{
                        margin: 0,
                        fontSize: "17px",
                        fontWeight: 700,
                      }}
                    >
                      Scope split by request count
                    </h3>
                    <span style={{ fontSize: "14px", color: "var(--muted)" }}>
                      {items.length} requests total
                    </span>
                  </div>

                  {/* Proportional 3-Status Bar */}
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      height: "48px",
                      width: "100%",
                    }}
                  >
                    {summary.coveredPct > 0 && (
                      <div
                        style={{
                          flex: summary.coveredPct,
                          background: "var(--cov)",
                          color: "var(--onCov)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "0 10px",
                          fontWeight: 700,
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>Covered</span>
                        <span className="am-num">{summary.coveredPct}%</span>
                      </div>
                    )}

                    {summary.extraPct > 0 && (
                      <div
                        style={{
                          flex: summary.extraPct,
                          background: "var(--ext)",
                          color: "var(--onExt)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0 14px",
                          fontWeight: 700,
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>
                          Extra ({formatHours(summary.totalExtraHours)} h)
                        </span>
                        <span className="am-num">{summary.extraPct}%</span>
                      </div>
                    )}

                    {summary.unclearPct > 0 && (
                      <div
                        style={{
                          flex: summary.unclearPct,
                          backgroundColor: "var(--uncSoft)",
                          backgroundImage:
                            "repeating-linear-gradient(135deg, var(--uncStripe) 0 2px, transparent 2px 8px)",
                          border: "1.5px dashed var(--uncBorder)",
                          color: "var(--uncText)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 6px",
                          fontWeight: 700,
                          fontSize: "13px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            background: "var(--panel-solid)",
                            color: "var(--ink)",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid var(--rule)",
                          }}
                        >
                          Unclear {summary.unclearPct}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Full Unclipped Bar Legend */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px 18px",
                      fontSize: "14px",
                      color: "var(--muted)",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "4px",
                          background: "var(--cov)",
                        }}
                      />
                      Covered by contract ($0)
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "4px",
                          background: "var(--ext)",
                        }}
                      />
                      Extra work, billable
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "4px",
                          border: "1.5px dashed var(--uncBorder)",
                          backgroundColor: "var(--uncSoft)",
                        }}
                      />
                      Unclear: not priced yet ($0)
                    </span>
                  </div>

                  {/* Request Breakdown Pills */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      paddingTop: "2px",
                    }}
                  >
                    {items.map((it, idx) => {
                      const isCov = it.status === "Covered";
                      const isExt = it.status === "Extra";
                      const badgeBg = isCov
                        ? "var(--covSoft)"
                        : isExt
                          ? "var(--extSoft)"
                          : "var(--uncSoft)";
                      const badgeColor = isCov
                        ? "var(--covText)"
                        : isExt
                          ? "var(--extText)"
                          : "var(--uncText)";
                      const badgeBorder = isCov
                        ? "var(--covBorder)"
                        : isExt
                          ? "var(--extBorder)"
                          : "var(--uncBorder)";
                      return (
                        <span
                          key={it.id}
                          style={{
                            fontSize: "13.5px",
                            fontWeight: 600,
                            padding: "4px 11px",
                            borderRadius: "8px",
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`,
                          }}
                        >
                          #{idx + 1} {it.short} ·{" "}
                          {isCov
                            ? "0 h"
                            : isExt
                              ? `+${formatHours(it.hours)} h`
                              : "Unclear"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Full-Width Interactive Clause-Matched Request List */}
        {showResults && (
          <section
            aria-label="Requests found in the message"
            className="am-glass-card"
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
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
              <div>
                <h2
                  className="am-display"
                  style={{
                    margin: 0,
                    fontSize: "24px",
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                  }}
                >
                  Requests found in the message
                </h2>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "15px",
                    color: "var(--muted)",
                  }}
                >
                  Override any flag or edit hours below. Every total and the
                  client reply recalculate immediately in plain code.
                </p>
              </div>
              <span style={{ fontSize: "14px", color: "var(--muted)" }}>
                {summary.billNote}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {items.map((r, idx) => {
                const n = idx + 1;
                const isCov = r.status === "Covered";
                const isExt = r.status === "Extra";
                const isUnc = r.status === "Unclear";
                const hasVerifiedQuote =
                  r.clauseQuote &&
                  r.clauseQuote !== "No matching clause found";
                const rowDollars = isExt
                  ? clampNonNegative(r.hours, 999) * summary.hourlyRate
                  : 0;

                const statusBadgeStyle: React.CSSProperties = isCov
                  ? {
                      background: "var(--covSoft)",
                      color: "var(--covText)",
                      border: "1px solid var(--covBorder)",
                    }
                  : isExt
                    ? {
                        background: "var(--extSoft)",
                        color: "var(--extText)",
                        border: "1px solid var(--extBorder)",
                      }
                    : {
                        background: "var(--uncSoft)",
                        color: "var(--uncText)",
                        border: "1px solid var(--uncBorder)",
                      };

                return (
                  <article
                    key={r.id}
                    className="am-audit-row am-request-grid"
                    data-testid={`req-${n}`}
                    style={{
                      padding: "18px 20px",
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1.35fr) auto",
                      alignItems: "center",
                      gap: "16px 24px",
                    }}
                  >
                    {/* Left: Client Request + Verbatim Contract Clause Citation */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            ...statusBadgeStyle,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 12px",
                            borderRadius: "999px",
                            fontSize: "13.5px",
                            fontWeight: 700,
                          }}
                        >
                          {isCov && (
                            <svg
                              viewBox="0 0 16 16"
                              width="13"
                              height="13"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 8.5l3.2 3.2L13 4.8" />
                            </svg>
                          )}
                          {isExt && (
                            <svg
                              viewBox="0 0 16 16"
                              width="13"
                              height="13"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            >
                              <path d="M8 3v10M3 8h10" />
                            </svg>
                          )}
                          {isUnc && (
                            <svg
                              viewBox="0 0 16 16"
                              width="13"
                              height="13"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
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
                            fontSize: "19px",
                            fontWeight: 700,
                            letterSpacing: "-0.015em",
                          }}
                        >
                          &ldquo;{r.requestText}&rdquo;
                        </p>
                      </div>

                      {/* Verbatim Contract Clause Evidence Box */}
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "var(--panel-solid)",
                          border: "1px solid var(--rule)",
                          fontSize: "14.5px",
                          color: "var(--muted)",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          alignItems: "baseline",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: hasVerifiedQuote
                              ? "var(--mint-text)"
                              : "var(--uncText)",
                          }}
                        >
                          {r.clauseTag}:
                        </span>
                        {hasVerifiedQuote ? (
                          <span
                            style={{
                              fontStyle: "italic",
                              color: "var(--ink)",
                            }}
                          >
                            &ldquo;{r.clauseQuote}&rdquo;
                          </span>
                        ) : (
                          <span
                            style={{ fontStyle: "italic", color: "var(--ink)" }}
                          >
                            No matching clause found
                          </span>
                        )}
                        {r.reason && <span>— {r.reason}</span>}
                      </div>
                    </div>

                    {/* Right: 3-Way Status Toggle + Hours Input + Row Dollar Impact */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "12px",
                        justifyContent: "flex-end",
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
                          background: "var(--panel-solid)",
                          border: "1px solid var(--rule)",
                        }}
                      >
                        <button
                          data-testid={`flag-${n}-covered`}
                          onClick={() => handleSetFlag(r.id, "Covered")}
                          aria-pressed={isCov}
                          style={{
                            height: "38px",
                            padding: "0 15px",
                            border: 0,
                            borderRadius: "999px",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            background: isCov ? "var(--cov)" : "transparent",
                            color: isCov ? "var(--onCov)" : "var(--muted)",
                          }}
                        >
                          Covered
                        </button>
                        <button
                          data-testid={`flag-${n}-extra`}
                          onClick={() => handleSetFlag(r.id, "Extra")}
                          aria-pressed={isExt}
                          style={{
                            height: "38px",
                            padding: "0 15px",
                            border: 0,
                            borderRadius: "999px",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            background: isExt ? "var(--ext)" : "transparent",
                            color: isExt ? "var(--onExt)" : "var(--muted)",
                          }}
                        >
                          Extra
                        </button>
                        <button
                          data-testid={`flag-${n}-unclear`}
                          onClick={() => handleSetFlag(r.id, "Unclear")}
                          aria-pressed={isUnc}
                          style={{
                            height: "38px",
                            padding: "0 15px",
                            border: 0,
                            borderRadius: "999px",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            background: isUnc
                              ? "var(--uncSoft)"
                              : "transparent",
                            color: isUnc ? "var(--uncText)" : "var(--muted)",
                          }}
                        >
                          Unclear
                        </button>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "var(--panel-solid)",
                          border: "1px solid var(--rule)",
                          borderRadius: "12px",
                          padding: "0 12px",
                          height: "44px",
                        }}
                      >
                        <label
                          htmlFor={`hours-${n}`}
                          style={{
                            fontSize: "13.5px",
                            color: "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          {isCov ? "In contract" : isUnc ? "If extra" : "Hours"}
                        </label>
                        <input
                          id={`hours-${n}`}
                          data-testid={`hours-${n}`}
                          type="number"
                          min="0"
                          step="0.5"
                          value={isCov ? "0" : String(r.hours)}
                          onChange={(e) => handleSetHours(r.id, e.target.value)}
                          disabled={isCov}
                          style={{
                            width: "54px",
                            border: 0,
                            background: "transparent",
                            color: "var(--ink)",
                            fontFamily:
                              "var(--font-bricolage), var(--font-instrument), sans-serif",
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "17px",
                            fontWeight: 700,
                            textAlign: "right",
                            opacity: isCov ? 0.5 : isUnc ? 0.75 : 1,
                          }}
                        />
                        <span
                          style={{ fontSize: "13.5px", color: "var(--muted)" }}
                        >
                          h
                        </span>
                      </div>

                      <div
                        className="am-num"
                        style={{
                          minWidth: "72px",
                          textAlign: "right",
                          fontSize: "19px",
                          fontWeight: 800,
                          color: isExt ? "var(--extText)" : "var(--muted)",
                        }}
                      >
                        {isExt ? `+$${formatDollars(rowDollars)}` : "$0"}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom Outgoing Client Reply Composer */}
        {showResults && (
          <section
            id="reply"
            className="am-glass-card-strong"
            style={{
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <h2
                  className="am-display"
                  style={{
                    margin: 0,
                    fontSize: "24px",
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                  }}
                >
                  Your reply to the client
                </h2>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "15px",
                    color: "var(--muted)",
                  }}
                >
                  {clipboardFallbackNotice
                    ? "Select the text below and press Ctrl+C / Cmd+C."
                    : copied
                      ? "Copied to clipboard!"
                      : "Three sentences. The numbers come from the flags above."}
                </p>
              </div>

              <button
                className="am-cta-mint"
                data-testid="copy"
                onClick={handleCopy}
                style={{
                  height: "46px",
                  padding: "0 24px",
                  fontSize: "15px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V6a2 2 0 0 1 2-2h8" />
                </svg>
                <span>{copied ? "Copied" : "Copy reply"}</span>
              </button>
            </div>

            <div
              key={`reply-${flashTick}`}
              data-testid="reply"
              style={{
                whiteSpace: "pre-wrap",
                fontSize: "17px",
                lineHeight: 1.65,
                padding: "18px 20px",
                borderRadius: "14px",
                background: "var(--well)",
                border: "1px solid var(--rule)",
                borderLeft: "4px solid var(--mint)",
                color: "var(--ink)",
              }}
            >
              {summary.replyText}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "10px 24px",
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
      </main>
    </div>
  );
}
