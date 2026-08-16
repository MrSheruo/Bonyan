"use client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";

const HeroSection = () => {
  return (
    <Carousel
      plugins={[
        Autoplay({
          delay: 5000,
        }),
      ]}
      opts={{
        loop: true,
        skipSnaps: false,
        align: "start",
      }}
      className="w-full max-w-full"
    >
      <CarouselContent>
        <CarouselItem>
          <div className="w-full h-[40vh] md:h-[50vh] relative">
            <Image
              src="/hero/hero_1.jpg"
              alt="hero"
              fill
              className="object-cover"
            />
          </div>
        </CarouselItem>
        <CarouselItem>
          <div className="w-full h-[40vh] md:h-[50vh] relative">
            <Image
              src="/hero/hero_2.jpg"
              alt="hero"
              fill
              className="object-cover"
            />
          </div>
        </CarouselItem>{" "}
        <CarouselItem>
          <div className="w-full h-[40vh] md:h-[50vh] relative">
            <Image
              src="/hero/hero_3.jpg"
              alt="hero"
              fill
              className="object-cover"
            />
          </div>
        </CarouselItem>
        <CarouselItem>
          <div className="w-full h-[40vh] md:h-[50vh] relative">
            <Image
              src="/hero/hero_4.jpg"
              alt="hero"
              fill
              className="object-cover"
            />
          </div>
        </CarouselItem>
      </CarouselContent>
    </Carousel>
  );
};

export default HeroSection;
