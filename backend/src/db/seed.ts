import * as XLSX from "xlsx";
import fs from "node:fs";

import { db } from "./db.js";
import { supabaseAdmin } from "@/shared/supabase.js";
import {
  user,
  categories,
  products,
  productImages,
  stores,
  listings,
} from "./schema.js";
import { sql } from "drizzle-orm";

// ---------- config ----------
const BUCKET = "product-images";
const IMAGE_FILES = Array.from(
  { length: 12 },
  (_, i) => `${String(i + 1).padStart(2, "0")}.jpeg`,
);

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function getImageUrls(): string[] {
  return IMAGE_FILES.map(
    (f) => supabaseAdmin.storage.from(BUCKET).getPublicUrl(f).data.publicUrl,
  );
}

const TIER_MAP: Record<string, "economy" | "standard" | "luxury"> = {
  اقتصادية: "economy",
  متوسطة: "standard",
  فاخرة: "luxury",
};

// ---------- category-aware attribute pools ----------
const POOLS: Record<
  string,
  { brand: string[]; material: string[]; color: string[]; size: string[] }
> = {
  أرضيات: {
    brand: ["كليوباترا", "الجوهرة", "لوتس", "روكا", "الفراعنة للسيراميك"],
    material: ["سيراميك", "بورسلين", "رخام طبيعي", "باركيه خشبي"],
    color: ["بيج", "رمادي", "أبيض", "بني", "أسود"],
    size: ["30x30 سم", "60x60 سم", "80x80 سم", "غير مقاس"],
  },
  دهانات: {
    brand: ["جوتن", "الحليج", "سيبا", "دهانات الأهرام"],
    material: ["بلاستيك مطفي", "دهان زيتي", "دهان قطيفة"],
    color: ["أبيض", "بيج فاتح", "أزرق سماوي", "رمادي فاتح", "أخضر فاتح"],
    size: ["3.6 لتر", "9 لتر", "18 لتر"],
  },
  أثاث: {
    brand: [
      "المعتز للأثاث",
      "دلتا للأثاث",
      "هوم سنتر ستايل",
      "المستقبل للأثاث",
    ],
    material: ["خشب MDF", "خشب زان", "خشب صنوبر", "معدن وخشب"],
    color: ["بني", "بيج", "رمادي", "كحلي", "أبيض"],
    size: ["مقعدين", "3 مقاعد", "طقم غرفة كاملة"],
  },
  كهربا: {
    brand: ["السويدي إليكتريك", "شنايدر ستايل", "الأهرام للكهرباء"],
    material: ["نحاس نقي", "ألومنيوم", "بلاستيك مقوى ضد الحريق"],
    color: ["أبيض", "أسود", "فضي"],
    size: ["قياس قياسي"],
  },
  مطابخ: {
    brand: ["الأمل للنجارة", "هاي كلاس كيتشن", "مودرن كيتشن"],
    material: ["أكريليك", "HPL", "خشب سويدي", "ألوميتال", "خشمونيوم"],
    color: ["أبيض", "رمادي", "بني خشبي", "أسود مطفي"],
    size: ["3 متر", "4 متر", "5 متر", "6 متر"],
  },
  سباكة: {
    brand: ["هيبا", "الفراعنة للسباكة", "سيراميكا"],
    material: ["نحاس", "PPR", "ستانلس ستيل"],
    color: ["أبيض", "كروم", "ستانلس"],
    size: ["1/2 بوصة", "3/4 بوصة", "1 بوصة"],
  },
};

const EGYPTIAN_NAMES = [
  "محمد سعيد",
  "أحمد فتحي",
  "خالد إبراهيم",
  "مصطفى جمال",
  "طارق سمير",
  "هاني عادل",
  "وليد فؤاد",
  "شريف ماهر",
  "عمرو صلاح",
  "كريم رأفت",
];

async function main() {
  const buf = fs.readFileSync("./src/db/Bonyan.xlsx");
  const wb = XLSX.read(buf, { type: "buffer" });
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!]!);
  // ---------- 1. categories ----------
  const catNames = [...new Set(rows.map((r) => r.Category))];
  await db
    .insert(categories)
    .values(catNames.map((name) => ({ name })))
    .onConflictDoNothing();
  const catRows = await db.select().from(categories);
  const catMap = new Map(catRows.map((c) => [c.name, c.id]));

  // ---------- 2. stores (+ fake owner users, direct insert) ----------
  const storeKeys = [
    ...new Map(rows.map((r) => [`${r.Supplier_Name}||${r.City}`, r])).values(),
  ];

  const ownerRows = await db
    .insert(user)
    .values(
      storeKeys.map((_, i) => ({
        name: pick(EGYPTIAN_NAMES),
        email: `owner${Date.now()}${i}@bonyan-import.local`,
        emailVerified: true,
        role: "user",
      })),
    )
    .returning({ id: user.id });

  const storeInsertValues = storeKeys.map((r, i) => ({
    name: r.Supplier_Name,
    city: r.City,
    location: null,
    ownerName: pick(EGYPTIAN_NAMES),
    contactNumber: `01${randInt(0, 2)}${String(randInt(0, 99999999)).padStart(8, "0")}`,
    verified: Math.random() > 0.3,
    ownerId: ownerRows[i]!.id,
  }));
  const storeRows = await db
    .insert(stores)
    .values(storeInsertValues)
    .returning({ id: stores.id, name: stores.name, city: stores.city });
  const storeMap = new Map(
    storeRows.map((s) => [`${s.name}||${s.city}`, s.id]),
  );

  // ---------- 3. products (distinct name+category+tier, rating averaged) ----------
  const productGroups = new Map<
    string,
    {
      name: string;
      category: string;
      tier: string;
      unit: string;
      ratings: number[];
    }
  >();
  for (const r of rows) {
    const key = `${r.Product_Name}||${r.Category}||${r.Tier}`;
    if (!productGroups.has(key)) {
      productGroups.set(key, {
        name: r.Product_Name,
        category: r.Category,
        tier: r.Tier,
        unit: r.Unit,
        ratings: [],
      });
    }
    productGroups.get(key)!.ratings.push(r.Rating);
  }

  const productEntries = [...productGroups.entries()];
  const productInsertValues = productEntries.map(([, g]) => {
    const pool = POOLS[g.category]!;
    const avgRating = (
      g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length
    ).toFixed(1);
    return {
      name: g.name,
      categoryId: catMap.get(g.category)!,
      brand: pick(pool.brand),
      rawMaterial: pick(pool.material),
      color: pick(pool.color),
      size: pick(pool.size),
      unit: g.unit,
      tier: TIER_MAP[g.tier]!,
      description: `${g.name} - خامة ${pick(pool.material)} بجودة ${g.tier === "فاخرة" ? "ممتازة" : g.tier === "متوسطة" ? "جيدة" : "اقتصادية"}.`,
      rating: avgRating,
    };
  });

  const productRows = await db
    .insert(products)
    .values(productInsertValues)
    .returning({ id: products.id, name: products.name, tier: products.tier });
  // map back using same order as productEntries
  const productIdMap = new Map<string, number extends never ? never : any>();
  productEntries.forEach(([key], i) =>
    productIdMap.set(key, productRows[i]!.id),
  );

  // ---------- 4. product images ----------
  const imageUrls = getImageUrls();
  for (const batch of chunk(productRows, 300)) {
    await db.insert(productImages).values(
      batch.map((p) => ({
        productId: p.id,
        url: pick(imageUrls),
        isPrimary: true,
        sortOrder: 0,
      })),
    );
  }

  // ---------- 5. listings (aggregate duplicate product+store rows by mean price) ----------
  const listingGroups = new Map<
    string,
    { productKey: string; storeKey: string; prices: number[] }
  >();
  for (const r of rows) {
    const productKey = `${r.Product_Name}||${r.Category}||${r.Tier}`;
    const storeKey = `${r.Supplier_Name}||${r.City}`;
    const key = `${productKey}###${storeKey}`;
    if (!listingGroups.has(key))
      listingGroups.set(key, { productKey, storeKey, prices: [] });
    listingGroups.get(key)!.prices.push(r.Price_EGP);
  }

  const listingInsertValues = [...listingGroups.values()].map((g) => ({
    productId: productIdMap.get(g.productKey)!,
    storeId: storeMap.get(g.storeKey)!,
    price: (g.prices.reduce((a, b) => a + b, 0) / g.prices.length).toFixed(2),
    inStock: Math.random() > 0.15,
  }));

  for (const batch of chunk(listingInsertValues, 300)) {
    await db.insert(listings).values(batch).onConflictDoNothing();
  }

  console.log(
    `Done: ${catRows.length} categories, ${storeRows.length} stores, ${productRows.length} products, ${listingInsertValues.length} listings.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
