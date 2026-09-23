/**
 * mention.ts — Jira mention helpers
 * ============================================================
 * A Jira mention is NOT text. What looks like "@harisfadli" is a ProseMirror
 * node carrying that person's Atlassian account ID. Pasting the plain string
 * gives Jira nothing to build a tag from, and the "@" autocomplete only fires
 * on real keystrokes — paste skips it entirely.
 *
 * So a snippet containing {@key} is copied as text/html with the real mention
 * markup, while everything else stays plain text exactly as before.
 *
 * A key that is not in MENTION_IDS is deliberately left raw as "{@key}" so the
 * mistake is visible on screen instead of silently producing nothing.
 *
 * NOTE: JiraHelper.tsx currently has its own copy of these functions. When you
 * next edit that file, delete them there and import from here instead — two
 * copies will drift.
 * ============================================================
 */

import { MENTION_IDS } from "../content/data";

const MENTION_TOKEN_G = /\{@([a-zA-Z0-9_-]+)\}/g;
const MENTION_TOKEN = /\{@([a-zA-Z0-9_-]+)\}/;

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * *teks* -> <strong>teks</strong>.
 *
 * Dijalankan SESUDAH escapeHtml, supaya isi template tidak bisa menyuntikkan
 * markup sendiri — satu-satunya HTML yang boleh lahir dari teks adalah ini.
 *
 * Pasangan bintang tidak boleh menyeberang baris. Itu yang membuat daftar
 * bergaya "* Booking Reference" di awal baris tidak ikut menebal, dan bintang
 * tunggal (perkalian) dibiarkan apa adanya.
 */
function boldify(escaped: string): string {
  return escaped.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
}

/** Buang penanda *...* — untuk preview di layar dan fallback teks polos. */
export function stripBoldMarkers(text: string): string {
  return text.replace(/\*([^*\n]+)\*/g, "$1");
}

export function hasMention(text: string): boolean {
  return MENTION_TOKEN.test(text);
}

/** Plain-text version — used for on-screen preview and as the clipboard fallback. */
export function mentionToPlain(text: string): string {
  return stripBoldMarkers(
    text.replace(MENTION_TOKEN_G, (whole, key: string) => {
      const m = MENTION_IDS[key.toLowerCase()];
      return m ? `@${m.username}` : whole;
    })
  );
}

/** HTML version — Jira reads this and builds a real mention node. */
export function mentionToHtml(text: string): string {
  const body = escapeHtml(text)
    .replace(MENTION_TOKEN_G, (whole, key: string) => {
      const m = MENTION_IDS[key.toLowerCase()];
      if (!m) return whole;
      return `<span data-prosemirror-content-type="node" data-prosemirror-node-name="mention" data-prosemirror-node-inline="true" data-mention-id="${m.id}" contenteditable="false">@${escapeHtml(m.username)}</span>`;
    })
    .replace(/\n/g, "<br>");
  return `<p data-pm-slice="1 1 []">${boldify(body)}</p>`;
}

/**
 * Salin teks berformat untuk email (Gmail / Outlook), bukan Jira.
 *
 * Bedanya dengan mentionToHtml: tidak ada mention, tidak ada atribut
 * ProseMirror, dan baris kosong jadi PARAGRAF terpisah — di email jeda antar
 * paragraf itu wajar, sementara <br> beruntun membuatnya rapat dan sesak.
 *
 * text/plain tetap ikut ditulis, supaya menempel ke aplikasi yang tidak
 * membaca HTML tetap menghasilkan teks yang masuk akal.
 */
export async function copyRichText(text: string): Promise<boolean> {
  return copyHtml(textToHtml(text), stripBoldMarkers(text));
}

/**
 * Teks template -> HTML email: baris kosong jadi paragraf, *teks* jadi tebal,
 * newline tunggal jadi <br>. Diekspor supaya bisa digabung dengan HTML lain
 * (tabel, gambar) dalam satu salinan.
 */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${boldify(escapeHtml(block)).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Salin HTML yang sudah jadi, beserta versi teks polosnya.
 * Dipakai untuk isi yang tidak bisa diwakili template teks — tabel, gambar.
 */
export async function copyHtml(html: string, plain: string): Promise<boolean> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    return true;
  } catch {
    // Rich clipboard ditolak (butuh HTTPS) — jatuh ke teks polos.
  }

  try {
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy text to the clipboard, using the rich path only when a mention is
 * present. Returns true on success.
 */
export async function copyWithMentions(text: string): Promise<boolean> {
  const plain = mentionToPlain(text);

  if (hasMention(text)) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([mentionToHtml(text)], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    } catch {
      // Rich clipboard refused (needs HTTPS) — fall through to plain text.
    }
  }

  try {
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    return false;
  }
}
