import { db } from "./db.js";
import { auth } from "@/shared/auth.js";
import { supabaseAdmin } from "@/shared/supabase.js";
import {
  user,
  categories,
  products,
  productImages,
  stores,
  listings,
  addresses,
  carts,
  cartItems,
} from "./schema.js";
import { eq } from "drizzle-orm";

const PASSWORD = "test0123";
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
function getImageUrls(): string[] {
  return IMAGE_FILES.map((file) => {
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(file);
    return data.publicUrl;
  });
}

const TABLE_PRODUCTS = [
  {
    name: "Nordic Dining Table",
    brand: "IKEA",
    material: "Solid Pine",
    color: "White",
    size: "Medium (4-seater)",
    desc: "Minimalist Scandinavian dining table with clean lines.",
  },
  {
    name: "Harrison Extendable Table",
    brand: "West Elm",
    material: "Oak Wood",
    color: "Walnut",
    size: "Large (6-seater)",
    desc: "Extendable oak table, seats up to 8 when open.",
  },
  {
    name: "Marlow Round Table",
    brand: "Article",
    material: "Solid Pine",
    color: "Oak",
    size: "Small (2-seater)",
    desc: "Compact round table, perfect for small dining rooms.",
  },
  {
    name: "Elston Glass Top Table",
    brand: "CB2",
    material: "Tempered Glass",
    color: "Black",
    size: "Medium (4-seater)",
    desc: "Modern glass-top table with a matte black steel frame.",
  },
  {
    name: "Rustic Farmhouse Table",
    brand: "Ashley Furniture",
    material: "Oak Wood",
    color: "Walnut",
    size: "Large (6-seater)",
    desc: "Farmhouse-style table with a distressed wood finish.",
  },
  {
    name: "Marble Coffee Table",
    brand: "West Elm",
    material: "Marble",
    color: "White",
    size: "Small (2-seater)",
    desc: "Elegant marble-top coffee table with brass legs.",
  },
  {
    name: "Industrial Console Table",
    brand: "Wayfair",
    material: "Steel & Glass",
    color: "Black",
    size: "Small (2-seater)",
    desc: "Industrial-style console table with a steel frame.",
  },
  {
    name: "Kensington Dining Table",
    brand: "Ashley Furniture",
    material: "Oak Wood",
    color: "Grey",
    size: "Extra Large (8-seater)",
    desc: "Large family dining table, seats up to 10.",
  },
  {
    name: "Copenhagen Side Table",
    brand: "IKEA",
    material: "Solid Pine",
    color: "White",
    size: "Small (2-seater)",
    desc: "Simple side table, great next to a sofa or bed.",
  },
  {
    name: "Milano Marble Dining Table",
    brand: "CB2",
    material: "Marble",
    color: "White",
    size: "Large (6-seater)",
    desc: "Statement dining table with a genuine marble top.",
  },
];

async function main() {
  console.log("Seeding: 3 real users...");
  const userSpecs = [
    { name: "Ahmed Salah", email: "ahmed.salah@example.com" },
    { name: "Mariam Hassan", email: "mariam.hassan@example.com" },
    { name: "Youssef Adel", email: "youssef.adel@example.com" },
  ];

  const seededUsers: { id: string }[] = [];
  for (const spec of userSpecs) {
    const result = await auth.api.signUpEmail({
      body: { email: spec.email, password: PASSWORD, name: spec.name },
    });
    await db
      .update(user)
      .set({ role: "user" })
      .where(eq(user.id, result.user.id));
    seededUsers.push({ id: result.user.id });
    console.log(`  created ${spec.email}`);
  }

  console.log("Seeding: Tables category...");
  const [tablesCategory] = await db
    .insert(categories)
    .values({ name: "Tables", imageUrl: null })
    .returning({ id: categories.id });

  console.log("Seeding: 1 store...");
  const [store] = await db
    .insert(stores)
    .values({
      name: "Home & Co",
      city: "Cairo",
      location: "Cairo District 5",
      ownerName: "Store Owner",
      contactNumber: "+20 100 000 0000",
      verified: true,
      ownerId: seededUsers[0]!.id,
    })
    .returning({ id: stores.id });

  console.log("Seeding: table products...");
  const insertedProducts = await db
    .insert(products)
    .values(
      TABLE_PRODUCTS.map((p) => ({
        name: p.name,
        categoryId: tablesCategory!.id,
        brand: p.brand,
        rawMaterial: p.material,
        color: p.color,
        size: p.size,
        unit: "piece",
        tier: pick(["economy", "standard", "luxury"] as const),
        description: p.desc,
        rating: (Math.round((3.5 + Math.random() * 1.4) * 10) / 10).toFixed(1),
      })),
    )
    .returning({ id: products.id });

  console.log("Seeding: product images (random from Supabase bucket)...");
  const imageUrls = getImageUrls();
  await db.insert(productImages).values(
    insertedProducts.map((p) => ({
      productId: p.id,
      url: pick(imageUrls),
      isPrimary: true,
      sortOrder: 0,
    })),
  );

  console.log("Seeding: listings...");
  const insertedListings = await db
    .insert(listings)
    .values(
      insertedProducts.map((p) => ({
        productId: p.id,
        storeId: store!.id,
        price: String(randInt(80, 900)),
        inStock: true,
      })),
    )
    .returning({ id: listings.id, price: listings.price });

  console.log("Seeding: addresses...");
  await db.insert(addresses).values(
    seededUsers.map((u) => ({
      userId: u.id,
      label: "home" as const,
      line1: `${randInt(1, 100)} Tahrir St`,
      city: "Cairo",
      governorate: "Cairo",
      postalCode: "11511",
      isDefault: true,
    })),
  );

  console.log("Seeding: carts + cart items...");
  for (const u of seededUsers) {
    const [cart] = await db
      .insert(carts)
      .values({ userId: u.id, status: "active" })
      .returning({ id: carts.id });

    const items = [pick(insertedListings), pick(insertedListings)];
    for (const item of items) {
      await db
        .insert(cartItems)
        .values({
          cartId: cart!.id,
          listingId: item.id,
          quantity: randInt(1, 2),
          priceAtAdd: item.price,
        })
        .onConflictDoNothing();
    }
  }

  console.log("Seed complete.");
  console.log(`Login: any of the 3 emails above, password "${PASSWORD}"`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
