import { get, post } from "./client.js";
import { createResourceClient } from "./resource.js";

const CART_BASE = "/users/me/cart";
const cartItems = createResourceClient(`${CART_BASE}/items`);

export const getCart = () => get(CART_BASE);
export const addCartItem = (listingId, quantity) =>
  cartItems.create({ listingId, quantity });
export const updateCartItem = (itemId, quantity) =>
  cartItems.update(itemId, { quantity });
export const removeCartItem = (itemId) => cartItems.remove(itemId);
export const checkoutCart = () => post(`${CART_BASE}/checkout`, {});
