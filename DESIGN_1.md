# Internal Tools Hub — Design & Context

Dokumen konteks untuk project tool hub rimkirim.
Dipakai untuk: (a) rujukan sendiri saat maintain, (b) di-attach ke AI di sesi baru
supaya konteks keputusan tidak hilang.

**Cara pakai:** attach file ini di awal chat baru. Konteks keputusan & aturan akan
kembali. Kode aktual TIDAK ada di sini — file kode tetap perlu ditempel terpisah
saat mau diubah.

Terakhir diperbarui: 16 Juli 2026

---

## 1. Ringkasan Project

Web app internal berisi kumpulan tools untuk memudahkan kerja tim
(freight forwarding / customs clearance). Bukan produk publik, bukan portfolio —
alat kerja harian.

- **Live:** https://ultimate-tool-six.vercel.app/
- **Repo:** github.com/AlifAkbar307/Ultimate-Tool
- **Stack:** React + Vite + TypeScript + Tailwind + Framer Motion + React Router
- **Font:** Prompt (Google Fonts)
- **Deploy:** GitHub → Vercel (auto-redeploy tiap push)

---

## 2. Prinsip Arsitektur (jangan dilanggar)

1. **Client-side murni.** Tidak ada backend, database, auth, atau penyimpanan data.
   Semua logika jalan di browser.
2. **Data terpisah dari logika.** Semua konten yang berubah (snippet, tabel, label
   parser, aturan tanggal, navItems) hidup di `src/content/data.ts`. Komponen UI
   hanya MEMBACA. Tidak pernah hardcode konten di komponen.
   → Konsekuensi: nambah snippet = copy satu blok di data.ts, ganti teks. Tanpa AI.
3. **Fail-loud, bukan fail-silent.** Tool yang outputnya masuk ke quote/customer
   harus BERHENTI dan memberi peringatan saat ketemu input tak dikenal — bukan
   melewatinya diam-diam.
4. **Tidak pakai admin UI / DB.** Alasan: yang edit cuma satu orang, frekuensi
   rendah, dan edit via GitHub + auto-redeploy sudah cukup. Admin UI + auth = over-
   engineering untuk kasus ini.

---

## 3. Design System

| Elemen | Nilai |
|---|---|
| Background halaman | `#f2f2f2` (abu lembut, statis — tanpa partikel/animasi) |
| Kartu konten | putih, `rounded-2xl`, shadow, max-width **1280px**, terpusat |
| Teks / permukaan gelap | `#1e1e1e` |
| Aksen (neon lime) | `#c1ff00` — **HANYA** untuk tombol, nav aktif, flash "tersalin" |
| Status Eligible | `#16a34a` (hijau) |
| Status Not Eligible | `#dc2626` (merah) |
| Text selection | background `#c1ff00`, teks dipaksa `#1e1e1e` |

**Aturan keras:** `#c1ff00` tidak pernah dipakai sebagai warna teks di atas putih
(kontras buruk) dan tidak pernah untuk status eligible/not-eligible.

**Layout:** header (judul + subtitle) sejajar nav di breakpoint `xl` (1280px).
Di bawah itu nav turun ke baris sendiri — disengaja, karena label nav pakai
`whitespace-nowrap` dan akan meluber kalau dipaksa sejajar di ruang sempit.

**Nav:** satu pill container horizontal, inner shadow (recessed), item aktif =
pill `#c1ff00` yang MELUNCUR (Framer Motion `layoutId`), item naik + fade saat
first load (stagger). Collapse ke hamburger di breakpoint `md` (768px).

**Catatan lebar:** di container 1280px, ruang efektif ≈ 1152px. Judul ≈ 130px.
Nav dengan label panjang ≈ 820px (6 item) / ≈ 980px (7 item). 7 item + label
panjang = TIDAK muat andal → label harus dipendekkan.

---

## 4. Status Tools

| # | Tool | Status | Blocker |
|---|---|---|---|
| 1 | Jira Helper (tabel + snippet) | ✅ live | verifikasi copy di Vercel |
| 2 | Quote Parser (LMR / non-LMR) | ✅ live | — |
| 3 | Eligibility Checker | ✅ live | — |
| 4 | CIPL vs SKP | ⬜ belum | butuh contoh format CIPL & SKP asli |
| 5 | CIPL Transformer | ⬜ belum | butuh spec (input/output/aturan) |
| 6 | Contoh Dokumen | ⬜ belum | butuh gambar yang sudah dianonimkan |
| 7 | Regulasi | ⬜ belum | butuh kompilasi isi regulasi |

---

## 5. Aturan Operasional (SUMBER KEBENARAN — verifikasi ke regulasi)

> ⚠️ Angka-angka di bawah adalah aturan bisnis, bukan hasil perhitungan teknis.
> Kebenarannya terhadap regulasi Bea Cukai = tanggung jawab manusia, bukan AI.
> **TODO: catat sumber regulasi persisnya (PMK/pasal) di sini.**

### 5.1 Eligibility Checker

Anchor = tanggal customer sampai di Indonesia. Anchor dihitung sebagai hari ke-1
**di sisi sesudah** (makanya 15 hari → +14).

| Skema | Batas awal | Batas akhir |
|---|---|---|
| Barang Penumpang | anchor − **30** hari | anchor + **14** hari |
| Barang Pindahan | anchor − **90** hari | anchor + **89** hari |

**Contoh tervalidasi** (dipakai sebagai tes regresi):
Sampai **1 Jan 2026** →
- Penumpang: 2 Des 2025 → **15 Jan 2026**
- Pindahan: 3 Okt 2025 → 31 Mar 2026

Input tanggal barang bersifat **opsional** — kalau kosong, garis + rentang tetap
tampil, pin tidak muncul, status netral (tanpa hijau/merah).

### 5.2 Aturan lain (dari manual book)

- Berat maksimal barang kiriman: **5 kg**
- SP3BP diperlukan jika barang tiba di Indonesia **sebelum** customer tiba
- Barang kiriman: `<1500 USD` → CN, `>1500 USD` → PIBK
- Barang penumpang: value CI/PL `<500 USD`
- Personal effects dari US: batas value **2500 USD**
- Jerman: butuh MRN jika value `>1000 EUR`
- Warehouse FedEx: **IDR 2000/kg/hari**

---

## 6. Spec: Quote Parser (SUDAH DIBANGUN)

### Input
Teks di-paste dari FedEx. **Dua pola bisa tercampur dalam satu paste:**
- Pola A — label & angka MENEMPEL satu baris: `Fuel SurchargeIDR 833,892.39`
- Pola B — label satu baris, angka di baris berikutnya

**Strategi parsing:** deteksi angka lewat penanda mata uang (`IDR` / `Rp`, boleh
diawali `-`). Label = teks tepat SEBELUM penanda itu (baris sama atau baris
sebelumnya). Jangan mengandalkan struktur baris.

### Format angka (3 pola)
- `IDR 431,000.00` — koma = ribuan, titik = desimal
- `IDR8,826,000.00` — sama, tanpa spasi
- `Rp7.734.000,00` — titik = ribuan, koma = desimal ⚠️ **jebakan 1000x**

**Algoritma aman:** buang prefix mata uang & spasi, catat minus. Di antara `.` dan
`,` yang tersisa — yang muncul **terakhir** adalah desimal, yang lain ribuan.
Ini otomatis menangani ketiga pola tanpa menebak.

### Daftar label (ada di data.ts — edit di sana kalau FedEx ganti nama)
Pencocokan: **exact full-line, case-insensitive, trimmed.** BUKAN substring
(karena "Indonesia VAT On Freight" mengandung "Freight").

| Kategori | Label |
|---|---|
| FREIGHT | `FREIGHT`, `Freight`, `Tarif dasar`, `Base rate` |
| VAT | `Indonesia VAT On Freight` |
| FSI | `BIAYA TAMBAHAN BAHAN BAKAR`, `Fuel Surcharge` |
| VOLUME DISCOUNT (non-LMR) | `Volume discount` |
| SKIP (abaikan total) | `Total excl. TAX`, `Total tidak termasuk PAJAK` |
| TOTAL (checksum saja) | `TOTAL SUDAH TERMASUK PAJAK`, `TOTAL TAX INCLUDED`, `Estimasi Total`, `Estimated Total` |

### Output — selalu 4 baris, urutan tetap
1. **Freight** — LMR: apa adanya. **non-LMR:** `Freight − |Volume discount|`
   (pakai nilai absolut! angka input sudah bertanda minus → kalau langsung
   dikurangkan, hasilnya malah bertambah)
2. **VAT**
3. **FSI**
4. **Additional** — jumlah SEMUA baris lain yang tidak masuk kategori di atas.
   Kalau tidak ada → `0.00`

Format: angka polos, titik desimal, **tanpa pemisah ribuan**, 2 desimal.
(Contoh: `4387624.79`) — supaya aman masuk sel spreadsheet.

### Aturan defensif
- **Fail-loud:** kalau FREIGHT / VAT / FSI tidak ketemu → peringatan merah,
  JANGAN output. Ketiganya wajib ada.
  ⚠️ Ini krusial: tanpa ini, Freight yang tak terkenali diam-diam masuk baris
  Additional, checksum tetap LOLOS (semua angka terjumlah), tapi output salah tempat.
- **Checksum:** jumlah 4 baris vs total tertera. Selisih **> 2 rupiah** → peringatan
  merah. ≤ 2 = toleransi pembulatan, lolos diam-diam.

### UI
Pill LMR / non-LMR (default **LMR**). Layout 3 kolom: input kiri | tombol
"Convert" tengah | output kanan (tanpa scroll).

**Pill bahasa DIBUANG** — alasan: paste FedEx mencampur bahasa (label Indonesia
tapi VAT selalu `Indonesia VAT On Freight` bahasa Inggris). Parser cocokkan SEMUA
label kedua bahasa sekaligus; format angka dideteksi otomatis. Pill bahasa jadi
tombol kosong yang menyesatkan.

### Contoh tervalidasi (tes regresi)
**LMR-EN:**
```
Additional handling surcharge - dimension / IDR 431,000.00
Additional handling surcharge - weight / IDR 431,000.00
Fuel Surcharge / IDR 2,177,046.48
Out of Pickup Area Tier C / IDR 442,000.00
FREIGHT / IDR 4,387,624.79
Total excl. TAX / IDR 7,868,671.27
Indonesia VAT On Freight / IDR 86,555.00
TOTAL TAX INCLUDED / IDR 7,955,226.27
```
→ Output: `4387624.79` / `86555.00` / `2177046.48` / `1304000.00`

**non-LMR-ID:**
```
Tarif dasar / Rp7.734.000,00
Indonesia VAT On Freight / Rp35.990,00
BIAYA TAMBAHAN BAHAN BAKAR / Rp905.226,00
Volume discount / -Rp5.367.396,00
Estimasi Total / Rp3.307.820,00
```
→ Output: `2366604.00` / `35990.00` / `905226.00` / `0.00`

**non-LMR-EN:** Freight `8826000 − 6125244 = 2700756.00`, VAT `54347.00`,
FSI `1366962.00`, Additional `442000 + 431000 = 873000.00`, total `4995065`

---

## 7. Spec: Jira Helper (SUDAH DIBANGUN)

Dua bagian: **Tabel Checklist** + **Snippet Komentar**. Digabung karena dipakai di
momen kerja yang sama (update ticket Jira). Konten: 3 tabel + 22 snippet (7 grup),
semua di `data.ts`.

### ⚠️ Temuan penting: tabel Jira butuh `text/html` di clipboard

Asumsi awal (SALAH): paste teks cell-per-line → Jira auto-convert jadi tabel.
Kenyataan: yang bikin GDocs jadi tabel di Jira adalah **`text/html` di clipboard**,
bukan format teksnya. Diverifikasi lewat clipboard viewer — GDocs menaruh HTML
dengan `<thead>`, `<th>`, `<td>`.

**Solusi:** tulis DUA format ke clipboard sekaligus:
```javascript
await navigator.clipboard.write([
  new ClipboardItem({
    'text/html': new Blob([htmlString], { type: 'text/html' }),
    'text/plain': new Blob([plainString], { type: 'text/plain' })
  })
]);
```
HTML = `<table>` bersih (`<thead>` + `<th>`, `<tbody>` + `<td>`), tanpa inline
style. Jira mengabaikan styling dan merakit ulang pakai styling editornya sendiri.

**Konsekuensi:** `navigator.clipboard.write` butuh **HTTPS (secure context)**.
Preview Replit bisa gagal — **tes final wajib di URL Vercel**, bukan preview.

**Lebar kolom tidak bisa dikontrol** — Jira yang menentukan, sama seperti saat
paste dari GDocs. Jangan buang waktu ke sini.

### Nama Checker
Field global di atas tombol salin, default `ILHAM` (dari `CHECKER_DEFAULT` di
data.ts). Mengganti field → mengganti kolom Checker di SEMUA baris saat disalin.
Kolom Complete & Remarks pre-filled dari manual book, tidak diedit di UI.

### Snippet
Search mencocokkan **judul DAN isi** (case-insensitive). Grup dengan nol hasil
disembunyikan saat search. Placeholder ditulis `{seperti ini}` — diisi manual
setelah paste.

---

## 8. Spec: Tools yang BELUM dibangun

### 8.1 CIPL vs SKP (Tool 4)
Membandingkan dokumen CIPL dengan SKP.
**Pendekatan v1 — TIDAK pakai AI/LLM:** kalau format keduanya konsisten saat
di-copy, normalisasi item lalu diff. Cocokkan yang exact, **flag yang tidak cocok
untuk review manual** (human-in-the-loop, bukan tool yang pura-pura ngerti konteks).
LLM asli (butuh backend + API key + biaya per panggilan) hanya kalau versi
deterministik terbukti kurang.

**BLOCKER:** butuh 2–3 contoh CIPL + SKP asli (data disamarkan, struktur & label
dipertahankan persis).

**TODO isi:**
- [ ] Contoh format CIPL saat di-copy
- [ ] Contoh format SKP saat di-copy
- [ ] "Dicek terhadap apa" — aturan pembandingannya apa saja?

### 8.2 CIPL Transformer (Tool 5)
Mirip Quote Parser tapi lebih rumit: ambil beberapa data dari CIPL, output bisa
di-copy ke spreadsheet — **4 kolom**, jumlah baris tergantung data yang di-paste
(beda dari Quote Parser yang selalu 4 baris).

**TODO isi:**
- [ ] Contoh input mentah
- [ ] 4 kolom itu apa saja
- [ ] Aturan: satu baris output = satu apa di input?
- [ ] Ada checksum/validasi?
- [ ] Fail-loud kapan?

### 8.3 Contoh Dokumen (Tool 6)
Halaman gambar contoh dokumen valid.

**Pola teknis:** file gambar TIDAK bisa masuk data.ts. Taruh file di folder
`public/`, simpan **path**-nya di data.ts (mis. `"/docs/passport-contoh.png"`)
+ judul + keterangan. data.ts tetap satu sumber konten (menyimpan rujukan).

**⚠️ BLOCKER — kepatuhan, bukan teknis:** app ini publik di `.vercel.app` tanpa
auth. Gambar dokumen customer asli (passport, NPWP, invoice) TIDAK BOLEH ditaruh.
Harus dianonimkan/blur atau dibuat dummy dulu. Ini kerja manual, tidak bisa
didelegasikan.

**TODO isi:**
- [ ] Dokumen apa saja yang ditampilkan + urutannya
- [ ] Gambar dianonimkan
- [ ] Keputusan: perlu tombol salin gambar, atau cukup ditampilkan (klik-kanan
      copy sendiri)? Kalau cukup ditampilkan → halaman ini nyaris tanpa logika.

### 8.4 Regulasi (Tool 7)
Halaman kompilasi regulasi untuk penjelasan ke customer. Konten teks statis,
pola sama dengan snippet.

**TODO isi:**
- [ ] Kompilasi teks regulasinya
- [ ] Pengelompokan

---

## 9. Keputusan & Alasannya (jangan diulang dari nol)

| Keputusan | Alasan |
|---|---|
| **Repo terpisah dari monorepo Replit** | Monorepo Replit (`artifacts/`, `lib/`, `pnpm-workspace.yaml`) dirancang untuk dev environment mereka, bukan deployment. Deploy sebagian = perang melawan pnpm. Extract `artifacts/tool-hub/` jadi repo sendiri = zero ambiguity. |
| **Tanpa admin UI / DB / auth** | Yang edit cuma satu orang, frekuensi rendah, selalu dari laptop saat jam kerja. Struktur data yang rapi sudah menyelesaikan "nambah itu ribet". |
| **Tanpa Google Sheets** | Terlalu mudah — menghilangkan tujuan latihan maintaining. Config file bikin tersentuh strukturnya. |
| **Jira Helper jadi landing page** | Paling sering dipakai. |
| **Tool 2 + 3 digabung** | Dipakai di momen kerja yang sama. Penggabungan by workflow, bukan by size. |
| **Tool kecil tetap halaman sendiri** | Halaman pendek yang fokus > halaman penuh yang campur aduk. Yang bikin "kosong" terasa buruk itu layout melebar, bukan konten sedikit → pakai container terpusat. |
| **Pill bahasa dibuang** | Tidak berfungsi (lihat §6). Tombol yang tidak melakukan apa-apa = jebakan saat maintenance. |
| **Latar abu statis, tanpa partikel** | Ini alat kerja harian. Dekorasi bergerak = distraksi saat memproses quote. |
| **Header + nav di DALAM kartu putih** | Pill nav berwarna abu (`#f0f0f0`) — kalau ditaruh di latar abu, kontras hilang. |
| **Otomasi input Bea Cukai — DITUNDA** | Tidak ada API resmi → hanya browser automation → rapuh (bergantung HTML mereka tidak berubah), maintenance tinggi, di luar kendali. Plus ada dimensi kepatuhan yang belum diverifikasi (ToS/hukum). Nilai per usaha terendah. |

---

## 10. Jejak Masalah Deploy (extract monorepo → Vercel)

Empat kategori error yang muncul berurutan. Semuanya **sisa monorepo**. Kalau
suatu saat extract app Replit lagi, cek keempatnya sekaligus di depan:

1. **`catalog:` di package.json** → `EUNSUPPORTEDPROTOCOL`. Ini sintaks pnpm
   catalog yang merujuk `pnpm-workspace.yaml` (tidak ikut ter-extract).
   **Fix:** ganti tiap `catalog:` dengan versi konkret dari `pnpm-workspace.yaml`.
2. **`"workspace:*"`** (mis. `@workspace/api-client-react`) → merujuk package
   monorepo yang tidak ikut. **Fix:** buang.
3. **`"extends": "../../tsconfig.base.json"` + `references`** di tsconfig.json →
   menunjuk root monorepo. **Fix:** buang, bikin tsconfig mandiri.
4. **`vite.config.ts` mewajibkan env `PORT` & `BASE_PATH`** (throw kalau kosong) →
   selalu ada di Replit, tidak ada di Vercel. **Fix:** buang blok `server`/`preview`
   (itu untuk dev server lokal, tidak dipakai saat build production), set `base: '/'`.
   Buang juga plugin `@replit/*`.
5. **`outDir: 'dist/public'`** → Vercel preset Vite mencari di `dist`. Kalau tidak
   disamakan: build SUKSES tapi situs blank. **Fix:** `outDir: 'dist'`.

**Vercel settings:** biarkan semua default (Root Directory `./`, auto-detect Vite).
Jangan set Install Command ke `pnpm install` — pnpm tetap cari katalog yang tidak ada.

**Alur git (pelajaran dari kalender):**
- Jangan sertakan `.git` bawaan Replit (bikin remote nyasar ke Replit)
- Buat `.gitignore` SEBELUM `git add` (mencegah `node_modules`/`dist` masuk)
- Verifikasi lokasi (`dir`) sebelum `git init` — jangan init di home directory
- Repo GitHub baru harus BENAR-BENAR kosong (jangan centang README) — kalau tidak,
  riwayat bertabrakan saat push

**Alur kerja:** pilih SATU tempat edit per fase. Kalau aktif di Replit, jangan edit
di GitHub (dan sebaliknya) — download-manual tidak punya sync otomatis, risiko desync.

---

## 11. Roadmap

**Insight utama:** sisa project ini mayoritas bukan "bangun", tapi "siapkan bahan".
Tidak satu pun tool tersisa yang terblokir oleh kode — semuanya terblokir oleh input
yang belum ada. Kuota AI tak terbatas pun tidak menolong tanpa bahan.

### Blok 0 — Tutup yang menggantung (~1 jam, energi rendah)
- [ ] Deploy `Layout.tsx` versi `xl:`
- [ ] Pendekkan label nav di `data.ts` → Jira / Quote / Eligibility / CIPL-SKP /
      Dokumen / Regulasi. **Ganti HANYA `label` — jangan sentuh `path` & `id`**
      (`path` = URL, `id` = kunci ke TOOL_COMPONENTS di App.tsx; salah ubah → 404)
- [ ] **Verifikasi copy tabel Jira di domain Vercel** ← belum pernah dikonfirmasi.
      Kalau gagal di production, ini prioritas di atas semuanya.

### Blok 1 — Kumpulkan bahan (BOTTLENECK — tidak butuh AI sama sekali)
- [ ] Contoh CIPL + SKP asli (2–3 pasang, disamarkan)
- [ ] Tulis spec CIPL Transformer
- [ ] Kompilasi isi Regulasi
- [ ] Anonimkan gambar Contoh Dokumen ← paling berat, paling manual

### Blok 2 — Halaman statis (butuh Blok 1)
- [ ] Halaman Regulasi
- [ ] Halaman Contoh Dokumen

### Blok 3 — Tool CIPL (butuh Blok 1)
- [ ] CIPL vs SKP
- [ ] CIPL Transformer

### Catatan scope
Kalau minggu depan terasa berat, **buang Contoh Dokumen (Tool 6)** dari scope —
bukan karena malas, tapi karena itu satu-satunya yang biayanya tinggi (kerja manual
+ risiko data pribadi) sementara belum terbukti akan dibuka rekan kerja. Kombinasi
mahal + belum terbukti dipakai = profil yang sama dengan kalender libur FedEx
(dibangun, jarang dipakai).

CIPL jelas berulang di kerjaan → prioritaskan itu.

### Kuota Replit AI
Habis, reset **26 Juli 2026**. Bukan blocker utama — yang menghambat bahan, bukan AI.
Hal deterministik (aritmatika tanggal, struktur data, layout) tidak perlu Replit AI
sama sekali.

---

## 12. Prinsip Kerja (dari sesi sebelumnya, layak dipegang)

- **Bangun karena ada masalah nyata yang cukup sering muncul, bukan karena butuh
  isi portfolio.** Tool yang tidak dipakai = tool yang gagal, sebagus apa pun
  eksekusinya. (Pelajaran kalender libur FedEx: dibangun rapi, dipakai sebulan sekali.)
- **Catat dampak selagi masih segar** — "sebelumnya berapa lama / seberapa sering
  salah". Ini yang paling cepat hilang dan paling mahal direkonstruksi.
- **Value utamanya bukan tool-building** — itu makin jadi komoditas. Yang langka:
  tahu masalah mana yang layak dipecahkan, karena paham regulasi & operasinya.
- **Garis sehat pakai AI:** paham cukup untuk mendiagnosis, menjelaskan, dan
  mengarahkan — bukan sekadar menerima output. Kalau nambah satu snippet saja butuh
  AI, berarti struktur datanya gagal desain.
- **Kasih file yang berdekatan, bukan cuma yang mau diubah.** Layout & TopNav saling
  terkait; melihat satu tanpa yang lain = tebakan. (Terbukti dua kali di sesi ini.)
