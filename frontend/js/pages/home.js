// js/pages/home.js
import { get } from "../api/client.js";
import { createIcons } from "lucide";
import { APP_ICONS } from "../utils/icons.js";
import Swiper from "swiper";
import "swiper/css";

// --- categories: hardcoded snapshot of GET /categories ---
export const CATEGORIES = [
  {
    id: "d8a94142-761a-414b-9f5d-f05fa4eee8b8",
    name: "Furniture",
    imageUrl: "https://picsum.photos/seed/cat-Furniture/400/300",
  },
  {
    id: "6e29a1b1-e57f-48cd-bb8b-1e526bc9edd8",
    name: "Kitchenware",
    imageUrl: "https://picsum.photos/seed/cat-Kitchenware/400/300",
  },
  {
    id: "0a57c2a3-45cf-47c2-82c5-b0c1884f74f3",
    name: "Electronics",
    imageUrl: "https://picsum.photos/seed/cat-Electronics/400/300",
  },
  {
    id: "20efbf34-dc82-4632-b79b-101b8088df7b",
    name: "Lighting",
    imageUrl: "https://picsum.photos/seed/cat-Lighting/400/300",
  },
  {
    id: "d72c156d-777b-468f-a5ce-b9b86dc2bff5",
    name: "Textiles",
    imageUrl: "https://picsum.photos/seed/cat-Textiles/400/300",
  },
  {
    id: "8a6236c1-75f9-42d7-a04a-82a15a5c7974",
    name: "Outdoor",
    imageUrl: "https://picsum.photos/seed/cat-Outdoor/400/300",
  },
  {
    id: "43bf47cc-1794-4fb6-8928-fc7de56ce50a",
    name: "Decor",
    imageUrl: "https://picsum.photos/seed/cat-Decor/400/300",
  },
  {
    id: "4c89ab87-936d-4725-a05c-bdb8b62d60d7",
    name: "Storage",
    imageUrl: "https://picsum.photos/seed/cat-Storage/400/300",
  },
  {
    id: "9fa17802-360c-4d6d-9731-a823795a7b67",
    name: "Bathroom",
    imageUrl: "https://picsum.photos/seed/cat-Bathroom/400/300",
  },
  {
    id: "33a52570-95e2-49ad-920c-69c716964c73",
    name: "Office",
    imageUrl: "https://picsum.photos/seed/cat-Office/400/300",
  },
  {
    id: "46b9a565-c932-4187-8592-1ecff2541d7e",
    name: "Bedding",
    imageUrl: "https://picsum.photos/seed/cat-Bedding/400/300",
  },
  {
    id: "7e0eb2fc-d658-471b-ae83-073336ef0db8",
    name: "Rugs & Carpets",
    imageUrl: "https://picsum.photos/seed/cat-Rugs & Carpets/400/300",
  },
  {
    id: "a32db2d3-2c2a-490e-90ce-7a3eb3a2b067",
    name: "Wall Art",
    imageUrl: "https://picsum.photos/seed/cat-Wall Art/400/300",
  },
  {
    id: "6263b036-c5a7-4bd8-a5de-a55a05934369",
    name: "Garden Tools",
    imageUrl: "https://picsum.photos/seed/cat-Garden Tools/400/300",
  },
  {
    id: "29fcbe17-a088-43a5-94cc-4959cd1b1e14",
    name: "Cleaning Supplies",
    imageUrl: "https://picsum.photos/seed/cat-Cleaning Supplies/400/300",
  },
];

const findCategory = (name) => CATEGORIES.find((c) => c.name === name);

// --- listings (individual /listings/:id fetches for now) ---
const LISTING_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

async function fetchListings(ids) {
  const results = await Promise.allSettled(
    ids.map((id) => get(`/listings/${id}`)),
  );
  return results.filter((r) => r.status === "fulfilled").map((r) => r.value);
}

// --- card renderers ---
function categoryCard(title, categoryName, subtitle = "") {
  const cat = findCategory(categoryName);
  return `
    <a href="/category/${encodeURIComponent(cat.name)}" class="w-1/3 flex flex-col gap-3">
      <img src="${cat.imageUrl}" alt="${cat.name}" class="w-full h-3/4 object-cover rounded-xl">
      <h3 class="text-center text-xl">${title}</h3>
      ${subtitle ? `<p class="text-[#857675] text-center">${subtitle}</p>` : ""}
    </a>`;
}

function listingPriceCard(listing) {
  const img = listing.images?.[0]?.url ?? "";
  const price = listing.hasDiscount
    ? `$${listing.effectivePrice} <span class="line-through opacity-60 ml-1">$${listing.price}</span>`
    : `$${listing.effectivePrice}`;
  return `
    <a href="/product/${listing.id}" class="h-[25vh] w-1/4 relative">
      <img src="${img}" alt="${listing.product.name}" class="w-full h-[25vh] object-cover rounded-xl">
      <p class="bg-black/80 text-white text-sm px-2 py-1 rounded absolute bottom-2 left-2">${price}</p>
    </a>`;
}

function dealCard(listing) {
  const img = listing.images?.[0]?.url ?? "";
  return `
    <a href="/product/${listing.id}" class="w-1/4 flex flex-col gap-3">
      <img src="${img}" alt="${listing.product.name}" class="w-full h-3/4 object-cover rounded-xl">
      <div class="flex justify-between">
        <div class="flex flex-col gap-2">
          <p>${listing.product.name}</p>
          <p class="text-[#857675]">$${listing.effectivePrice}</p>
        </div>
        <div class="flex gap-1 items-center">
          <p>${listing.product.rating}</p>
          <i data-lucide="star" class="w-4 h-4"></i>
        </div>
      </div>
    </a>`;
}

// --- "Shop our most-loved categories" via real Swiper: no nav modules
// imported (so no arrows/dots ever render) and speed:0 (no slide animation) ---
function categorySlide(cat) {
  return `
    <div class="swiper-slide relative">
      <a href="/category/${encodeURIComponent(cat.name)}" class="flex flex-col gap-3">
        <img src="${cat.imageUrl}" alt="${cat.name}" class="w-full h-3/4 object-cover rounded-xl">
        <h3 class="text-center text-xl">${cat.name}</h3>
      </a>
      <i data-lucide="heart" class="absolute top-2 right-2 w-6 h-6 text-white"></i>
    </div>`;
}

let categorySwiper;
function initCategorySwapper(container) {
  const el = container.querySelector("#category-swiper");
  if (!el) return;

  el.querySelector(".swiper-wrapper").innerHTML =
    CATEGORIES.map(categorySlide).join("");
  createIcons({ icons: APP_ICONS });

  categorySwiper?.destroy(true, true);
  categorySwiper = new Swiper(el, {
    slidesPerView: 4,
    spaceBetween: 32,
    loop: true,
    speed: 0, // no slide animation
    allowTouchMove: false, // no drag/manual interaction, matches "no buttons" (view-only)
    autoplay: { delay: 4000, disableOnInteraction: false },
  });
}

// --- skeleton for the async rows ---
const rowSkeleton = (n) =>
  Array.from({ length: n })
    .map(
      () =>
        `<div class="w-1/4 h-[25vh] rounded-xl bg-gray-200 animate-pulse"></div>`,
    )
    .join("");

function staticHomeHTML() {
  return `
  <!-- sec1: hero -->
  <div class="flex w-[95vw] m-auto gap-8 pt-16">
    <div class="relative flex-3/5 h-125 rounded-2xl">
      <img class="block w-full h-full object-cover rounded-2xl" src="../../assets/hero_image_1.jpg" alt="" />
      <div class="flex flex-col gap-4 absolute bottom-16 left-4 w-[50%]">
        <h3 class="text-3xl text-white">Making your house<br> feel like home</h3>
        <button class="bg-(--bonyan-border) text-2xl text-white px-6 py-4 rounded-4xl w-fit"><a href="/fashion"> Start Your Journey </a></button>
      </div>
    </div>
    <div class="relative h-125 rounded-2xl">
      <img class="w-full h-full object-cover rounded-2xl" src="../../assets/hero_image_2.jpg" alt="" />
      <h3 class="absolute bottom-16 left-4 text-3xl">Where your happily ever after begins</h3>
    </div>
  </div>
      <!-- sec2: stress-free planning (static) -->
      <div class="w-[95vw] m-auto mb-16">
        <div class="flex flex-col gap-6 ">
          <div class="w-full"><h2 class="text-3xl">Jump into stress-free planning</h2></div>
          <div class="w-full flex gap-8">
            <a href="/category/fashion" class="w-1/3 flex flex-col gap-3 hover:cursor-pointer">
              <img src="../../assets/home/Rectangle 100.png" alt="Scenic Natural Backdrops" class="w-full h-3/4 object-cover rounded-xl">
              <h3 class="text-center text-xl">Scenic Natural Backdrops</h3>
              <p class="text-[#857675] text-center">Sweet, soft, and perfectly arranged</p>
            </a>
            <a href="/category/fashion" class="w-1/3 flex flex-col gap-3 hover:cursor-pointer">
              <img src="../../assets/home/Rectangle 99.png" alt="Sophisticated Modern Simplicity" class="w-full h-3/4 object-cover rounded-xl">

              <h3 class="text-center text-xl">Delicate Pastel Whispers</h3>
              <p class="text-[#857675] text-center">Sweet, soft, and perfectly arranged</p>
            </a>
            <a href="/category/wedding" class="w-1/3 flex flex-col gap-3 hover:cursor-pointer">
              <img src="../../assets/home/Rectangle 98.png" alt="Delicate Pastel Whispers" class="w-full h-3/4 object-cover rounded-xl">

              <h3 class="text-center text-xl">Sophisticated Modern Simplicity</h3>
              <p class="text-[#857675] text-center">Clean design that reflects your taste</p>
            </a>
          </div>
        </div>
      </div>
      <!-- sec3: Best of Summer 2026 (hardcoded categories) -->
      <div class="w-[95vw] m-auto mb-16">
        <div class="flex flex-col gap-6 h-[35vh]">
          <div class="w-full h-[5vh]">
            <h2 class="text-3xl">
              Discover Our Best of Summer 2026: The Newlywed Edition
            </h2>
          </div>
          <div class="m-auto flex gap-32">
            <div class="flex flex-col gap-6 justify-between items-center px-4 py-2 border-2 border-black rounded-3xl">
              <img src="../../assets/home/Rectangle 107.png" alt="" />
              <h3 class="text-2xl">Dreamy Comfort</h3>
            </div>
            <div class="flex flex-col gap-6 justify-between items-center px-4 py-2 border border-black rounded-3xl">
              <img src="../../assets/home/Rectangle 106.png" alt="" />
              <h3 class="text-2xl">Modern Lounging</h3>
            </div>
            <div class="flex flex-col gap-6 justify-between items-center px-4 py-2 border border-black rounded-3xl">
              <img src="../../assets/home/Rectangle 105.png" alt="" />
              <h3 class="text-2xl">Fashion Tables</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- sec8: Today's big deals (listings, filled async) -->
      <div class="w-[95vw] m-auto mb-16">
        <div class="flex flex-col gap-6 h-[35vh]">
          <div class="w-full h-[5vh]"><h2 class="text-3xl">Today's big deals</h2></div>
          <div id="deals-row" class="w-full flex gap-8 h-[30vh]">
            ${rowSkeleton(4)}
          </div>
        </div>
      </div>
      <!-- sec4: Perfect newlywed gifts — top 3 (static) -->
      <div class="w-[95vw] m-auto mb-6">
        <div class="flex gap-8 h-[25vh] w-full">
          <div class="flex flex-col gap-3 h-[25vh] w-1/4">
            <h2 class="text-4xl font-bold">Bonyan - Perfect <br> newlywed gifts</h2>
            <button class="bg-[#675516] text-white rounded-2xl py-2 px-2 text-xl hover:bg-[#9B864A] transition duration-300 w-1/2">Get more</button>
          </div>
          <div class="h-[25vh] w-1/4 relative">
            <img src="../../assets/home/Rectangle 99.png" alt="Marble Serving Tray with Gold Accents" class="w-full h-[25vh] object-cover rounded-xl">
            <p class="bg-black/60 text-white text-sm px-2 py-1 rounded absolute bottom-2 left-2">Marble Serving Tray with Gold Accents</p>
          </div>
          <div class="h-[25vh] w-1/4 relative">
            <img src="../../assets/home/Rectangle 110.png" alt="Luxury Crystal Vases & Scented Candles" class="w-full h-[25vh] object-cover rounded-xl">
            <p class="bg-black/60 text-white text-sm px-2 py-1 rounded absolute bottom-2 left-2">Luxury Crystal Vases & Scented Candles</p>
          </div>
          <div class="h-[25vh] w-1/4 relative">
            <img src="../../assets/home/Rectangle 111.png" alt="Premium Oud & Oriental Perfumes Gift Box" class="w-full h-[25vh] object-cover rounded-xl">
            <p class="bg-black/60 text-white text-sm px-2 py-1 rounded absolute bottom-2 left-2">Premium Oud & Oriental Perfumes Gift Box</p>
          </div>
        </div>
      </div>
      <!-- sec5: gift price row (listings, filled async) -->
      <div class="w-[95vw] m-auto mb-16">
        <div id="gift-price-row" class="flex gap-8 h-[25vh] w-full">
          ${rowSkeleton(4)}
        </div>
      </div>
      <!-- sec6: Gifts as special as they are (hardcoded categories) -->
      <!--
      <div class="w-[95vw] m-auto mb-16">
        <div class="flex flex-col gap-6 h-[20vh]">
          <div class="w-full h-[5vh]"><h2 class="text-3xl">Gifts as special as they are</h2></div>
          <div class="w-full flex gap-8 h-[15vh]">
            ${categoryCard("Wedding Gifts", "Wall Art")}
            ${categoryCard("For Bride", "Textiles")}
            ${categoryCard("For Groom", "Storage")}
          </div>
        </div>
      </div>
      -->
      <!-- sec7: Shop our most-loved categories (Swiper, no nav/animation) -->
      <!--
            <div class="w-[95vw] m-auto mb-16">
        <div class="flex flex-col gap-6 h-[35vh]">
          <div class="w-full h-[5vh]"><h2 class="text-3xl">Shop our most-loved categories</h2></div>
          <div id="category-swiper" class="swiper w-full h-[30vh]">
            <div class="swiper-wrapper"></div>
          </div>
        </div>
      </div>
      -->

      <!-- sec9: The most Search (static — no matching service endpoint yet) -->
      <!--      <div class="w-[95vw] m-auto mb-16">
        <div class="flex flex-col gap-6 h-[35vh]">
          <div class="w-full h-[5vh]"><h2 class="text-3xl">The most Search</h2></div>
          <div class="w-full flex gap-8 h-[30vh]">
            ${[
              ["Catering", "bonyan-search-catering"],
              ["Electrical Contractor", "bonyan-search-electrical"],
              ["Plumber", "bonyan-search-plumber"],
              ["Interior Designer", "bonyan-search-interior"],
            ]
              .map(
                ([name, seed]) => `
            <div class="w-1/4 flex flex-col gap-3">
              <img src="https://picsum.photos/seed/${seed}/500/500" alt="${name}" class="w-full h-3/4 object-cover rounded-xl">
              <div class="flex gap-1 items-center">
                <p>${name}</p>
                <p>4.9</p>
                <i data-lucide="star" class="w-4 h-4"></i>
              </div>
            </div>`,
              )
              .join("")}
          </div>
        </div>
      </div>-->
      <!-- footer -->
      <div class="w-full p-8 flex gap-4 bg-[#92766B] items-center justify-between">
        <div class="w-1/3"><img src="../../assets/logo.jpg" alt=""></div>
        <div class="text-white">
          <p class="font-semibold text-xl">Contact Us</p>
          <ul><li>+1065460252</li><li>BonyanTeam@gmail.com</li><li>Mansoura</li></ul>
        </div>
        <div class="text-white">
          <p class="font-semibold text-xl">Customer support</p>
          <ul><li>Shopping Policy</li><li>Return  Policy</li></ul>
        </div>
      </div>
    `;
}

async function loadListingSections(container) {
  const listings = await fetchListings(LISTING_IDS);
  const giftRow = container.querySelector("#gift-price-row");
  if (giftRow)
    giftRow.innerHTML = listings.slice(0, 4).map(listingPriceCard).join("");

  const dealsRow = container.querySelector("#deals-row");
  if (dealsRow)
    dealsRow.innerHTML = listings.slice(4, 8).map(dealCard).join("");

  createIcons({ icons: APP_ICONS });
}

export async function render(params, container) {
  container.innerHTML = staticHomeHTML();
  createIcons({ icons: APP_ICONS });
  initCategorySwapper(container);
  loadListingSections(container);
}
