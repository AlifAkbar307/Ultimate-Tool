/**
 * PickupCall.tsx — Template penjemputan & email
 * ============================================================
 * Pure client-side. No API, no backend, no storage.
 *
 * SUB-TAB
 *   Chat Pickup   — template chat yang diteruskan CS ke customer via WA
 *   Email Export  — email pemberitahuan resi untuk kiriman keluar dari Indonesia
 *   (Email Import menyusul — butuh tabel dokumen 3 skema)
 *
 * SEMUA KONTEN DI data.ts
 * Nambah negara, nomor CS, vendor, atau mengubah kalimat email = edit data.ts.
 * Tidak ada yang perlu disentuh di file ini.
 *
 * DUA DAFTAR NEGARA DARI SATU SUMBER
 * PICKUP_COUNTRIES memuat semua negara yang pernah dilayani. Tab Chat Pickup
 * hanya menampilkan yang PUNYA nomor CS FedEx — menawarkan negara tanpa nomor
 * berarti mengeluarkan template yang menyuruh customer menelepon ke ruang
 * kosong. Tab Email Export menampilkan semuanya, karena hanya butuh kode negara.
 *
 * TANGGAL
 * Dipilih lewat date picker, nama harinya dihitung, tidak diketik. Nama hari
 * yang tidak cocok dengan tanggalnya membuat customer bersiap di hari yang
 * salah. Tanggal ISO disusun manual jadi Date lokal — `new Date("2025-12-30")`
 * dibaca sebagai UTC dan menggeser tanggal satu hari di browser yang zona
 * waktunya di belakang UTC.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PICKUP_COUNTRIES,
  PICKUP_CS_MENTIONS,
  PICKUP_TEMPLATE,
  SHIPPING_VENDORS,
  EXPORT_EMAIL_SUBJECT,
  EXPORT_EMAIL_BODY,
  PICKUP_WINDOWS,
  IMPORT_DOCS_PINDAHAN,
  IMPORT_EMAIL_SUBJECT,
  IMPORT_EMAIL_INTRO,
  IMPORT_IMAGE_URL,
  type ImportDoc,
} from "../content/data";
import {
  copyWithMentions,
  copyRichText,
  copyHtml,
  textToHtml,
  escapeHtml,
  mentionToPlain,
  stripBoldMarkers,
} from "../lib/mention";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Panjang nomor resi berbeda antar vendor — FedEx 12 digit, Rayspeed 17.
 * Jadi yang dicek cuma batas bawah, untuk menangkap paste yang kepotong.
 * Peringatan saja, tidak pernah memblokir.
 */
const AWB_MIN_DIGITS = 10;

/** Kode negara asal untuk subjek email ekspor. */
const ORIGIN_CODE = "ID";

const RED = "#dc2626";

type SubTab = "chat" | "export" | "import";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "chat", label: "Chat Pickup" },
  { id: "export", label: "Email Export" },
  { id: "import", label: "Email Import" },
];

/** Batas jumlah box yang masuk akal — mencegah salah ketik 150 jadi 1500 baris. */
const MAX_BOXES = 60;

const GREEN = "#16a34a";

// ── LOGIC ───────────────────────────────────────────────────────────────────

function replaceAll(source: string, find: string, value: string): string {
  return source.split(find).join(value);
}

function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

/** "Reinol Eko Sianturi" -> "Reinol" */
function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}

/**
 * Pecah judul tiket Jira jadi nomor resi + nama.
 *   "877228419927 / Monica Jenifer Siandita"
 *   "10002023160912860 / Youngky Johanie Ecinos (ID - SG) (Kloter 34)"
 * Kurung di ujung nama (rute, kloter) dibuang — itu penanda internal, bukan
 * bagian dari nama customer yang masuk ke sapaan email.
 */
function parseTicket(raw: string): { awb: string; nama: string } {
  const slash = raw.indexOf("/");
  if (slash < 0) return { awb: raw.trim(), nama: "" };
  const awb = raw.slice(0, slash).trim();
  let nama = raw.slice(slash + 1).trim();
  while (/\([^)]*\)\s*$/.test(nama)) {
    nama = nama.replace(/\s*\([^)]*\)\s*$/, "").trim();
  }
  return { awb, nama };
}

/** Buka kalender begitu field tanggal disentuh, bukan hanya ikonnya. */
function openDatePicker(el: HTMLInputElement | null) {
  try {
    (el as unknown as { showPicker?: () => void })?.showPicker?.();
  } catch {
    // Browser lama tidak punya showPicker — field tetap bisa dipakai biasa.
  }
}

/**
 * "2025-12-30" -> "Selasa, 30 Desember 2025".
 * Tanggal disusun sebagai Date LOKAL, bukan lewat new Date(iso) yang dibaca
 * sebagai UTC dan mundur sehari di sebagian zona waktu.
 */
function formatTanggal(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

// ── UI ────────────────────────────────────────────────────────────────────────

const inputClass =
  "w-full h-10 px-3 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20";

const labelClass = "text-sm font-semibold text-[#1e1e1e] mb-2";

function CopyButton({
  onCopy,
  disabled,
  testId,
  label = "Salin",
}: {
  onCopy: () => Promise<boolean>;
  disabled?: boolean;
  testId: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handle = async () => {
    if (disabled) return;
    const ok = await onCopy();
    setFailed(!ok);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      data-testid={testId}
      className="h-9 px-5 rounded-md text-[#1e1e1e] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-default"
      style={{ backgroundColor: copied ? "#c1ff00" : "var(--hub-accent)" }}
    >
      {failed ? "Gagal" : copied ? "Tersalin!" : label}
    </button>
  );
}

// ── TAB: Chat Pickup ────────────────────────────────────────────────────────

/** Urut abjad Indonesia. Diurutkan di sini, bukan di data.ts, supaya nambah
 *  negara cukup ditempel di mana saja tanpa memikirkan posisinya. */
const COUNTRIES_SORTED = [...PICKUP_COUNTRIES].sort((a, b) =>
  a.country.localeCompare(b.country, "id")
);

function ChatPickupTab() {
  const [countryName, setCountryName] = useState("");
  const [ticket, setTicket] = useState("");
  const [pickup, setPickup] = useState("");

  const { awb } = parseTicket(ticket);

  // Hanya negara yang punya nomor CS — lihat catatan di kepala file.
  const withPhone = COUNTRIES_SORTED.filter((c) => Boolean(c.phone));
  const selected = withPhone.find((c) => c.country === countryName);
  const ready = Boolean(selected) && awb.trim() !== "" && pickup.trim() !== "";

  const message = useMemo(() => {
    if (!selected) return "";
    let text = PICKUP_TEMPLATE;
    text = replaceAll(text, "{csMention}", PICKUP_CS_MENTIONS.map((k) => `{@${k}}`).join(" "));
    text = replaceAll(text, "{negara}", selected.country);
    text = replaceAll(text, "{telepon}", selected.phone ?? "");
    text = replaceAll(text, "{awb}", awb);
    text = replaceAll(text, "{pickup}", pickup.trim());
    return text;
  }, [selected, awb, pickup]);

  const awbDigits = digitCount(awb);
  const awbWarning =
    awb.trim() !== "" && awbDigits < AWB_MIN_DIGITS
      ? `Nomor resi terbaca ${awbDigits} digit — terlalu pendek. Kemungkinan paste-nya kepotong.`
      : null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className={labelClass}>Negara</label>
          <select
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            data-testid="pickup-country"
            className={inputClass}
          >
            <option value="">&mdash; pilih negara &mdash;</option>
            {withPhone.map((c) => (
              <option key={c.code} value={c.country}>
                {c.country}
              </option>
            ))}
          </select>
          {selected && (
            <p className="mt-1.5 text-xs text-[#1e1e1e]/55">CS FedEx: {selected.phone}</p>
          )}
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Judul tiket / nomor resi</label>
          <input
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            data-testid="pickup-awb"
            placeholder="877228419927 / Nama Customer"
            className={inputClass}
          />
          {awb !== "" && (
            <p className="mt-1.5 text-xs text-[#1e1e1e]/55">Resi terbaca: {awb}</p>
          )}
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Nomor Pickup</label>
          <input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            data-testid="pickup-booking"
            placeholder="Booking reference"
            className={inputClass}
          />
        </div>
      </div>

      {awbWarning && (
        <div
          data-testid="warning-awb-chat"
          className="mt-4 px-4 py-3 rounded-lg border text-sm font-medium"
          style={{ borderColor: "rgba(220,38,38,0.3)", backgroundColor: "rgba(220,38,38,0.06)", color: RED }}
        >
          {awbWarning}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1e1e1e]">Hasil</h2>
          <CopyButton
            testId="pickup-copy"
            disabled={!ready}
            onCopy={() => copyWithMentions(message)}
          />
        </div>

        {ready ? (
          <motion.pre
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            data-testid="pickup-preview"
            className="px-5 py-4 rounded-xl border border-[#1e1e1e]/10 bg-white text-sm text-[#1e1e1e] whitespace-pre-wrap leading-relaxed font-sans"
          >
            {mentionToPlain(message)}
          </motion.pre>
        ) : (
          <EmptyBox text="Lengkapi negara, nomor AWB, dan nomor pickup untuk melihat hasilnya." />
        )}
      </div>
    </>
  );
}

// ── TAB: Email Export ───────────────────────────────────────────────────────

function EmailExportTab() {
  const [countryName, setCountryName] = useState("");
  const [ticket, setTicket] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [vendorId, setVendorId] = useState(SHIPPING_VENDORS[0]?.id ?? "");

  const { awb, nama: namaLengkap } = parseTicket(ticket);

  // Negara asal tidak bisa jadi negara tujuan — "ID-ID" tidak pernah benar.
  const destinations = COUNTRIES_SORTED.filter((c) => c.code !== ORIGIN_CODE);
  const selected = destinations.find((c) => c.country === countryName);
  const vendor = SHIPPING_VENDORS.find((v) => v.id === vendorId);
  const ready =
    Boolean(selected) && Boolean(vendor) && namaLengkap !== "" && awb !== "" && tanggal !== "";

  const fill = (template: string): string => {
    let text = template;
    text = replaceAll(text, "{awb}", awb);
    text = replaceAll(text, "{kodeNegara}", selected?.code ?? "");
    text = replaceAll(text, "{kodeAsal}", ORIGIN_CODE);
    text = replaceAll(text, "{negara}", selected?.country ?? "");
    text = replaceAll(text, "{namaLengkap}", namaLengkap);
    text = replaceAll(text, "{nama}", firstName(namaLengkap));
    text = replaceAll(text, "{tanggalPickup}", formatTanggal(tanggal));
    text = replaceAll(text, "{vendor}", vendor?.emailName ?? "");
    return text;
  };

  const subject = useMemo(
    () => (ready ? fill(EXPORT_EMAIL_SUBJECT) : ""),
    [ready, selected, vendor, namaLengkap, awb, tanggal]
  );
  const body = useMemo(
    () => (ready ? fill(EXPORT_EMAIL_BODY) : ""),
    [ready, selected, vendor, namaLengkap, awb, tanggal]
  );

  const awbDigits = digitCount(awb);
  const awbWarning =
    awb.trim() !== "" && awbDigits < AWB_MIN_DIGITS
      ? `Nomor resi terbaca ${awbDigits} digit — terlalu pendek. Kemungkinan paste-nya kepotong.`
      : null;

  /** Subjek sengaja teks polos: kotak subjek email tidak menerima format. */
  const plainCopy = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className={labelClass}>Judul tiket Jira</label>
          <input
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            data-testid="export-ticket"
            placeholder="877228419927 / Monica Jenifer Siandita"
            className={inputClass}
          />
          {(awb !== "" || namaLengkap !== "") && (
            <p className="mt-1.5 text-xs text-[#1e1e1e]/55">
              Resi {awb || "\u2014"} &middot; sapaan: kak {firstName(namaLengkap) || "\u2014"}
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Negara tujuan</label>
          <select
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            data-testid="export-country"
            className={inputClass}
          >
            <option value="">&mdash; pilih negara &mdash;</option>
            {destinations.map((c) => (
              <option key={c.code} value={c.country}>
                {c.country} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Tanggal pickup</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            onClick={(e) => openDatePicker(e.currentTarget)}
            onFocus={(e) => openDatePicker(e.currentTarget)}
            data-testid="export-tanggal"
            className={`${inputClass} cursor-pointer`}
          />
          {tanggal !== "" && (
            <p className="mt-1.5 text-xs text-[#1e1e1e]/55">{formatTanggal(tanggal)}</p>
          )}
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Vendor 3PL</label>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            data-testid="export-vendor"
            className={inputClass}
          >
            {SHIPPING_VENDORS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {awbWarning && (
        <div
          data-testid="warning-awb-export"
          className="mt-4 px-4 py-3 rounded-lg border text-sm font-medium"
          style={{ borderColor: "rgba(220,38,38,0.3)", backgroundColor: "rgba(220,38,38,0.06)", color: RED }}
        >
          {awbWarning}
        </div>
      )}

      {/* Subjek dan isi disalin terpisah — di Gmail keduanya masuk ke kotak
          yang berbeda, jadi satu tombol gabungan justru menambah kerja. */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1e1e1e]">Subjek</h2>
          <CopyButton
            testId="export-copy-subject"
            disabled={!ready}
            label="Salin subjek"
            onCopy={() => plainCopy(subject)}
          />
        </div>
        {ready ? (
          <p
            data-testid="export-subject"
            className="px-5 py-3 rounded-xl border border-[#1e1e1e]/10 bg-white text-sm text-[#1e1e1e] font-mono"
          >
            {subject}
          </p>
        ) : (
          <EmptyBox text="Lengkapi semua field untuk melihat subjek." />
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1e1e1e]">Isi email</h2>
          <CopyButton
            testId="export-copy-body"
            disabled={!ready}
            label="Salin isi"
            onCopy={() => copyRichText(body)}
          />
        </div>
        {ready ? (
          <motion.pre
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            data-testid="export-body"
            className="px-5 py-4 rounded-xl border border-[#1e1e1e]/10 bg-white text-sm text-[#1e1e1e] whitespace-pre-wrap leading-relaxed font-sans"
          >
            {stripBoldMarkers(body)}
          </motion.pre>
        ) : (
          <EmptyBox text="Lengkapi semua field untuk melihat isi email." />
        )}
      </div>
    </>
  );
}

// ── TAB: Email Import ───────────────────────────────────────────────────────

/**
 * Instruksi tempel resi untuk sel "Copies of Airwaybill / Resi".
 *
 * Normal: box ke-k dapat halaman k.
 * Negara dengan skipPage (Asia): halaman 2 adalah halaman sisipan, jadi box 1
 * dapat halaman 1, lalu box ke-k (k >= 2) dapat halaman k+1.
 *
 * Diverifikasi ke contoh nyata: 1 box normal -> "(page 1)", 3 box Asia ->
 * "(page 1-4)" dengan box 2 = hal 3, 15 box normal -> "(page 1-15)".
 * Satu box yang tersisa belum terbukti: 1 box Asia -> "(page 1-2)".
 */
function buildBoxInstructions(boxes: number, skipPage: boolean): string {
  const total = skipPage ? boxes + 1 : boxes;
  const range = total === 1 ? "page 1" : `page 1-${total}`;
  const lines = ["Print 2x", `1. Serahkan 1 lampiran kepada kurir yang menjemput (${range}).`];
  for (let k = 1; k <= boxes; k++) {
    const page = skipPage && k >= 2 ? k + 1 : k;
    lines.push(`${k + 1}. Tempel lampiran hardcopy resi halaman ${page} (page ${page}) pada box kiriman ke-${k}.`);
  }
  return lines.join("\n");
}

const CELL = "border:1px solid #1e1e1e;padding:6px 8px;vertical-align:middle;";

/**
 * Tabel dokumen sebagai HTML dengan gaya INLINE. Gmail membuang blok <style>
 * dan kelas CSS dari konten yang ditempel, jadi semua gaya harus menempel di
 * elemennya masing-masing supaya garis dan warna status bertahan.
 */
function buildDocTableHtml(docs: ImportDoc[], received: boolean[], boxNote: string): string {
  const head = ["No", "Nama Dokumen", "Keterangan", "Status Dokumen"]
    .map((h) => `<th style="${CELL}background:#f2f2f2;text-align:center;">${h}</th>`)
    .join("");
  const rows = docs
    .map((d, i) => {
      const note = d.note === "{instruksiBox}" ? boxNote : d.note;
      const ok = received[i];
      const status = ok ? "Received" : "Not Received";
      const color = ok ? GREEN : RED;
      return (
        "<tr>" +
        `<td style="${CELL}text-align:center;">${i + 1}</td>` +
        `<td style="${CELL}">${escapeHtml(d.name)}</td>` +
        `<td style="${CELL}">${escapeHtml(note).replace(/\n/g, "<br>")}</td>` +
        `<td style="${CELL}text-align:center;color:${color};">${status}</td>` +
        "</tr>"
      );
    })
    .join("");
  return (
    `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">` +
    `<thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`
  );
}

/** Versi teks polos tabel — fallback kalau HTML ditolak. */
function buildDocTablePlain(docs: ImportDoc[], received: boolean[], boxNote: string): string {
  return docs
    .map((d, i) => {
      const note = d.note === "{instruksiBox}" ? boxNote : d.note;
      const status = received[i] ? "Received" : "Not Received";
      return `${i + 1}. ${d.name} [${status}]\n${note}`;
    })
    .join("\n\n");
}

function EmailImportTab() {
  const docs = IMPORT_DOCS_PINDAHAN;

  const [countryName, setCountryName] = useState("");
  const [ticket, setTicket] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState(PICKUP_WINDOWS[0] ?? "");
  const [boxInput, setBoxInput] = useState("1");
  const [withImage, setWithImage] = useState(true);
  const [received, setReceived] = useState<boolean[]>(() => docs.map((d) => d.defaultReceived));

  const { awb, nama: namaLengkap } = parseTicket(ticket);

  // Negara asal impor — Indonesia tidak bisa jadi asal kiriman ke Indonesia.
  const origins = COUNTRIES_SORTED.filter((c) => c.code !== ORIGIN_CODE);
  const selected = origins.find((c) => c.country === countryName);

  const boxes = Number(boxInput);
  const boxesValid = Number.isInteger(boxes) && boxes >= 1 && boxes <= MAX_BOXES;

  const ready =
    Boolean(selected) && awb !== "" && namaLengkap !== "" && tanggal !== "" && boxesValid;

  const boxNote = boxesValid ? buildBoxInstructions(boxes, Boolean(selected?.skipPage)) : "";

  const fill = (template: string): string => {
    let text = template;
    text = replaceAll(text, "{awb}", awb);
    text = replaceAll(text, "{kodeNegara}", selected?.code ?? "");
    text = replaceAll(text, "{kodeTujuan}", ORIGIN_CODE);
    text = replaceAll(text, "{namaLengkap}", namaLengkap);
    text = replaceAll(text, "{nama}", firstName(namaLengkap));
    text = replaceAll(text, "{tanggalPickup}", formatTanggal(tanggal));
    text = replaceAll(text, "{jamPickup}", jam);
    return text;
  };

  const subject = ready ? fill(IMPORT_EMAIL_SUBJECT) : "";
  const intro = ready ? fill(IMPORT_EMAIL_INTRO) : "";

  const toggle = (i: number) =>
    setReceived((prev) => prev.map((v, k) => (k === i ? !v : v)));

  const copyBody = async (): Promise<boolean> => {
    const imageHtml = withImage
      ? `<p><img src="${IMPORT_IMAGE_URL}" alt="H Taping Method" style="max-width:560px;" /></p>`
      : "";
    const html = textToHtml(intro) + buildDocTableHtml(docs, received, boxNote) + imageHtml;
    const plain =
      stripBoldMarkers(intro) + "\n\n" + buildDocTablePlain(docs, received, boxNote);
    return copyHtml(html, plain);
  };

  const plainCopy = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <>
      <p className="mb-6 text-xs font-semibold uppercase tracking-wide text-[#1e1e1e]/55">
        Skema: Barang Pindahan
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className={labelClass}>Judul tiket Jira</label>
          <input
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            data-testid="import-ticket"
            placeholder="877341074702 / Abdul Aziiz Nugraha"
            className={inputClass}
          />
          {(awb !== "" || namaLengkap !== "") && (
            <p className="mt-1.5 text-xs text-[#1e1e1e]/55">
              Resi {awb || "\u2014"} &middot; sapaan: kak {firstName(namaLengkap) || "\u2014"}
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Negara asal</label>
          <select
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            data-testid="import-country"
            className={inputClass}
          >
            <option value="">&mdash; pilih negara &mdash;</option>
            {origins.map((c) => (
              <option key={c.code} value={c.country}>
                {c.country} ({c.code})
              </option>
            ))}
          </select>
          {selected?.skipPage && (
            <p className="mt-1.5 text-xs text-[#1e1e1e]/55">
              Ada halaman sisipan di posisi 2 &mdash; nomor halaman box bergeser.
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Tanggal pickup</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            onClick={(e) => openDatePicker(e.currentTarget)}
            onFocus={(e) => openDatePicker(e.currentTarget)}
            data-testid="import-tanggal"
            className={`${inputClass} cursor-pointer`}
          />
          {tanggal !== "" && (
            <p className="mt-1.5 text-xs text-[#1e1e1e]/55">{formatTanggal(tanggal)}</p>
          )}
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Jam pickup</label>
          <select
            value={jam}
            onChange={(e) => setJam(e.target.value)}
            data-testid="import-jam"
            className={inputClass}
          >
            {PICKUP_WINDOWS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>Jumlah box</label>
          <input
            type="number"
            min={1}
            max={MAX_BOXES}
            value={boxInput}
            onChange={(e) => setBoxInput(e.target.value)}
            data-testid="import-boxes"
            className={inputClass}
          />
          {boxInput !== "" && !boxesValid && (
            <p className="mt-1.5 text-xs font-medium" style={{ color: RED }}>
              Jumlah box harus bilangan bulat 1&ndash;{MAX_BOXES}.
            </p>
          )}
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 h-10 text-sm text-[#1e1e1e] cursor-pointer">
            <input
              type="checkbox"
              checked={withImage}
              onChange={(e) => setWithImage(e.target.checked)}
              data-testid="import-with-image"
            />
            Sertakan gambar H-Taping
          </label>
        </div>
      </div>

      {/* ── Status dokumen ─────────────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#1e1e1e] mb-2">Status dokumen</h2>
        <div className="rounded-xl border border-[#1e1e1e]/10 divide-y divide-[#1e1e1e]/10">
          {docs.map((d, i) => (
            <label
              key={d.name}
              className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer hover:bg-[#f2f2f2]"
            >
              <input
                type="checkbox"
                checked={received[i]}
                onChange={() => toggle(i)}
                data-testid={`import-doc-${i + 1}`}
              />
              <span className="w-6 text-[#1e1e1e]/45">{i + 1}</span>
              <span className="flex-1 text-[#1e1e1e]">{d.name}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: received[i] ? GREEN : RED }}
              >
                {received[i] ? "Received" : "Not Received"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Subjek ─────────────────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1e1e1e]">Subjek</h2>
          <CopyButton
            testId="import-copy-subject"
            disabled={!ready}
            label="Salin subjek"
            onCopy={() => plainCopy(subject)}
          />
        </div>
        {ready ? (
          <p className="px-5 py-3 rounded-xl border border-[#1e1e1e]/10 bg-white text-sm text-[#1e1e1e] font-mono">
            {subject}
          </p>
        ) : (
          <EmptyBox text="Lengkapi semua field untuk melihat subjek." />
        )}
      </div>

      {/* ── Isi email ──────────────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1e1e1e]">Isi email</h2>
          <CopyButton
            testId="import-copy-body"
            disabled={!ready}
            label="Salin isi"
            onCopy={copyBody}
          />
        </div>

        {ready ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="px-5 py-4 rounded-xl border border-[#1e1e1e]/10 bg-white text-sm text-[#1e1e1e]"
          >
            <pre className="whitespace-pre-wrap leading-relaxed font-sans mb-4">
              {stripBoldMarkers(intro)}
            </pre>
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    {["No", "Nama Dokumen", "Keterangan", "Status"].map((h) => (
                      <th key={h} className="border border-[#1e1e1e]/30 bg-[#f2f2f2] px-2 py-1.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d, i) => (
                    <tr key={d.name}>
                      <td className="border border-[#1e1e1e]/30 px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="border border-[#1e1e1e]/30 px-2 py-1.5">{d.name}</td>
                      <td className="border border-[#1e1e1e]/30 px-2 py-1.5 whitespace-pre-line">
                        {d.note === "{instruksiBox}" ? boxNote : d.note}
                      </td>
                      <td
                        className="border border-[#1e1e1e]/30 px-2 py-1.5 text-center font-semibold"
                        style={{ color: received[i] ? GREEN : RED }}
                      >
                        {received[i] ? "Received" : "Not Received"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {withImage && (
              <img
                src={IMPORT_IMAGE_URL}
                alt="H Taping Method"
                className="mt-4 max-w-sm rounded-lg border border-[#1e1e1e]/10"
              />
            )}
          </motion.div>
        ) : (
          <EmptyBox text="Lengkapi tiket, negara, tanggal, dan jumlah box untuk melihat email." />
        )}
      </div>
    </>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="px-5 py-10 rounded-xl border border-dashed border-[#1e1e1e]/15 text-center">
      <p className="text-sm text-[#1e1e1e]/35">{text}</p>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

export function PickupCall() {
  const [tab, setTab] = useState<SubTab>("chat");

  return (
    <div className="w-full max-w-4xl mx-auto py-4 pb-20">
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">Pickup Call</h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-6">
        Template chat penjemputan dan email pemberitahuan resi. Isi field, salin, tempel.
      </p>

      <div className="inline-flex gap-1 p-1 rounded-full bg-[#f0f0f0] mb-8">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            data-testid={`subtab-${t.id}`}
            className="relative px-4 h-8 rounded-full text-sm font-semibold"
            style={{ color: "#1e1e1e", opacity: tab === t.id ? 1 : 0.55 }}
          >
            {tab === t.id && (
              <motion.span
                layoutId="pickup-subtab-pill"
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: "var(--hub-accent)" }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "chat" && <ChatPickupTab />}
      {tab === "export" && <EmailExportTab />}
      {tab === "import" && <EmailImportTab />}
    </div>
  );
}
