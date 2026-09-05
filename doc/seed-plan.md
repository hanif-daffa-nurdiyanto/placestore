# Rencana Seeder PlaceStore

## Tujuan

Membuat data demo PlaceStore yang cukup banyak, konsisten, aman dijalankan ulang, dan tetap terjangkau dari sisi pembuatan serta penyimpanan gambar.

Target awal:

- Menggunakan akun yang sudah terdaftar di tabel `users`; seeder tidak membuat akun Clerk baru.
- Setiap akun memiliki 1–2 toko.
- Menggunakan kategori yang sudah ada saat seeder dijalankan.
- Setiap kategori mempunyai total 5–10 produk.
- Produk untuk satu kategori hanya dibuat pada satu toko yang sudah ditentukan agar katalog konsisten.
- Produk memiliki 1–3 jenis varian dan maksimal 1–3 kombinasi SKU.
- Produk dan SKU mempunyai gambar yang sesuai dengan nama serta variannya.
- Seeder dapat dijalankan ulang tanpa menggandakan data.
- Data hasil seed dapat dihapus tanpa menyentuh data asli pengguna.

## Snapshot data saat rencana dibuat

Snapshot deployment pengembangan pada 5 September 2026:

- 5 akun pada tabel `users`.
- 4 toko pada tabel `shops`.
- 5 produk pada tabel `products`.
- 5 kategori aktif:

| Kategori | Slug saat ini |
| --- | --- |
| Gadget | `gadget` |
| Hobby | `hobby` |
| Healthy and Care | `healthy-and-care` |
| Otomotif | `otomotif` |
| Electronics | `e` |

Seeder harus mencari kategori berdasarkan slug atau ID aktual ketika dijalankan. Seeder tidak boleh diam-diam mengganti slug `e` menjadi `electronics`, karena perubahan tersebut dapat merusak tautan yang sudah ada.

Snapshot production saat implementasi selesai memiliki 4 akun dan 6 kategori. Slug production untuk dua kategori adalah `healthy-and-beauty` dan `electronic`, serta terdapat kategori tambahan `fashion`. Manifest memakai slug production sebagai nama kanonis dan alias `healthy-and-care`/`e` untuk tetap kompatibel dengan development.

## Rekomendasi utama

Gunakan pendekatan **manifest deterministik + batch Convex + asset registry**.

1. Data toko, produk, varian, SKU, harga, stok, dan referensi gambar didefinisikan dalam manifest TypeScript.
2. Akun dipilih dari pengguna yang sudah ada memakai allowlist `externalId`, bukan dengan membuat akun baru.
3. Setiap kategori dipetakan secara eksplisit ke satu toko pemilik katalog.
4. Gambar disiapkan dan dioptimalkan sekali, kemudian diunggah ke Convex Storage satu kali saja.
5. Seeder menyimpan penanda untuk setiap record agar proses dapat dilanjutkan, diperbaiki, atau dibersihkan tanpa duplikasi.
6. Penulisan data dilakukan per batch kecil agar tidak melewati batas transaksi Convex.

Pendekatan ini lebih terjangkau daripada membuat gambar baru setiap kali seed dijalankan, lebih stabil daripada hotlink gambar pihak ketiga, dan lebih aman daripada mutation besar yang mencoba membuat seluruh katalog sekaligus.

## Skala data yang disarankan

Gunakan target default 7 produk per kategori. Pada production dengan 6 kategori, hasil akhirnya adalah 42 produk. Nilai ini cukup untuk menguji homepage, explore, halaman toko, filter, cart, dan pagination tanpa membuat proses awal terlalu berat.

Target dapat dikonfigurasi:

```ts
const seedConfig = {
  namespace: "demo-v1",
  productsPerCategory: 7,
  shopsPerUser: 1,
  minSkuCombinations: 1,
  maxSkuCombinations: 3,
  outOfStockRatio: 0.1,
  randomSeed: 240905,
};
```

`productsPerCategory` berarti jumlah total yang diinginkan setelah seed, bukan selalu jumlah produk baru. Sebelum menulis data, dry-run perlu menghitung kekurangan setiap kategori.

Contoh:

- Gadget sudah memiliki 2 produk dan targetnya 7: buat 5 produk seed.
- Hobby belum memiliki produk dan targetnya 7: buat 7 produk seed.
- Produk asli tidak dihapus atau dipindahkan otomatis.

## Pembagian akun, toko, dan kategori

### Aturan pemilihan akun

- Gunakan hanya akun yang `externalId`-nya berada dalam allowlist.
- Simpan allowlist pada environment variable atau file lokal yang diabaikan Git.
- Jangan menyimpan email, token Clerk, atau data pribadi pengguna dalam manifest repository.
- Validasi semua akun target sebelum seed dimulai. Jika satu akun tidak ditemukan, hentikan proses sebelum ada data yang ditulis.
- Seeder tidak boleh mengubah plan atau profil akun.

Contoh konfigurasi lokal:

```env
SEED_USER_EXTERNAL_IDS=user_xxx,user_yyy,user_zzz
SEED_NAMESPACE=demo-v1
SEED_MODE=dry-run
```

### Pemetaan toko yang direkomendasikan

Dengan 5 akun dan 5 kategori, mulai dengan satu toko berkatalog per akun:

| Slot akun | Nama toko contoh | Kategori utama | Target produk |
| --- | --- | --- | ---: |
| Akun A | PlaceTech | Gadget | 7 |
| Akun B | Hobby Corner | Hobby | 7 |
| Akun C | Care Daily | Healthy and Care | 7 |
| Akun D | Auto Place | Otomotif | 7 |
| Akun E | Home Electronics | Electronics | 7 |

Nama di atas adalah placeholder dan dapat diubah di manifest.

Satu toko boleh memiliki beberapa kategori jika jumlah akun yang dipilih lebih sedikit daripada jumlah kategori. Namun, satu kategori tetap hanya boleh menunjuk ke satu toko dalam `categoryOwnership`.

```ts
const categoryOwnership = {
  gadget: "place-tech",
  hobby: "hobby-corner",
  "healthy-and-care": "care-daily",
  otomotif: "auto-place",
  e: "home-electronics",
};
```

Permintaan 1–2 toko per akun perlu diterapkan secara bertahap. Dengan lima kategori eksklusif, lima toko kedua tidak mempunyai kategori produk. Rekomendasi:

- Fase pertama: satu toko per akun.
- Fase kedua: buat toko kedua hanya untuk akun yang memang perlu menguji multi-store.
- Toko kedua boleh menjadi toko kosong untuk pengujian dashboard, atau baru diisi setelah kategori tambahan disepakati.
- Jangan menduplikasi kategori yang sama ke toko kedua karena bertentangan dengan aturan konsistensi kategori.

Jika toko yang sesuai sudah ada, manifest dapat memilih antara `reuse` atau `create`. Rekomendasi default adalah memakai toko seed tersendiri agar produk demo tidak tercampur dengan toko asli pengguna.

## Katalog produk yang disarankan

Gunakan produk generik tanpa klaim merek agar gambar lebih mudah dibuat dan aman dipakai sebagai data demo.

| Kategori | Contoh produk |
| --- | --- |
| Gadget | Smartwatch Active, TWS Mini, Power Bank 10K, Charger GaN, Mechanical Keyboard, Wireless Mouse, Webcam Full HD |
| Hobby | Acrylic Paint Set, Sketchbook A5, Miniature Car Kit, Badminton Racket, Jigsaw Puzzle, Fishing Reel, Craft Tool Set |
| Healthy and Care | Facial Cleanser, Sunscreen Gel, Body Lotion, Hair Serum, Electric Toothbrush, Massage Roller, Travel Care Kit |
| Otomotif | Car Phone Holder, Portable Tire Inflator, Microfiber Set, Car Vacuum, Dash Camera, Helmet Intercom, Emergency Tool Kit |
| Electronics | Rice Cooker Mini, Electric Kettle, Desk Fan, Steam Iron, LED Table Lamp, Bluetooth Speaker, Extension Socket |
| Fashion | Basic Cotton T-Shirt, Canvas Tote Bag, Casual Cap, Lightweight Jacket, Daily Sneakers, Compact Wallet, Woven Scarf |

Setiap definisi produk minimal mempunyai:

```ts
type SeedProduct = {
  seedKey: string;
  categorySlug: string;
  shopSeedKey: string;
  name: string;
  description: string;
  basePrice: number;
  isActive: boolean;
  images: SeedImageRef[];
  variants: Array<{ name: string; values: string[] }>;
  skus: Array<{
    options: Array<{ name: string; value: string }>;
    price: number;
    stock: number;
    image?: SeedImageRef;
  }>;
};
```

`seedKey` harus stabil, misalnya `gadget-smartwatch-active`. Nama produk boleh diubah tanpa membuat record baru selama `seedKey` tetap sama.

## Strategi varian dan SKU

Ada dua istilah yang perlu dibedakan:

- **Jenis varian**: atribut seperti Warna, Ukuran, Kapasitas, atau Paket.
- **Kombinasi SKU**: gabungan nilai varian yang benar-benar dijual, misalnya `Warna=Hitam|Ukuran=M`.

Keputusan final untuk permintaan “1–3 variant dan kombinasi 1–3” adalah:

- Setiap produk mempunyai 1–3 jenis varian.
- Setiap produk mempunyai 1–3 kombinasi SKU yang valid secara total.
- Tidak harus membuat seluruh hasil Cartesian dari semua nilai varian.

Distribusi agar katalog terlihat alami:

- 50% produk: 1 jenis varian.
- 35% produk: 2 jenis varian.
- 15% produk: 3 jenis varian.
- 35% produk: 1 kombinasi SKU.
- 40% produk: 2 kombinasi SKU.
- 25% produk: 3 kombinasi SKU.

Contoh dua jenis varian dengan tiga kombinasi:

```ts
variants: [
  { name: "Warna", values: ["Hitam", "Putih", "Biru"] },
  { name: "Kapasitas", values: ["64 GB", "128 GB"] },
],
skus: [
  {
    options: [
      { name: "Warna", value: "Hitam" },
      { name: "Kapasitas", value: "64 GB" },
    ],
    price: 1299000,
    stock: 18,
  },
  {
    options: [
      { name: "Warna", value: "Putih" },
      { name: "Kapasitas", value: "128 GB" },
    ],
    price: 1499000,
    stock: 9,
  },
  {
    options: [
      { name: "Warna", value: "Biru" },
      { name: "Kapasitas", value: "128 GB" },
    ],
    price: 1529000,
    stock: 0,
  },
],
```

Aturan data SKU:

- Urutan `options` harus mengikuti urutan pada `variants` agar `skuKey` konsisten dengan halaman produk.
- Harga menggunakan bilangan bulat rupiah dan tidak negatif.
- Stok menggunakan bilangan bulat dan tidak negatif.
- Sekitar 10% kombinasi dapat diberi stok 0 untuk menguji status unavailable.
- Setiap produk sebaiknya tetap mempunyai minimal satu SKU dengan stok lebih dari 0.
- Gambar SKU hanya wajib untuk varian yang mengubah tampilan fisik, terutama Warna atau Model.
- Varian nonvisual seperti Paket atau Kapasitas dapat memakai gambar utama produk.

## Strategi gambar yang sesuai dan terjangkau

### Keputusan: 100% Pexels/Openverse

Seluruh gambar seed diambil dari Pexels atau hasil pencarian Openverse. Seeder tidak menggunakan generasi gambar AI agar tidak memakai token pembuatan gambar.

1. Prioritaskan Pexels untuk foto produk generik yang sesuai secara visual.
2. Gunakan Openverse sebagai pencarian tambahan dengan prioritas lisensi CC0 atau public domain.
3. Periksa lisensi setiap hasil Openverse karena kewajiban atribusi dapat berbeda untuk setiap gambar.
4. Jangan menggunakan URL pihak ketiga langsung pada UI. Unduh, optimalkan, lalu simpan sekali ke Convex Storage.
5. Simpan provider, halaman sumber, pembuat, lisensi, atribusi, dan hash file di manifest aset.

Pendekatan ini tidak memerlukan biaya atau token generasi gambar. Konsekuensinya, pemilihan gambar dan pencocokan warna SKU mungkin membutuhkan kurasi lebih banyak. Lisensi sumber gambar tetap harus diperiksa sebelum aset dimasukkan ke seed atau dipakai di production.

Referensi kebijakan sumber:

- [Lisensi Pexels](https://www.pexels.com/license/)
- [Dokumentasi API Openverse](https://docs.openverse.org/api/reference/index.html)
- [Panduan penggunaan ulang Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)

### Anggaran jumlah gambar

Untuk katalog production 42 produk:

- Maksimal 42 gambar cover utama, satu per produk; produk asli yang sudah ada tidak diunggah ulang.
- Gambar SKU visual diambil sesuai kombinasi yang memang membutuhkan pembeda gambar.
- 6 logo toko.
- Gambar kategori yang sekarang sudah ada dipakai ulang dan tidak perlu diunggah lagi.
- Jumlah aktual aset dapat dilihat di `seedRecords` dengan `entityType: "asset"`.

Jika setiap gambar WebP berukuran sekitar 120–200 KB, total aset awal kira-kira 8–14 MB. Angka ini merupakan target optimasi, bukan batas Convex.

### Standar visual

- Cover produk: rasio 1:1, ukuran 800×800 px.
- Gambar SKU: rasio dan framing sama dengan cover produk.
- Logo toko: 512×512 px dengan safe area di tengah.
- Format utama: WebP; JPEG dapat dipakai jika foto tidak cocok dikompresi ke WebP.
- Latar netral terang agar cocok dengan kartu PlaceStore.
- Satu produk harus memakai sudut kamera dan pencahayaan yang sama untuk seluruh warna SKU.
- Hindari teks kecil, watermark, harga, logo marketplace lain, dan merek yang tidak mendapat izin.
- Gunakan `object-fit: cover` pada kartu; subjek utama harus tetap berada dekat tengah agar tidak terpotong buruk.

### Manifest aset

```ts
type SeedImageRef = {
  assetKey: string;
  provider: "pexels" | "openverse";
  sourceUrl: string;
  sourcePage: string;
  creator?: string;
  license: string;
  attribution?: string;
  expectedSha256?: string;
  alt: string;
};
```

`assetKey` harus stabil, misalnya `gadget-smartwatch-active-blue`. Seeder mengecek asset registry berdasarkan `assetKey`; jika sudah ada dan file storage masih valid, gambar tidak diunduh atau diunggah ulang.

### Alur pembuatan aset

1. Buat daftar produk final terlebih dahulu.
2. Cari satu cover yang sesuai untuk setiap produk dari Pexels/Openverse.
3. Cari gambar SKU tambahan hanya jika perubahan varian memang terlihat.
4. Resize dan kompres secara lokal menggunakan script deterministik, misalnya dengan `sharp`.
5. Hitung SHA-256 untuk mendeteksi file duplikat.
6. Tinjau kontak visual, crop, watermark, dan kecocokan nama produk.
7. Unggah ke Convex Storage satu kali dan simpan hubungan `assetKey -> storageId`.

## Arsitektur seeder Convex

### File yang direncanakan

```text
convex/
  seed.ts                 # internal action sebagai orchestrator
  seedInternal.ts         # internal query/mutation per batch
  seedManifest.ts         # katalog deterministik, tanpa secret
scripts/
  prepare-seed-images.ts  # resize, WebP, hash, validasi aset
seed-assets/
  manifest.json           # metadata sumber; aset besar dapat di-ignore
doc/
  seed-plan.md
```

Jika aset tidak disimpan di Git, `seed-assets/generated/` harus masuk `.gitignore`, sedangkan manifest metadata tetap boleh disimpan di repository.

### Pemisahan tanggung jawab

- `internalAction` mengatur proses, mengambil gambar dari sumber yang disetujui, menyimpan `Blob` ke Storage, dan memanggil internal mutation.
- `internalQuery` membaca akun, kategori, toko, dan record seed berdasarkan index.
- `internalMutation` menulis maksimal satu batch toko/produk/SKU dalam satu transaksi.
- Action tidak mengakses database secara langsung; semua akses database dilakukan melalui query/mutation.
- Semua fungsi mempunyai validator argumen dan return value yang jelas.
- Jika internal function tidak dapat dipanggil langsung dari CLI versi proyek, gunakan wrapper sementara yang dilindungi `SEED_SECRET` dan `ALLOW_SEED`, lalu hapus atau nonaktifkan wrapper setelah seed selesai.

### Tabel metadata seed yang direkomendasikan

Tambahkan tabel khusus agar idempotensi dan cleanup tidak bergantung pada nama produk:

```ts
seedRuns: {
  namespace: string;
  status: "running" | "completed" | "failed";
  manifestVersion: string;
  startedAt: number;
  completedAt?: number;
  summary?: string;
}

seedRecords: {
  namespace: string;
  entityType: "shop" | "product" | "sku" | "asset";
  seedKey: string;
  entityId: string;
  checksum: string;
  storageId?: Id<"_storage">;
  createdAt: number;
  updatedAt: number;
}
```

Index yang dibutuhkan:

- `seedRuns.by_namespace`
- `seedRecords.by_namespace_and_entityType_and_seedKey`

Alternatif yang lebih sederhana adalah menambahkan `seedKey` langsung ke tabel `shops` dan `products`, tetapi tabel metadata terpisah lebih baik karena tidak mencampur atribut demo dengan model domain utama dan mempermudah rollback.

### Mode operasi

Seeder minimal mendukung:

- `dry-run`: validasi dan tampilkan rencana tanpa menulis data.
- `apply`: membuat record yang belum ada dan memperbarui record seed yang checksumnya berubah.
- `repair`: mengunggah ulang aset yang hilang dan memperbaiki relasi seed tanpa menghapus data.
- `cleanup`: menghapus hanya record pada `SEED_NAMESPACE` tertentu.

Mode `cleanup` harus menghapus dengan urutan:

1. SKU seed.
2. Produk seed.
3. File Storage yang hanya dipakai seed.
4. Toko seed yang tidak lagi mempunyai produk atau transaksi.
5. `seedRecords` dan `seedRuns` terkait.

Penghapusan storage harus bersifat best-effort. Storage ID yang sudah hilang tidak boleh menggagalkan cleanup database.

### Idempotensi

- Gunakan `namespace + entityType + seedKey` sebagai identitas logis.
- Gunakan checksum konten manifest untuk menentukan apakah record perlu diperbarui.
- Gunakan pseudo-random generator dengan seed tetap untuk stok atau variasi harga; jangan memakai `Math.random()` tanpa seed.
- Jangan mencari produk hanya berdasarkan nama karena nama dapat sama atau berubah.
- Jangan mengunggah gambar lagi jika SHA-256 dan storage record masih valid.
- Jalankan `apply` dua kali pada pengujian; jumlah toko, produk, SKU, dan file harus tetap sama.

### Batching dan kelanjutan proses

- Validasi keseluruhan manifest sebelum batch pertama ditulis.
- Proses toko terlebih dahulu, lalu kategori per kategori.
- Tulis sekitar 5 produk beserta SKU per mutation sebagai titik awal.
- Setelah satu batch selesai, jadwalkan batch berikutnya dengan `ctx.scheduler.runAfter(0, ...)` atau lanjutkan dari action.
- Simpan cursor/batch terakhir di `seedRuns` agar proses dapat dilanjutkan setelah gagal.
- Jangan memasukkan seluruh katalog dan semua gambar ke satu mutation.
- Batasi concurrency unduhan gambar, misalnya 3–5 file sekaligus, agar sumber gambar dan runtime tidak terbebani.

## Validasi sebelum penulisan

Dry-run harus gagal dengan pesan yang jelas jika:

- Akun allowlist tidak ditemukan.
- Slug kategori tidak ditemukan atau muncul lebih dari sekali.
- Dua toko ditetapkan sebagai pemilik kategori yang sama.
- Slug toko bentrok dengan toko yang bukan milik seed namespace.
- `seedKey` toko, produk, SKU, atau aset duplikat.
- Produk menunjuk toko atau kategori yang tidak ada.
- Produk mempunyai lebih dari 3 jenis varian.
- SKU mempunyai option yang tidak didefinisikan pada varian.
- Urutan option SKU tidak sama dengan urutan varian.
- Dua SKU pada produk mempunyai key kombinasi yang sama.
- Produk memiliki kurang dari 1 atau lebih dari 3 kombinasi SKU.
- Harga atau stok negatif/tidak bulat.
- Semua SKU sebuah produk kehabisan stok, kecuali produk tersebut memang ditandai sebagai skenario uji.
- Aset tidak dapat diunduh, MIME bukan gambar, ukuran melewati batas yang ditentukan, atau hash tidak cocok.

## Verifikasi setelah seed

Seeder harus menghasilkan ringkasan seperti:

```text
Seed namespace: placestore-demo-v1
Users reused: 4
Shops reused: 0
Shops created: 6
Categories mapped: 6
Products created: 40
SKUs upserted: 103
Warnings: 0
```

Pemeriksaan aplikasi:

- Homepage menampilkan cover pada product card dan Daily Essentials.
- Explore menampilkan 5–10 produk per kategori target.
- Filter kategori aktif sesuai query.
- Halaman toko hanya menampilkan kategori yang dipetakan kepadanya.
- Halaman produk mengganti gambar ketika kombinasi SKU bergambar dipilih.
- Kombinasi stok 0 tetap dapat dipilih, tetapi cart/checkout dinonaktifkan dan alert tampil.
- Cart dan checkout memakai gambar SKU yang dipilih.
- Semua URL gambar memberikan respons sukses.
- Seeder kedua tidak menambah record atau file duplikat.
- Cleanup namespace tidak menghapus produk, toko, atau gambar non-seed.

## Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Produk demo tercampur dengan data pengguna | Gunakan seed namespace dan toko seed terpisah |
| Seeder dijalankan di production tanpa sengaja | Default `dry-run`, require `ALLOW_SEED=true`, tampilkan deployment target |
| Mutation terlalu besar | Batch kecil dan simpan progress |
| Gambar hilang tetapi ID masih tersimpan | Asset registry, validasi `_storage`, dan mode `repair` |
| Gambar terunggah berulang | `assetKey` + SHA-256 + idempotensi |
| Sumber gambar berubah/hilang | Simpan ke Convex Storage; jangan hotlink saat runtime |
| Lisensi gambar tidak jelas | Simpan `sourcePage` dan `licenseNote`, lakukan review sebelum apply |
| Kombinasi varian tidak cocok dengan UI | Gunakan pembuat `skuKey` yang sama dan test pilihan varian |
| Toko kedua kosong | Batasi awal ke satu toko per akun atau tambahkan kategori baru |
| Seed mengubah data nyata | `apply` hanya boleh patch record yang tercatat pada seed namespace |

## Keputusan yang telah dikonfirmasi

Seluruh rekomendasi berikut telah disetujui sebagai dasar implementasi:

1. Batas 5–10 produk dihitung sebagai total produk per kategori setelah memperhitungkan produk lama. Target default adalah 7 produk per kategori.
2. Aturan satu kategori untuk satu toko berlaku pada produk seed. Seeder tidak memindahkan atau mengubah kepemilikan produk lama.
3. Setiap produk seed mempunyai 1–3 jenis varian dan maksimal 1–3 kombinasi SKU secara total.
4. Akun yang tersedia dipilih secara internal tanpa menulis `externalId` ke repository. Alokasi bersifat capacity-aware, maksimal dua toko seed per akun, dan tetap mematuhi batas plan.
5. Seeder membuat toko demo baru pada akun target selama batas jumlah toko akun masih memungkinkan. Toko pengguna yang sudah ada tidak diisi produk seed.
6. Fase awal membuat satu toko berkatalog per akun. Toko kedua boleh dibuat kosong hanya sebagai skenario pengujian multi-store; toko kosong bukan persyaratan seed katalog utama.
7. Seluruh gambar memakai sumber Pexels/Openverse tanpa generasi AI agar hemat token.
8. Katalog menggunakan nama produk generik dan menghindari klaim merek nyata.
9. Production hanya diizinkan dengan konfirmasi namespace eksplisit, secret, dan `ALLOW_SEED=true`; runner segera dinonaktifkan sesudah verifikasi.
10. Transaksi dan review demo tidak termasuk seed katalog fase pertama dan akan direncanakan sebagai fase terpisah setelah katalog stabil.

## Status implementasi

Implementasi tersedia pada:

- `convex/seedManifest.ts`: konfigurasi, enam toko, dan 42 produk deterministik.
- `convex/seedInternal.ts`: inspect, asset registry, upsert batch, run tracking, dan cleanup.
- `convex/seed.ts`: guard, dry-run, integrasi Pexels/Openverse, apply, repair, dan cleanup.
- `convex/seedManifest.test.ts`: validasi jumlah kategori, produk, varian, SKU, key, harga, dan stok.
- `scripts/seed-cli.mjs`: wrapper CLI yang tidak menyimpan secret dalam repository.

Environment development yang diperlukan:

```bash
npx convex env set ALLOW_SEED true
npx convex env set SEED_SECRET "<secret-yang-kuat>"
npx convex env set PEXELS_API_KEY "<api-key-pexels>"
```

Secret yang sama diberikan hanya pada shell lokal ketika menjalankan perintah:

```bash
SEED_SECRET="<secret-yang-sama>" npm run seed:dry-run
SEED_SECRET="<secret-yang-sama>" npm run seed:apply
SEED_SECRET="<secret-yang-sama>" npm run seed:repair
SEED_SECRET="<secret-yang-sama>" npm run seed:cleanup
```

Dry-run pada deployment development telah berhasil dan merencanakan 32 produk baru: 7 Electronics, 6 Otomotif, 7 Healthy and Care, 6 Hobby, dan 6 Gadget. Tiga produk lama yang sudah memiliki kategori dihitung ke dalam target tujuh produk.

Apply development pertama berhenti sebelum membuat toko atau produk karena endpoint Openverse timeout dan `PEXELS_API_KEY` belum tersedia. Production kemudian berhasil memakai Pexels: 6 toko, 40 produk baru, dan 103 SKU dibuat. Fashion sudah memiliki 2 produk asli sehingga hanya menerima 5 produk seed; setiap kategori berakhir dengan total 7 produk.

Apply kedua juga selesai tanpa menambah jumlah produk: keenam kategori tetap berisi 7 produk dan dry-run sesudahnya melaporkan `seedProductsPlanned: 0`. Setelah verifikasi, `ALLOW_SEED` pada production dikembalikan ke `false`.

### Menjalankan seed untuk website Vercel

Vercel hanya menjalankan frontend/server web PlaceStore. Data seed ditulis ke deployment Convex yang menjadi backend website tersebut. Karena itu, environment seeder harus dipasang pada **Convex production**, bukan sebagai environment frontend Vercel.

Pastikan Vercel juga men-deploy Convex functions dengan build command:

```bash
npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL
```

Tambahkan `CONVEX_DEPLOY_KEY` dari Convex production ke Vercel Environment Variables untuk environment Production. Jangan memasukkan `SEED_SECRET` atau `PEXELS_API_KEY` ke variable frontend `VITE_*`.

Pasang environment seeder langsung ke Convex production secara interaktif agar nilainya tidak masuk shell history:

```bash
npx convex env set PEXELS_API_KEY --prod
npx convex env set SEED_SECRET --prod
npx convex env set ALLOW_SEED true --prod
```

Setelah functions production selesai di-deploy, jalankan dry-run production dari komputer lokal:

```bash
SEED_SECRET="<secret-yang-sama>" \
CONFIRM_PRODUCTION_SEED="placestore-demo-v1" \
npm run seed:prod:dry-run
```

Jika hasil dry-run benar, jalankan apply:

```bash
SEED_SECRET="<secret-yang-sama>" \
CONFIRM_PRODUCTION_SEED="placestore-demo-v1" \
npm run seed:prod:apply
```

Setelah apply dan verifikasi selesai, segera nonaktifkan runner production:

```bash
npx convex env set ALLOW_SEED false --prod
```

Seeder tidak dijalankan otomatis pada setiap deployment Vercel. Hal ini mencegah build biasa melakukan perubahan database atau mengulang unduhan gambar tanpa disengaja.

## Checklist persiapan dan tahap pembuatan

- [x] Konfirmasi arti “1–3 kombinasi”: maksimal tiga SKU per produk.
- [x] Konfirmasi target 5–10 sebagai total produk termasuk produk yang sudah ada, dengan target default 7.
- [x] Konfirmasi eksklusivitas kategori hanya berlaku untuk data seed.
- [x] Tentukan akun tersedia sebagai target secara internal dan alokasikan toko berdasarkan kapasitas plan.
- [x] Tetapkan pembuatan toko demo baru tanpa memakai toko lama untuk produk seed.
- [x] Tetapkan satu toko berkatalog per akun; toko kedua boleh kosong hanya untuk pengujian multi-store.
- [x] Tetapkan 100% gambar dari Pexels/Openverse tanpa generasi AI.
- [x] Tetapkan penggunaan nama produk generik tanpa klaim merek nyata.
- [x] Lindungi production dengan secret, konfirmasi namespace, dan flag `ALLOW_SEED` sementara.
- [x] Pisahkan transaksi dan review demo dari fase seed katalog pertama.
- [x] Tetapkan `SEED_NAMESPACE`, versi manifest, target deployment, dan random seed.
- [x] Finalisasi pemetaan kategori ke satu toko pemilik.
- [x] Finalisasi 7 nama serta deskripsi produk per kategori.
- [x] Finalisasi jenis varian, nilai, harga, stok, dan 1–3 SKU setiap produk.
- [x] Kumpulkan cover produk, gambar SKU visual, dan logo toko dari Pexels/Openverse saat apply production.
- [x] Catat provider, halaman sumber, pembuat, lisensi, atribusi, dan hash setiap aset di asset registry.
- [ ] Tambahkan script optimasi gambar ke WebP 800×800 dan validasi ukuran.
- [x] Tambahkan schema `seedRuns` dan `seedRecords` beserta index-nya.
- [x] Buat manifest TypeScript deterministik tanpa secret atau data pribadi.
- [x] Buat internal query untuk validasi akun, kategori, toko, dan record seed.
- [x] Buat internal mutation untuk upsert toko, produk, SKU, dan metadata per batch.
- [x] Buat internal action untuk orkestrasi aset dan batch database.
- [x] Tambahkan mode `dry-run`, `apply`, `repair`, dan `cleanup`.
- [x] Tambahkan guard deployment serta `ALLOW_SEED` agar production aman.
- [x] Jalankan dry-run dan tinjau jumlah akun, toko, kategori, produk, SKU, dan aset.
- [x] Jalankan apply production: 6 toko, 40 produk baru, dan 103 SKU.
- [ ] Jalankan seed pada deployment development dengan batch kecil.
- [ ] Verifikasi seluruh gambar dan hubungan kategori–toko–produk–SKU.
- [ ] Uji pemilihan gambar SKU, stok kosong, cart, dan checkout.
- [x] Jalankan `apply` kedua kali dan pastikan total tiap kategori tetap 7 tanpa duplikasi.
- [ ] Uji `repair` menggunakan satu referensi gambar yang sengaja dibuat hilang.
- [ ] Uji `cleanup` dan pastikan hanya namespace seed yang terhapus.
- [x] Dokumentasikan perintah operasional dan hasil akhir seed.
