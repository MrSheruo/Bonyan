"use client";
import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

const COLORS = [
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Terracotta", hex: "#E2725B" },
  { name: "Saddle Brown", hex: "#8B4513" },
  { name: "Dark Slate Gray", hex: "#2F4F4F" },
  { name: "Cornsilk", hex: "#FFF8DC" },
];

const BRANDS = [
  "سيبا",
  "دهانات الأهرام",
  "هاي كلاس كيتشن",
  "هيبا",
  "شنايدر ستايل",
  "السويدي إليكتريك",
];

interface Params {
  categories: {
    id: string;
    name: string;
  }[];
}

export const FiltersSidebar = ({ categories = [] }: Params) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedCategories =
    searchParams.get("category")?.split(",").filter(Boolean) ?? [];
  const selectedColor = searchParams.get("color") ?? "";
  const selectedBrand = searchParams.get("brand") ?? "";
  const selectedMinRating = searchParams.get("minRating") ?? "";
  const [price, setPrice] = useState(Number(searchParams.get("price")) || 1000);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router],
  );

  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    updateParams({ category: next.join(",") || null });
  };

  const toggleBrand = (brand: string) => {
    updateParams({ brand: selectedBrand === brand ? null : brand });
  };

  const setMinRating = (rating: number) => {
    const strVal = String(rating);
    updateParams({ minRating: selectedMinRating === strVal ? null : strVal });
  };

  const handlePriceCommit = (value: number) => {
    updateParams({ price: value === 1000 ? null : String(value) });
  };

  const resetFilters = () => {
    setPrice(1000);
    router.push(pathname);
  };

  return (
    <aside className="w-72 shrink-0 hidden lg:flex flex-col gap-8">
      {categories.length > 0 && (
        <div className="pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold text-lg mb-4">Categories</h3>
          <div className="flex flex-col gap-3 text-sm max-h-60 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <Label
                key={cat.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <Checkbox
                  checked={selectedCategories.includes(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                />
                <span
                  className={`group-hover:text-primary transition-colors ${
                    selectedCategories.includes(cat.id)
                      ? "text-primary font-medium"
                      : ""
                  }`}
                >
                  {cat.name}
                </span>
              </Label>
            ))}
          </div>
        </div>
      )}

      {/* Brands */}
      <div className="pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="font-semibold text-lg mb-4">Brands</h3>
        <div className="flex flex-col gap-3 text-sm">
          {BRANDS.map((brand) => (
            <Label
              key={brand}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={selectedBrand === brand}
                onCheckedChange={() => toggleBrand(brand)}
              />
              <span
                className={`group-hover:text-primary transition-colors ${
                  selectedBrand === brand ? "text-primary font-medium" : ""
                }`}
              >
                {brand}
              </span>
            </Label>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="font-semibold text-lg mb-4">Minimum Rating</h3>
        <div className="flex flex-col gap-2 text-sm">
          {[5, 4, 3, 2, 1].map((stars) => {
            const isSelected = selectedMinRating === String(stars);
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setMinRating(stars)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < stars
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-300 dark:text-neutral-600"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs">{stars} & up</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Colors */}
      <div className="pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="font-semibold text-lg mb-4">Colors</h3>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => (
            <button
              key={c.name}
              aria-label={c.name}
              onClick={() =>
                updateParams({
                  color: selectedColor === c.name ? null : c.name,
                })
              }
              style={{ backgroundColor: c.hex }}
              className={`w-8 h-8 rounded-full border border-neutral-300 ring-2 transition-transform hover:scale-110 cursor-pointer ${
                selectedColor === c.name ? "ring-primary scale-110" : "ring-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={resetFilters}
        variant="outline"
        className="mt-2 w-full text-primary border-neutral-200 dark:border-neutral-800 cursor-pointer"
      >
        Reset Filters
      </Button>
    </aside>
  );
};
