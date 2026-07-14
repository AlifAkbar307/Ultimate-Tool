/**
 * ============================================================
 * data.ts — Single Source of Truth
 * ============================================================
 * All content that changes over time lives here.
 * UI components only READ from this file.
 *
 * To add, remove, or reorder tools:
 *   - Edit the `navItems` array below.
 *   - The FIRST item is always the default landing page (index route).
 *   - The first item's path must be "/".
 *   - All other items must have a unique path starting with "/".
 *
 * To rename the app or change the tagline:
 *   - Edit the `appConfig` object at the bottom.
 * ============================================================
 */

export type ToolItem = {
  id: string;
  label: string;
  path: string;
  /**
   * Short "coming soon" description shown on the tool's placeholder page.
   * Use backtick template literals so multi-line text with quotes/colons
   * won't cause syntax errors.
   */
  description: string;
};

/**
 * Navigation Items
 *
 * Order here determines the order in the top navigation bar.
 * The FIRST item is the default page when the app loads (path must be "/").
 *
 * Properties:
 *   id          — unique identifier (kebab-case, no spaces)
 *   label       — text shown in the nav bar and as the page heading
 *   path        — URL path (first item = "/", others start with "/")
 *   description — one-sentence summary shown under the heading on the placeholder page
 */
export const navItems: ToolItem[] = [
  {
    id: "jira-helper",
    label: "Jira Helper",
    path: "/",
    description: `Quickly generate Jira tickets from templates, track current sprint status, and automate routine updates.`,
  },
  {
    id: "quote-parser",
    label: "Quote Parser",
    path: "/quote-parser",
    description: `Upload and parse vendor quotes automatically. Extracts line items, pricing, and terms into structured data.`,
  },
  {
    id: "eligibility-checker",
    label: "Eligibility Checker",
    path: "/eligibility-checker",
    description: `Verify project and client eligibility instantly against the latest internal compliance and finance criteria.`,
  },
  {
    id: "cipl-vs-skp",
    label: "CIPL vs SKP",
    path: "/cipl-vs-skp",
    description: `Compare CIPL and SKP documents side-by-side to identify discrepancies, missing fields, or misaligned totals.`,
  },
  {
    id: "contoh-dokumen",
    label: "Contoh Dokumen",
    path: "/contoh-dokumen",
    description: `A curated repository of best-practice document examples, contract templates, and standard operating procedures.`,
  },
  {
    id: "regulasi",
    label: "Regulasi",
    path: "/regulasi",
    description: `Searchable database of current regulations, policy updates, and operational guidelines affecting our workflows.`,
  },
];

/**
 * App Configuration
 *
 * General settings for the hub. Change these to rebrand the app.
 */
export const appConfig = {
  appName: "Workspace",
  tagline: "Internal Tools Hub",
};

// ============================================================================
// JIRA HELPER — checklist tables + comment snippets
// ============================================================================
//
// PANDUAN MAINTAIN (baca ini dulu):
//
// Bagian ini adalah SATU-SATUNYA tempat konten Jira Helper disimpan.
// Komponen UI (JiraHelper.tsx) hanya MEMBACA dari sini — jangan taruh teks
// langsung di UI.
//
// Kalau mau menambah/mengubah:
//   - Tambah baris tabel      -> tambahkan objek ke `rows` di tabel terkait
//   - Tambah snippet baru      -> copy satu objek snippet yang ada, ganti isinya
//   - Tambah grup snippet baru -> copy satu objek grup, ganti `name` dan `snippets`
//   - Ganti nama checker default -> ubah CHECKER_DEFAULT di bawah
//
// Placeholder di snippet ditulis dengan kurung kurawal, contoh {kode}, {negara}.
// Itu HANYA penanda teks — user mengisinya manual setelah paste ke Jira.
// ============================================================================

// ----------------------------------------------------------------------------
// BAGIAN 1 — TABEL CHECKLIST
// ----------------------------------------------------------------------------
//
// CARA TOMBOL SALIN HARUS MERAKIT TEKS (penting untuk UI):
// Jira otomatis membuat tabel kalau teks di-paste dengan tiap sel di baris sendiri.
// Jadi tombol salin harus menghasilkan teks dengan urutan baris PERSIS seperti ini,
// digabung dengan newline ("\n"):
//
//   {jiraTitle}
//   No
//   Items
//   Complete
//   Remarks
//   Checker
//   {row.no}
//   {row.item}
//   {row.complete}
//   {row.remarks}
//   {checkerName}        <- nilai dari field checker global (default CHECKER_DEFAULT)
//   ... (lima baris di atas diulang untuk tiap row) ...
//
// Kolom Complete & Remarks tersalin apa adanya (pre-filled, tidak diedit di UI).
// Hanya kolom Checker yang diganti oleh field global sebelum disalin.
// ----------------------------------------------------------------------------

export interface ChecklistRow {
  no: number;
  item: string;
  complete: string;
  remarks: string;
}

export interface ChecklistTable {
  id: string; // dipakai internal (key, dsb)
  title: string; // nama yang tampil di UI (mis. tombol/tab)
  jiraTitle: string; // baris judul yang ikut disalin ke Jira
  rows: ChecklistRow[];
}

// Nama checker default. Bisa diubah user lewat field global sebelum menyalin.
export const CHECKER_DEFAULT = "ILHAM";

export const CHECKLIST_TABLES: ChecklistTable[] = [
  {
    id: "pindahan",
    title: "Barang Pindahan",
    jiraTitle: "DOCS UPDATE (BARANG PINDAHAN)",
    rows: [
      { no: 1, item: "[Doc Review] Passport", complete: "YES", remarks: "CLEAR" },
      { no: 2, item: "[Doc Review] E-NPWP / KTP", complete: "YES", remarks: "KTP" },
      { no: 3, item: "[Doc Review] CI/PL - Correct Sender & Receiver Details", complete: "YES", remarks: "CLEAR" },
      { no: 4, item: "[Doc Review] CI/PL - Correct Purpose of Shipment", complete: "YES", remarks: "CLEAR" },
      { no: 5, item: "[Doc Review] CI/PL - Correct Contents / Item Desc (No DG / Hazard / New Items)", complete: "YES", remarks: "CLEAR" },
      { no: 6, item: "[Doc Review] CI/PL - Correct Total Items", complete: "YES", remarks: "CLEAR" },
      { no: 7, item: "[Doc Review] CI/PL - Correct Total Value & Currency", complete: "YES", remarks: "CLEAR" },
      { no: 8, item: "[Doc Review] SKP - 1 Yr Abroad & Matched Contents with CI/PL", complete: "YES", remarks: "MATCHED" },
      { no: 9, item: "[Decision Check] Does This Shipment Require a Statement Letter?", complete: "NO", remarks: "EVERYTHING MATCHED" },
      { no: 10, item: "[Doc Review] Supporting Document 1 - Proof of Acceptance / Employment", complete: "YES", remarks: "LOA" },
      { no: 11, item: "[Doc Review] Supporting Document 2 - Proof of Completion / Contract End", complete: "YES", remarks: "IJAZAH" },
      { no: 12, item: "[Doc Review] Flight Ticket - Max 3 Months before/after Arrival in Indonesia", complete: "YES", remarks: "01 - 02 JAN 2026" },
      { no: 13, item: "[Decision Check] Does This Shipment Require a SP3BP?", complete: "NO", remarks: "H-6" },
      { no: 14, item: "[Conditional Document] ECD, Arrival Stamp, and Boarding Pass?", complete: "NO", remarks: "Cust Belum Sampai" },
      { no: 15, item: "[Table Review] Pickup Readiness", complete: "YES", remarks: "H-6 Flight" },
      { no: 16, item: "[Parcel Review] Box Packaging Eligible", complete: "YES", remarks: "CLEAR" },
    ],
  },

  {
    id: "penumpang",
    title: "Barang Penumpang",
    jiraTitle: "DOCS UPDATE (BARANG PENUMPANG)",
    rows: [
      { no: 1, item: "[Doc Review] Passport", complete: "YES", remarks: "CLEAR" },
      { no: 2, item: "[Doc Review] E-NPWP / KTP", complete: "YES", remarks: "KTP" },
      { no: 3, item: "[Doc Review] CI/PL - Correct Sender & Receiver Details", complete: "YES", remarks: "CLEAR" },
      { no: 4, item: "[Doc Review] CI/PL - Correct Purpose of Shipment", complete: "YES", remarks: "CLEAR" },
      { no: 5, item: "[Doc Review] CI/PL - Correct Contents / Item Desc (No DG / Hazard / New Items)", complete: "YES", remarks: "CLEAR" },
      { no: 6, item: "[Doc Review] CI/PL - Correct Total Items", complete: "YES", remarks: "CLEAR" },
      { no: 7, item: "[Doc Review] CI/PL - Correct Total Value & Currency (<500 USD)", complete: "YES", remarks: "CLEAR" },
      { no: 8, item: "[Doc Review] Flight Ticket - Max 30 Days before and 15 Days after Arrival in Indonesia", complete: "YES", remarks: "01 - 02 JAN 2026" },
      { no: 9, item: "[Decision Check] Does This Shipment Require a SP3BP?", complete: "NO", remarks: "H-6" },
      { no: 10, item: "[Conditional Document] ECD, Arrival Stamp, and Boarding Pass?", complete: "NO", remarks: "Cust Belum Sampai" },
      { no: 11, item: "[Table Review] Pickup Readiness", complete: "YES", remarks: "H-6 Flight" },
    ],
  },

  {
    id: "kiriman",
    title: "Barang Kiriman",
    jiraTitle: "DOCS UPDATE (BARANG KIRIMAN)",
    rows: [
      { no: 1, item: "[Doc Review] E-NPWP / KTP Receiver", complete: "YES", remarks: "KTP" },
      { no: 2, item: "[Doc Review] CI/PL - Correct Sender & Receiver Details", complete: "YES", remarks: "CLEAR" },
      { no: 3, item: "[Doc Review] CI/PL - Correct Purpose of Shipment", complete: "YES", remarks: "CLEAR" },
      { no: 4, item: "[Doc Review] CI/PL - Correct Contents / Item Desc (No DG / Hazard / New Items)", complete: "YES", remarks: "CLEAR" },
      { no: 5, item: "[Doc Review] CI/PL - Correct Total Items", complete: "YES", remarks: "CLEAR" },
      { no: 6, item: "[Doc Review] CI/PL - Correct Total Value & Currency", complete: "YES", remarks: "CLEAR" },
      { no: 7, item: "[Decision Check] Does This Shipment Require a PIBK or CN?", complete: "YES", remarks: "<1500 USD (CN), >1500 USD (PIBK)" },
      { no: 8, item: "[Doc Review] Goods Invoice and Product Purchase Link", complete: "YES", remarks: "MATCHED" },
    ],
  },
];

// ----------------------------------------------------------------------------
// BAGIAN 2 — SNIPPET KOMENTAR
// ----------------------------------------------------------------------------
//
// Snippet dikelompokkan (group) supaya mudah dicari.
// Search di UI harus mencari di JUDUL dan ISI (body) snippet.
// Tombol salin menyalin `body` apa adanya (termasuk placeholder {..} yang
// nanti diisi user manual di Jira).
//
// Body memakai template literal (backtick) supaya aman untuk teks multi-baris,
// tanda kutip, dan karakter bullet (○).
// ----------------------------------------------------------------------------

export interface Snippet {
  id: string;
  title: string;
  body: string;
}

export interface SnippetGroup {
  id: string;
  name: string;
  snippets: Snippet[];
}

export const SNIPPET_GROUPS: SnippetGroup[] = [
  {
    id: "sp3bp",
    name: "SP3BP & Pengiriman Lebih Awal",
    snippets: [
      {
        id: "sp3bp-alasan",
        title: "Minta alasan SP3BP (barang tiba lebih dulu)",
        body: `Mohon dibantu provide alasan SP3BP karena melihat estimasi dari FedEx barang tiba lebih dulu dibanding kedatangan customer di Indonesia dan pickup h-{X} sebelum flight. Mohon disampaikan secara detail kegiatan customer beserta tanggalnya mulai dari tanggal pickup sampai tanggal flight customer. Mohon dijelaskan pada customer fungsi surat ini adalah sebagai pengganti boarding pass yang menjadi syarat pengiriman skema barang pindahan / penumpang.`,
      },
      {
        id: "sp3bp-opsi-early",
        title: "Opsi untuk pengiriman lebih awal (tanpa alasan kuat)",
        body: `Berhubung customer tidak memiliki alasan yang kuat untuk mengirimkan lebih early mohon ditanyakan ke customer terkait opsi berikut:
○ Barang dapat dikirimkan lebih awal namun konsekuensinya barangnya stuck di warehouse FedEx hingga customer sampai ke Indonesia karena BC require dokumen Boarding pass / ECD. Yang mana biaya warehouse FedEx itu IDR 2000/kg/hari.
○ Memundurkan tanggal pickup h-6 sebelum tanggal customer sampai di Indonesia
○ Memprovide alasan yang lebih kuat terkait pengiriman yang lebih awal sehingga tidak bisa melampirkan boarding pass secara langsung`,
      },
      {
        id: "reminder-ecd",
        title: "Reminder lampirkan ECD, boarding pass, arrival stamp saat tiba",
        body: `Mohon diingatkan kembali ke customer saat mau tiba ke Indonesia untuk melampirkan ECD, boarding pass, dan arrival stamp (jika ada).`,
      },
    ],
  },

  {
    id: "statement-letter",
    name: "Statement Letter & Value 0",
    snippets: [
      {
        id: "value-0-statement",
        title: "Barang value 0 di SKP butuh statement letter",
        body: `Mohon infokan ke customer dikarenakan terdapat beberapa barang dengan value 0 pada SKP, maka akan dibutuhkan Statement letter pada saat tahap clearance nantinya (dibuatkan oleh tim clearance kita). Lalu mohon ditambahkan pada deskripsi tiket ini MEMBUTUHKAN STATEMENT LETTER: BEBERAPA BARANG VALUE 0`,
      },
      {
        id: "statement-alasan-studi",
        title: "Arahkan buat statement letter (alasan backforgood & studi)",
        body: `Mohon diarahkan ke customer untuk membuat statement letter dan mencantumkan alasan dalam letter tersebut : menjelaskan alasan backforgood ke Indonesia, lalu apakah customer bakal kembali lagi ke {negara}, menjelaskan kenapa studinya belum selesai dan apakah studi bisa diselesaikan secara remote di Indonesia.`,
      },
    ],
  },

  {
    id: "dokumen-studi",
    name: "Dokumen Studi / BackForGood",
    snippets: [
      {
        id: "bukti-selesai-studi",
        title: "Minta bukti selesai studi (SKL/Ijazah/dll)",
        body: `Mohon lampirkan dokumen yang menunjukkan bukti bahwa customer sudah selesai studi dan akan BackForGood ke Indonesia. Contoh dokumen tersebut antara lain: SKL, Ijazah, Completion Letter, Transcript, Report of Academic, etc. Mohon dihimbau jika dokumennya masih belum cukup pada saat tahap clearance, tim clearance kita akan minta dokumen pendukung lain jika dibutuhkan`,
      },
      {
        id: "gap-kegiatan",
        title: "Tanya kegiatan saat ada gap tanggal",
        body: `Berhubung terdapat gap antara tanggal selesainya {studi/kontrak} customer hingga keberangkatan customer ke Indonesia, mohon ditanyakan kegiatan customer selama jangka waktu tersebut, dan jika ada mohon lampirkan dokumen yang mendukung kegiatan tersebut. Contoh kegiatan: Magang, mencari kerja, hanya liburan, dll.`,
      },
      {
        id: "kembali-keluarga",
        title: "Barang pindahan - tanya kembali bersama keluarga",
        body: `Untuk barang pindahan, Mohon ditanyakan kepada customer apakah yang bersangkutan kembali ke indonesia bersama keluarga atau tidak? Jika iya mohon disebutkan yang bersangkutan kembali bersama siapa saja (misal : suami, istri, dan anak). Mohon dilampirkan paspor keluarga yang juga ikut kembali bersama dengan yang bersangkutan.`,
      },
      {
        id: "kronologi-wajib",
        title: "Dokumen kronologi wajib (risiko tertahan BC)",
        body: `Karena dokumen - dokumen yang diperlukan tersebut adalah sebagai kronologi kegiatan selama di luar negeri hingga backforgood menuju Indonesia. Apabila customer menolak untuk melampirkan maka barang akan dapat tertahan di Bea cukai, karena dokumen tersebut diperlukan sebagai syarat proses skema barang pindahan/penumpang yang diterapkan oleh Bea Cukai.`,
      },
      {
        id: "kronologi-catatan-internal",
        title: "Catatan kronologi (jika customer menolak lampirkan)",
        body: `Terus ya sebenernya harus dilampirin aja sebagai bukti kronologi gitu. Tapi klo dari customer nolak ngelampirin, terus dari BC ngerequire itu, customer harus bisa ngeprovide dokumen tersebut.`,
      },
    ],
  },

  {
    id: "dokumen-negara",
    name: "Dokumen Spesifik per Negara",
    snippets: [
      {
        id: "spanyol-nie",
        title: "Spanyol - minta NIE",
        body: `Berhubung customer melakukan pengiriman dari spanyol, untuk keperluan clearance mohon dimintakan NIE milik customer.`,
      },
      {
        id: "us-personal-effects",
        title: "US - revalue di bawah 2500 USD (personal effects)",
        body: `Mohon untuk merevalue invoice total pada CIPL dibawah 2500 USD ya. Karena pengiriman personal effects dari US memiliki batas value 2500 USD.`,
      },
      {
        id: "jerman-mrn",
        title: "Jerman - dokumen MRN di atas 1000 EUR",
        body: `Mohon dihimbau kepada customer bahwa pengiriman dari Jerman memerlukan dokumen MRN apabila total value diatas 1000 EUR, akan ada biaya tambahan yang dikenakan dan pickup paling cepat dilakukan 3 hari setelah approval quotes dan seluruh dokumen sudah clear. Jika customer tidak berkenan untuk dikenakan MRN, maka mohon dibantu untuk mengarahkan customer untuk merevalue dibawah 1000 EUR.`,
      },
    ],
  },

  {
    id: "pickup-dropoff",
    name: "Pickup & Drop Off",
    snippets: [
      {
        id: "pic-standby",
        title: "Tanya PIC standby berapa hari",
        body: `Untuk PIC bisa standby berapa hari?, karena selalu ada resiko gagal pickup.`,
      },
      {
        id: "pickup-1-hari",
        title: "Pickup hanya 1 hari - minta PIC lain / drop off",
        body: `Guys berhubung pickup customer hanya available untuk 1 hari, mohon ditanyakan PIC lain yang dapat ngejaga paketnya untuk proses pickup. Jika tidak ada, apakah customer berkenan untuk drop off? Karena akan selalu ada resiko gagal pickup`,
      },
      {
        id: "dropoff-lewat-jam",
        title: "Drop off jika lewat jam pickup",
        body: `Mohon dihimbau kepada customer untuk drop off barang apabila sudah melewati jam pick up ({jam} waktu {negara}). Berikut alamat dropoff terdekat:
{alamat}`,
      },
    ],
  },

  {
    id: "barang-spesifik",
    name: "Barang Spesifik / DG / Deskripsi",
    snippets: [
      {
        id: "cek-baterai-liquid",
        title: "Cek kandungan baterai / liquid",
        body: `Apakah barang berikut mengandung baterai / liquid:
○ {nama barang}`,
      },
      {
        id: "espresso-return",
        title: "Espresso machine - risiko return",
        body: `Barang "espresso machine" akhir - akhir ini rawan untuk direturn pada pengiriman karena dianggap mengandung electrolyte liquid (terdapat sedikit cairan/bubuk). Mohon dihimbau kepada customer apabila ada resiko bahwa barang direturn pada alamat awal, customer dapat menyiapkan PIC agar barang tersebut dapat dikirim kembali ke alamat tujuan. Namun, baiknya customer dapat mengtakeout barang "espresso machine" jika tidak ingin resiko return tersebut.`,
      },
      {
        id: "deskripsi-barang-spesifik",
        title: "Minta deskripsi barang lebih spesifik",
        body: `Mohon untuk menyebutkan barang secara spesifik pada barang "{deskripsi barang}" di box {nomor}. Contoh : 2 pcs pants, 2 pcs jeans. Jika jenis barangnya sama maka penyebutan dengan 4 pcs pants saja dan tidak perlu menggunakan garis miring ya.`,
      },
      {
        id: "barang-baru-pajak",
        title: "Himbau barang baru berpotensi pajak",
        body: `Mohon dihimbau ke customer bahwa barang baru dapat berpotensi terkena pajak`,
      },
    ],
  },

  {
    id: "lain-lain",
    name: "CIPL / Alamat / Lain-lain",
    snippets: [
      {
        id: "kode-alamat",
        title: "Tanya arti kode pada alamat pengirim",
        body: `Pada alamat pengirim tertera "{kode}", mohon ditanyakan ke customer maksud angka tersebut apa?`,
      },
      {
        id: "kode-koper",
        title: "Minta kode koper customer",
        body: `Mohon dimintakan kode koper milik customer.`,
      },
    ],
  },
];
