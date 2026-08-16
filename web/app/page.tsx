import { categoryCardsInfo } from "@/components/data/category";
import { mockProducts } from "@/components/data/products";
import HeroSection from "@/components/hero-section";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type Product } from "@/lib/api/products";

function toProductShape(mock: any): Product {
  return {
    id: String(mock.id),
    name: mock.name,
    tier: mock.badge,
    images: (mock.images || []).map((url: string, idx: number) => ({
      url,
      isPrimary: idx === 0,
    })),
    listings: [
      {
        id: typeof mock.id === "number" ? mock.id : 1,
        productId: String(mock.id),
        storeId: "store-1",
        price: mock.price,
        effectivePrice: Number(mock.price),
        inStock: true,
        hasDiscount: false,
        discountEndsAt: null,
        store: { id: "store-1", name: mock.store || "Bonyan", city: "Cairo" },
      },
    ],
  };
}

const HomePage = async () => {
  let realProducts: Product[] = [];
  try {
    const res = await fetch("http://localhost:8080/products", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      realProducts = data.items || [];
    }
  } catch {
    realProducts = [];
  }

  const featured = realProducts.length > 0 ? realProducts.slice(0, 6) : mockProducts.slice(0, 5).map(toProductShape);
  const newArrivals = realProducts.length > 6 ? realProducts.slice(6, 12) : mockProducts.slice(4, 10).map(toProductShape);

  return (
    <main className="flex flex-col gap-20 mb-32">
      {/* HERO Section */}
      <section className="w-full relative">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 z-10 flex flex-col items-start justify-start gap-4 px-10 md:px-20 text-white">
          <h1 className="text-3xl md:text-5xl font-bold">
            Crafted for Slow Living.
          </h1>
          <p className="max-w-md">
            Discover artisanal furniture pieces that bring warmth, texture, and
            enduring structure to your sanctuary.
          </p>
          <Button className="mt-2 px-6 py-4" size={"lg"}>
            <Link
              className="flex items-center gap-2 font-semibold"
              href={"/search"}
            >
              Shop Collection
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <div>
          <HeroSection />
        </div>
      </section>

      {/* CATEGORIES Section */}
      <section className="w-full flex flex-col gap-16 px-16">
        <h2 className="text-xl font-semibold">Browse By Space</h2>
        <div className="grid grid-cols-5 w-full pl-32">
          {categoryCardsInfo.map((categoryCard) => (
            <CategoryCard key={categoryCard.id} href={categoryCard.href}>
              {categoryCard.icon}
              {categoryCard.name}
            </CategoryCard>
          ))}
        </div>
      </section>

      {/* PRODUCTS Section */}
      <section className="flex flex-col gap-5 px-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Featured Craftsmanship</h2>
          <Link
            href="/search"
            className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex justify-between gap-4 overflow-x-auto px-4 pb-4">
          {featured.map((product) => (
            <div key={product.id} className="w-64 shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5 px-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Arrivals</h2>
          <Link
            href="/search"
            className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex justify-between gap-4 overflow-x-auto px-4 pb-4">
          {newArrivals.map((product) => (
            <div key={product.id} className="w-64 shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default HomePage;

export const CategoryCard = ({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 font-semibold w-40 h-40 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors duration-500 cursor-pointer text-center"
    >
      {children}
    </Link>
  );
};
