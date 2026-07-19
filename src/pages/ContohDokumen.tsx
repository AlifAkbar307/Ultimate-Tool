/**
 * ContohDokumen.tsx — Referensi Dokumen Bukti Tinggal
 * ============================================================
 * Pure client-side. Membaca konten dari src/content/data.ts (DOC_REFERENCES).
 *
 * Layout kartu (rectangle, disusun menurun 1 kolom):
 *   ┌───────────────────────────────────────────┐
 *   │ [gambar/    ] WORKER                        │
 *   │ [placeholder] ✓ syarat 1                    │
 *   │ [           ] ✓ syarat 2                    │
 *   │ [           ] ✓ syarat 3                    │
 *   │               catatan alternatif...         │
 *   │  ▸ Lihat implikasi (untuk tim)  [dropdown]  │
 *   └───────────────────────────────────────────┘
 * Kartu didesain agar bisa di-screenshot bersama contoh gambarnya.
 *
 * Gambar: isi field `image` di DOC_REFERENCES (data.ts) dengan path, mis.
 * "/docs/loa-contoh.png" (taruh file di folder public/docs/). Jika kosong,
 * tampil placeholder "Contoh gambar menyusul".
 *
 * Untuk mengubah isi teks, edit DOC_REFERENCES di data.ts — bukan komponen ini.
 * ============================================================
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DOC_REFERENCES,
  DOC_COMBINED_RULE,
  type DocReferenceCard,
} from "../content/data";

// Teks pengecualian (poin dari PMK: yang utama adalah STAY >= 1 tahun, bukan
// durasi kerja/studi). Ditampilkan merah di bawah syarat utama.
const RULE_EXCEPTION =
  "Kecuali SKP membuktikan customer sudah stay di luar negeri setidaknya 1 tahun. " +
  "PMK menekankan lama tinggal (stay), bukan durasi kerja/studi — jadi selisih " +
  "tanggal dua dokumen boleh kurang dari 1 tahun selama total stay tetap >= 1 tahun.";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 mt-0.5 shrink-0" fill="none" aria-hidden>
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

// GANTI fungsi ImageSlot yang lama di ContohDokumen.tsx dengan versi ini.
// Perubahan: slot jadi LANDSCAPE dengan aspect-ratio 3:2 terkunci (600x400px ideal),
// cocok untuk menampilkan "belahan atas surat" (kop + judul + tanggal).
// Semua kartu jadi seragam karena rasio dikunci — gambar apa pun di-fit ke 3:2.

function ImageSlot({ image, title }: { image?: string; title: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt={`Contoh ${title}`}
        className="w-full md:w-64 shrink-0 rounded-lg object-cover border border-[#1e1e1e]/10 aspect-[3/2]"
      />
    );
  }
  return (
    <div className="w-full md:w-64 shrink-0 aspect-[3/2] rounded-lg border-2 border-dashed border-[#1e1e1e]/20 flex items-center justify-center text-center px-4">
      <span className="text-xs text-[#1e1e1e]/35 leading-snug">
        Contoh gambar
        <br />
        menyusul
      </span>
    </div>
  );
}

function DocCard({ card }: { card: DocReferenceCard }) {
  const [showImpl, setShowImpl] = useState(false);

  return (
    <div className="rounded-xl border border-[#1e1e1e]/10 bg-white p-5">
      <div className="flex flex-col md:flex-row gap-5">
        {/* Slot gambar (kiri di desktop, atas di mobile) */}
        <ImageSlot image={card.image} title={card.title} />

        {/* Konten (kanan) */}
        <div className="flex-1 min-w-0">
          {/* Badge audience */}
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#1e1e1e]/5 text-[#1e1e1e]/70 mb-3">
            {card.audience}
          </span>

          {/* Daftar syarat — infografis (di-SS ke customer) */}
          <ul className="space-y-2.5">
            {card.requirements.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#1e1e1e] leading-snug">
                <CheckIcon />
                <span>{r.syarat}</span>
              </li>
            ))}
          </ul>

          {/* Catatan alternatif */}
          {card.note && (
            <p className="text-xs text-[#1e1e1e]/45 leading-snug mt-3 pt-3 border-t border-[#1e1e1e]/5">
              {card.note}
            </p>
          )}
        </div>
      </div>

      {/* Dropdown implikasi (untuk tim, read-only) */}
      <div className="mt-4">
        <button
          onClick={() => setShowImpl((v) => !v)}
          data-testid={`impl-toggle-${card.id}`}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-[#1e1e1e]/15 text-[#1e1e1e] hover:bg-[#1e1e1e]/[0.03] transition-colors"
          aria-expanded={showImpl}
        >
          <span>{showImpl ? "Sembunyikan implikasi" : "Lihat implikasi (untuk tim)"}</span>
          <motion.span
            animate={{ rotate: showImpl ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#1e1e1e]/50"
          >
            ▾
          </motion.span>
        </button>

        <AnimatePresence>
          {showImpl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3 rounded-lg bg-[#1e1e1e]/[0.03] p-4">
                {card.requirements.map((r, i) => (
                  <div key={i}>
                    <p className="text-xs font-semibold text-[#1e1e1e] leading-snug">
                      {r.syarat}
                    </p>
                    <p className="text-xs text-[#1e1e1e]/55 leading-snug mt-0.5">
                      {r.implikasi}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ContohDokumen() {
  const categories = Array.from(new Set(DOC_REFERENCES.map((c) => c.category)));

  return (
    <div className="w-full max-w-3xl mx-auto py-4 pb-20">
      {/* Heading */}
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">
        Referensi Dokumen
      </h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">
        Dokumen pendukung barang pindahan — syarat yang harus ada. Kartu bisa
        di-screenshot untuk dikirim ke customer; dropdown implikasi untuk tim.
      </p>

      {/* Aturan gabungan >= 1 tahun + pengecualian */}
      <div className="rounded-xl border-2 border-[#16a34a]/25 bg-[#16a34a]/5 p-4 mb-8">
        <p className="text-xs font-bold uppercase tracking-wide text-[#16a34a] mb-1">
          Syarat Utama
        </p>
        <p className="text-sm text-[#1e1e1e] leading-snug">{DOC_COMBINED_RULE}</p>
        <p className="text-sm text-[#dc2626] leading-snug mt-2 font-medium">
          {RULE_EXCEPTION}
        </p>
      </div>

      {/* Section per kategori — kartu disusun menurun (1 kolom) */}
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
              <div className="space-y-4">
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
