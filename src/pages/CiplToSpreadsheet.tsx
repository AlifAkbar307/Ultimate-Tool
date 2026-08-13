/**
 * CiplToSpreadsheet.tsx — CIPL table → 4 spreadsheet columns
 * ============================================================
 * Pure client-side text parser — no API, no backend, no storage.
 *
 * WHAT IT DOES
 * Paste the package table of a CIPL (together with its Consignment Total
 * block) and this tool produces one line per package:
 *
 *     Berat <TAB> Panjang <TAB> Lebar <TAB> Tinggi
 *
 * Tab-separated, so pasting into a spreadsheet fills columns and rows
 * directly. Dot as decimal separator, no thousands separators, no header row.
 *
 * WHY THE CONSIGNMENT TOTAL BLOCK IS MANDATORY
 * The parsed rows are checked against Total Packages and Total Weight. This
 * is the only thing that catches (a) a manual selection that got cut short,
 * and (b) the new-format bug that duplicates a package row — a real case
 * where 21 packages rendered as 22 rows and inflated the weight by 21 kg.
 * Without the totals block there is no way to detect either, so the tool
 * refuses rather than producing numbers it cannot vouch for.
 *
 * TWO SUPPORTED CIPL FORMATS (customer-facing form, not expected to grow)
 *   old : "65 cm x 35 cm x 37 cm"  — totals below the table, no units
 *   new : "65 × 35 × 37"           — totals above the table, units attached
 *
 * TO ADJUST TOLERANCE WITHOUT TOUCHING LOGIC
 * Edit WEIGHT_TOLERANCE_KG below.
 * ============================================================
 */

import React, { useState } from "react";
import { motion } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * How far the sum of row weights may differ from the stated Total Weight
 * before we flag it. Kept tiny on purpose: the checksum is the whole point
 * of this tool. Sums are compared in integer grams, so ordinary floating
 * point error (8.1 + 8.2 + 8.3 = 24.599999999999998) can never trip it.
 */
const WEIGHT_TOLERANCE_KG = 0.01;

// ── PARSING LOGIC ───────────────────────────────────────────────────────────
// (Should not need edits to handle a new packing type — types are read as
// free text and never validated against a list.)

/**
 * Dimension patterns. These are the row anchors: three integers in a row.
 * Dimensions are ALWAYS integers in both formats — only weight may carry
 * decimals — so this pattern cannot accidentally swallow a weight.
 */
const DIM_OLD = /(\d+)\s*cm\s*[x\u00d7]\s*(\d+)\s*cm\s*[x\u00d7]\s*(\d+)\s*cm/gi;
const DIM_NEW = /(\d+)\s*[x\u00d7]\s*(\d+)\s*[x\u00d7]\s*(\d+)/gi;

type CiplFormat = "old" | "new";

interface PackageRow {
  no: number;
  type: string;
  weight: number;
  p: number;
  l: number;
  t: number;
}

interface ConsignmentTotals {
  packages: number;
  weight: number;
  items: number;
}

interface NumToken {
  raw: string;
  start: number;
  end: number;
}

/**
 * Collapse every run of whitespace to a single space.
 *
 * Line breaks in a pasted CIPL are meaningless and inconsistent — the same
 * dimension appears as "65 cm x 35 cm\nx 37 cm" on one page and
 * "65 cm x 35 \ncm x 37 cm" on the next, because the PDF wraps wherever the
 * column happens to end. Flattening first makes every pattern below immune
 * to that.
 */
function flatten(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Every numeric token in a string, with its position. */
function numTokens(s: string): NumToken[] {
  const re = /-?\d+(?:\.\d+)?/g;
  const out: NumToken[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/** Detect which CIPL format the pasted text is. Old is checked first because
 *  its dimensions contain "cm", which the new-format pattern won't match. */
function detectFormat(flat: string): CiplFormat | null {
  DIM_OLD.lastIndex = 0;
  if (DIM_OLD.exec(flat)) return "old";
  DIM_NEW.lastIndex = 0;
  if (DIM_NEW.exec(flat)) return "new";
  return null;
}

/**
 * Read the Consignment Total block.
 *
 * Column ORDER differs between formats — old is Packages/Weight/Item, new is
 * Packages/Item/Weight — so position alone is not safe. Two strategies:
 *
 *   1. New format attaches units ("21 Packages 1060 Pcs 361 Kg"), so each
 *      number is read by its own unit. Order becomes irrelevant.
 *   2. Old format has no units, but it does print the label row directly
 *      above the numbers. We read the labels, sort them by position, and map
 *      the numbers onto that order.
 *
 * Note this deliberately scans forward from the "Consignment Total" marker
 * only — the per-page "Total This Page" blocks carry the same labels but
 * different numbers and must never be used.
 */
function extractTotals(flat: string): ConsignmentTotals | null {
  const marker = /CONSIGNMENT\s+TOTAL/i.exec(flat);
  if (!marker) return null;
  const win = flat.slice(marker.index + marker[0].length);

  // Strategy 1 — units (new format)
  const pk = /(\d+)\s*Packages?\b/i.exec(win);
  const kg = /(\d+(?:\.\d+)?)\s*Kg\b/i.exec(win);
  const pcs = /(\d+)\s*Pcs\b/i.exec(win);
  if (pk && kg && pcs) {
    return { packages: Number(pk[1]), weight: Number(kg[1]), items: Number(pcs[1]) };
  }

  // Strategy 2 — label order (old format)
  const lp = /Total\s+Packages/i.exec(win);
  const lw = /Total\s+Weight/i.exec(win);
  const li = /Total\s+Item/i.exec(win);
  if (!lp || !lw || !li) return null;

  const order = (
    [
      { key: "packages" as const, at: lp.index },
      { key: "weight" as const, at: lw.index },
      { key: "items" as const, at: li.index },
    ]
  ).sort((a, b) => a.at - b.at);

  // Numbers start after the LAST label, including the 4th one
  // (Invoice Total / Subtotal), which always sits last in both formats.
  let start = Math.max(
    lp.index + lp[0].length,
    lw.index + lw[0].length,
    li.index + li[0].length
  );
  const fourth = /(Invoice\s+Total|Subtotal)/i.exec(win.slice(start));
  if (fourth) start = start + fourth.index + fourth[0].length;

  const toks = numTokens(win.slice(start));
  if (toks.length < 3) return null;

  const result: Partial<ConsignmentTotals> = {};
  order.forEach((o, idx) => {
    result[o.key] = Number(toks[idx].raw);
  });
  return result as ConsignmentTotals;
}

interface RowParseOk {
  ok: true;
  rows: PackageRow[];
}
interface RowParseFail {
  ok: false;
  message: string;
}

/**
 * Walk every dimension match and read backwards from it.
 *
 * Layout of a row is: <no> <packing type> <weight> <dimension> <description…>
 * The description is free text full of numbers, so we never read forward.
 * Reading backwards from the dimension gives:
 *   - weight  = the last numeric token before the dimension
 *   - no      = the last numeric token before the weight
 *   - type    = whatever text sits between them, unvalidated
 *
 * The packing type is customer-entered free text (Box / Suitcase / anything),
 * so it is deliberately never matched against a list — a new type must never
 * require a code change.
 */
function parseRows(flat: string, format: CiplFormat): RowParseOk | RowParseFail {
  const re = format === "old" ? DIM_OLD : DIM_NEW;
  re.lastIndex = 0;

  const rows: PackageRow[] = [];
  let prevEnd = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(flat)) !== null) {
    const position = rows.length + 1;
    const segment = flat.slice(prevEnd, m.index);

    const toks = numTokens(segment);
    if (toks.length < 1) {
      return { ok: false, message: `Baris ke-${position}: berat tidak ditemukan sebelum dimensi.` };
    }

    const weightTok = toks[toks.length - 1];

    // The weight must sit immediately before the dimension. Anything else in
    // between means we misidentified the row — fail loud instead of guessing.
    const gap = segment.slice(weightTok.end).trim();
    if (gap !== "") {
      return {
        ok: false,
        message: `Baris ke-${position}: ada teks tak dikenal antara berat dan dimensi ("${gap}").`,
      };
    }

    const before = segment.slice(0, weightTok.start);
    const beforeToks = numTokens(before);
    if (beforeToks.length < 1) {
      return { ok: false, message: `Baris ke-${position}: nomor baris tidak ditemukan.` };
    }
    const noTok = beforeToks[beforeToks.length - 1];

    rows.push({
      no: Number(noTok.raw),
      type: before.slice(noTok.end).trim(),
      weight: Number(weightTok.raw),
      p: Number(m[1]),
      l: Number(m[2]),
      t: Number(m[3]),
    });

    prevEnd = m.index + m[0].length;
  }

  return { ok: true, rows };
}

interface ExtractSuccess {
  kind: "success";
  format: CiplFormat;
  rows: PackageRow[];
  totals: ConsignmentTotals;
}
interface ExtractError {
  kind: "error";
  message: string;
  hint: string | null;
}
type ExtractResult = ExtractSuccess | ExtractError;

/** Adjacent rows that are identical in every parsed field.
 *
 *  NOTE: this is NOT an error by itself — two genuinely identical boxes are
 *  common and legitimate (CIPL Vania has boxes 7 & 8 both Box/17kg/65×35×37).
 *  It is only surfaced as a possible explanation once a checksum has already
 *  failed, which is when a duplicated row becomes the likely cause. */
function adjacentDuplicates(rows: PackageRow[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (a.type === b.type && a.weight === b.weight && a.p === b.p && a.l === b.l && a.t === b.t) {
      out.push(`${a.no} & ${b.no}`);
    }
  }
  return out;
}

function processCipl(rawText: string): ExtractResult {
  if (!rawText.trim()) {
    return { kind: "error", message: "Input masih kosong.", hint: null };
  }

  const flat = flatten(rawText);

  const format = detectFormat(flat);
  if (!format) {
    return {
      kind: "error",
      message:
        "Format CIPL tidak dikenali — tidak ditemukan pola dimensi (\u201c65 cm x 35 cm x 37 cm\u201d atau \u201c65 \u00d7 35 \u00d7 37\u201d).",
      hint: null,
    };
  }

  const totals = extractTotals(flat);
  if (!totals) {
    return {
      kind: "error",
      message: "Blok Consignment Total tidak ditemukan.",
      hint:
        "Blok ini wajib ikut ter-copy — tanpa angka pembanding, seleksi yang terpotong tidak bisa terdeteksi.",
    };
  }

  const parsed = parseRows(flat, format);
  if (!parsed.ok) {
    return { kind: "error", message: parsed.message, hint: null };
  }
  const rows = parsed.rows;

  if (rows.length === 0) {
    return { kind: "error", message: "Tidak ada baris paket yang terbaca.", hint: null };
  }

  const problems: string[] = [];

  // Row numbers must run 1, 2, 3, … with no gap. This is what catches a
  // packing type that contains a number (e.g. "Koper 24 inch"), which would
  // otherwise shift the backwards read by one token.
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].no !== i + 1) {
      problems.push(
        `Nomor baris tidak berurutan — baris ke-${i + 1} terbaca sebagai "${rows[i].no}".`
      );
      break;
    }
  }

  if (rows.length !== totals.packages) {
    problems.push(
      `Jumlah baris terbaca ${rows.length}, tetapi Total Packages menyatakan ${totals.packages}.`
    );
  }

  // Compare in integer grams so float error can never cause a false alarm.
  const sumGrams = rows.reduce((acc, r) => acc + Math.round(r.weight * 100), 0);
  const statedGrams = Math.round(totals.weight * 100);
  if (Math.abs(sumGrams - statedGrams) > Math.round(WEIGHT_TOLERANCE_KG * 100)) {
    problems.push(
      `Jumlah berat baris ${sumGrams / 100} kg, tetapi Total Weight menyatakan ${totals.weight} kg.`
    );
  }

  if (problems.length > 0) {
    const dups = adjacentDuplicates(rows);
    const hint =
      rows.length > totals.packages && dups.length > 0
        ? `Kandidat baris ganda (identik dengan baris sebelumnya): ${dups.join(
            ", "
          )}. Perlu dicek manual — box yang benar-benar kembar juga wajar.`
        : rows.length < totals.packages
        ? "Kemungkinan seleksi copy terpotong — pastikan seluruh halaman tabel ikut ter-copy."
        : null;
    return { kind: "error", message: problems.join(" "), hint };
  }

  return { kind: "success", format, rows, totals };
}

/** Plain number for output: dot decimal, no thousands separator, no padding. */
function formatNumber(n: number): string {
  return String(n);
}

/** Tab-separated output — one line per package, no header row. */
function buildTsv(rows: PackageRow[]): string {
  return rows
    .map((r) => [r.weight, r.p, r.l, r.t].map(formatNumber).join("\t"))
    .join("\n");
}

// ── UI ────────────────────────────────────────────────────────────────────────

export function CiplToSpreadsheet() {
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleProcess = () => {
    setResult(processCipl(rawText));
    setCopied(false);
  };

  const handleCopy = async () => {
    if (result?.kind !== "success") return;
    try {
      await navigator.clipboard.writeText(buildTsv(result.rows));
      setCopied(true);
      setTimeout(() => setCopied(false), 700);
    } catch {
      // Clipboard access denied/unavailable — nothing else to do here.
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-[#1e1e1e]/10">
      <h2 className="text-2xl font-bold tracking-tight text-[#1e1e1e] mb-1">
        CIPL &rarr; Kolom Spreadsheet
      </h2>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">
        Paste tabel paket CIPL <strong>beserta blok Consignment Total</strong> untuk mendapatkan
        kolom Berat &middot; Panjang &middot; Lebar &middot; Tinggi siap tempel.
      </p>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">
        {/* ── Paste area ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-semibold text-[#1e1e1e] mb-2">
            Paste tabel CIPL di sini
          </label>
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setResult(null);
            }}
            data-testid="input-cipl-text"
            rows={12}
            placeholder={
              "1 Box 14.75 64 cm x 34 cm x 40 cm\n2 books, 1 dress, ... 59 408\n...\nConsignment Total\nTotal Packages Total Weight Total Item Invoice Total\n4 69.1 223 1482"
            }
            className="w-full h-full min-h-[280px] px-3 py-2.5 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20"
          />
        </div>

        {/* ── Convert button ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-center lg:px-2">
          <button
            type="button"
            onClick={handleProcess}
            data-testid="button-process-cipl"
            className="h-11 px-6 rounded-md text-[#1e1e1e] font-semibold text-sm active:scale-[0.98] transition-all shadow-sm whitespace-nowrap"
            style={{ backgroundColor: "var(--hub-accent)" }}
          >
            Convert
          </button>
        </div>

        {/* ── Output area ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[#1e1e1e]">
              Hasil (Berat, Panjang, Lebar, Tinggi)
            </h3>
            {result?.kind === "success" && (
              <button
                type="button"
                onClick={handleCopy}
                data-testid="button-copy-cipl"
                className="h-8 px-3 rounded-md text-xs font-semibold border border-[#1e1e1e]/15 transition-colors"
                style={{ backgroundColor: copied ? "#c1ff00" : "white", color: "#1e1e1e" }}
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
              <p className="text-xs font-medium mb-3" style={{ color: "#16a34a" }}>
                {result.rows.length} paket &middot; {result.totals.weight} kg &middot; cocok dengan
                Consignment Total (format {result.format})
              </p>
              <pre
                data-testid="output-cipl-lines"
                className="text-sm font-mono leading-relaxed text-[#1e1e1e] whitespace-pre-wrap"
              >
                {buildTsv(result.rows)}
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

      {/* ── Warning area ─────────────────────────────────────────────────────── */}
      {result?.kind === "error" && (
        <div
          data-testid="warning-cipl-error"
          className="mt-6 px-4 py-3 rounded-lg border text-sm font-medium"
          style={{
            borderColor: "rgba(220,38,38,0.3)",
            backgroundColor: "rgba(220,38,38,0.06)",
            color: "#dc2626",
          }}
        >
          {result.message}
          {result.hint && <div className="mt-1.5 font-normal">{result.hint}</div>}
        </div>
      )}
    </section>
  );
}
