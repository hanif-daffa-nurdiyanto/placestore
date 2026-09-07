export const SEED_CONFIG = {
  namespace: "placestore-demo-v1",
  manifestVersion: "3",
  productsPerCategory: 7,
  reviewsPerProduct: 2,
  shopsPerUser: 1,
  randomSeed: 20260905,
} as const;

export const SEED_CATEGORY_ALIASES: Record<string, string[]> = {
  gadget: ["gadget"],
  hobby: ["hobby"],
  "healthy-and-beauty": ["healthy-and-beauty", "healthy-and-care"],
  otomotif: ["otomotif"],
  electronic: ["electronic", "e"],
  fashion: ["fashion"],
};

export type SeedShop = {
  seedKey: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  logoQuery: string;
  categorySlug: string;
};

export type SeedSku = {
  options: Array<{ name: string; value: string }>;
  price: number;
  stock: number;
  imageQuery?: string;
};

export type SeedProduct = {
  seedKey: string;
  categorySlug: string;
  name: string;
  description: string;
  basePrice: number;
  imageQuery: string;
  variants: Array<{ name: string; values: string[] }>;
  skus: SeedSku[];
  reviews: SeedReview[];
};

export type SeedReview = {
  rating: number;
  reviewText: string;
};

export const SEED_SHOPS: SeedShop[] = [
  {
    seedKey: "place-tech",
    name: "PlaceTech",
    slug: "seed-place-tech",
    description: "Gadget praktis untuk kebutuhan digital sehari-hari.",
    address: "Jakarta, Indonesia",
    logoQuery: "modern technology store desk",
    categorySlug: "gadget",
  },
  {
    seedKey: "hobby-corner",
    name: "Hobby Corner",
    slug: "seed-hobby-corner",
    description: "Perlengkapan kreatif dan hobi untuk mengisi waktu luang.",
    address: "Bandung, Indonesia",
    logoQuery: "colorful craft supplies flat lay",
    categorySlug: "hobby",
  },
  {
    seedKey: "care-daily",
    name: "Care Daily",
    slug: "seed-care-daily",
    description: "Pilihan perawatan diri sederhana untuk rutinitas harian.",
    address: "Surabaya, Indonesia",
    logoQuery: "skincare bottles neutral background",
    categorySlug: "healthy-and-beauty",
  },
  {
    seedKey: "auto-place",
    name: "Auto Place",
    slug: "seed-auto-place",
    description: "Aksesori otomotif fungsional untuk perjalanan yang nyaman.",
    address: "Tangerang, Indonesia",
    logoQuery: "car accessories tools flat lay",
    categorySlug: "otomotif",
  },
  {
    seedKey: "home-electronics",
    name: "Home Electronics",
    slug: "seed-home-electronics",
    description: "Elektronik rumah tangga ringkas dan mudah digunakan.",
    address: "Yogyakarta, Indonesia",
    logoQuery: "small home appliances kitchen",
    categorySlug: "electronic",
  },
  {
    seedKey: "daily-fashion",
    name: "Daily Fashion",
    slug: "seed-daily-fashion",
    description: "Pakaian dan aksesori kasual untuk kebutuhan sehari-hari.",
    address: "Bekasi, Indonesia",
    logoQuery: "fashion clothing rack neutral store",
    categorySlug: "fashion",
  },
];

type CompactSku = [values: string[], price: number, stock: number];

const REVIEW_COMMENTS = [
  (name: string) => `${name} sesuai deskripsi dan berfungsi dengan baik.`,
  (name: string) => `Kualitas ${name} bagus, pengemasan juga rapi.`,
  (name: string) => `${name} nyaman digunakan untuk kebutuhan sehari-hari.`,
  (name: string) => `Produk ${name} tiba dengan kondisi baik dan layak dibeli.`,
] as const;

function buildReviews(name: string, seedKey: string): SeedReview[] {
  const offset = Array.from(seedKey).reduce<number>(
    (total, character) => total + character.charCodeAt(0),
    Number(SEED_CONFIG.randomSeed),
  );
  const ratings = [5, 4, 5, 3] as const;
  return Array.from({ length: SEED_CONFIG.reviewsPerProduct }, (_, index) => ({
    rating: ratings[(offset + index) % ratings.length],
    reviewText: REVIEW_COMMENTS[(offset + index) % REVIEW_COMMENTS.length](name),
  }));
}

function product(
  categorySlug: string,
  seedKey: string,
  name: string,
  description: string,
  basePrice: number,
  imageQuery: string,
  variantNames: string[],
  compactSkus: CompactSku[],
  visualVariant?: string,
): SeedProduct {
  const variants = variantNames.map((variantName, index) => ({
    name: variantName,
    values: Array.from(new Set(compactSkus.map(([values]) => values[index] ?? ""))).filter(
      Boolean,
    ),
  }));

  return {
    seedKey: `${categorySlug}-${seedKey}`,
    categorySlug,
    name,
    description,
    basePrice,
    imageQuery,
    variants,
    reviews: buildReviews(name, `${categorySlug}-${seedKey}`),
    skus: compactSkus.map(([values, price, stock]) => {
      const options = variantNames.map((variantName, index) => ({
        name: variantName,
        value: values[index] ?? "",
      }));
      const visualValue = options.find((option) => option.name === visualVariant)?.value;
      return {
        options,
        price,
        stock,
        imageQuery: visualValue ? `${visualValue} ${imageQuery}` : undefined,
      };
    }),
  };
}

export const SEED_PRODUCTS: SeedProduct[] = [
  product("gadget", "smartwatch-active", "Smartwatch Active", "Jam pintar ringan untuk aktivitas dan notifikasi harian.", 599_000, "smart watch product isolated", ["Warna"], [[ ["Hitam"], 499_000, 18 ], [ ["Biru"], 519_000, 12 ], [ ["Merah"], 519_000, 0 ]], "Warna"),
  product("gadget", "tws-mini", "TWS Mini", "Earbud nirkabel ringkas dengan charging case.", 329_000, "wireless earbuds charging case product", ["Warna"], [[ ["Putih"], 279_000, 24 ], [ ["Hitam"], 289_000, 15 ]], "Warna"),
  product("gadget", "power-bank-10k", "Power Bank 10K", "Daya portabel 10.000 mAh untuk perjalanan.", 349_000, "portable power bank product", ["Warna", "Kabel"], [[ ["Hitam", "USB-C"], 299_000, 20 ], [ ["Putih", "USB-C"], 309_000, 13 ], [ ["Biru", "Tanpa kabel"], 319_000, 7 ]], "Warna"),
  product("gadget", "charger-gan", "Charger GaN Compact", "Adaptor pengisian ringkas untuk berbagai perangkat.", 399_000, "compact wall charger product", ["Daya"], [[ ["30W"], 249_000, 22 ], [ ["45W"], 329_000, 16 ], [ ["65W"], 389_000, 8 ]]),
  product("gadget", "mechanical-keyboard", "Mechanical Keyboard", "Keyboard mekanis ringkas untuk kerja dan bermain.", 899_000, "compact mechanical keyboard product", ["Warna", "Switch"], [[ ["Putih", "Linear"], 749_000, 11 ], [ ["Hitam", "Tactile"], 779_000, 9 ], [ ["Biru", "Clicky"], 799_000, 4 ]], "Warna"),
  product("gadget", "wireless-mouse", "Wireless Mouse", "Mouse ergonomis dengan koneksi nirkabel stabil.", 279_000, "wireless computer mouse product", ["Warna"], [[ ["Hitam"], 219_000, 25 ], [ ["Putih"], 229_000, 17 ]], "Warna"),
  product("gadget", "webcam-full-hd", "Webcam Full HD", "Kamera web jernih untuk rapat dan kelas daring.", 649_000, "webcam product isolated", ["Paket"], [[ ["Kamera"], 549_000, 14 ], [ ["Kamera + Tripod"], 619_000, 6 ]]),

  product("hobby", "acrylic-paint", "Acrylic Paint Set", "Set cat akrilik untuk latihan dan proyek kreatif.", 189_000, "acrylic paint set art supplies", ["Jumlah Warna"], [[ ["12 warna"], 129_000, 20 ], [ ["24 warna"], 179_000, 12 ], [ ["36 warna"], 239_000, 7 ]]),
  product("hobby", "sketchbook-a5", "Sketchbook A5", "Buku gambar bertekstur halus untuk sketsa harian.", 89_000, "blank sketchbook art product", ["Warna Sampul"], [[ ["Hitam"], 69_000, 28 ], [ ["Cokelat"], 75_000, 16 ]], "Warna Sampul"),
  product("hobby", "miniature-car", "Miniature Car Kit", "Model kendaraan mini untuk dirakit dan dipajang.", 299_000, "miniature model car kit", ["Skala", "Warna"], [[ ["1:32", "Merah"], 239_000, 9 ], [ ["1:24", "Biru"], 279_000, 6 ], [ ["1:24", "Hitam"], 289_000, 3 ]], "Warna"),
  product("hobby", "badminton-racket", "Badminton Racket", "Raket ringan untuk permainan rekreasi.", 429_000, "badminton racket product", ["Berat"], [[ ["4U"], 349_000, 13 ], [ ["5U"], 379_000, 8 ]]),
  product("hobby", "jigsaw-puzzle", "Jigsaw Puzzle", "Puzzle ilustrasi untuk aktivitas santai bersama keluarga.", 179_000, "jigsaw puzzle box product", ["Jumlah Keping"], [[ ["500"], 119_000, 19 ], [ ["1000"], 159_000, 10 ]]),
  product("hobby", "fishing-reel", "Fishing Reel", "Reel pancing ringkas dengan putaran halus.", 499_000, "fishing reel product isolated", ["Ukuran", "Handle"], [[ ["1000", "Kanan"], 399_000, 8 ], [ ["2000", "Kiri"], 429_000, 5 ], [ ["3000", "Kanan"], 459_000, 2 ]]),
  product("hobby", "craft-tool-set", "Craft Tool Set", "Peralatan dasar untuk kerajinan kertas dan model.", 239_000, "craft tools set flat lay", ["Paket"], [[ ["Basic"], 169_000, 18 ], [ ["Complete"], 219_000, 9 ]]),

  product("healthy-and-beauty", "facial-cleanser", "Facial Cleanser", "Pembersih wajah lembut untuk rutinitas harian.", 129_000, "facial cleanser bottle product", ["Ukuran"], [[ ["100 ml"], 89_000, 30 ], [ ["200 ml"], 119_000, 17 ]]),
  product("healthy-and-beauty", "sunscreen-gel", "Sunscreen Gel", "Gel pelindung ringan untuk pemakaian sehari-hari.", 159_000, "sunscreen tube skincare product", ["Ukuran", "Paket"], [[ ["30 ml", "Satuan"], 99_000, 21 ], [ ["50 ml", "Satuan"], 139_000, 14 ], [ ["50 ml", "Duo"], 259_000, 6 ]]),
  product("healthy-and-beauty", "body-lotion", "Body Lotion", "Losion tubuh dengan tekstur ringan dan nyaman.", 119_000, "body lotion bottle neutral background", ["Aroma"], [[ ["Fresh"], 89_000, 20 ], [ ["Floral"], 89_000, 15 ], [ ["Unscented"], 95_000, 11 ]]),
  product("healthy-and-beauty", "hair-serum", "Hair Serum", "Serum perawatan rambut dalam botol praktis.", 149_000, "hair serum bottle product", ["Ukuran"], [[ ["30 ml"], 99_000, 19 ], [ ["60 ml"], 139_000, 8 ]]),
  product("healthy-and-beauty", "electric-toothbrush", "Electric Toothbrush", "Sikat gigi elektrik dengan kepala yang dapat diganti.", 449_000, "electric toothbrush product isolated", ["Warna", "Paket"], [[ ["Putih", "Standard"], 349_000, 14 ], [ ["Hitam", "Standard"], 359_000, 10 ], [ ["Biru", "Travel"], 399_000, 5 ]], "Warna"),
  product("healthy-and-beauty", "massage-roller", "Massage Roller", "Roller pijat portabel untuk relaksasi setelah aktivitas.", 199_000, "massage roller wellness product", ["Warna"], [[ ["Hijau"], 139_000, 12 ], [ ["Ungu"], 139_000, 9 ]], "Warna"),
  product("healthy-and-beauty", "travel-care-kit", "Travel Care Kit", "Set wadah perawatan pribadi untuk bepergian.", 169_000, "travel toiletry kit product", ["Warna", "Ukuran", "Paket"], [[ ["Biru", "Mini", "5 pcs"], 119_000, 15 ], [ ["Pink", "Medium", "7 pcs"], 149_000, 8 ], [ ["Putih", "Medium", "9 pcs"], 159_000, 0 ]], "Warna"),

  product("otomotif", "phone-holder", "Car Phone Holder", "Dudukan ponsel stabil untuk dashboard kendaraan.", 249_000, "car phone holder product", ["Model"], [[ ["Dashboard"], 169_000, 18 ], [ ["Ventilasi"], 189_000, 13 ], [ ["Magnet"], 219_000, 7 ]]),
  product("otomotif", "tire-inflator", "Portable Tire Inflator", "Pompa ban portabel dengan layar tekanan digital.", 699_000, "portable tire inflator product", ["Paket"], [[ ["Standard"], 579_000, 10 ], [ ["Dengan tas"], 629_000, 6 ]]),
  product("otomotif", "microfiber-set", "Microfiber Cleaning Set", "Kain microfiber lembut untuk membersihkan kendaraan.", 139_000, "microfiber cleaning cloth set", ["Warna", "Jumlah"], [[ ["Biru", "3 pcs"], 89_000, 24 ], [ ["Abu-abu", "5 pcs"], 119_000, 17 ], [ ["Kuning", "8 pcs"], 149_000, 9 ]], "Warna"),
  product("otomotif", "car-vacuum", "Compact Car Vacuum", "Vacuum mobil ringkas untuk sela jok dan kabin.", 599_000, "handheld car vacuum product", ["Warna"], [[ ["Hitam"], 479_000, 12 ], [ ["Putih"], 489_000, 7 ]], "Warna"),
  product("otomotif", "dash-camera", "Dashboard Camera", "Kamera dashboard ringkas untuk merekam perjalanan.", 999_000, "car dashboard camera product", ["Resolusi", "Paket"], [[ ["1080p", "Kamera"], 799_000, 9 ], [ ["2K", "Kamera"], 899_000, 5 ], [ ["2K", "Kamera + Memori"], 959_000, 3 ]]),
  product("otomotif", "helmet-intercom", "Helmet Intercom", "Interkom helm untuk komunikasi selama perjalanan.", 849_000, "motorcycle helmet intercom product", ["Paket"], [[ ["Single"], 699_000, 8 ], [ ["Duo"], 1_299_000, 4 ]]),
  product("otomotif", "emergency-kit", "Car Emergency Tool Kit", "Paket alat darurat ringkas untuk disimpan di mobil.", 389_000, "car emergency tools kit", ["Paket"], [[ ["Basic"], 279_000, 15 ], [ ["Plus"], 349_000, 7 ]]),

  product("electronic", "rice-cooker", "Mini Rice Cooker", "Penanak nasi ringkas untuk porsi kecil.", 649_000, "small rice cooker product", ["Warna", "Kapasitas"], [[ ["Putih", "1 L"], 529_000, 12 ], [ ["Hijau", "1.2 L"], 579_000, 8 ], [ ["Pink", "1.2 L"], 579_000, 5 ]], "Warna"),
  product("electronic", "electric-kettle", "Electric Kettle", "Ketel listrik sederhana dengan mati otomatis.", 399_000, "electric kettle product isolated", ["Warna"], [[ ["Putih"], 299_000, 19 ], [ ["Hitam"], 319_000, 11 ]], "Warna"),
  product("electronic", "desk-fan", "Compact Desk Fan", "Kipas meja ringkas dengan beberapa tingkat kecepatan.", 329_000, "small desk fan product", ["Warna", "Daya"], [[ ["Putih", "USB"], 249_000, 20 ], [ ["Biru", "USB"], 259_000, 13 ], [ ["Hijau", "Baterai"], 289_000, 6 ]], "Warna"),
  product("electronic", "steam-iron", "Steam Iron", "Setrika uap ringan untuk penggunaan harian.", 499_000, "steam iron appliance product", ["Warna"], [[ ["Biru"], 399_000, 14 ], [ ["Ungu"], 409_000, 8 ]], "Warna"),
  product("electronic", "table-lamp", "LED Table Lamp", "Lampu meja LED untuk belajar dan bekerja.", 379_000, "led desk lamp product", ["Warna", "Mode"], [[ ["Putih", "3 tingkat"], 279_000, 18 ], [ ["Hitam", "3 tingkat"], 289_000, 10 ], [ ["Putih", "Dimmable"], 329_000, 7 ]], "Warna"),
  product("electronic", "bluetooth-speaker", "Portable Bluetooth Speaker", "Speaker portabel untuk mendengarkan audio sehari-hari.", 549_000, "portable bluetooth speaker product", ["Warna"], [[ ["Hitam"], 429_000, 16 ], [ ["Biru"], 439_000, 9 ], [ ["Merah"], 439_000, 0 ]], "Warna"),
  product("electronic", "extension-socket", "Extension Socket", "Stopkontak ekstensi dengan port pengisian tambahan.", 299_000, "power strip extension socket product", ["Panjang Kabel", "Jumlah Soket"], [[ ["1.5 m", "3"], 219_000, 22 ], [ ["3 m", "4"], 269_000, 13 ], [ ["5 m", "5"], 319_000, 5 ]]),

  product("fashion", "basic-tshirt", "Basic Cotton T-Shirt", "Kaos katun kasual dengan potongan nyaman untuk sehari-hari.", 179_000, "plain cotton tshirt fashion", ["Warna", "Ukuran"], [[ ["Hitam", "M"], 129_000, 18 ], [ ["Putih", "L"], 129_000, 15 ], [ ["Navy", "XL"], 139_000, 8 ]], "Warna"),
  product("fashion", "canvas-tote", "Canvas Tote Bag", "Tas kanvas ringan untuk membawa kebutuhan harian.", 159_000, "canvas tote bag product", ["Warna"], [[ ["Natural"], 109_000, 20 ], [ ["Hitam"], 119_000, 13 ]], "Warna"),
  product("fashion", "casual-cap", "Casual Baseball Cap", "Topi kasual dengan strap yang dapat disesuaikan.", 149_000, "baseball cap fashion product", ["Warna"], [[ ["Hitam"], 99_000, 17 ], [ ["Beige"], 109_000, 12 ], [ ["Biru"], 109_000, 6 ]], "Warna"),
  product("fashion", "light-jacket", "Lightweight Jacket", "Jaket ringan untuk aktivitas luar ruang dan perjalanan.", 449_000, "lightweight casual jacket fashion", ["Warna", "Ukuran", "Model"], [[ ["Hitam", "M", "Regular"], 349_000, 10 ], [ ["Olive", "L", "Regular"], 369_000, 7 ], [ ["Navy", "XL", "Relaxed"], 389_000, 4 ]], "Warna"),
  product("fashion", "daily-sneakers", "Daily Sneakers", "Sepatu kasual sederhana untuk aktivitas sehari-hari.", 499_000, "casual sneakers product", ["Warna", "Ukuran"], [[ ["Putih", "39"], 399_000, 9 ], [ ["Hitam", "41"], 409_000, 8 ], [ ["Abu-abu", "42"], 419_000, 5 ]], "Warna"),
  product("fashion", "compact-wallet", "Compact Wallet", "Dompet ringkas dengan beberapa kompartemen kartu.", 229_000, "compact wallet fashion product", ["Warna"], [[ ["Cokelat"], 169_000, 14 ], [ ["Hitam"], 179_000, 11 ]], "Warna"),
  product("fashion", "woven-scarf", "Soft Woven Scarf", "Syal tenun lembut sebagai pelengkap gaya kasual.", 189_000, "woven scarf fashion product", ["Warna", "Ukuran"], [[ ["Beige", "Regular"], 139_000, 16 ], [ ["Abu-abu", "Regular"], 139_000, 12 ], [ ["Maroon", "Long"], 159_000, 6 ]], "Warna"),
];

export function getSeedShopForCategory(categorySlug: string) {
  return SEED_SHOPS.find((shop) => shop.categorySlug === categorySlug) ?? null;
}
