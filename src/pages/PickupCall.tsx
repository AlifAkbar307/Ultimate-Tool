/**
 * PickupCall.tsx — Template chat penjemputan
 * ============================================================
 * Pure client-side. No API, no backend, no storage.
 *
 * WHAT IT DOES
 * Three inputs — negara, nomor AWB, nomor pickup — assembled into the standard
 * Jira comment that CS forwards to the customer over WhatsApp. One copy button,
 * same as every other snippet in this app.
 *
 * WHY THIS IS A PAGE AND NOT A SNIPPET
 * Only one reason: picking a country must pull in that country's FedEx phone
 * number. Everything else here a plain snippet could already do. If that lookup
 * ever goes away, fold this back into SNIPPET_GROUPS and delete the page.
 *
 * CONTENT LIVES IN data.ts
 * Adding a country = one line in PICKUP_COUNTRIES. Changing the wording = edit
 * PICKUP_TEMPLATE. Neither needs a code change.
 *
 * FAIL-LOUD
 * The copy button stays disabled until every field is filled, because a half
 * empty template goes straight to a customer. The AWB is checked for exactly 12
 * digits — a warning, not a block, since the operator may have a valid reason.
 * The pickup number is deliberately unvalidated: its format varies.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PICKUP_COUNTRIES,
  PICKUP_CS_MENTIONS,
  PICKUP_TEMPLATE,
} from "../content/data";
import { copyWithMentions, mentionToPlain } from "../lib/mention";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/** FedEx air waybill length. Used for a warning only, never to block. */
const AWB_DIGITS = 12;

const RED = "#dc2626";
const GREEN = "#16a34a";

// ── LOGIC ───────────────────────────────────────────────────────────────────

function replaceAll(source: string, find: string, value: string): string {
  return source.split(find).join(value);
}

/** The "@A @B @C" prefix, built from the keys listed in PICKUP_CS_MENTIONS. */
function buildCsMentions(): string {
  return PICKUP_CS_MENTIONS.map((key) => `{@${key}}`).join(" ");
}

interface BuildInput {
  country: string;
  phone: string;
  awb: string;
  pickup: string;
}

function buildMessage({ country, phone, awb, pickup }: BuildInput): string {
  let text = PICKUP_TEMPLATE;
  text = replaceAll(text, "{csMention}", buildCsMentions());
  text = replaceAll(text, "{negara}", country);
  text = replaceAll(text, "{telepon}", phone);
  text = replaceAll(text, "{awb}", awb.trim());
  text = replaceAll(text, "{pickup}", pickup.trim());
  return text;
}

/** Digits only — so "7712 3456 7890" is judged on its digits, not its spaces. */
function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

// ── UI ────────────────────────────────────────────────────────────────────────

const inputClass =
  "w-full h-10 px-3 rounded-lg border border-[#1e1e1e]/15 bg-white text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e1e1e]/20";

export function PickupCall() {
  const [countryName, setCountryName] = useState("");
  const [awb, setAwb] = useState("");
  const [pickup, setPickup] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const selected = PICKUP_COUNTRIES.find((c) => c.country === countryName);

  const ready = Boolean(selected) && awb.trim() !== "" && pickup.trim() !== "";

  const message = useMemo(() => {
    if (!selected) return "";
    return buildMessage({
      country: selected.country,
      phone: selected.phone,
      awb,
      pickup,
    });
  }, [selected, awb, pickup]);

  const awbDigits = digitCount(awb);
  const awbWarning =
    awb.trim() !== "" && awbDigits !== AWB_DIGITS
      ? `Nomor AWB terbaca ${awbDigits} digit, biasanya ${AWB_DIGITS}. Cek lagi sebelum dikirim.`
      : null;

  const handleCopy = async () => {
    if (!ready) return;
    const ok = await copyWithMentions(message);
    setCopyFailed(!ok);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 pb-20">
      <h1 className="text-3xl font-bold tracking-tight text-[#1e1e1e] mb-1">Pickup Call</h1>
      <p className="text-sm text-[#1e1e1e]/50 mb-8">
        Template chat penjemputan untuk diteruskan CS ke customer. Isi tiga field, salin, tempel
        ke komentar Jira.
      </p>

      {/* ── Fields ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-[#1e1e1e] mb-2">Negara</label>
          <select
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            data-testid="pickup-country"
            className={inputClass}
          >
            <option value="">— pilih negara —</option>
            {PICKUP_COUNTRIES.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country}
              </option>
            ))}
          </select>
          {selected && (
            <p className="mt-1.5 text-xs text-[#1e1e1e]/55">CS FedEx: {selected.phone}</p>
          )}
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold text-[#1e1e1e] mb-2">Nomor AWB</label>
          <input
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
            data-testid="pickup-awb"
            placeholder={`${AWB_DIGITS} digit`}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold text-[#1e1e1e] mb-2">Nomor Pickup</label>
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
          data-testid="warning-awb"
          className="mt-4 px-4 py-3 rounded-lg border text-sm font-medium"
          style={{
            borderColor: "rgba(220,38,38,0.3)",
            backgroundColor: "rgba(220,38,38,0.06)",
            color: RED,
          }}
        >
          {awbWarning}
        </div>
      )}

      {/* ── Preview + copy ───────────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1e1e1e]">Hasil</h2>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!ready}
            data-testid="pickup-copy"
            className="h-9 px-5 rounded-md text-[#1e1e1e] font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-default"
            style={{ backgroundColor: copied ? "#c1ff00" : "var(--hub-accent)" }}
          >
            {copied ? "Tersalin!" : "Salin"}
          </button>
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
          <div className="px-5 py-10 rounded-xl border border-dashed border-[#1e1e1e]/15 text-center">
            <p className="text-sm text-[#1e1e1e]/35">
              Lengkapi negara, nomor AWB, dan nomor pickup untuk melihat hasilnya.
            </p>
          </div>
        )}

        {copyFailed && (
          <p className="mt-3 text-sm font-medium" style={{ color: RED }}>
            Gagal menyalin — clipboard butuh HTTPS. Buka lewat alamat Vercel, bukan preview lokal.
          </p>
        )}

        {ready && !copyFailed && (
          <p className="mt-3 text-xs text-[#1e1e1e]/45">
            Mention CS terbentuk otomatis saat ditempel ke Jira. Garis{" "}
            <span style={{ color: GREEN }}>--</span> memisahkan bagian yang diteruskan ke customer.
          </p>
        )}
      </div>
    </div>
  );
}
