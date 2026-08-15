# Bonyan — Project Context

## What this is
Bonyan is a furniture / wedding-planning e-commerce SPA. Vite + vanilla JS (no TypeScript, no framework), Tailwind v4, `lucide` for icons. Backend is a separate Express API running on `localhost:3000` during development (will move to a real server later — only `js/api/config.js` needs to change when that happens).

The person I'm working with is a 4th-year CS student, backend-focused, building this as a real project. They want direct corrections with reasoning, concise answers, tables over bullet lists, and code delivered inline in chat (not as downloadable files) unless explicitly asked otherwise (this document is the one exception, by request).

We do **not** care about responsive design right now. Figma exists but we do not follow it 100% — brand identity (colors, fonts, logo, tone) must match, but layout/content decisions can diverge from Figma when the backend shape demands it.

## Decisions already made (don't re-litigate these)

- **Auth UI**: header dropdown (Sign In / Sign Up / Account panel), not full standalone `/signin` `/signup` pages. Those routes and their markup were deleted.
- **Token strategy**: JWT in `localStorage` under key `token`, user object under key `user`. Sent as `Authorization: Bearer <token>` on every request via `js/api/client.js`.
- **Routing**: rewrote from exact-match `routes[path]` lookup to pattern matching supporting `:param` segments (needed for `/product/:id`, `/category/:name`). Router is `async`. Page render functions can either (a) return an HTML string (simple pages), or (b) accept `(params, container)` and write into `container` directly — this second form is how skeleton-loading pages work (see cart.js).
- **Storefront data source**: `listings` (joined product + store + price/discount), not bare `products`, powers home/category cards. Category/search filtering goes through `GET /products?category=&q=` which the backend already merges with listing data (price/store/discount included in that response — confirmed by the person, not yet verified against a real payload).
- **Product detail page**: `GET /listings/:id` — full shape confirmed, includes `images: [{ url, isPrimary }]`.
- **Cart**: `GET /users/me/cart` returns `{ id, status, items: [{ id, listingId, quantity, priceAtAdd, inStock }], total }`. **No product name/image in cart items** — the page fetches `GET /listings/:id` per item client-side to get display info, with a skeleton shown while that resolves.
- **Reviews and Packages sections** on the product page: no backend routes exist for either. Left as static "Coming soon" placeholders, not wired to anything.
- **Star ratings**: deferred — not building 5-star visual fill logic yet (lucide icons are stroke-only, needs extra work). Currently just showing one star icon + numeric rating.
- **CSS migration**: header was rewritten from a custom `.header`/`.auth-*` stylesheet to inline Tailwind utility classes. `css/all.css` (30k dead lines) was deleted. `css/style.css`'s old `.header`/`.auth-*` rule blocks should also be deleted now that nothing uses them (check first — this may not be done yet, verify in the actual file).
- **Icons**: centralized in `js/utils/icons.js` (`APP_ICONS` export) instead of each file declaring its own lucide icon subset. `createIcons({ icons: APP_ICONS })` must be called after *any* DOM update that introduces new `data-lucide` elements — the router calls it after every route render; `cart.js` also calls it after its own async re-render since that happens after the router's call already ran.

## Known API endpoints (from Express route files, given by the person)

```
POST   /auth/register        { name, email, password } → { token, user }
POST   /auth/login            { email, password } → { redirect, token, user }
POST   /auth/logout           (requireAuth)

GET    /products              ?category=&q=  → merged product+listing data (price/store/discount included)
GET    /products/:id
POST   /products               (requireAuth, canManageProducts)
PATCH  /products/:id
DELETE /products/:id

GET    /categories
POST   /categories             (requireAuth, canManageCategories)
PATCH  /categories/:id
DELETE /categories/:id

GET    /stores/:id
GET    /stores/owner/:ownerId  (requireAuth, isAdminRole)
POST   /stores                 (requireAuth)
PATCH  /stores/:id
DELETE /stores/:id

GET    /listings               (all, joined with store)
GET    /listings/compare
GET    /listings/:id
POST   /listings                (requireAuth, requireStoreOwner)
PATCH  /listings/:id
DELETE /listings/:id
POST   /listings/:id/restore
POST   /listings/:id/discounts
PATCH  /listings/:id/discounts/:discountId
DELETE /listings/:id/discounts/:discountId

GET    /users/me               (requireAuth)
PATCH  /users/me
DELETE /users/me
POST   /users/me/reactivate

GET    /users/me/cart          → { id, status, items: [{id, listingId, quantity, priceAtAdd, inStock}], total }
POST   /users/me/cart/items    { listingId, quantity }
PATCH  /users/me/cart/items/:id { quantity }
DELETE /users/me/cart/items/:id
POST   /users/me/cart/checkout  — shape/requirements NOT yet known, needs to be asked about before wiring

/users/me/orders     — mounted, sub-routes not yet given
/users/me/addresses  — mounted, sub-routes not yet given
/users/me/intents    — mounted, sub-routes not yet given

PATCH  /order-items/:id/status  (requireAuth)
```

### Confirmed real response shapes

**`GET /listings/:id`**
```json
{
  "id": 3,
  "productId": "28f785b6-...",
  "storeId": "6dc4c7f3-...",
  "price": "27.00",
  "inStock": true,
  "product": {
    "id": "28f785b6-...", "name": "Orbit Terracotta Table 0",
    "categoryId": "8a6236c1-...", "brand": "Orbit", "rawMaterial": "Steel",
    "color": "Cream", "size": "Small", "unit": "box", "tier": "standard",
    "description": "A steel table from the Orbit collection.", "rating": "0.0"
  },
  "store": {
    "id": "6dc4c7f3-...", "name": "Casa Living", "location": "Erbil District 4",
    "city": "Basra", "ownerName": "Store Owner One", "contactNumber": "+964 732349123",
    "rating": "0.0", "verified": true
  },
  "images": [{ "url": "https://picsum.photos/seed/.../640/480", "isPrimary": true }],
  "effectivePrice": 27,
  "hasDiscount": false,
  "discount": null
}
```
Discount shape when `hasDiscount: true` is **not yet known** — ask before building discount-display logic anywhere beyond the null case.

**`POST /auth/register`** and **`POST /auth/login`** response:
```json
{
  "token": "...",
  "user": {
    "name": "username", "email": "johndoe@gmail.com", "emailVerified": false,
    "image": null, "role": "user", "banned": false, "budget": "0.00",
    "maritalStatus": null, "phone": null, "id": "796251e7-..."
  }
}
```

**`GET /users/me/cart`**
```json
{
  "id": "07484e35-...",
  "status": "active",
  "items": [{ "id": 15, "listingId": 2, "quantity": 23, "priceAtAdd": 43, "inStock": true }],
  "total": 989
}
```

## Reusable patterns already built

`js/api/client.js` exposes `get/post/patch/del`, auto-attaches bearer token, throws `Error(message)` parsed from backend JSON error body on non-2xx.

`js/api/resource.js` exposes `createResourceClient(basePath)` → `{ list, get, create, update, remove }`, a generic CRUD wrapper. Used for cart items now; **should be reused for `/users/me/orders`, `/users/me/addresses`, `/users/me/intents`** rather than writing bespoke fetch code for each — this was explicitly the point of building it.

Page render function signature: `async function render(params, container)`. Return a string for simple pages. For pages needing a loading skeleton, write to `container.innerHTML` yourself (skeleton first, then real content after await), and return nothing — the router only assigns `content.innerHTML` from the return value if it's a string.

## What's done vs pending

| Page/feature | Status |
|---|---|
| Router (path params, async, skeleton support) | Done |
| API client, resource factory, auth module, cart module | Done |
| Header (Tailwind, auth dropdown wired to real login/register/logout) | Done |
| `/product/:id` (`product_page.js`) | Done — images, price/discount, store info wired. Reviews/Packages static placeholders. Star fill visuals deferred. |
| `/cart` (`cart.js`) | Done — skeleton loading, per-item listing fetch, quantity update, remove. Checkout button present but **not wired** (endpoint contract unknown). |
| `/home` (`home.js`) | **Not started** — currently a placeholder string. This is next work. |
| `/fashion` (`fashion.js`) | **Not started** — currently a placeholder string. |
| `/category/:name` (`category_page.js`, formerly `/table`) | **Not started** — currently a placeholder string. Needs filter sidebar + pagination wired to `GET /products?category=&q=`. |
| Orders (`/users/me/orders`) + an orders page | **Not started** — sub-routes and response shape not yet known, ask before building. |
| `/wedding`, `/budget` | Intentionally "Coming Soon" static, low priority. Budget will be dashboard-controlled later per the person. |

## Immediate next session scope (per the person's request)

1. `/home` page — real design + content, likely mixing static shell sections with `GET /listings` and `GET /categories` data (exact split of which sections are static vs API-driven was never finalized — ask).
2. `/fashion` page — same treatment.
3. Cart checkout wiring — need `POST /users/me/cart/checkout` request/response contract first.
4. Orders — need `/users/me/orders` sub-routes and shapes first, then build an orders page (list + presumably a detail view, unconfirmed).

## Process notes for whoever picks this up

The person has real, evolving backend responses — don't guess API shapes and build against the guess. Every page/module above was built only after getting a real example JSON response or the actual router file pasted in. Ask before writing code that depends on an unconfirmed contract. They've been fine with — and expect — multiple rounds of clarifying questions before code, not code-first-then-fix.