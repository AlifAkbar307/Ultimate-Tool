/**
 * UnderConstruction.tsx — Placeholder halaman
 * ============================================================
 * Halaman sementara: satu gambar, satu kalimat. Tidak ada logika.
 *
 * GAMBARNYA DI MANA
 * Taruh file gambar di `public/placeholder/under-construction.png`, sama
 * seperti gambar contoh dokumen di `public/docs/`. Path di bawah mengacu ke
 * situ — ganti kalau nama filenya beda.
 *
 * KALAU DIPAKAI UNTUK LEBIH DARI SATU HALAMAN
 * Kirim judulnya lewat prop: <UnderConstruction title="Pickup Call" />
 * ============================================================
 */

import React from "react";
import { motion } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const IMAGE_SRC = "/placeholder/under-construction.png";
const DEFAULT_TITLE = "Segera Hadir";
const DEFAULT_NOTE = "Halaman ini sedang disiapkan. Belum ada yang bisa dikerjakan di sini.";

// ── UI ────────────────────────────────────────────────────────────────────────

export function UnderConstruction({
  title = DEFAULT_TITLE,
  note = DEFAULT_NOTE,
}: {
  title?: string;
  note?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="w-full max-w-3xl mx-auto py-4 pb-20 text-center"
    >
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">{title}</h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">{note}</p>

      <img
        src={IMAGE_SRC}
        alt="Halaman sedang dibangun"
        data-testid="placeholder-image"
        className="w-full max-w-xl mx-auto rounded-2xl border border-[#1e1e1e]/10"
      />
    </motion.div>
  );
}
