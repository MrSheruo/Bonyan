"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, Loader2, Star, Check } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AddToCartDialog } from "./add-to-cart-dialog";
import { type Product } from "@/lib/api/products";
import { useUser } from "@/lib/hooks/use-auth";
import { useAddToCart } from "@/lib/hooks/use-cart";
import { useSavedItemsStore } from "@/lib/stores/saved-items-store";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  savedListingId?: string;
  savedPrice?: number;
}

export const ProductCard = ({
  product,
  savedListingId,
  savedPrice,
}: ProductCardProps) => {
  const router = useRouter();
  const { isAuthenticated, isAuthReady } = useUser();
  const addToCartMutation = useAddToCart();

  const isSaved = useSavedItemsStore((s) => s.isSaved);
  const addItem = useSavedItemsStore((s) => s.addItem);
  const removeItem = useSavedItemsStore((s) => s.removeItem);

  const productSaved = isSaved(product.id);

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  // Extract images
  const primaryImage = product.images?.find((i) => i.isPrimary)?.url;
  const otherImages = (product.images || [])
    .filter((i) => !i.isPrimary)
    .map((i) => i.url);
  const rawList = primaryImage
    ? [primaryImage, ...otherImages]
    : (product.images || []).map((i) => i.url);
  const filteredList = rawList.filter((url): url is string =>
    Boolean(url && url.trim().length > 0),
  );
  const imageList =
    filteredList.length > 0 ? filteredList : ["/hero/hero_1.jpg"];

  // Snapshot mode detection: savedListingId was passed — treat as saved snapshot.
  const isSnapshotMode =
    typeof savedListingId === "string" && savedListingId.length > 0;

  // Listings & Price calculations
  const listings = (product.listings || []).filter(Boolean);
  const hasMultipleListings = listings.length > 1;
  const inStockListings = listings.filter((l) => l.inStock);
  const isAvailable = isSnapshotMode ? true : inStockListings.length > 0;

  // Find lowest price listing (same logic used for "from $X" display + save snapshot)
  const sortedByPrice = [...listings].sort(
    (a, b) => Number(a.effectivePrice) - Number(b.effectivePrice),
  );
  const lowestListing = sortedByPrice[0];

  const snapshotEffectivePrice =
    isSnapshotMode && typeof savedPrice === "number" ? savedPrice : undefined;

  const effectivePrice =
    snapshotEffectivePrice !== undefined
      ? snapshotEffectivePrice
      : lowestListing
        ? lowestListing.effectivePrice
        : null;

  const originalPrice =
    lowestListing && lowestListing.hasDiscount ? lowestListing.price : null;
  const storeName = lowestListing?.store?.name || product.brand || "Bonyan";

  const handleToggleSave = () => {
    if (productSaved) {
      removeItem(product.id);
      toast.info("Removed from saved items");
      return;
    }

    // Snapshots the CHEAPEST listing (same as "from $X" logic)
    const snapshotListing = lowestListing;
    if (!snapshotListing && !isSnapshotMode) {
      toast.error("No listing available to save");
      return;
    }

    const listingId = snapshotListing
      ? String(snapshotListing.id)
      : String(savedListingId);
    const price =
      snapshotEffectivePrice !== undefined
        ? snapshotEffectivePrice
        : snapshotListing
          ? Number(snapshotListing.effectivePrice)
          : Number(savedPrice ?? 0);

    addItem({
      productId: product.id,
      listingId,
      name: product.name,
      image: imageList[0] ?? "/hero/hero_1.jpg",
      brand: product.brand ?? null,
      rating:
        product.rating !== null && product.rating !== undefined
          ? Number(product.rating).toFixed(1)
          : "0.0",
      price,
    });
    toast.success("Saved to your items");
  };

  const handleAddToCart = () => {
    if (!isAuthReady) {
      toast.info("Still checking your session… please try again in a moment.");
      return;
    }
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!isAvailable) {
      return;
    }

    if (isSnapshotMode) {
      addToCartMutation.mutate(
        { listingId: Number(savedListingId), quantity: 1 },
        {
          onSuccess: () => {
            setJustAdded(true);
            setTimeout(() => setJustAdded(false), 1500);
          },
        },
      );
      return;
    }

    if (listings.length === 0) {
      return;
    }

    if (listings.length === 1) {
      addToCartMutation.mutate(
        { listingId: listings[0].id, quantity: 1 },
        {
          onSuccess: () => {
            setJustAdded(true);
            setTimeout(() => setJustAdded(false), 1500);
          },
        },
      );
    } else {
      setDialogOpen(true);
    }
  };

  const primaryImageUrl = imageList[0] ?? "/hero/hero_1.jpg";

  return (
    <>
      <div className="group flex flex-col bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border/50">
        <div className="relative aspect-4/5 bg-muted/40">
          {product.tier && (
            <Badge
              variant="secondary"
              className="absolute top-4 left-4 z-10 text-xs capitalize bg-background/80 backdrop-blur-xs"
            >
              {product.tier}
            </Badge>
          )}

          <button
            type="button"
            onClick={handleToggleSave}
            aria-label={productSaved ? "Remove from saved" : "Save for later"}
            aria-pressed={productSaved}
            className={`absolute top-4 right-4 z-10 w-9 h-9 bg-background/90 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs transition-colors cursor-pointer ${
              productSaved
                ? "text-red-500 hover:bg-red-50"
                : "text-muted-foreground hover:text-red-500 hover:bg-red-50/50"
            }`}
          >
            <Heart
              className="h-4 w-4 transition-transform"
              fill={productSaved ? "currentColor" : "none"}
            />
          </button>

          <Carousel
            setApi={setApi}
            plugins={[Autoplay({ delay: 5000 })]}
            opts={{ loop: true, skipSnaps: false, align: "start" }}
            className="w-full h-full"
          >
            <CarouselContent className="h-full ml-0">
              {imageList.map((imgUrl, index) => (
                <CarouselItem key={index} className="h-full pl-0 relative">
                  <Image
                    src={imgUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {count > 1 && (
            <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1">
              {Array.from({ length: count }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === current ? "bg-primary w-3" : "bg-background/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-primary text-xs font-semibold tracking-wider uppercase truncate max-w-[70%]">
                {storeName}
              </span>
              {product.rating !== null && product.rating !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{Number(product.rating).toFixed(1)}</span>
                </div>
              )}
            </div>

            <Link
              href={`/product/${encodeURIComponent(product.id)}`}
              className="font-bold text-foreground text-base line-clamp-1 group-hover:text-primary transition-colors cursor-pointer"
            >
              {product.name}
            </Link>

            {product.brand && (
              <p className="text-xs text-muted-foreground">{product.brand}</p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-baseline gap-2">
              {effectivePrice !== null ? (
                <>
                  <p className="font-bold text-primary text-xl">
                    {!isSnapshotMode && hasMultipleListings && (
                      <span className="text-xs font-normal text-muted-foreground mr-1">
                        from
                      </span>
                    )}
                    ${effectivePrice}
                  </p>
                  {originalPrice !== null && !isSnapshotMode && (
                    <p className="text-muted-foreground line-through text-sm">
                      ${originalPrice}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  Unavailable
                </p>
              )}
            </div>

            <Button
              type="button"
              onClick={handleAddToCart}
              disabled={!isAvailable || addToCartMutation.isPending}
              className="w-full transition-all cursor-pointer"
            >
              {addToCartMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : justAdded ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-400" />
                  Added!
                </>
              ) : !isAvailable ? (
                "Out of Stock"
              ) : !isSnapshotMode && hasMultipleListings ? (
                "Choose Seller"
              ) : (
                "Add to Cart"
              )}
            </Button>
          </div>
        </div>
      </div>

      {!isSnapshotMode ? (
        <AddToCartDialog
          product={product}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      ) : null}
    </>
  );
};
