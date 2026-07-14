/**
 * QuoteParser.tsx — FedEx Quote → Spreadsheet Line Extractor
 * ============================================================
 * Pure client-side text parser — no API, no backend, no storage.
 * All logic runs in the browser.
 *
 * WHAT IT DOES
 * Paste a FedEx price breakdown (label line, then amount line, repeating)
 * and this tool produces exactly 4 numbers — Freight, VAT, FSI, Additional —
 * ready to paste straight into a spreadsheet.
 *
 * TO EDIT LABELS / TOLERANCE WITHOUT TOUCHING LOGIC:
 * Edit ONLY the LABEL_CONFIG and CHECKSUM_TOLERANCE constants below.
 * Everything under "PARSING & CALCULATION LOGIC" should not need changes
 * just to add/rename a label.
 * ============================================================
 */

import React, { useState } from "react";
import { motion } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════════════
// LABEL CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────
// Every line in the pasted text is matched against these lists by EXACT full
// line text (case-insensitive, trimmed) — never by substring. This matters:
// "Indonesia VAT On Freight" contains the word "Freight" but must NOT be
// counted as a Freight line.
//
// To add a new synonym for an existing category, just add a string to its
// array below. To add a brand-new category, you'll need to touch the logic
// further down — but simple label additions/renames only need edits here.
// ══════════════════════════════════════════════════════════════════════════════
const LABEL_CONFIG = {
  // Lines counted as the Freight component
  freight: ["FREIGHT", "Freight", "Tarif dasar", "Base rate"],

  // Lines counted as the VAT component
  vat: ["Indonesia VAT On Freight"],

  // Lines counted as the FSI (fuel surcharge) component
  fsi: ["BIAYA TAMBAHAN BAHAN BAKAR", "Fuel Surcharge"],

  // Volume discount — subtracted from Freight, but ONLY in non-LMR mode
  volumeDiscount: ["Volume discount"],

  // Lines to ignore completely — never summed anywhere, not even Additional
  skip: ["Total excl. TAX", "Total tidak termasuk PAJAK"],

  // Lines used ONLY to sanity-check the final total (checksum) — not a
  // component of the output themselves
  total: [
    "TOTAL SUDAH TERMASUK PAJAK",
    "TOTAL TAX INCLUDED",
    "Estimasi Total",
    "Estimated Total",
  ],
} as const;

// Acceptable rounding difference (in rupiah) between our computed total and
// the input's TOTAL line before we flag a mismatch warning.
const CHECKSUM_TOLERANCE = 2;

type Category = "freight" | "vat" | "fsi" | "volumeDiscount" | "skip" | "total";
type Mode = "LMR" | "non-LMR";

// ── PARSING & CALCULATION LOGIC ─────────────────────────────────────────────
// (Should not need edits just to add/rename labels — see config above.)

/**
 * Classify a label line into one of the configured categories.
 * Matching is exact (whole trimmed line), case-insensitive.
 * Returns null if the label doesn't match any known category.
 */
function matchCategory(label: string): Category | null {
  const normalized = label.trim().toLowerCase();
  for (const category of Object.keys(LABEL_CONFIG) as Category[]) {
    const candidates = LABEL_CONFIG[category] as readonly string[];
    if (candidates.some((c) => c.trim().toLowerCase() === normalized)) {
      return category;
    }
  }
  return null;
}

/**
 * Parse a rupiah amount string in any of the supported formats into a number.
 *
 * Supported formats:
 *   IDR 431,000.00    (IDR, space, comma=thousands, dot=decimal)
 *   IDR8,826,000.00   (IDR, no space, comma=thousands, dot=decimal)
 *   Rp7.734.000,00    (Rp, no space, dot=thousands, comma=decimal)
 *   -Rp5.367.396,00   (negative, leading minus)
 *   -IDR6,125,244.00  (negative, leading minus)
 *
 * Algorithm: strip currency prefix (IDR/Rp) and spaces; note a leading minus;
 * of the remaining "." and "," characters, whichever appears LAST is the
 * decimal separator and the other is the thousands separator; strip the
 * thousands separators; convert the decimal separator to "."; parse as float.
 *
 * Returns null if the string cannot be parsed into a valid number.
 */
function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  // Leading minus may appear before or after the currency prefix
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }

  // Strip currency prefix and any internal whitespace
  s = s.replace(/^(IDR|Rp)/i, "").replace(/\s+/g, "");

  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }

  if (!s) return null;

  // Strict character check FIRST: reject anything that isn't a digit, ".",
  // or "," outright. Without this, a garbage value like "1x2,000.00" would
  // silently partial-parse via parseFloat (which stops at the first invalid
  // character) instead of failing loud as required.
  if (!/^[0-9.,]+$/.test(s) || !/[0-9]/.test(s)) return null;

  const dotCount = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g) || []).length;

  let normalized: string;

  if (dotCount === 0 && commaCount === 0) {
    // Plain integer, no separators at all
    normalized = s;
  } else if (dotCount > 0 && commaCount > 0) {
    // Both separator characters appear — whichever occurs LAST is the
    // decimal separator, the other is the thousands separator.
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    const decimalChar = lastDot > lastComma ? "." : ",";
    const thousandsChar = decimalChar === "." ? "," : ".";
    const decimalIdx = decimalChar === "." ? lastDot : lastComma;
    const integerPart = s.slice(0, decimalIdx).split(thousandsChar).join("");
    const fractionPart = s.slice(decimalIdx + 1);
    normalized = `${integerPart}.${fractionPart}`;
  } else {
    // Only ONE separator character is present, possibly repeated (e.g.
    // "Rp7.734.000" or "IDR431,000" with no decimal component at all).
    // A single occurrence followed by 1-2 trailing digits is a decimal
    // separator (cents); anything else (repeated, or a 3-digit trailing
    // group) is thousands grouping only — strip it, no decimal to add.
    const ch = dotCount > 0 ? "." : ",";
    const count = dotCount > 0 ? dotCount : commaCount;
    const lastIdx = s.lastIndexOf(ch);
    const trailingDigits = s.length - lastIdx - 1;
    if (count === 1 && trailingDigits <= 2) {
      const integerPart = s.slice(0, lastIdx);
      const fractionPart = s.slice(lastIdx + 1);
      normalized = `${integerPart}.${fractionPart}`;
    } else {
      normalized = s.split(ch).join("");
    }
  }

  // Final strict validation: normalized must be a plain decimal number.
  // Anything else means the input didn't actually match a supported format.
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const value = parseFloat(normalized);
  if (Number.isNaN(value)) return null;

  return negative ? -value : value;
}

/** Format a number as a plain output line: dot decimal, 2 decimal places, no thousands separators. */
function formatOutput(n: number): string {
  return n.toFixed(2);
}

interface ParseSuccess {
  kind: "success";
  outputs: [number, number, number, number]; // Freight, VAT, FSI, Additional
  checksumWarning: string | null;
}

interface ParseError {
  kind: "error";
  message: string;
}

type ParseResult = ParseSuccess | ParseError;

// Matches an amount ANYWHERE in the text: an optional leading "-", then
// "IDR" or "Rp", then digits (with any mix of "," and "." separators).
// This is the anchor the extractor uses instead of assuming one label per
// line — real pasted quotes mix label+amount stuck on the same line
// ("FREIGHTIDR 1,734,954.25") with label/amount on separate lines
// ("Total excl. TAX" \n "IDR 2,999,846.64").
//
// NOTE: labels are always stuck directly to "IDR"/"Rp" with no separator in
// Pattern A (e.g. "FREIGHTIDR..."), so a marker is deliberately allowed to
// be preceded by a letter — we can't require a word boundary there without
// breaking that exact pattern. The one hard requirement is a digit right
// after "IDR"/"Rp" (with optional whitespace), which real label text won't
// produce on its own.
const AMOUNT_MARKER_REGEX = /-?(?:IDR|Rp)\s*[0-9][0-9.,]*/gi;

interface LabelAmountPair {
  label: string;
  amountStr: string;
}

/**
 * Walk the raw text and pull out every (label, amount) pair by locating each
 * IDR/Rp-prefixed amount and taking the label as the text immediately before
 * it — whether that text sits on the same line (label stuck to the amount)
 * or on the previous line (label and amount on separate lines).
 *
 * This does NOT assume any fixed line structure, so it survives both
 * pasting styles FedEx produces, mixed within the same document.
 */
function extractLabelAmountPairs(rawText: string): LabelAmountPair[] {
  const matches: { text: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  // Reset lastIndex in case the regex object is ever reused
  AMOUNT_MARKER_REGEX.lastIndex = 0;
  while ((match = AMOUNT_MARKER_REGEX.exec(rawText)) !== null) {
    matches.push({ text: match[0], index: match.index });
  }

  const pairs: LabelAmountPair[] = [];
  for (let i = 0; i < matches.length; i++) {
    const segmentStart = i === 0 ? 0 : matches[i - 1].index + matches[i - 1].text.length;
    const segment = rawText.slice(segmentStart, matches[i].index);

    // The label is the last non-empty line of the text preceding this
    // amount — handles both same-line ("FREIGHTIDR...") and previous-line
    // ("Total excl. TAX" \n "IDR...") layouts uniformly.
    const segmentLines = segment.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const label = segmentLines.length > 0 ? segmentLines[segmentLines.length - 1] : "";

    pairs.push({ label, amountStr: matches[i].text });
  }
  return pairs;
}

/**
 * Parse the raw pasted text and compute the 4 output lines for the given mode.
 */
function processQuote(rawText: string, mode: Mode): ParseResult {
  const pairs = extractLabelAmountPairs(rawText);

  if (pairs.length === 0) {
    return {
      kind: "error",
      message: "Tidak ditemukan angka berformat IDR/Rp di input — paste teks FedEx terlebih dahulu.",
    };
  }

  let freightAmount: number | null = null;
  let vatAmount: number | null = null;
  let fsiAmount: number | null = null;
  let volumeDiscountAmount = 0; // defaults to 0 when not present
  let totalAmount: number | null = null;
  let additionalSum = 0;

  for (const { label, amountStr } of pairs) {
    // No text preceded this amount at all (e.g. two IDR/Rp amounts back to
    // back with nothing between them). That's malformed input — surfacing
    // it as Additional would silently corrupt the total, so fail loud.
    if (!label) {
      return {
        kind: "error",
        message: `Angka "${amountStr}" ditemukan tanpa label yang mendahuluinya — cek format input.`,
      };
    }

    const category = matchCategory(label);

    // SKIP lines are ignored entirely — never parsed, never summed.
    if (category === "skip") continue;

    const amount = parseAmount(amountStr);
    if (amount === null) {
      return {
        kind: "error",
        message: `Tidak bisa membaca angka "${amountStr}" pada baris "${label}".`,
      };
    }

    switch (category) {
      case "freight":
        freightAmount = amount;
        break;
      case "vat":
        vatAmount = amount;
        break;
      case "fsi":
        fsiAmount = amount;
        break;
      case "volumeDiscount":
        volumeDiscountAmount = amount;
        break;
      case "total":
        totalAmount = amount;
        break;
      default:
        // Unrecognized label with a valid amount — counts toward Additional.
        additionalSum += amount;
    }
  }

  // Fail loud: FREIGHT, VAT, and FSI must always be present.
  const missing: string[] = [];
  if (freightAmount === null) missing.push("FREIGHT");
  if (vatAmount === null) missing.push("VAT");
  if (fsiAmount === null) missing.push("FSI");
  if (missing.length > 0) {
    return {
      kind: "error",
      message: `${missing.join(", ")} tidak ditemukan — cek label input.`,
    };
  }

  // Freight is reduced by the volume discount, but only in non-LMR mode.
  // The Volume discount amount in the input is often already negative
  // (e.g. "-Rp5.367.396,00"), so we take its absolute value before
  // subtracting — otherwise subtracting a negative would add it back in.
  const freightFinal =
    mode === "non-LMR"
      ? (freightAmount as number) - Math.abs(volumeDiscountAmount)
      : (freightAmount as number);

  const outputs: [number, number, number, number] = [
    freightFinal,
    vatAmount as number,
    fsiAmount as number,
    additionalSum,
  ];

  // Checksum against the matched TOTAL line, if one was found.
  let checksumWarning: string | null = null;
  if (totalAmount !== null) {
    const computedTotal = outputs.reduce((a, b) => a + b, 0);
    const diff = Math.abs(computedTotal - totalAmount);
    if (diff > CHECKSUM_TOLERANCE) {
      checksumWarning = `Checksum tidak cocok — hasil hitung ${formatOutput(
        computedTotal
      )} vs total di input ${formatOutput(totalAmount)} (selisih ${formatOutput(diff)}).`;
    }
  }

  return { kind: "success", outputs, checksumWarning };
}

// ── UI ────────────────────────────────────────────────────────────────────────

const MODES: Mode[] = ["LMR", "non-LMR"];

export function QuoteParser() {
  const [mode, setMode] = useState<Mode>("LMR");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleProcess = () => {
    setResult(processQuote(rawText, mode));
    setCopied(false);
  };

  const handleCopy = async () => {
    if (result?.kind !== "success") return;
    const text = result.outputs.map(formatOutput).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 700);
    } catch {
      // Clipboard access denied/unavailable — nothing else to do here.
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 pb-20">
      {/* Page heading */}
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">
        Quote Parser
      </h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">
        Paste breakdown harga FedEx untuk mendapatkan 4 baris angka siap tempel ke spreadsheet.
      </p>

      {/* ── Mode pills — styled like the main nav pills ─────────────────── */}
      <div
        className="inline-flex items-center gap-1 px-2 py-2 rounded-full mb-6"
        style={{
          background: "#f0f0f0",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            data-testid={`mode-pill-${m}`}
            onClick={() => {
              setMode(m);
              // Mode change invalidates any prior result to avoid stale output
              setResult(null);
            }}
            className="relative px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors outline-none select-none"
            style={{ color: "#1e1e1e" }}
          >
            {mode === m && (
              <motion.span
                layoutId="quote-mode-pill"
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: "var(--hub-accent)" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{m}</span>
          </button>
        ))}
      </div>

      {/* ── Three-column row: paste (left) / Convert (center) / output (right) ──
          Stacks vertically on narrow screens, side-by-side on wide screens. */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">
        {/* ── Paste area ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-semibold text-[#1e1e1e] mb-2">
            Paste teks FedEx di sini
          </label>
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setResult(null);
            }}
            data-testid="input-raw-text"
            rows={12}
            placeholder={"Freight\nIDR 5,601,223.13\nIndonesia VAT On Freight\nIDR 91,735.00\n..."}
            className="w-full h-full min-h-[280px] px-3 py-2.5 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20"
          />
        </div>

        {/* ── Convert button ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-center lg:px-2">
          <button
            type="button"
            onClick={handleProcess}
            data-testid="button-process"
            className="h-11 px-6 rounded-md text-[#1e1e1e] font-semibold text-sm active:scale-[0.98] transition-all shadow-sm whitespace-nowrap"
            style={{ backgroundColor: "var(--hub-accent)" }}
          >
            Convert
          </button>
        </div>

        {/* ── Output area ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#1e1e1e]">Hasil (Freight, VAT, FSI, Additional)</h2>
            {result?.kind === "success" && (
              <button
                type="button"
                onClick={handleCopy}
                data-testid="button-copy"
                className="h-8 px-3 rounded-md text-xs font-semibold border border-[#1e1e1e]/15 transition-colors"
                style={{
                  backgroundColor: copied ? "#c1ff00" : "white",
                  color: "#1e1e1e",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>

          {result?.kind === "success" ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="px-5 py-4 rounded-xl border border-[#1e1e1e]/10 bg-white h-full min-h-[280px]"
            >
              <pre
                data-testid="output-lines"
                className="text-sm font-mono leading-relaxed text-[#1e1e1e] whitespace-pre-wrap"
              >
                {result.outputs.map(formatOutput).join("\n")}
              </pre>
            </motion.div>
          ) : (
            <div className="px-5 py-4 rounded-xl border border-dashed border-[#1e1e1e]/15 bg-transparent h-full min-h-[280px] flex items-center justify-center">
              <p className="text-sm text-[#1e1e1e]/35 text-center">
                Hasil akan muncul di sini setelah klik Convert.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Warning area — shown below the row on failure ────────────────── */}
      {result?.kind === "error" && (
        <div
          data-testid="warning-error"
          className="mt-6 px-4 py-3 rounded-lg border text-sm font-medium"
          style={{ borderColor: "rgba(220,38,38,0.3)", backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}
        >
          {result.message}
        </div>
      )}

      {result?.kind === "success" && result.checksumWarning && (
        <div
          data-testid="warning-checksum"
          className="mt-6 px-4 py-3 rounded-lg border text-sm font-medium"
          style={{ borderColor: "rgba(220,38,38,0.3)", backgroundColor: "rgba(220,38,38,0.06)", color: "#dc2626" }}
        >
          {result.checksumWarning}
        </div>
      )}
    </div>
  );
}
