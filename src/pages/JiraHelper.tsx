/**
 * JiraHelper.tsx — Checklist Tables + Comment Snippets for Jira
 * ============================================================
 * Pure client-side tool — no API, no backend, no storage.
 * All content lives in ../content/data.ts (CHECKLIST_TABLES, CHECKER_DEFAULT,
 * SNIPPET_GROUPS). This component only READS from that file — to add/edit
 * checklist rows or snippets, edit the data file, not this component.
 * ============================================================
 */

import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CHECKLIST_TABLES,
  CHECKER_DEFAULT,
  SNIPPET_GROUPS,
  ChecklistTable,
} from "../content/data";

type SubTab = "checklist" | "snippets" | "quotes";
import { QUOTE_SNIPPETS, type QuoteSnippet } from "../content/data";
import { CURRENCY_LIST, type CurrencyOption } from "../content/data";
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "checklist", label: "Tabel Checklist" },
  { id: "snippets", label: "Snippet Komentar" },
  { id: "quotes", label: "Quote Snippet" },
];

/**
 * Assemble the plain-text block Jira auto-converts into a table: one cell
 * per line, in the exact order jiraTitle / 5 headers / (5 cells per row).
 * The Checker cell always uses the CURRENT checker name field, never the
 * value baked into the data file.
 */
function buildTableText(table: ChecklistTable, checkerName: string): string {
  const lines: string[] = [table.jiraTitle, "No", "Items", "Complete", "Remarks", "Checker"];
  for (const row of table.rows) {
    lines.push(String(row.no), row.item, row.complete, row.remarks, checkerName);
  }
  return lines.join("\n");
}

/** Escape HTML special characters so cell text can't break the markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build a real <table> HTML string for the checklist table. Jira (like most
 * rich-text targets, e.g. Google Docs) reads the HTML clipboard flavor and
 * renders an actual table on paste, rather than relying on plain-text
 * auto-conversion. The Checker cell always uses the CURRENT checker name.
 */
function buildTableHtml(table: ChecklistTable, checkerName: string): string {
  const headerCells = ["No", "Items", "Complete", "Remarks", "Checker"]
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("");

  const bodyRows = table.rows
    .map((row) => {
      const cells = [String(row.no), row.item, row.complete, row.remarks, checkerName]
        .map((cell) => `<td>${escapeHtml(cell)}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return (
    `<p>${escapeHtml(table.jiraTitle)}</p>` +
    `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
  );
}

/** Small "Salin" button that flashes #c1ff00 briefly after a successful copy. */
function CopyButton({
  onCopy,
  testId,
  label = "Salin",
}: {
  onCopy: () => string;
  testId: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const text = onCopy();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 700);
    } catch {
      // Clipboard access denied/unavailable — nothing else to do here.
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={testId}
      className="h-8 px-3 rounded-md text-xs font-semibold border border-[#1e1e1e]/15 transition-colors whitespace-nowrap"
      style={{ backgroundColor: copied ? "#c1ff00" : "white", color: "#1e1e1e" }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

/**
 * "Salin" button for checklist tables: writes BOTH an HTML table and a
 * plain-text fallback to the clipboard so pasting into Jira (or any
 * rich-text target) produces a real rendered table, not literal markup.
 * Falls back to plain-text-only copy if the rich clipboard write fails
 * (e.g. unsupported browser or permission denied).
 */
function ChecklistCopyButton({
  table,
  checkerName,
  testId,
}: {
  table: ChecklistTable;
  checkerName: string;
  testId: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const html = buildTableHtml(table, checkerName);
    const text = buildTableText(table, checkerName);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 700);
      return;
    } catch {
      // Rich clipboard write unsupported/denied — fall back to plain text.
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 700);
    } catch {
      // Clipboard access denied/unavailable — nothing else to do here.
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={testId}
      className="h-8 px-3 rounded-md text-xs font-semibold border border-[#1e1e1e]/15 transition-colors whitespace-nowrap"
      style={{ backgroundColor: copied ? "#c1ff00" : "white", color: "#1e1e1e" }}
    >
      {copied ? "Copied!" : "Salin"}
    </button>
  );
}

// GANTI fungsi ChecklistSection yang lama di JiraHelper.tsx dengan versi ini.
// Perubahan: ditambah section "Folder Tempat Copy File Quotations" di bawah
// daftar tabel checklist — satu tombol yang MEMBUKA folder Drive di tab baru
// (bukan tombol salin; tim buka folder lalu Ctrl+C file di dalamnya seperti biasa).
//
// Untuk mengganti link folder nanti: ubah URL di konstanta QUOTATIONS_FOLDER_URL.

const QUOTATIONS_FOLDER_URL =
  "https://drive.google.com/drive/folders/1pD9YLvatlvZJvaUYdS8CFzLQKt7H3PP7";

/** SECTION 1 — Tabel Checklist. */
function ChecklistSection() {
  const [checkerName, setCheckerName] = useState(CHECKER_DEFAULT);

  return (
    <div>
      <label className="block text-sm font-semibold text-[#1e1e1e] mb-2">
        Nama Checker
      </label>
      <input
        type="text"
        value={checkerName}
        onChange={(e) => setCheckerName(e.target.value)}
        data-testid="input-checker-name"
        className="w-full max-w-xs px-3 py-2 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20 mb-6"
      />

      <div className="rounded-xl border border-[#1e1e1e]/10 bg-white divide-y divide-[#1e1e1e]/10">
        {CHECKLIST_TABLES.map((table) => (
          <div
            key={table.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="text-sm font-medium text-[#1e1e1e]">{table.title}</span>
            <ChecklistCopyButton
              testId={`button-copy-table-${table.id}`}
              table={table}
              checkerName={checkerName}
            />
          </div>
        ))}
      </div>

      {/* ── Folder Tempat Copy File Quotations ─────────────────────────────── */}
      {/* Tombol membuka folder Drive di tab baru. Tim lalu Ctrl+C file di sana. */}
      <div className="mt-8">
        <h2 className="text-sm font-bold text-[#1e1e1e] mb-3">
          Folder Tempat Copy File Quotations
        </h2>
        <div className="rounded-xl border border-[#1e1e1e]/10 bg-white flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm text-[#1e1e1e]/60 leading-snug">
            Buka folder Drive lalu salin (Ctrl+C) template quotation yang dibutuhkan.
          </span>
          <a
            href={QUOTATIONS_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-open-quotations-folder"
            className="h-8 px-3 rounded-md text-xs font-semibold border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] hover:bg-[#1e1e1e]/[0.03] transition-colors whitespace-nowrap flex items-center"
          >
            Buka Folder
          </a>
        </div>
        {/* Currency Converter */}
      <div className="mt-8">
        <CurrencyConverter />
      </div>
      </div>
    </div>
  );
}

interface RateData {
  date: string;
  rates: Record<string, number>; // key = kode mata uang huruf kecil
}
 
// Ambil kurs untuk satu base currency. Coba CDN utama, lalu fallback.
async function fetchRates(base: string): Promise<RateData> {
  const b = base.toLowerCase();
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${b}.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${b}.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data[b]) return { date: data.date, rates: data[b] };
    } catch {
      /* coba url berikutnya */
    }
  }
  throw new Error("Gagal mengambil kurs. Coba lagi nanti.");
}
 
function fmtID(n: number, maxFrac = 2): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: maxFrac });
}
 
function CurrencyConverter() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("IDR");
 
  // cache kurs per base currency supaya ganti "to" tidak fetch ulang
  const [cache, setCache] = useState<Record<string, RateData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 
  // Fetch saat "from" berubah & belum ada di cache
  useEffect(() => {
    let cancelled = false;
    if (cache[from]) return;
    setLoading(true);
    setError("");
    fetchRates(from)
      .then((data) => {
        if (!cancelled) setCache((c) => ({ ...c, [from]: data }));
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, cache]);
 
  const data = cache[from];
  const rate = data?.rates[to.toLowerCase()];
  const amt = parseFloat(amount);
  const result = rate !== undefined && !isNaN(amt) ? amt * rate : null;
 
  const swap = () => {
    setFrom(to);
    setTo(from);
  };
 
  const selectClass =
    "px-2 py-2 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20";
 
  return (
    <div className="rounded-xl border border-[#1e1e1e]/10 bg-white p-4">
      <h3 className="text-sm font-bold text-[#1e1e1e] mb-3">Currency Converter</h3>
 
      <div className="flex flex-wrap items-end gap-2">
        {/* Jumlah */}
        <div className="flex flex-col">
          <label className="text-xs text-[#1e1e1e]/50 mb-1">Jumlah</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="currency-amount"
            className="w-28 px-2 py-2 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20"
          />
        </div>
 
        {/* Dari */}
        <div className="flex flex-col">
          <label className="text-xs text-[#1e1e1e]/50 mb-1">Dari</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)}
            data-testid="currency-from" className={selectClass}>
            {CURRENCY_LIST.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>
 
        {/* Tukar */}
        <button
          type="button"
          onClick={swap}
          data-testid="currency-swap"
          className="px-3 py-2 rounded-lg border border-[#1e1e1e]/15 text-[#1e1e1e] text-sm hover:bg-[#1e1e1e]/[0.03] transition-colors"
          title="Tukar arah"
        >
          ⇄
        </button>
 
        {/* Ke */}
        <div className="flex flex-col">
          <label className="text-xs text-[#1e1e1e]/50 mb-1">Ke</label>
          <select value={to} onChange={(e) => setTo(e.target.value)}
            data-testid="currency-to" className={selectClass}>
            {CURRENCY_LIST.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>
      </div>
 
      {/* Hasil */}
      <div className="mt-4 min-h-[2rem]">
        {loading && <p className="text-sm text-[#1e1e1e]/50">Mengambil kurs…</p>}
        {error && <p className="text-sm text-[#dc2626]">{error}</p>}
        {!loading && !error && result !== null && (
          <div>
            <p className="text-lg font-bold text-[#1e1e1e]">
              {fmtID(result)} {to}
            </p>
            <p className="text-xs text-[#1e1e1e]/50 mt-0.5">
              1 {from} = {fmtID(rate!, 4)} {to}
              {data?.date ? ` · per ${data.date}` : ""}
            </p>
          </div>
        )}
      </div>
 
      {/* Disclaimer — jaga dari salah pakai untuk nilai pabean */}
      <p className="text-xs text-[#1e1e1e]/40 mt-3 pt-3 border-t border-[#1e1e1e]/5 leading-snug">
        Estimasi kurs pasar harian — <span className="font-semibold">bukan kurs Bea Cukai (KMK)</span>.
        Untuk perhitungan pabean, gunakan kurs resmi yang berlaku.
      </p>
    </div>
  );
}

/** SECTION 2 — Snippet Komentar. */
function SnippetSection() {
  const [query, setQuery] = useState("");

  // Filter groups by title/body match (case-insensitive); a group with zero
  // remaining matches hides entirely.
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SNIPPET_GROUPS;

    return SNIPPET_GROUPS.map((group) => ({
      ...group,
      snippets: group.snippets.filter(
        (s) => s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
      ),
    })).filter((group) => group.snippets.length > 0);
  }, [query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="input-snippet-search"
        placeholder="Cari snippet (judul atau isi)..."
        className="w-full px-3 py-2.5 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20 mb-6"
      />

      {filteredGroups.length === 0 && (
        <p className="text-sm text-[#1e1e1e]/40 text-center py-8">
          Tidak ada snippet yang cocok.
        </p>
      )}

      <div className="space-y-8">
        {filteredGroups.map((group) => (
          <div key={group.id}>
            <h2 className="text-sm font-bold text-[#1e1e1e] mb-3">{group.name}</h2>
            <div className="space-y-3">
              {group.snippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="rounded-xl border border-[#1e1e1e]/10 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <span className="text-sm font-semibold text-[#1e1e1e]">
                      {snippet.title}
                    </span>
                    <CopyButton
                      testId={`button-copy-snippet-${snippet.id}`}
                      onCopy={() => snippet.body}
                    />
                  </div>
                  <p className="text-sm text-[#1e1e1e]/60 whitespace-pre-wrap leading-relaxed">
                    {snippet.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
/**
 * QuoteSnippetSection — mode "Quote Snippet" di Jira Helper.
 * Taruh fungsi ini DI DALAM file JiraHelper.tsx (bersama ChecklistSection &
 * SnippetSection), lalu render saat viewMode === "quotes". Lihat wiring di bawah.
 *
 * Import tambahan yang dibutuhkan di atas JiraHelper.tsx:
 *   import { QUOTE_SNIPPETS, type QuoteSnippet } from "../content/data";
 *   (useState & motion sudah ada di file itu)
 */

// Format angka gaya Indonesia (titik ribuan, koma desimal)
function fmtID(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

// Ganti semua kemunculan (tanpa regex, aman dari karakter khusus)
function replaceAll(s: string, find: string, val: string): string {
  return s.split(find).join(val);
}

function fillQuote(
  snippet: QuoteSnippet,
  namaLengkap: string,
  dims: { nobox: string; p: string; l: string; t: string; berat: string },
): string {
  let text = snippet.body;

  if (snippet.fields.includes("nama")) {
    const full = namaLengkap.trim();
    const first = full.split(/\s+/)[0] || "";
    text = replaceAll(text, "{NamaLengkap}", full);
    text = replaceAll(text, "{nama}", first);
  }

  if (snippet.fields.includes("p")) {
    text = replaceAll(text, "{nobox}", dims.nobox);
    text = replaceAll(text, "{p}", dims.p);
    text = replaceAll(text, "{l}", dims.l);
    text = replaceAll(text, "{t}", dims.t);
    text = replaceAll(text, "{berat}", dims.berat);

    const p = parseFloat(dims.p);
    const l = parseFloat(dims.l);
    const t = parseFloat(dims.t);
    if (!isNaN(p) && !isNaN(l) && !isNaN(t)) {
      const volume = p * l * t;
      const volumetric = volume / 5000;
      const roundup = Math.ceil(volumetric);
      text = replaceAll(text, "{volume}", fmtID(volume));
      text = replaceAll(text, "{volumetric}", fmtID(volumetric));
      text = replaceAll(text, "{volumetrikroundup}", String(roundup));
    }
  }

  return text;
}

function QuoteCard({
  snippet,
  namaLengkap,
}: {
  snippet: QuoteSnippet;
  namaLengkap: string;
}) {
  const [copied, setCopied] = useState(false);
  const [dims, setDims] = useState({ nobox: "", p: "", l: "", t: "", berat: "" });

  const hasDims = snippet.fields.includes("p");

  // Peringatan: snippet volumetrik mengasumsikan volumetrik > berat aktual.
  const p = parseFloat(dims.p), l = parseFloat(dims.l), t = parseFloat(dims.t);
  const berat = parseFloat(dims.berat);
  let warn = "";
  if (hasDims && !isNaN(p) && !isNaN(l) && !isNaN(t) && !isNaN(berat)) {
    const roundup = Math.ceil((p * l * t) / 5000);
    if (berat >= roundup) {
      warn = `Berat aktual (${dims.berat}) ≥ volumetrik (${roundup}). Snippet ini untuk kasus volumetrik LEBIH BESAR — teks bisa keliru.`;
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fillQuote(snippet, namaLengkap, dims));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* non-HTTPS: abaikan */
    }
  }

  const input =
    "px-2 py-1 rounded-md border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20";

  return (
    <div className="rounded-xl border border-[#1e1e1e]/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-sm font-semibold text-[#1e1e1e]">{snippet.title}</span>
        <button
          onClick={handleCopy}
          data-testid={`copy-quote-${snippet.id}`}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#1e1e1e]/15 transition-colors"
          style={{ backgroundColor: copied ? "#c1ff00" : "transparent", color: "#1e1e1e" }}
        >
          {copied ? "Tersalin ✓" : "Salin"}
        </button>
      </div>

      {/* Input dimensi (hanya untuk snippet volumetrik) */}
      {hasDims && (
        <div className="flex flex-wrap gap-2 mb-2">
          <input className={`${input} w-20`} placeholder="No. box" value={dims.nobox}
            onChange={(e) => setDims({ ...dims, nobox: e.target.value })} />
          <input className={`${input} w-16`} placeholder="P" value={dims.p}
            onChange={(e) => setDims({ ...dims, p: e.target.value })} />
          <input className={`${input} w-16`} placeholder="L" value={dims.l}
            onChange={(e) => setDims({ ...dims, l: e.target.value })} />
          <input className={`${input} w-16`} placeholder="T" value={dims.t}
            onChange={(e) => setDims({ ...dims, t: e.target.value })} />
          <input className={`${input} w-24`} placeholder="Berat akt." value={dims.berat}
            onChange={(e) => setDims({ ...dims, berat: e.target.value })} />
        </div>
      )}

      {warn && (
        <p className="text-xs text-[#dc2626] leading-snug mb-2">{warn}</p>
      )}

      {/* Preview teks final */}
      <pre className="text-xs text-[#1e1e1e]/60 leading-snug whitespace-pre-wrap font-sans mt-1">
        {fillQuote(snippet, namaLengkap, dims)}
      </pre>
    </div>
  );
}

// GANTI seluruh fungsi QuoteSnippetSection lama dengan versi ini.
//
// Perubahan:
//   - Tombol "Scroll to Email Template" di atas.
//   - Field "Nama Lengkap Customer" dipindah ke atas group yang memakai nama
//     (group email). State tetap di parent karena QuoteCard membutuhkannya.
//   - Anchor scroll (emailRef) dipasang di group email.
//
// PENTING — tambahkan useRef ke baris import di ATAS file JiraHelper.tsx:
//   import React, { useMemo, useState, useRef } from "react";
// (kalau useMemo tidak dipakai, biarkan saja — tidak error)

function QuoteSnippetSection() {
  const [namaLengkap, setNamaLengkap] = useState("");
  const [scrollHover, setScrollHover] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);

  const scrollToEmail = () => {
    emailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {/* Tombol lompat ke bagian email */}
      <button
        type="button"
        onClick={scrollToEmail}
        onMouseEnter={() => setScrollHover(true)}
        onMouseLeave={() => setScrollHover(false)}
        data-testid="scroll-to-email"
        className="w-full block text-center mb-6 text-sm font-semibold py-4 rounded-xl border border-[#1e1e1e]/15 transition-colors"
        style={{
          backgroundColor: scrollHover ? "var(--hub-accent)" : "transparent",
          color: "#1e1e1e",
        }}
      >
        ↓ Scroll to Email Template ↓
      </button>

      <div className="space-y-8">
        {QUOTE_SNIPPETS.map((group) => {
          // Group yang memakai nama customer (punya snippet dengan field "nama").
          const needsNama = group.snippets.some((s) => s.fields.includes("nama"));

          return (
            <div key={group.id} ref={needsNama ? emailRef : undefined}>
              <h3 className="text-sm font-bold text-[#1e1e1e] mb-3">{group.name}</h3>

              {/* Field nama tampil tepat sebelum group email */}
              {needsNama && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#1e1e1e] mb-2">
                    Nama Lengkap Customer
                  </label>
                  <input
                    type="text"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder="mis. Annisa Putri"
                    data-testid="input-nama-customer"
                    className="w-full max-w-xs px-3 py-2 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20"
                  />
                </div>
              )}

              <div className="space-y-3">
                {group.snippets.map((s) => (
                  <QuoteCard key={s.id} snippet={s} namaLengkap={namaLengkap} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function JiraHelper() {
  const [subTab, setSubTab] = useState<SubTab>("checklist");

  return (
    <div className="w-full max-w-2xl mx-auto py-4 pb-20">
      {/* Page heading */}
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">
        Jira Helper
      </h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">
        Salin tabel checklist dan snippet komentar siap tempel ke Jira.
      </p>

      {/* ── Sub-tab pills — styled like the main nav pills ────────────────── */}
      <div
        className="inline-flex items-center gap-1 px-2 py-2 rounded-full mb-6"
        style={{
          background: "#f0f0f0",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`subtab-${tab.id}`}
            onClick={() => setSubTab(tab.id)}
            className="relative px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors outline-none select-none"
            style={{ color: "#1e1e1e" }}
          >
            {subTab === tab.id && (
              <motion.span
                layoutId="jira-helper-subtab-pill"
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: "var(--hub-accent)" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {subTab === "checklist" && <ChecklistSection />}
      {subTab === "snippets" && <SnippetSection />}
      {subTab === "quotes" && <QuoteSnippetSection />}
    </div>
  );
}
