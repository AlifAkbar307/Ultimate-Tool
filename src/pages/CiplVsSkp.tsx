/**
 * CiplVsSkp.tsx — CIPL vs SKP side-by-side review
 * ============================================================
 * Pure client-side text parser — no API, no backend, no storage.
 *
 * WHAT IT DOES
 * Paste a CIPL (package table + Consignment Total) and an SKP (Daftar Barang
 * Pindahan). The tool compares total item counts, then lays both documents out
 * box by box so meaning-matching can be done by eye, with three working aids:
 * flag a row as checked, move a CIPL box to align it, park a box as handcarry.
 *
 * WHAT IT DELIBERATELY DOES NOT DO — and why
 *
 * 1. It does NOT read quantities out of the CIPL description column.
 *    Customer descriptions come in at least three incompatible grammars:
 *      a. "2 books, 1 dress"                       (qty first, comma)
 *      b. "Children Books (3 pcs), Shoes (1 pcs)"  (parenthesised, comma)
 *      c. "Computer Keyboard 1 set Shoes 11 pairs" (no separator at all)
 *    The new CIPL format also injects the row's Total Item and Total Value INTO
 *    the description when copied out of the PDF, at a position that moves with
 *    the description height. Any quantity read out of that is a guess, so the
 *    CIPL item count comes from ONE place: the Consignment Total block.
 *
 * 2. It does NOT validate SKP units. Whatever the customer typed is shown
 *    verbatim — "1 kgm" or "2 box" is a customer mistake that must stay
 *    VISIBLE, not be normalised away or rejected. Rows are located by the
 *    3-letter currency code instead, which is far more reliable than the unit.
 *
 * 3. It does NOT match item names between documents. "Degree certificate" vs
 *    "document maps" is a meaning judgement, not a string operation.
 *
 * 4. It does NOT guess which box is missing, nor which box was handcarried.
 *    CIPL boxes are fixed in place as the display anchor — the CIPL can simply
 *    be re-pasted to start over. SKP boxes are the movable side: they can be
 *    reordered to line up, or parked as potential handcarry, in which case the
 *    remaining SKP boxes close up the gap and the parked items are deducted
 *    from the SKP total. Both are operator judgements, never tool findings.
 *
 * NOTHING IS PERSISTED
 * Flags, ordering and handcarry marks live in memory only, and are cleared by
 * pressing Bandingkan again or leaving the page (DESIGN.md §2.5). A long review
 * should therefore be finished in one sitting.
 * ============================================================
 */

import React, { useState } from "react";
import { motion } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/** Tick-off colour. Deliberately NOT the neon accent: DESIGN.md §3 reserves
 *  #c1ff00 for buttons / active nav / copy flash and bars it from status. */
const FLAG_GREEN = "#16a34a";
const RED = "#dc2626";

/** SKP item table column header, repeated per page — skipped. */
const SKP_HEADER = /No\s+Nama\s+Barang\s+Jumlah\s+Perkiraan\s+Harga\s+Kondisi\s+Barang/gi;

/** Text marking the end of the CIPL package rows. */
const CIPL_TAIL = /(Total\s+This\s+Page|Consignment\s+Total|I\s+declare)/i;

/** CIPL column header, repeated per page — stripped out of descriptions. */
const CIPL_HEADER =
  /No\.?\s*Packing\s*Type\s*Weight\s*\(Kg\)\s*Dimension\s*\(Cm\)\s*Description of Goods\s*Total\s*Item\s*Total\s*Value(\s*\([A-Z]{3}\))?/gi;

// ── PARSING LOGIC ───────────────────────────────────────────────────────────

/** CIPL row anchors — three integers. Dimensions are always whole numbers. */
const DIM_OLD = /(\d+)\s*cm\s*[x\u00d7]\s*(\d+)\s*cm\s*[x\u00d7]\s*(\d+)\s*cm/gi;
const DIM_NEW = /(\d+)\s*[x\u00d7]\s*(\d+)\s*[x\u00d7]\s*(\d+)/gi;

/**
 * SKP item row anchor: <qty> [unit] <CURRENCY> <value> <condition>
 *
 * The 3-letter currency code with word boundaries on BOTH sides is the real
 * anchor. Item names are full of uppercase runs — IMEI, IPad, OLED — but each
 * has a 4th letter that destroys the trailing boundary, so none can be mistaken
 * for a currency. The unit is free text and may be absent entirely.
 */
const SKP_ROW = /(\d+)\s+(?:([^\s\d]\S*)\s+)?\b([A-Z]{3})\b\s*([\d.,]+)\s+(\S+)/g;

interface SkpItem {
  no: number;
  name: string;
  qty: number;
  /** Verbatim, exactly as the customer typed it. May be empty. */
  unit: string;
}
interface SkpBox {
  no: number;
  items: SkpItem[];
  total: number;
}
interface CiplBox {
  no: number;
  type: string;
  items: string[];
}
interface CiplTotals {
  packages: number;
  weight: number;
  items: number;
}

function flatten(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

interface NumToken {
  raw: string;
  start: number;
  end: number;
}
function numTokens(s: string): NumToken[] {
  const re = /-?\d+(?:\.\d+)?/g;
  const out: NumToken[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

// ── SKP ─────────────────────────────────────────────────────────────────────

interface SkpOk {
  ok: true;
  boxes: SkpBox[];
  total: number;
}
interface SkpFail {
  ok: false;
  message: string;
}

function parseSkp(raw: string): SkpOk | SkpFail {
  if (!raw.trim()) return { ok: false, message: "SKP masih kosong." };

  const flat = flatten(raw);
  const parts = flat.split(/Nomor Box\s+(\d+)/i);
  if (parts.length < 3) {
    return {
      ok: false,
      message: 'Tidak ditemukan penanda "Nomor Box" — pastikan seluruh isi SKP ter-copy.',
    };
  }

  const boxes: SkpBox[] = [];

  for (let i = 1; i < parts.length; i += 2) {
    const boxNo = Number(parts[i]);
    const body = parts[i + 1].replace(SKP_HEADER, " ");

    const items: SkpItem[] = [];
    let prevEnd = 0;
    let m: RegExpExecArray | null;
    SKP_ROW.lastIndex = 0;

    while ((m = SKP_ROW.exec(body)) !== null) {
      const segment = body.slice(prevEnd, m.index).trim();
      const space = segment.indexOf(" ");
      const itemNo = Number(segment.slice(0, space < 0 ? segment.length : space));
      const name = space < 0 ? "" : segment.slice(space + 1).trim();

      if (!Number.isFinite(itemNo)) {
        return {
          ok: false,
          message: `SKP box ${boxNo}: nomor barang tidak terbaca pada "${segment.slice(0, 40)}".`,
        };
      }
      items.push({ no: itemNo, name, qty: Number(m[1]), unit: m[2] ?? "" });
      prevEnd = m.index + m[0].length;
    }

    if (items.length === 0) {
      return { ok: false, message: `SKP box ${boxNo}: tidak ada baris barang yang terbaca.` };
    }

    // Leftover text means a row failed to match — never drop it silently.
    const leftover = body.slice(prevEnd).trim();
    if (leftover !== "") {
      return {
        ok: false,
        message: `SKP box ${boxNo}: ada teks yang tidak terbaca sebagai baris barang ("${leftover.slice(
          0,
          60
        )}"). Biasanya karena kolom Perkiraan Harga kosong, atau kode mata uangnya bukan 3 huruf kapital.`,
      };
    }

    for (let k = 0; k < items.length; k++) {
      if (items[k].no !== k + 1) {
        return {
          ok: false,
          message: `SKP box ${boxNo}: nomor barang tidak berurutan — barang ke-${
            k + 1
          } terbaca sebagai "${items[k].no}".`,
        };
      }
    }

    boxes.push({ no: boxNo, items, total: items.reduce((a, it) => a + it.qty, 0) });
  }

  for (let k = 0; k < boxes.length; k++) {
    if (boxes[k].no !== k + 1) {
      return {
        ok: false,
        message: `Nomor box SKP tidak berurutan — box ke-${k + 1} tertulis "${boxes[k].no}".`,
      };
    }
  }

  return { ok: true, boxes, total: boxes.reduce((a, b) => a + b.total, 0) };
}

// ── CIPL ────────────────────────────────────────────────────────────────────

interface CiplOk {
  ok: true;
  boxes: CiplBox[];
  totals: CiplTotals;
  format: "old" | "new";
}
interface CiplFail {
  ok: false;
  message: string;
}

function extractCiplTotals(flat: string): CiplTotals | null {
  const marker = /CONSIGNMENT\s+TOTAL/i.exec(flat);
  if (!marker) return null;
  const win = flat.slice(marker.index + marker[0].length);

  // New format attaches units, so column order does not matter.
  const pk = /(\d+)\s*Packages?\b/i.exec(win);
  const kg = /(\d+(?:\.\d+)?)\s*Kg\b/i.exec(win);
  const pcs = /(\d+)\s*Pcs\b/i.exec(win);
  if (pk && kg && pcs) {
    return { packages: Number(pk[1]), weight: Number(kg[1]), items: Number(pcs[1]) };
  }

  // Old format has no units, but prints the label row above the numbers.
  const lp = /Total\s+Packages/i.exec(win);
  const lw = /Total\s+Weight/i.exec(win);
  const li = /Total\s+Item/i.exec(win);
  if (!lp || !lw || !li) return null;

  const order = [
    { key: "packages" as const, at: lp.index },
    { key: "weight" as const, at: lw.index },
    { key: "items" as const, at: li.index },
  ].sort((a, b) => a.at - b.at);

  let start = Math.max(lp.index + lp[0].length, lw.index + lw[0].length, li.index + li[0].length);
  const fourth = /(Invoice\s+Total|Subtotal)/i.exec(win.slice(start));
  if (fourth) start = start + fourth.index + fourth[0].length;

  const toks = numTokens(win.slice(start));
  if (toks.length < 3) return null;

  const out: Partial<CiplTotals> = {};
  order.forEach((o, idx) => {
    out[o.key] = Number(toks[idx].raw);
  });
  return out as CiplTotals;
}

/**
 * Split a description on commas at parenthesis depth ZERO. Commas inside
 * brackets are sub-breakdowns of one item and must not split it. A description
 * with no commas stays as a single entry — visually coarse, but it asserts
 * nothing false, which is the point.
 */
function splitDescription(desc: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  for (const ch of desc) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth <= 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Remove the row's Total Item and Total Value from the END of a description.
 * Only a trailing pair is removed; if the numbers were injected mid-text (new
 * format) nothing is touched, so noise stays visible rather than having real
 * words guessed away.
 */
function stripTrailingTotals(desc: string): string {
  const trimmed = desc.trim();
  const m = /\s(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$/.exec(trimmed);
  return m ? trimmed.slice(0, m.index).trim() : trimmed;
}

function parseCipl(raw: string): CiplOk | CiplFail {
  if (!raw.trim()) return { ok: false, message: "CIPL masih kosong." };

  const flat = flatten(raw);

  DIM_OLD.lastIndex = 0;
  let format: "old" | "new" | null = null;
  if (DIM_OLD.exec(flat)) {
    format = "old";
  } else {
    DIM_NEW.lastIndex = 0;
    if (DIM_NEW.exec(flat)) format = "new";
  }
  if (!format) {
    return { ok: false, message: "Format CIPL tidak dikenali — pola dimensi tidak ditemukan." };
  }

  const totals = extractCiplTotals(flat);
  if (!totals) {
    return {
      ok: false,
      message:
        "Blok Consignment Total CIPL tidak ditemukan — wajib ikut ter-copy, karena jumlah item CIPL diambil dari sana.",
    };
  }

  const re = format === "old" ? DIM_OLD : DIM_NEW;
  re.lastIndex = 0;

  const anchors: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat)) !== null) {
    anchors.push({ start: m.index, end: m.index + m[0].length });
  }
  if (anchors.length === 0) {
    return { ok: false, message: "Tidak ada baris paket CIPL yang terbaca." };
  }

  const boxes: CiplBox[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const prevEnd = i === 0 ? 0 : anchors[i - 1].end;
    const head = flat.slice(prevEnd, anchors[i].start);

    const toks = numTokens(head);
    if (toks.length < 2) {
      return { ok: false, message: `Baris CIPL ke-${i + 1}: nomor box / berat tidak terbaca.` };
    }
    const weightTok = toks[toks.length - 1];
    const noTok = toks[toks.length - 2];
    const boxNo = Number(noTok.raw);

    if (boxNo !== i + 1) {
      return {
        ok: false,
        message: `Nomor box CIPL tidak berurutan — baris ke-${i + 1} terbaca sebagai "${boxNo}".`,
      };
    }

    let desc = flat.slice(
      anchors[i].end,
      i + 1 < anchors.length ? anchors[i + 1].start : flat.length
    );
    const tail = CIPL_TAIL.exec(desc);
    if (tail) desc = desc.slice(0, tail.index);
    desc = desc.replace(CIPL_HEADER, " ");

    // Trim the NEXT row's leading "<no> <type> <weight>", which sits at the end
    // of this slice.
    if (i + 1 < anchors.length) {
      const dt = numTokens(desc);
      if (dt.length >= 2) desc = desc.slice(0, dt[dt.length - 2].start);
    }

    boxes.push({
      no: boxNo,
      type: head.slice(noTok.end, weightTok.start).trim(),
      items: splitDescription(stripTrailingTotals(desc)),
    });
  }

  if (boxes.length !== totals.packages) {
    return {
      ok: false,
      message: `Jumlah baris CIPL ${boxes.length}, tetapi Total Packages menyatakan ${totals.packages}.`,
    };
  }

  return { ok: true, boxes, totals, format };
}

// ── COMPARISON ──────────────────────────────────────────────────────────────

interface CompareSuccess {
  kind: "success";
  cipl: CiplOk;
  skp: SkpOk;
  slots: number;
}
interface CompareError {
  kind: "error";
  message: string;
}
type CompareResult = CompareSuccess | CompareError;

function compare(ciplRaw: string, skpRaw: string): CompareResult {
  const cipl = parseCipl(ciplRaw);
  if (!cipl.ok) return { kind: "error", message: cipl.message };
  const skp = parseSkp(skpRaw);
  if (!skp.ok) return { kind: "error", message: skp.message };
  return { kind: "success", cipl, skp, slots: Math.max(cipl.boxes.length, skp.boxes.length) };
}

// ── UI ────────────────────────────────────────────────────────────────────────

function MiniButton({
  onClick,
  title,
  children,
  testId,
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      data-testid={testId}
      disabled={disabled}
      className="h-6 min-w-[24px] px-1.5 rounded border border-[#1e1e1e]/15 bg-white text-[11px] font-semibold text-[#1e1e1e] hover:bg-[#f2f2f2] disabled:opacity-25 disabled:cursor-default transition-colors"
    >
      {children}
    </button>
  );
}

/** Page chrome + the two paste areas, shared by the empty and result states. */
function PageShell({
  ciplText,
  skpText,
  setCiplText,
  setSkpText,
  onCompare,
  onClear,
  error,
  children,
}: {
  ciplText: string;
  skpText: string;
  setCiplText: (v: string) => void;
  setSkpText: (v: string) => void;
  onCompare: () => void;
  onClear: () => void;
  error: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto py-4 pb-20">
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">CIPL vs SKP</h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">
        Bandingkan jumlah item CIPL terhadap SKP, lalu periksa isinya berdampingan per box.
        Pencocokan nama barang tetap manual.
      </p>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-semibold text-[#1e1e1e] mb-2">
            CIPL &mdash; tabel paket + Consignment Total
          </label>
          <textarea
            value={ciplText}
            onChange={(e) => setCiplText(e.target.value)}
            data-testid="input-cipl"
            rows={10}
            placeholder={
              "1 Box 12 45 cm x 27 cm x 23 cm\nBooks 30 pieces 30 150\n...\nConsignment Total\nTotal Packages Total Weight Total Item Invoice Total\n4 50 110 840"
            }
            className="w-full h-full min-h-[220px] px-3 py-2.5 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-semibold text-[#1e1e1e] mb-2">
            SKP &mdash; Daftar Barang Pindahan
          </label>
          <textarea
            value={skpText}
            onChange={(e) => setSkpText(e.target.value)}
            data-testid="input-skp"
            rows={10}
            placeholder={
              "Nomor Box 1\nNo Nama Barang Jumlah Perkiraan Harga Kondisi Barang\n1 Buku 30 PCE EUR 150 Bekas\nNomor Box 2\n..."
            }
            className="w-full h-full min-h-[220px] px-3 py-2.5 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20"
          />
        </div>
      </div>

      <div className="flex justify-center items-center gap-3 my-6">
        <button
          type="button"
          onClick={onCompare}
          data-testid="button-compare"
          className="h-11 px-8 rounded-md text-[#1e1e1e] font-semibold text-sm active:scale-[0.98] transition-all shadow-sm"
          style={{ backgroundColor: "var(--hub-accent)" }}
        >
          Bandingkan
        </button>
        <button
          type="button"
          onClick={onClear}
          data-testid="button-clear"
          className="h-11 px-5 rounded-md border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] font-semibold text-sm hover:bg-[#f2f2f2] transition-colors"
        >
          Kosongkan
        </button>
      </div>

      {error && (
        <div
          data-testid="warning-compare-error"
          className="px-4 py-3 rounded-lg border text-sm font-medium"
          style={{
            borderColor: "rgba(220,38,38,0.3)",
            backgroundColor: "rgba(220,38,38,0.06)",
            color: RED,
          }}
        >
          {error}
        </div>
      )}

      {children}
    </div>
  );
}

export function CiplVsSkp() {
  const [ciplText, setCiplText] = useState("");
  const [skpText, setSkpText] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);

  /**
   * SKP box numbers in DISPLAY order. CIPL boxes stay fixed in slots 1..N as
   * the anchor; the SKP side is what gets dragged around and parked, because
   * a handcarried box is an SKP box that never made it into the CIPL.
   * Parking removes the box from this list, so everything below closes up.
   */
  const [skpOrder, setSkpOrder] = useState<number[]>([]);
  /** SKP box numbers parked as potential handcarry. */
  const [parked, setParked] = useState<number[]>([]);
  /** Keys of rows ticked off during review. Keyed by PRINTED box number, so
   *  reordering never moves a tick to the wrong row. */
  const [flags, setFlags] = useState<string[]>([]);

  const handleCompare = () => {
    const r = compare(ciplText, skpText);
    setResult(r);
    setSkpOrder(r.kind === "success" ? r.skp.boxes.map((b) => b.no) : []);
    setParked([]);
    setFlags([]);
  };

  const clearAll = () => {
    setCiplText("");
    setSkpText("");
    setResult(null);
    setSkpOrder([]);
    setParked([]);
    setFlags([]);
  };

  const onEdit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setResult(null);
  };

  const toggleFlag = (key: string) =>
    setFlags((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  /** Park an SKP box as handcarry — it leaves the list and the rest close up. */
  const park = (boxNo: number) => {
    setSkpOrder((prev) => prev.filter((n) => n !== boxNo));
    setParked((prev) => [...prev, boxNo].sort((a, b) => a - b));
  };

  /** Bring a parked box back, re-inserted after every lower-numbered box that
   *  is currently in the list — predictable without being clever. */
  const restore = (boxNo: number) => {
    setParked((prev) => prev.filter((n) => n !== boxNo));
    setSkpOrder((prev) => {
      const at = prev.filter((n) => n < boxNo).length;
      const next = [...prev];
      next.splice(at, 0, boxNo);
      return next;
    });
  };

  const moveSkp = (index: number, direction: -1 | 1) =>
    setSkpOrder((prev) => {
      const to = index + direction;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[to];
      next[to] = tmp;
      return next;
    });

  if (result?.kind !== "success") {
    return (
      <PageShell
        ciplText={ciplText}
        skpText={skpText}
        setCiplText={onEdit(setCiplText)}
        setSkpText={onEdit(setSkpText)}
        onCompare={handleCompare}
        onClear={clearAll}
        error={result?.kind === "error" ? result.message : null}
      />
    );
  }

  const { cipl, skp } = result;

  const skpBox = (no: number): SkpBox | undefined => skp.boxes.find((b) => b.no === no);
  const slotCount = Math.max(cipl.boxes.length, skpOrder.length);
  const slots = Array.from({ length: slotCount }, (_, i) => i + 1);

  const parkedItems = parked.reduce((a, no) => a + (skpBox(no)?.total ?? 0), 0);
  const effectiveSkp = skp.total - parkedItems;
  const diff = effectiveSkp - cipl.totals.items;

  const verdictColor = diff === 0 ? FLAG_GREEN : RED;
  const headline =
    diff === 0
      ? "JUMLAH ITEM COCOK"
      : diff > 0
      ? `CIPL KURANG ${diff} ITEM`
      : `CIPL LEBIH ${-diff} ITEM`;
  const note =
    diff === 0
      ? "Total sama — isi per box tetap perlu diperiksa manual."
      : diff > 0
      ? "Ada barang di SKP yang tidak muncul di CIPL."
      : "CIPL melebihi SKP. SKP dokumen resmi — CIPL tidak boleh melebihi.";

  const flagStyle = (key: string) =>
    flags.includes(key)
      ? { backgroundColor: `${FLAG_GREEN}1f`, boxShadow: `inset 2px 0 0 ${FLAG_GREEN}` }
      : undefined;

  /** CIPL cell — free text only, no quantity ever claimed. */
  const CiplCell = ({ box }: { box: CiplBox | undefined }) => (
    <div className="px-4 py-3 border-r border-[#1e1e1e]/10">
      {box ? (
        <>
          <div className="text-xs font-bold text-[#1e1e1e]/55 mb-1.5">
            CIPL Box {box.no}
            {box.type ? ` · ${box.type}` : ""}
          </div>
          <ul className="text-sm text-[#1e1e1e]">
            {box.items.map((it, k) => {
              const key = `cipl-${box.no}-${k}`;
              return (
                <li
                  key={key}
                  onClick={() => toggleFlag(key)}
                  data-testid={key}
                  style={flagStyle(key)}
                  className="cursor-pointer leading-snug py-0.5 px-1.5 -mx-1.5 rounded hover:bg-[#f2f2f2]"
                >
                  {it}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <span className="text-sm font-semibold" style={{ color: RED }}>
          Tidak ada pasangan di CIPL
        </span>
      )}
    </div>
  );

  /** SKP cell — name + quantity + verbatim unit, plus the move/park controls. */
  const SkpCell = ({
    box,
    index,
    isParked,
  }: {
    box: SkpBox | undefined;
    index: number;
    isParked: boolean;
  }) => (
    <div className="px-4 py-3">
      {box ? (
        <>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-[#1e1e1e]/55">
              SKP Box {box.no} &middot; {box.total} item
            </span>
            <span className="flex-1" />
            {!isParked && (
              <>
                <MiniButton
                  onClick={() => moveSkp(index, -1)}
                  title="Naikkan box SKP satu baris"
                  testId={`skp-up-${box.no}`}
                  disabled={index === 0}
                >
                  &uarr;
                </MiniButton>
                <MiniButton
                  onClick={() => moveSkp(index, 1)}
                  title="Turunkan box SKP satu baris"
                  testId={`skp-down-${box.no}`}
                  disabled={index === skpOrder.length - 1}
                >
                  &darr;
                </MiniButton>
              </>
            )}
            <MiniButton
              onClick={() => (isParked ? restore(box.no) : park(box.no))}
              title={
                isParked
                  ? "Kembalikan ke daftar utama"
                  : "Keluarkan dari perbandingan sebagai potensi handcarry"
              }
              testId={`handcarry-${box.no}`}
            >
              {isParked ? "Kembalikan" : "Handcarry"}
            </MiniButton>
          </div>
          <table className="w-full text-sm text-[#1e1e1e]">
            <tbody>
              {box.items.map((it) => {
                const key = `skp-${box.no}-${it.no}`;
                return (
                  <tr
                    key={key}
                    onClick={() => toggleFlag(key)}
                    data-testid={key}
                    style={flagStyle(key)}
                    className="cursor-pointer hover:bg-[#f2f2f2]"
                  >
                    <td className="py-0.5 px-1.5 align-top leading-snug">{it.name}</td>
                    <td className="py-0.5 px-1.5 align-top whitespace-nowrap text-right font-mono text-[#1e1e1e]/70">
                      {it.qty}
                      {it.unit ? ` ${it.unit}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <span className="text-sm font-semibold" style={{ color: RED }}>
          Tidak ada pasangan di SKP
        </span>
      )}
    </div>
  );

  return (
    <PageShell
      ciplText={ciplText}
      skpText={skpText}
      setCiplText={onEdit(setCiplText)}
      setSkpText={onEdit(setSkpText)}
      onCompare={handleCompare}
      onClear={clearAll}
      error={null}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        {/* ── Verdict ─────────────────────────────────────────────────────── */}
        <div
          data-testid="verdict-block"
          className="px-5 py-4 rounded-xl border mb-4"
          style={{ borderColor: `${verdictColor}55`, backgroundColor: `${verdictColor}0f` }}
        >
          <p className="text-lg font-bold" style={{ color: verdictColor }}>
            {headline}
          </p>
          <p className="text-sm font-medium text-[#1e1e1e] mt-1">
            SKP {skp.boxes.length} box &middot; {skp.total} item
            {parkedItems > 0 && (
              <>
                {" "}
                &minus; {parkedItems} handcarry = <strong>{effectiveSkp}</strong>
              </>
            )}
            &nbsp;&mdash;&nbsp; CIPL {cipl.totals.packages} box &middot; {cipl.totals.items} item
            &middot; {cipl.totals.weight} kg
          </p>
          <p className="text-sm mt-1 text-[#1e1e1e]/60">{note}</p>
        </div>

        <p className="text-xs text-[#1e1e1e]/50 mb-3">
          Kolom CIPL dikunci sebagai acuan tampilan. Sisi SKP yang digeser: pakai &uarr;&darr; untuk
          menyejajarkan box, atau <strong>Handcarry</strong> untuk mengeluarkan box dari perhitungan
          (box di bawahnya naik menutup celah). Klik baris mana pun untuk menandainya sudah dicek.
          Penyandingan ini tata letak, bukan verifikasi isi &mdash; dan semua tanda hilang saat
          halaman ditinggalkan atau tombol Bandingkan ditekan lagi.
        </p>

        <div className="rounded-xl border border-[#1e1e1e]/10 overflow-hidden">
          <div className="grid grid-cols-2 text-xs font-semibold uppercase tracking-wide text-[#1e1e1e]/60 bg-[#f2f2f2]">
            <div className="px-4 py-2.5 border-r border-[#1e1e1e]/10">CIPL (acuan tampilan)</div>
            <div className="px-4 py-2.5">SKP (sumber kebenaran)</div>
          </div>

          {slots.map((slot) => {
            const c = cipl.boxes[slot - 1];
            const skpNo = skpOrder[slot - 1];
            return (
              <div
                key={slot}
                data-testid={`slot-${slot}`}
                className="grid grid-cols-2 border-t border-[#1e1e1e]/10"
              >
                <CiplCell box={c} />
                <SkpCell
                  box={skpNo === undefined ? undefined : skpBox(skpNo)}
                  index={slot - 1}
                  isParked={false}
                />
              </div>
            );
          })}
        </div>

        {/* ── Handcarry group ─────────────────────────────────────────────── */}
        {parked.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-[#1e1e1e] mb-1">
              Potensi Handcarry &mdash; {parked.length} box SKP &middot; {parkedItems} item
            </h3>
            <p className="text-xs text-[#1e1e1e]/50 mb-3">
              Dikeluarkan dari perhitungan di atas. Ini dugaan operator, bukan temuan tool &mdash;
              tekan Kembalikan kalau ternyata bukan handcarry.
            </p>
            <div className="rounded-xl border border-dashed border-[#1e1e1e]/20 overflow-hidden opacity-85">
              {parked.map((no) => (
                <div key={no} data-testid={`parked-${no}`} className="border-t border-[#1e1e1e]/10">
                  <SkpCell box={skpBox(no)} index={-1} isParked />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </PageShell>
  );
}
