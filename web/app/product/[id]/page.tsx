"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Minus as MinusIcon,
  Plus as PlusIcon,
  ShoppingCart as CartIcon,
  Loader2 as Loader2Icon,
  Star as StarIcon,
  Truck as TruckIcon,
  ShieldCheck as ShieldCheckIcon,
  ArrowLeft as ArrowLeftIcon,
  Check as CheckIcon,
  Store as StoreIcon,
  MapPin as MapPinIcon,
  Heart as HeartIcon,
} from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useProduct } from "@/lib/hooks/use-products";
import { useUser } from "@/lib/hooks/use-auth";
import { useAddToCart } from "@/lib/hooks/use-cart";
import {
  useSavedItemsStore,
  type SavedItem,
} from "@/lib/stores/saved-items-store";
import type { Product, ProductListing } from "@/lib/api/products";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QTY_MIN = 1;
const QTY_MAX = 99;

function starFill(rating: number): (1 | 0)[] {
  const whole = Math.floor(rating);
  return Array.from({ length: 5 }, (_, i) => (i < whole ? 1 : 0)) as (1 | 0)[];
}

interface ListingCardProps {
  listing: ProductListing;
  selected: boolean;
  onSelect: (id: number) => void;
}

function ListingCard({ listing, selected, onSelect }: ListingCardProps) {
  const originalPrice = listing.hasDiscount ? Number(listing.price) : null;
  const discountPct =
    originalPrice !== null && originalPrice > 0
      ? Math.round(100 - (listing.effectivePrice / originalPrice) * 100)
      : 0;

  return (
    <button
      type="button"
      onClick={() => listing.inStock && onSelect(listing.id)}
      disabled={!listing.inStock}
      aria-pressed={selected}
      className={cn(
        "group w-full text-left rounded-xl border-2 p-4 transition-all relative cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
          : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
            selected
              ? "border-primary bg-primary"
              : "border-input bg-background group-hover:border-primary/40",
          )}
        >
          {selected ? (
            <CheckIcon className="size-3 text-primary-foreground" />
          ) : null}
        </span>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
              {listing.store.name}
            </span>
            {listing.store.city ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPinIcon className="h-3 w-3" />
                {listing.store.city}
              </span>
            ) : null}
            {!listing.inStock ? (
              <Badge
                variant="outline"
                className="text-muted-foreground border-muted ml-auto"
              >
                Out of stock
              </Badge>
            ) : listing.hasDiscount ? (
              <Badge className="ml-auto bg-accent text-accent-foreground border-transparent">
                -{discountPct}%
              </Badge>
            ) : null}
          </div>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="font-bold text-lg text-primary">
              ${listing.effectivePrice}
            </span>
            {originalPrice !== null &&
            originalPrice !== listing.effectivePrice ? (
              <span className="text-sm text-muted-foreground line-through">
                ${originalPrice}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data: product, isLoading, isError, error } = useProduct(id);

  const router = useRouter();
  const { isAuthenticated, isAuthReady } = useUser();
  const addToCart = useAddToCart();

  const savedItemsAdd = useSavedItemsStore((s) => s.addItem);
  const savedItemsRemove = useSavedItemsStore((s) => s.removeItem);
  const savedItemsIsSaved = useSavedItemsStore((s) => s.isSaved);
  const isSaved = id ? savedItemsIsSaved(id) : false;

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselCount, setCarouselCount] = useState(0);

  const [qty, setQty] = useState(1);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(
    null,
  );
  const [justAdded, setJustAdded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Extract images
  const primaryImage = product?.images?.find((i) => i.isPrimary)?.url;
  const otherImages = (product?.images || [])
    .filter((i) => !i.isPrimary)
    .map((i) => i.url);
  const rawList = primaryImage
    ? [primaryImage, ...otherImages]
    : (product?.images || []).map((i) => i.url);
  const filteredList = rawList.filter((url): url is string =>
    Boolean(url && url.trim().length > 0),
  );
  const imageList =
    filteredList.length > 0 ? filteredList : ["/hero/hero_1.jpg"];

  useEffect(() => {
    if (!carouselApi) return;
    setCarouselCount(carouselApi.scrollSnapList().length);
    setCarouselIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () =>
      setCarouselIndex(carouselApi.selectedScrollSnap()),
    );
  }, [carouselApi]);

  // Auto-select listing (if 1) on product load
  useEffect(() => {
    if (!product) return;
    const listings = product.listings || [];
    if (listings.length === 1) {
      setSelectedListingId(listings[0].id);
    } else {
      const inStock = listings.find((l) => l.inStock);
      if (inStock && listings.length > 1 && selectedListingId === null) {
        // Don't auto-pick when many — let user choose
      }
    }
    setQty(1);
    setActionError(null);
  }, [product?.id]);

  const sortedByPrice = useMemo(
    () =>
      product
        ? [...(product.listings || [])].sort(
            (a, b) => Number(a.effectivePrice) - Number(b.effectivePrice),
          )
        : [],
    [product],
  );
  const lowestListing = sortedByPrice[0];
  const selectedListing =
    product?.listings?.find((l) => l.id === selectedListingId) ?? null;

  const hasMultipleListings = (product?.listings?.length ?? 0) > 1;
  const fromPriceText = lowestListing
    ? hasMultipleListings
      ? `from $${lowestListing.effectivePrice}`
      : `$${lowestListing.effectivePrice}`
    : "";

  const ratingNumber =
    product?.rating !== null && product?.rating !== undefined
      ? Number(product.rating)
      : 0;
  const starStates = starFill(ratingNumber);

  const decQty = () => setQty((q) => Math.max(QTY_MIN, q - 1));
  const incQty = () => setQty((q) => Math.min(QTY_MAX, q + 1));

  const canAct =
    selectedListing !== null && selectedListing.inStock && qty >= 1;

  const requireAuth =
    <T extends (...a: any[]) => void>(fn: T) =>
    (...args: Parameters<T>) => {
      if (!isAuthReady) {
        toast.info(
          "Still checking your session… please try again in a moment.",
        );
        return;
      }
      if (!isAuthenticated) {
        router.push("/login");
        return;
      }
      return fn(...args);
    };

  const toggleSave = () => {
    if (!product) return;
    if (isSaved) {
      savedItemsRemove(product.id);
      toast.info("Removed from saved items");
      return;
    }
    const snapshot = lowestListing;
    if (!snapshot) {
      toast.error("No listing available to save");
      return;
    }
    const item: SavedItem = {
      productId: product.id,
      listingId: String(snapshot.id),
      name: product.name,
      image: imageList[0],
      brand: product.brand ?? null,
      rating: ratingNumber.toFixed(1),
      price: Number(snapshot.effectivePrice),
    };
    savedItemsAdd(item);
    toast.success("Saved to your items");
  };

  const handleAddToCart = requireAuth(async () => {
    if (!selectedListing) {
      setActionError("Please select a seller before adding to cart.");
      return;
    }
    setActionError(null);
    try {
      await addToCart.mutateAsync({
        listingId: selectedListing.id,
        quantity: qty,
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
      toast.success(`Added ${qty} × ${product?.name ?? "item"} to cart`);
    } catch (err) {
      const msg =
        err instanceof Error && (err as any).name === "ApiError"
          ? ((err as any).message ?? "Failed to add to cart")
          : "Failed to add to cart";
      setActionError(msg);
      toast.error(msg);
    }
  });

  const handleBuyNow = requireAuth(() => {
    if (!product || !selectedListing) {
      setActionError("Please select a seller before buying.");
      return;
    }
    setActionError(null);
    const params = new URLSearchParams({
      listingId: String(selectedListing.id),
      productId: String(product.id),
      quantity: String(qty),
    });
    router.push(`/checkout?${params.toString()}`);
  });

  if (isLoading) {
    return (
      <main className="w-full bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-2xl bg-muted/60" />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="aspect-square rounded-xl bg-muted/60"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-5 pt-4">
              <Skeleton className="h-5 w-40 bg-muted/60" />
              <Skeleton className="h-11 w-full bg-muted/60 rounded-lg" />
              <Skeleton className="h-6 w-1/3 bg-muted/60" />
              <Skeleton className="h-24 w-full bg-muted/60 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !product) {
    return (
      <main className="w-full bg-background">
        <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Product not found
          </h1>
          <Alert className="bg-destructive/10 border-destructive/30 text-left w-full">
            <AlertTitle className="text-sm text-destructive">
              Unable to load product
            </AlertTitle>
            <AlertDescription className="text-sm text-destructive/90">
              {error instanceof Error
                ? error.message
                : "This product may have been removed or the link may be invalid."}
            </AlertDescription>
          </Alert>
          <Link
            href="/products"
            className={cn(
              "inline-flex items-center gap-2",
              cn("inline-flex items-center gap-2"),
              Button.prototype.className,
            )}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to all products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12">
        <div className="mb-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="hover:text-foreground">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/products"
                  className="hover:text-foreground"
                >
                  All products
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1 max-w-[42ch]">
                  {product.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* IMAGE CAROUSEL + THUMBNAILS */}
          <div className="space-y-4 sticky top-6">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-border/60 bg-muted/40 shadow-sm">
              <Carousel
                setApi={setCarouselApi}
                opts={{ loop: true, align: "start" }}
                plugins={
                  imageList.length > 1
                    ? [Autoplay({ delay: 6000, stopOnInteraction: true })]
                    : []
                }
                className="w-full h-full"
              >
                <CarouselContent className="h-full ml-0">
                  {imageList.map((img, i) => (
                    <CarouselItem key={i} className="h-full pl-0 relative">
                      <Image
                        src={img}
                        alt={product.name}
                        fill
                        priority={i === 0}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              <button
                type="button"
                onClick={toggleSave}
                aria-label={isSaved ? "Remove from saved" : "Save for later"}
                className={cn(
                  "absolute top-4 right-4 z-10 w-10 h-10 bg-background/90 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs transition-colors cursor-pointer",
                  isSaved
                    ? "text-red-500 hover:bg-red-50"
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-50/50",
                )}
              >
                <HeartIcon
                  className="h-5 w-5"
                  fill={isSaved ? "currentColor" : "none"}
                />
              </button>

              {product.tier ? (
                <Badge
                  variant="secondary"
                  className="absolute top-4 left-4 z-10 capitalize bg-background/80 backdrop-blur-xs"
                >
                  {product.tier}
                </Badge>
              ) : null}
            </div>

            {imageList.length > 1 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {imageList.map((img, i) => {
                  const active = i === carouselIndex;
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        carouselApi?.scrollTo(i);
                        setCarouselIndex(i);
                      }}
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
                        active
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-border/70",
                      )}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} thumbnail ${i + 1}`}
                        fill
                        sizes="(max-width: 640px) 25vw, 16vw"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
                {carouselCount > imageList.length
                  ? Array.from({
                      length: carouselCount - imageList.length,
                    }).map((_, i) => (
                      <div
                        key={`dup-${i}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-border/40"
                      />
                    ))
                  : null}
              </div>
            ) : null}
          </div>

          {/* INFO COLUMN */}
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {product.brand ? (
                  <p className="text-primary text-sm font-semibold tracking-wider uppercase">
                    {product.brand}
                  </p>
                ) : (
                  <span className="h-4" />
                )}
                {product.rating !== null && product.rating !== undefined ? (
                  <div
                    className="inline-flex items-center gap-1.5"
                    title={`Rated ${ratingNumber.toFixed(1)} / 5`}
                  >
                    <span className="inline-flex">
                      {starStates.map((fill, i) => (
                        <StarIcon
                          key={i}
                          className="h-4 w-4"
                          style={{
                            color: fill === 0 ? "#cbd5e1" : "#f59e0b",
                          }}
                          fill={fill > 0 ? "currentColor" : "none"}
                        />
                      ))}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {ratingNumber.toFixed(1)}
                    </span>
                  </div>
                ) : null}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3 pt-1">
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {fromPriceText}
                </p>
              </div>
            </div>

            {product.description ? (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  About this piece
                </h2>
                <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="inline-flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TruckIcon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    Free artisan delivery
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Within 2–5 business days
                  </span>
                </div>
              </div>
              <div className="inline-flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="inline-flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                  <ShieldCheckIcon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    Handmade guarantee
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Verified artisan makers
                  </span>
                </div>
              </div>
            </div>

            {/* LISTINGS */}
            {hasMultipleListings ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Choose a seller
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {(product.listings || []).filter((l) => l.inStock).length}{" "}
                    in stock
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {(product.listings || []).map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      selected={selectedListingId === listing.id}
                      onSelect={setSelectedListingId}
                    />
                  ))}
                </div>
              </div>
            ) : selectedListingId === null ? (
              <div className="text-sm text-muted-foreground">
                No sellers available for this product right now.
              </div>
            ) : null}

            {/* QUANTITY STEPPER + CTAS */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="inline-flex items-center rounded-xl border border-border/70 bg-background overflow-hidden">
                  <button
                    type="button"
                    onClick={decQty}
                    disabled={qty <= QTY_MIN}
                    aria-label="Decrease quantity"
                    className="px-3 h-11 text-lg text-foreground disabled:text-muted-foreground disabled:opacity-50 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <div
                    role="status"
                    aria-label={`Quantity: ${qty}`}
                    className="h-11 min-w-13 flex items-center justify-center px-3 font-semibold text-foreground border-x border-border/70"
                  >
                    {qty}
                  </div>
                  <button
                    type="button"
                    onClick={incQty}
                    disabled={qty >= QTY_MAX}
                    aria-label="Increase quantity"
                    className="px-3 h-11 text-lg text-foreground disabled:text-muted-foreground disabled:opacity-50 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                {selectedListing?.inStock === false ? (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-muted h-9"
                  >
                    Out of stock
                  </Badge>
                ) : null}
              </div>

              {actionError ? (
                <Alert className="bg-destructive/10 border-destructive/30">
                  <AlertTitle className="text-sm text-destructive">
                    Could not complete action
                  </AlertTitle>
                  <AlertDescription className="text-sm text-destructive/90">
                    {actionError}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAct || addToCart.isPending}
                  onClick={handleAddToCart}
                  className="h-12 text-sm md:text-base cursor-pointer"
                >
                  {addToCart.isPending ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Adding…
                    </>
                  ) : justAdded ? (
                    <>
                      <CheckIcon className="mr-2 h-4 w-4 text-green-500" />
                      Added!
                    </>
                  ) : (
                    <>
                      <CartIcon className="mr-2 h-4 w-4" />
                      Add to Cart
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  disabled={!canAct}
                  onClick={handleBuyNow}
                  className="h-12 text-sm md:text-base cursor-pointer"
                >
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
