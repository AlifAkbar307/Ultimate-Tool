/**
 * ContohDokumen.tsx — Referensi Dokumen Bukti Tinggal
 * ============================================================
 * Pure client-side. Membaca konten dari src/content/data.ts (DOC_REFERENCES).
 * Tidak ada gambar / file upload — infografis dirender dari teks, jadi tim bisa
 * screenshot langsung dari halaman ini tanpa data customer.
 *
 * Struktur:
 *   - Callout aturan gabungan (>= 1 tahun) di atas, menonjol.
 *   - Dua section (Proof of Acceptance / Completion), masing-masing berisi
 *     kartu Worker & Student.
 *   - Tiap kartu: badge audience + daftar syarat (infografis, untuk di-SS ke
 *     customer) + tombol Salin (menyalin syarat + implikasi, untuk tim).
 *
 * Untuk mengubah isi (syarat/implikasi/catatan), edit DOC_REFERENCES di data.ts —
 * jangan ubah komponen ini.
 * ============================================================
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  DOC_REFERENCES,
  DOC_COMBINED_RULE,
  type DocReferenceCard,
} from "../content/data";

// Rakit teks yang disalin saat tombol "Salin penjelasan" ditekan.
// Berisi judul + tiap syarat beserta implikasinya (untuk tim menjelaskan ke customer).
function buildCardCopyText(card: DocReferenceCard): string {
  const parts: string[] = [card.title];
  card.requirements.forEach((r) => {
    parts.push(`• ${r.syarat}\n  ${r.implikasi}`);
  });
  parts.push(DOC_COMBINED_RULE);
  return parts.join("\n\n");
}

// Checkmark kecil untuk daftar syarat
function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="w-4 h-4 mt-0.5 shrink-0"
      fill="none"
      aria-hidden
    >
      <circle cx="10" cy="10" r="9" fill="#16a34a" opacity="0.12" />
      <path
        d="M6 10.5l2.5 2.5L14 7.5"
        stroke="#16a34a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocCard({ card }: { card: DocReferenceCard }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildCardCopyText(card));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard bisa gagal di konteks non-HTTPS — abaikan diam-diam,
      // tombol tidak flash. Di Vercel (HTTPS) aman.
    }
  }

  return (
    <div className="rounded-xl border border-[#1e1e1e]/10 bg-white p-5 flex flex-col">
      {/* Badge audience */}
      <span className="self-start text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#1e1e1e]/5 text-[#1e1e1e]/70 mb-3">
        {card.audience}
      </span>

      {/* Daftar syarat — bagian infografis (di-SS ke customer) */}
      <ul className="space-y-2.5 flex-1">
        {card.requirements.map((r, i) => (
          <li key={i} className="flex gap-2 text-sm text-[#1e1e1e] leading-snug">
            <CheckIcon />
            <span>{r.syarat}</span>
          </li>
        ))}
      </ul>

      {/* Catatan alternatif (email, tanggal TTD) */}
      {card.note && (
        <p className="text-xs text-[#1e1e1e]/45 leading-snug mt-3 pt-3 border-t border-[#1e1e1e]/5">
          {card.note}
        </p>
      )}

      {/* Tombol salin penjelasan (syarat + implikasi) — untuk tim */}
      <button
        onClick={handleCopy}
        data-testid={`copy-doc-${card.id}`}
        className="mt-4 self-start text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#1e1e1e]/15 transition-colors"
        style={{
          backgroundColor: copied ? "#c1ff00" : "transparent",
          color: "#1e1e1e",
        }}
      >
        {copied ? "Tersalin ✓" : "Salin penjelasan (untuk tim)"}
      </button>
    </div>
  );
}

export function ContohDokumen() {
  // Kelompokkan kartu berdasarkan category, urutan sesuai kemunculan pertama di data
  const categories = Array.from(
    new Set(DOC_REFERENCES.map((c) => c.category)),
  );

  const [ruleCopied, setRuleCopied] = useState(false);
  async function copyRule() {
    try {
      await navigator.clipboard.writeText(DOC_COMBINED_RULE);
      setRuleCopied(true);
      setTimeout(() => setRuleCopied(false), 1500);
    } catch {
      /* non-HTTPS: abaikan */
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-4 pb-20">
      {/* Heading */}
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">
        Referensi Dokumen
      </h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">
        Dokumen pendukung barang pindahan — syarat yang harus ada. Kartu bisa
        di-screenshot untuk dikirim ke customer; tombol salin memberi penjelasan
        untuk tim.
      </p>

      {/* Aturan gabungan >= 1 tahun — menonjol */}
      <div className="rounded-xl border-2 border-[#16a34a]/25 bg-[#16a34a]/5 p-4 mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#16a34a] mb-1">
              Syarat Utama
            </p>
            <p className="text-sm text-[#1e1e1e] leading-snug">
              {DOC_COMBINED_RULE}
            </p>
          </div>
          <button
            onClick={copyRule}
            data-testid="copy-doc-rule"
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#1e1e1e]/15 transition-colors"
            style={{
              backgroundColor: ruleCopied ? "#c1ff00" : "transparent",
              color: "#1e1e1e",
            }}
          >
            {ruleCopied ? "✓" : "Salin"}
          </button>
        </div>
      </div>

      {/* Section per kategori */}
      <div className="space-y-10">
        {categories.map((cat, ci) => {
          const cards = DOC_REFERENCES.filter((c) => c.category === cat);
          return (
            <motion.section
              key={cat}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: ci * 0.08 }}
            >
              <h2 className="text-lg font-bold tracking-tight text-[#1e1e1e] mb-3">
                {cat}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {cards.map((card) => (
                  <DocCard key={card.id} card={card} />
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
