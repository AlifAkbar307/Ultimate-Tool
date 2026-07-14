/**
 * EligibilityChecker.tsx — Freight Forwarding Eligibility Tool
 * ============================================================
 * Pure client-side date calculator — no API, no backend, no storage.
 * All logic runs in the browser.
 *
 * To change the eligibility windows, edit ONLY the SCHEMES config below.
 * The calculation logic reads from it automatically.
 * ============================================================
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════════════
// SCHEME CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────
// Edit the numbers here to change eligibility windows.
// DO NOT touch the calculation logic further down in this file.
//
//   daysBeforeArrival  →  goods may arrive this many days BEFORE the customer
//   daysAfterArrival   →  goods may arrive this many days AFTER the customer
//
// Example check (arrival = 1 Jan 2026):
//   Penumpang earliest = 1 Jan − 30 = 2 Dec 2025  ✓
//   Penumpang latest   = 1 Jan + 14 = 15 Jan 2026 ✓
// ══════════════════════════════════════════════════════════════════════════════
const SCHEMES = [
  {
    id: "penumpang",
    name: "Barang Penumpang",
    daysBeforeArrival: 30, // earliest goods arrival = customer arrival − 30 days
    daysAfterArrival: 14,  // latest  goods arrival = customer arrival + 14 days
  },
  {
    id: "pindahan",
    name: "Barang Pindahan",
    daysBeforeArrival: 90, // earliest goods arrival = customer arrival − 90 days
    daysAfterArrival: 89,  // latest  goods arrival = customer arrival + 89 days
  },
] as const;

type Scheme = (typeof SCHEMES)[number];

// ── Date utilities ─────────────────────────────────────────────────────────────

/**
 * Add (or subtract, if negative) calendar days from a date.
 * Returns a new Date — does not mutate the original.
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Parse a date-input string ("YYYY-MM-DD") into a local midnight Date.
 *
 * Why not just `new Date(str)`? The built-in parser treats "YYYY-MM-DD" as UTC,
 * which shifts the date backward by one day in negative-offset timezones (e.g.
 * WIB is UTC+7, so UTC midnight = the previous day at 17:00 local). This avoids
 * that off-by-one error by constructing the date in local time directly.
 */
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as "2 Dec 2025" (en-GB locale for consistent abbreviations). */
function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Number Line sub-component ─────────────────────────────────────────────────

interface NumberLineProps {
  scheme: Scheme;
  arrivalDate: Date;
  estimatedDate: Date | null; // null = optional field left empty
}

function NumberLine({ scheme, arrivalDate, estimatedDate }: NumberLineProps) {
  const earliest = addDays(arrivalDate, -scheme.daysBeforeArrival);
  const latest = addDays(arrivalDate, scheme.daysAfterArrival);
  // Total window width in calendar days
  const totalDays = scheme.daysBeforeArrival + scheme.daysAfterArrival;

  // Where the arrival date falls as a % from the left edge of the track
  const arrivalPct = (scheme.daysBeforeArrival / totalDays) * 100;

  // Calculate pin position for the estimated goods date, if provided
  let pinPct: number | null = null;
  let pinOutOfRange: "before" | "after" | null = null;

  if (estimatedDate) {
    // Days from the earliest boundary to the estimated date
    const diffDays = Math.round(
      (estimatedDate.getTime() - earliest.getTime()) / 86_400_000
    );
    const rawPct = (diffDays / totalDays) * 100;

    if (rawPct < 0) {
      // Estimated date is before the window — clamp pin to left edge
      pinPct = 0;
      pinOutOfRange = "before";
    } else if (rawPct > 100) {
      // Estimated date is after the window — clamp pin to right edge
      pinPct = 100;
      pinOutOfRange = "after";
    } else {
      pinPct = rawPct;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="mt-5 select-none"
    >
      {/* Arrival date label — floated above its marker position */}
      <div className="relative h-9 mb-0.5">
        <div
          className="absolute -translate-x-1/2 text-center pointer-events-none"
          style={{ left: `${arrivalPct}%` }}
        >
          <div className="text-[11px] font-semibold text-[#1e1e1e] whitespace-nowrap leading-tight">
            {formatDate(arrivalDate)}
          </div>
          <div className="text-[10px] text-[#1e1e1e]/40 whitespace-nowrap leading-tight mt-0.5">
            tgl kedatangan
          </div>
        </div>
      </div>

      {/* Track + markers — py-2 gives room for the markers to overflow the bar */}
      <div className="relative py-2">
        {/* The gray track bar */}
        <div className="h-2 rounded-full bg-[#e5e7eb]" />

        {/* Arrival date marker: dark circle pinned to arrivalPct */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#1e1e1e] border-2 border-white shadow-sm z-20"
          style={{ left: `${arrivalPct}%` }}
        />

        {/* Estimated goods date pin — animated spring pop-in */}
        {pinPct !== null && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 22,
              delay: 0.1,
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md z-10"
            style={{
              left: `${pinPct}%`,
              // Green = in range, red = out of range (never use #c1ff00 for status)
              backgroundColor: pinOutOfRange ? "#dc2626" : "#16a34a",
            }}
            aria-label={
              pinOutOfRange === "before"
                ? "Out of range — before window start"
                : pinOutOfRange === "after"
                ? "Out of range — after window end"
                : "Within eligible window"
            }
          />
        )}
      </div>

      {/* Date labels at both ends of the track */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-[#1e1e1e]/50 leading-tight">
          {formatDate(earliest)}
        </span>
        <span className="text-[11px] text-[#1e1e1e]/50 leading-tight">
          {formatDate(latest)}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main page component ────────────────────────────────────────────────────────

export function EligibilityChecker() {
  // Raw strings from the <input type="date"> elements ("YYYY-MM-DD" or "")
  const [arrivalStr, setArrivalStr] = useState("");
  const [estimatedStr, setEstimatedStr] = useState("");

  // Parsed Date objects — null when the field is empty
  const arrivalDate = arrivalStr ? parseLocalDate(arrivalStr) : null;
  const estimatedDate = estimatedStr ? parseLocalDate(estimatedStr) : null;

  return (
    <div className="w-full max-w-2xl mx-auto py-4 pb-20">
      {/* Page heading */}
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">
        Eligibility Checker
      </h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">
        Kalkulator kelayakan pengiriman barang untuk Barang Penumpang dan Barang
        Pindahan.
      </p>

      {/* ── Inputs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {/* Required: customer's arrival date in Indonesia */}
        <div>
          <label className="block text-sm font-semibold text-[#1e1e1e] mb-2 leading-snug">
            Pada tanggal berapa customer sampai di Indonesia?{" "}
            <span className="text-[#dc2626]">*</span>
          </label>
          <input
            type="date"
            value={arrivalStr}
            onChange={(e) => {
              setArrivalStr(e.target.value);
              // Clear the estimated date whenever arrival changes,
              // so stale results don't linger on screen.
              setEstimatedStr("");
            }}
            data-testid="input-arrival-date"
            className="w-full px-3 py-2.5 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20"
          />
        </div>

        {/* Optional: estimated goods arrival date */}
        <div>
          <label className="block text-sm font-semibold text-[#1e1e1e] mb-2 leading-snug">
            Tanggal berapa estimasi barang sampai?{" "}
            <span className="text-[#1e1e1e]/40 font-normal">(opsional)</span>
          </label>
          <input
            type="date"
            value={estimatedStr}
            onChange={(e) => setEstimatedStr(e.target.value)}
            disabled={!arrivalStr}
            data-testid="input-estimated-date"
            className="w-full px-3 py-2.5 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* ── Results (shown only when arrival date is filled) ──── */}
      <AnimatePresence>
        {arrivalDate && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="space-y-5"
          >
            {SCHEMES.map((scheme) => {
              // Compute the allowed window for this scheme
              const earliest = addDays(arrivalDate, -scheme.daysBeforeArrival);
              const latest = addDays(arrivalDate, scheme.daysAfterArrival);

              // Determine eligibility
              // "neutral" = estimated date not yet entered
              let status: "eligible" | "not-eligible" | "neutral" = "neutral";
              if (estimatedDate) {
                const afterOrOnEarliest =
                  estimatedDate.getTime() >= earliest.getTime();
                const beforeOrOnLatest =
                  estimatedDate.getTime() <= latest.getTime();
                status =
                  afterOrOnEarliest && beforeOrOnLatest
                    ? "eligible"
                    : "not-eligible";
              }

              // Title text color — green/red/dark depending on status
              // Never use the neon lime #c1ff00 for these status colors
              const titleColor =
                status === "eligible"
                  ? "#16a34a"
                  : status === "not-eligible"
                  ? "#dc2626"
                  : "#1e1e1e";

              // Suffix appended to the scheme name
              const titleSuffix =
                status === "eligible"
                  ? ": Eligible"
                  : status === "not-eligible"
                  ? ": Not Eligible"
                  : "";

              // Card border accent
              const borderClass =
                status === "eligible"
                  ? "border-[#16a34a]/30"
                  : status === "not-eligible"
                  ? "border-[#dc2626]/25"
                  : "border-[#1e1e1e]/10";

              return (
                <div
                  key={scheme.id}
                  data-testid={`scheme-card-${scheme.id}`}
                  className={`px-5 pt-4 pb-6 rounded-xl border bg-white ${borderClass}`}
                >
                  {/* Section title with eligibility status */}
                  <h2
                    className="text-base font-bold tracking-tight"
                    style={{ color: titleColor }}
                  >
                    {scheme.name}
                    {titleSuffix}
                  </h2>

                  {/* Compact date-range summary */}
                  <p className="text-xs text-[#1e1e1e]/40 mt-0.5">
                    Window: {formatDate(earliest)} — {formatDate(latest)}
                  </p>

                  {/* Number line visualization */}
                  <NumberLine
                    scheme={scheme}
                    arrivalDate={arrivalDate}
                    estimatedDate={estimatedDate}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
