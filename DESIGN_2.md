# Internal Tools Hub — Design & Context

Dokumen konteks untuk project tool hub rimkirim.
Dipakai untuk: (a) rujukan sendiri saat maintain, (b) di-attach/paste ke AI di
sesi baru supaya konteks keputusan tidak hilang.

**Cara pakai:** paste isi file ini di awal chat baru. Konteks keputusan & aturan
akan kembali. Kode aktual TIDAK ada di sini — file kode tetap perlu di-paste
terpisah (sebagai teks, bukan attach) saat mau diubah.

Terakhir diperbarui: 28 Juli 2026

---

## 1. Ringkasan Project

Web app internal berisi kumpulan tools untuk memudahkan kerja tim
(freight forwarding / customs clearance). Bukan produk publik, bukan portfolio —
alat kerja harian.

- **Live:** https://ultimate-tool-six.vercel.app/
- **Repo:** github.com/AlifAkbar307/Ultimate-Tool
- **Stack:** React + Vite + TypeScript + Tailwind + Framer Motion + React Router
- **Font:** Prompt (Google Fonts)
- **Deploy:** GitHub → Vercel (auto-redeploy tiap push). **Replit sudah ditinggal.**
- **Alur kerja:** edit kode via GitHub langsung → Vercel redeploy. Satu sumber
  kebenaran (GitHub). Untuk logika baru, kode ditulis lengkap lalu di-paste.

---

## 2. Prinsip Arsitektur (jangan dilanggar)

1. **Client-side murni.** Tidak ada backend, database, auth. Semua jalan di browser.
   (Pengecualian tunggal: Currency Converter fetch API kurs eksternal read-only.)
2. **Data terpisah dari logika.** Semua konten yang berubah (snippet, tabel, label
   parser, aturan tanggal, navItems, daftar mata uang, referensi dokumen) hidup di
   `src/content/data.ts`. Komponen UI hanya MEMBACA. Nambah konten = edit data.ts,
   tanpa sentuh logika, tanpa AI.
3. **Fail-loud, bukan fail-silent.** Tool yang outputnya masuk ke quote/customer
   harus BERHENTI + beri peringatan saat ketemu input tak dikenal — bukan lewat diam.
4. **Tidak pakai admin UI / DB / auth.** Yang edit cuma satu orang, frekuensi rendah,
   selalu dari laptop saat jam kerja. Struktur data rapi sudah cukup.
5. **Nilai field TIDAK di-persist.** Tidak pakai localStorage/cookies. Field kosong
   saat ganti halaman itu DISENGAJA — mencegah data customer lama nyangkut ke sesi
   berikutnya (mis. nama customer kemarin ikut ke quote hari ini).

---

## 3. Design System

| Elemen | Nilai |
|---|---|
| Background halaman | `#f2f2f2` (abu lembut, statis — tanpa partikel/animasi) |
| Kartu konten | putih, `rounded-2xl`, shadow, max-width **1280px**, terpusat |
| Teks / permukaan gelap | `#1e1e1e` |
| Aksen (neon lime) | `#c1ff00` / CSS var `--hub-accent` — HANYA tombol, nav aktif, flash "tersalin" |
| Status Eligible / cocok | `#16a34a` (hijau) |
| Status Not Eligible / tidak cocok | `#dc2626` (merah) |
| Section lebih gelap (mis. hasil converter) | `#f2f2f2` |
| Text selection | background `#c1ff00`, teks dipaksa `#1e1e1e` |

**Aturan keras:** `#c1ff00` tidak pernah warna teks di atas putih (kontras buruk),
tidak pernah untuk status eligible/not-eligible.

**Layout:** header (judul + subtitle) sejajar nav di breakpoint `xl` (1280px).
Di bawah itu nav turun ke baris sendiri (label pakai `whitespace-nowrap`, meluber
kalau dipaksa sejajar di ruang sempit). Header + nav ADA DI DALAM kartu putih
(pill nav abu `#f0f0f0` — kalau di latar abu kontrasnya hilang).

**Nav:** satu pill horizontal, inner shadow, item aktif = pill `#c1ff00` yang
meluncur (Framer Motion `layoutId`), stagger rise+fade saat load, collapse ke
hamburger di `md`.

**Bug visual yang sudah diperbaiki:**
- 404 saat buka route langsung / refresh → `vercel.json` dengan SPA rewrite semua
  path ke `/index.html`.
- Layout geser ~15px saat pindah ke halaman pendek (scrollbar hilang) →
  `html { scrollbar-gutter: stable; }` di index.css.

**Batasan teknis yang sudah ditemui (jangan coba lagi):**
- Native `<select>`: tinggi dropdown & warna highlight hover TIDAK bisa di-CSS.
  Solusi: pangkas daftar (bukan custom dropdown) kalau cuma soal panjang.
- `::selection`: hanya ubah background, teks perlu dipaksa warnanya.
- Clipboard HTML (`ClipboardItem`) butuh HTTPS — tes di Vercel, bukan preview lokal.
- Drive Ctrl+C→Ctrl+V (copy file antar folder) TIDAK bisa ditiru tombol web
  (format clipboard internal Google). Solusi: link buka folder, tim Ctrl+C manual.

---

## 4. Status Tools

| # | Tool | Status |
|---|---|---|
| 1 | Quote Parser (LMR / non-LMR) | ✅ live |
| 2 | Eligibility Checker | ✅ live |
| 3 | Jira Helper (Checklist + Snippet + Quote Snippet) | ✅ live |
| 4 | Referensi Dokumen ("Contoh Dokumen") | ✅ live (4 gambar dummy lengkap) |
| 5 | Currency Converter | ✅ live |
| — | Folder Quotations (link Drive di Jira Helper) | ✅ live |
| 6 | Regulasi | ⬜ belum — butuh kompilasi isi |
| 7 | CIPL vs SKP Comparator | ⬜ skip/eksplorasi (lihat §9) |

**Jira Helper punya 3 sub-tab:** Tabel Checklist · Snippet Komentar · Quote Snippet.
Nav utama: Jira Helper (landing), Quote Parser, Eligibility Checker, CIPL vs SKP,
Contoh Dokumen, Regulasi.

**Dropped:** Selling Rate — data harga jual, diputuskan TIDAK ditaruh di app
(sensitivitas + app publik). Kalau nanti perlu: kunci spreadsheet di Google, app
kasih link — jangan taruh tabelnya.

---

## 5. Aturan Operasional (SUMBER KEBENARAN — verifikasi ke regulasi)

> ⚠️ Angka di bawah = aturan bisnis, bukan hitungan teknis. Kebenaran terhadap
> regulasi Bea Cukai = tanggung jawab manusia. **TODO: catat sumber PMK/pasal.**

### 5.1 Eligibility Checker
Anchor = tanggal customer sampai di Indonesia. Dihitung hari ke-1 di sisi sesudah.

| Skema | Batas awal | Batas akhir |
|---|---|---|
| Barang Penumpang | anchor − 30 hari | anchor + 14 hari |
| Barang Pindahan | anchor − 90 hari | anchor + 89 hari |

Contoh tervalidasi: sampai 1 Jan 2026 → Penumpang 2 Des 2025 → 15 Jan 2026;
Pindahan 3 Okt 2025 → 31 Mar 2026. Input tanggal barang opsional.

### 5.2 Dokumen barang pindahan (Referensi Dokumen)
Butuh 2 dokumen: Proof of Acceptance (tanggal MULAI) + Proof of Completion
(tanggal SELESAI). **Selisih mulai→selesai harus ≥ 1 tahun.**
**Pengecualian:** kalau SKP membuktikan customer stay di LN ≥ 1 tahun, selisih
boleh < 1 tahun — PMK menekankan lama STAY, bukan durasi kerja/studi.
Dua kasus: Worker (kontrak) & Student (LoA/ijazah). Alternatif dokumen: email
resmi (kop dari pengirim/TTD), tanggal TTD kalau tanggal berakhir tak ada.

### 5.3 Aturan lain
- Barang kiriman: <1500 USD → CN, >1500 USD → PIBK; berat maks 5 kg
- SP3BP kalau barang tiba sebelum customer tiba
- Penumpang value CI/PL <500 USD; US personal effects maks 2500 USD; Jerman MRN >1000 EUR
- Warehouse FedEx IDR 2000/kg/hari

---

## 6. Spec Tools yang Sudah Dibangun

### 6.1 Quote Parser (LMR/non-LMR)
Parse harga FedEx → 4 baris output (Freight, VAT, FSI, Additional). Dua pola input
(nempel/terpisah), 3 format angka (deteksi via IDR/Rp + separator terakhir=desimal).
non-LMR: Freight = Tarif dasar − |Volume discount|. Fail-loud kalau Freight/VAT/FSI
tak ketemu. Checksum ±2 rupiah. Output angka polos, titik desimal, tanpa ribuan.
Pill bahasa DIBUANG (parser cocokkan semua label 2 bahasa sekaligus).

### 6.2 Jira Helper
**Checklist:** 3 tabel, disalin sebagai HTML `<table>` (Jira baca text/html →
jadi tabel). Judul tabel bold via `<strong>` di buildTableHtml (BUKAN markdown **,
karena rich-text vs markdown konflik). Field "Nama Checker" global (default ILHAM)
ganti kolom Checker semua baris. Butuh HTTPS untuk clipboard HTML.
**Snippet Komentar:** 22 snippet + 5 surat pernyataan (link Google Docs /edit
view-only, customer bisa File→Download). Search cocokkan judul+isi.
**Quote Snippet:** field "Nama Lengkap" global → {nama}=kata pertama,
{NamaLengkap}=penuh. Snippet approval biarkan XXX mentah (tag manual di Jira).
Snippet volumetrik: input P/L/T/berat/nobox → {volume}=P×L×T, {volumetrikroundup}=
ceil(volume/5000). Fail-loud (warning merah) kalau berat aktual ≥ volumetrik.
Tombol "Scroll to Email Template".
**Folder Quotations:** tombol buka folder Drive di tab baru (tim Ctrl+C manual).

### 6.3 Referensi Dokumen ("Contoh Dokumen")
4 kartu (Acceptance/Completion × Worker/Student) dari `DOC_REFERENCES` di data.ts.
Kartu rectangle: gambar contoh (kiri, slot w-72 aspect 3:2 object-contain) +
checklist syarat (infografis, di-SS ke customer) + dropdown implikasi (untuk tim,
read-only). Aturan ≥1 tahun + pengecualian SKP-stay (teks merah) di atas.
Gambar dummy: taruh di public/docs/, isi field `image` di data.ts. 4 gambar sudah
ada. Gambar dibuat dari nol/anonim (nol data customer asli).

### 6.4 Currency Converter
Sumber: fawazahmed0/currency-api via jsDelivr CDN (gratis, no-key, CORS-ok,
update harian) + fallback URL currency-api.pages.dev. Fail-loud kalau dua-duanya
gagal. **URL sudah versi baru pasca-migrasi** (`/npm/@fawazahmed0/...@latest/v1/`);
API pernah migrasi sekali, bisa lagi — kalau converter mati mendadak, cek URL di
repo GitHub-nya dulu. 15 mata uang (EUR/USD/IDR di atas), di-cache per base.
Disclaimer "estimasi kurs pasar — BUKAN kurs Bea Cukai (KMK)". Tombol salin angka
bulat (Math.round, polos tanpa ribuan). Ada di tab Checklist Jira Helper.

---

## 7. Spec: Regulasi (Tool 6, BELUM dibangun)
Halaman kompilasi regulasi untuk penjelasan ke customer. Teks statis, pola sama
dengan snippet. **TODO:** kompilasi isi + pengelompokan.

---

## 8. Keputusan & Alasannya (jangan diulang dari nol)

| Keputusan | Alasan |
|---|---|
| Repo terpisah dari monorepo Replit | Monorepo Replit untuk dev mereka, bukan deploy. Extract app = zero ambiguity. |
| GitHub-only, Replit ditinggal | Satu sumber kebenaran, hindari desync. Logika baru ditulis langsung. |
| Tanpa admin/DB/auth | 1 editor, frekuensi rendah, dari laptop. Struktur data rapi cukup. |
| Tanpa localStorage | Nama customer tak boleh nyangkut antar sesi. Field kosong = fitur. |
| Tool 2+3 digabung jadi Jira Helper | Dipakai di momen kerja sama (update ticket). |
| Pill bahasa Quote Parser dibuang | Tak berfungsi (label campur bahasa). Tombol mati = jebakan maintenance. |
| Selling rate TIDAK di app | Data sensitif + app publik. Gate client-side = tirai, bukan kunci. |
| Currency: fawazahmed0 API | Gratis, no-key, CORS-ok, 200+ mata uang (eksotik masuk), fail-loud kalau mati. |
| Currency untuk estimasi internal | Disclaimer "bukan kurs BC" — cegah salah pakai untuk nilai pabean. |
| Drive folder: link buka, bukan tombol copy | Ctrl+C Drive tak bisa ditiru web. |
| Pangkas daftar mata uang (bukan custom dropdown) | Native select tak bisa di-style; pangkas lebih murah. |
| Judul tabel Jira bold via `<strong>` | Markdown ** konflik dgn rich-text tabel; HTML strong konsisten. |

---

## 9. CIPL vs SKP Comparator — status & desain

**Keputusan:** dibangun sebagai **jasa analisis Claude** (paste 2 dokumen → laporan
MD), BUKAN/atau tool mandiri. Sempat ada sesi yang membangun versi tool.

**Kalau versi TOOL: v1 = BAGIAN ANGKA saja.** Alasan: deskripsi item CIPL punya 4+
gaya format liar (customer bebas) + kurung bersarang ambigu → parsing item RAPUH,
DITUNDA. v1 fokus angka andal:
- SKP = SUMBER KEBENARAN (dokumen resmi). Total Item CIPL sering salah di tahap awal.
- Parse SKP penuh (format konsisten: "Nomor Box N" + baris item), jumlahkan.
- Baca kolom Total Item CIPL + Consignment Total.
- Bandingkan AGREGAT: total item SKP vs CIPL → tangkap "box hilang / salah hitung".
- Box TIDAK sejajar & item scatter → box bukan sumbu andalan, fokus agregat.
- TIDAK ada: auto-match nama (semantik+lintas bahasa), OCR, GPT-rewrite, hapus box.

**Kasus uji (ground truth):** CIPL 5 box (Total 297) vs SKP 7 box. SKP box 1&2
(225 item) TIDAK ada di CIPL (297 = jumlah SKP box 3-7). Tool/analisis HARUS
menangkap ini.

**Blocker sebenarnya (kenapa di-skip):** belum ada strategi menangani format CIPL
liar tanpa mengumpulkan contoh tak beraturan. v1-angka bisa maju tanpa itu.

**Kalau ANALISIS Claude:** cocokkan makna bukan string (Degree certificate=document
maps; Congklak+Coaster=handmade products), box tak perlu sejajar, waspada kurung
2-makna, verifikasi via jumlah Total Item.

---

## 10. Jejak Masalah Deploy (extract monorepo → Vercel) — SUDAH SELESAI

Lima kategori error, semua sisa monorepo. Kalau extract app Replit lagi, cek semua:
1. `catalog:` di package.json → ganti versi konkret dari pnpm-workspace.yaml
2. `"workspace:*"` → buang (package monorepo yang tak ikut)
3. tsconfig `extends ../../` + `references` → buang, bikin mandiri
4. vite.config wajib env PORT/BASE_PATH → buang blok server/preview, base:'/', buang plugin @replit
5. `outDir: 'dist/public'` → `dist` (kalau tidak: build sukses tapi situs blank)
6. `vercel.json` SPA rewrite (untuk 404 route langsung — ditambah belakangan)

Vercel: biarkan default (Root `./`, auto Vite). Jangan set install ke pnpm.
Git: jangan sertakan `.git` Replit; `.gitignore` sebelum `git add`; verifikasi
lokasi (`dir`) sebelum `git init`; repo GitHub baru harus benar-benar kosong.

---

## 11. Prinsip Kerja (layak dipegang)

- Bangun karena masalah nyata yang cukup sering, bukan buat isi portfolio. Tool tak
  dipakai = gagal, sebagus apa pun. Sebelum bangun: "apakah ini lebih cepat dari
  yang tim sudah lakukan?" Kalau tidak → jangan bangun.
- Raih nilai tinggi yang andal & murah dulu; tunda yang rapuh sampai terbukti perlu
  DAN punya bahan untuk membangunnya benar.
- Value utama bukan tool-building (makin komoditas) — tapi tahu masalah mana yang
  layak dipecahkan, karena paham regulasi & operasi.
- Garis sehat pakai AI: paham cukup untuk mendiagnosis & mengarahkan, bukan sekadar
  menerima output. Kalau nambah 1 snippet butuh AI, struktur datanya gagal desain.
- Kasih file yang berdekatan, bukan cuma yang mau diubah (terbukti berkali-kali).
- Data sensitif: sebelum taruh di app, tanya "kalau dilihat orang luar, rugi?"
  Kalau ya → link ke sumber terkunci, jangan di app.
- Sisa project mayoritas BUKAN koding — tapi keputusan & bahan yang cuma kamu punya
  (sumber regulasi, format CIPL, isi regulasi). Menutup bahan = langkah paling berguna.
