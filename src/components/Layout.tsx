/**
 * Layout.tsx — App Shell
 * ============================================================
 * Struktur halaman:
 *
 *   ┌───────────────────────────────────────────────┐  <- latar abu (#f2f2f2)
 *   │   ┌───────────────────────────────────────┐   │
 *   │   │  Judul + subtitle  |  TopNav (sejajar)│   │  <- kartu putih "mengambang"
 *   │   │  ─────────────────────────────────────│   │     max 1280px, di tengah
 *   │   │  Konten tool (Outlet)                 │   │
 *   │   └───────────────────────────────────────┘   │
 *   └───────────────────────────────────────────────┘
 *
 * CATATAN DESAIN:
 * - Latar halaman abu lembut & STATIS (tanpa partikel/animasi) supaya kartu
 *   konten terasa "pop" tanpa mengganggu fokus kerja.
 * - Header + nav ikut di DALAM kartu putih. Ini disengaja: pill nav berwarna
 *   abu muda (#f0f0f0), kalau ditaruh langsung di atas latar abu kontrasnya hilang.
 * - Nav sejajar judul mulai breakpoint `xl` (1280px). Di bawah itu nav turun
 *   ke baris sendiri — disengaja, karena di bawah 1280px ruangnya tidak cukup
 *   untuk judul + pill bar dalam satu baris (label nav pakai whitespace-nowrap,
 *   jadi tidak bisa menyusut dan akan meluber).
 *
 * CARA MENGUBAH:
 * - Lebar maksimal konten  -> ganti `max-w-[1280px]`
 * - Warna latar pinggir    -> ganti `bg-[#f2f2f2]`
 * - Kekuatan efek melayang -> ganti nilai `shadow-[...]`
 * - Titik nav pindah baris -> ganti prefix `xl:` (jangan turunkan ke `lg:`
 *   kecuali label nav sudah dipendekkan — lihat navItems di content/data.ts)
 * ============================================================
 */

import React from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import { appConfig } from "../content/data";

export function Layout() {
  return (
    // ── Latar halaman: abu lembut, statis ──────────────────────────
    <div className="min-h-screen bg-[#f2f2f2] py-6 md:py-10">
      {/* ── Kolom terpusat, lebar maksimal 1280px ──────────────────── */}
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-6">
        {/* ── Kartu putih "mengambang" ─────────────────────────────── */}
        <div className="rounded-2xl bg-white px-6 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] md:px-10 md:py-8">
          {/* ── Baris header: judul (kiri) + nav (kanan) ───────────── */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
            {/* Judul + subtitle */}
            <div className="shrink-0">
              <h1 className="text-2xl font-bold tracking-tight text-[#1e1e1e]">
                {appConfig.appName}
              </h1>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[#1e1e1e]/50">
                {appConfig.tagline}
              </p>
            </div>

            {/* Navigasi — sejajar judul mulai layar xl */}
            <div className="min-w-0 xl:flex xl:justify-end">
              <TopNav />
            </div>
          </div>

          {/* ── Area konten tool ───────────────────────────────────── */}
          <main className="mt-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
