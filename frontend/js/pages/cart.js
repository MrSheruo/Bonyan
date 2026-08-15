import { get } from "../api/client.js";
import { getCart, updateCartItem, removeCartItem } from "../api/cart.js";
import { isLoggedIn } from "../api/auth.js";
import { createIcons } from "lucide";
import { APP_ICONS } from "../utils/icons.js";

function skeletonRow() {
  return `
        <div class="flex gap-2 animate-pulse">
            <div class="w-32 h-32 bg-gray-200 rounded"></div>
            <div class="flex-1 flex flex-col gap-2 py-2">
                <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                <div class="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
        </div>
    `;
}

function itemRow(item, listing) {
  const name = listing?.product?.name ?? "Unknown item";
  const image =
    listing?.images?.find((i) => i.isPrimary)?.url ??
    listing?.images?.[0]?.url ??
    "";
  return `
        <div class="flex gap-2 border-b pb-4" data-item-id="${item.id}">
            <img src="${image}" alt="" class="w-32 h-32 object-cover rounded">
            <div class="flex-1 flex flex-col justify-between">
                <div>
                    <p class="font-medium">${name}</p>
                    <p class="text-gray-500 text-sm">${item.priceAtAdd} EGP each</p>
                    ${!item.inStock ? `<p class="text-red-600 text-sm">Out of stock</p>` : ""}
                </div>
                <div class="flex gap-3 items-center text-sm">
                    <label class="flex items-center gap-1">
                        Qty
                        <input type="number" min="1" value="${item.quantity}" class="w-16 border rounded px-2 py-1 cart-qty-input" data-item-id="${item.id}">
                    </label>
                    <button class="text-red-600 cart-remove-btn" data-item-id="${item.id}">Remove</button>
                </div>
            </div>
        </div>
    `;
}

function summaryHtml(cart) {
  return `
        <div class="w-1/3 flex flex-col gap-3">
            <p class="text-lg font-medium">How you'll pay</p>
            <p class="text-sm text-gray-500">Vodafone Cash or e& cash · Mastercard or Fawry</p>
            <div class="flex justify-between border-t pt-2">
                <p>Total</p>
                <p class="font-semibold">${cart.total} EGP</p>
            </div>
            <button id="checkout-btn" class="bg-black text-white py-2 rounded mt-2">Proceed to checkout</button>
        </div>
    `;
}

async function loadAndRenderCart(container) {
  let cart;
  try {
    cart = await getCart();
  } catch (err) {
    container.innerHTML = `<p class="p-8 text-center">Could not load your cart.</p>`;
    return;
  }

  if (cart.items.length === 0) {
    container.innerHTML = `<p class="p-8 text-center">Your basket is empty.</p>`;
    return;
  }

  const listings = await Promise.all(
    cart.items.map((item) =>
      get(`/listings/${item.listingId}`).catch(() => null),
    ),
  );

  container.innerHTML = `
        <div class="w-[95vw] m-auto flex gap-4 py-8">
            <div class="w-2/3 flex flex-col gap-4">
                <h2 class="text-2xl font-semibold">Your basket</h2>
                ${cart.items.map((item, i) => itemRow(item, listings[i])).join("")}
            </div>
            ${summaryHtml(cart)}
        </div>
    `;

  createIcons({ icons: APP_ICONS });
  wireInteractions(container);
}

function wireInteractions(container) {
  container.querySelectorAll(".cart-qty-input").forEach((input) => {
    input.addEventListener("change", async () => {
      const id = input.dataset.itemId;
      const qty = parseInt(input.value, 10);
      if (qty < 1) return;
      try {
        await updateCartItem(id, qty);
        await loadAndRenderCart(container);
      } catch (err) {
        console.error(err);
      }
    });
  });

  container.querySelectorAll(".cart-remove-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await removeCartItem(btn.dataset.itemId);
        await loadAndRenderCart(container);
      } catch (err) {
        console.error(err);
      }
    });
  });
}

export async function render(params, container) {
  if (!isLoggedIn()) {
    return `<p class="p-8 text-center">Please sign in to view your cart.</p>`;
  }

  container.innerHTML = `
        <div class="w-[95vw] m-auto flex flex-col gap-4 py-8">
            ${skeletonRow()}
            ${skeletonRow()}
        </div>
    `;

  await loadAndRenderCart(container);
}
