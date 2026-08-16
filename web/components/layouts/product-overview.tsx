"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { Product } from "../data/product-overview-1-data";

export function ProductOverview({ product }: { product: Product }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(
    product.sizes[0],
  );
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.scrollTo(selectedImage);

    const handleSelect = () => {
      const currentIndex = carouselApi.selectedScrollSnap();
      setSelectedImage(currentIndex);
    };

    carouselApi.on("select", handleSelect);
    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi, selectedImage]);

  return (
    <div>
      <section className="@container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 py-4 lg:flex-row lg:gap-8 lg:py-6 xl:gap-12 xl:py-12">
          {/* Main Image + Thumbnails */}
          <div className="flex flex-col gap-4 lg:w-1/2">
            <Carousel setApi={setCarouselApi} className="w-full">
              <CarouselContent>
                {product.images.map((image) => (
                  <CarouselItem key={image.id}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-90 rounded-lg object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            <div className="flex flex-wrap gap-4">
              {product.images.map((image, index) => (
                <div
                  key={image.id}
                  onMouseEnter={() => setSelectedImage(index)}
                  className={cn(
                    "ring-offset-background size-16 cursor-pointer overflow-hidden rounded-sm ring-offset-2 transition-all lg:size-18",
                    selectedImage === index && "ring-foreground ring-2",
                  )}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="size-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info + Attributes */}
          <div className="flex flex-col gap-6 lg:w-1/2 lg:gap-10">
            <div className="flex flex-col gap-2 lg:gap-4">
              <span className="text-sm font-semibold tracking-wide uppercase">
                {product.brand} —
              </span>
              <h2 className="text-xl font-bold tracking-tight text-balance lg:text-3xl">
                {product.name}
              </h2>
              <p className="text-muted-foreground text-balance">
                {product.description}
              </p>
            </div>

            {/* Reviews */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">Reviews</h3>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="text-foreground size-5"
                    fill={i < product.rating ? "currentColor" : "none"}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">Sizes</h3>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    onClick={() => setSelectedSize(size)}
                    className="h-9 px-4 py-2 size-12 cursor-pointer rounded-full p-0"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">Color</h3>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <Button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "h-9 px-4 py-2",
                      "ring-offset-background size-8 cursor-pointer rounded-full ring-offset-2 transition-all",
                      selectedColor.name === color.name &&
                        "ring-foreground ring-2",
                      selectedColor.name !== color.name &&
                        ["Black", "White"].includes(color.name) &&
                        "outline-muted outline-solid",
                    )}
                    style={{ backgroundColor: color.value }}
                    aria-label={`Select ${color.name} color`}
                  />
                ))}
              </div>
            </div>

            {/* Price */}
            <p className="text-2xl font-bold tracking-tight">
              {product.currency}
              {product.price}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                className="h-10 px-8 flex-1 cursor-pointer rounded-full"
                size="lg"
              >
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-full cursor-pointer"
                onClick={() => setIsWishlisted(!isWishlisted)}
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
              ></Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProductOverview;
