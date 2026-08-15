// js/pages/category_page.js
import { get } from '../api/client.js';
import { createIcons } from 'lucide';
import { APP_ICONS } from '../utils/icons.js';
import { CATEGORIES } from './home.js';

// ── helpers ────────────────────────────────────────────────────────────────

/** Build query string from a plain object, omitting undefined/null/''. */
function buildQuery(params) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? '?' + qs : '';
}

/** Find a category UUID by name (case-insensitive). */
function categoryIdByName(name) {
  if (!name) return undefined;
  const cat = CATEGORIES.find(
    (c) => c.name.toLowerCase() === decodeURIComponent(name).toLowerCase(),
  );
  return cat?.id;
}

/** Stars (outline only, per the project decision – no filled stars yet). */
function starsHtml(rating) {
  const count = Math.round(Number(rating) || 0);
  return Array.from({ length: 5 })
    .map((_, i) =>
      `<i data-lucide="star" class="w-4 h-4 ${i < count ? 'text-yellow-400' : 'text-gray-300'}"></i>`,
    )
    .join('');
}

// ── skeleton ───────────────────────────────────────────────────────────────

function skeletonGrid() {
  return Array.from({ length: 9 })
    .map(
      () => `
    <div class="animate-pulse flex flex-col gap-2">
      <div class="bg-gray-200 rounded-xl w-full h-52"></div>
      <div class="h-3 bg-gray-200 rounded w-2/3"></div>
      <div class="h-3 bg-gray-200 rounded w-1/3"></div>
    </div>`,
    )
    .join('');
}

// ── product card ───────────────────────────────────────────────────────────

function productCard(product, listing) {
  const img =
    listing?.images?.find((i) => i.isPrimary)?.url ??
    listing?.images?.[0]?.url ??
    `https://picsum.photos/seed/prod-${product.id}/400/300`;

  const storeName = listing?.store?.name ?? '—';
  const price = listing ? `${listing.effectivePrice} IQD` : '—';
  const rating = parseFloat(product.rating) || 0;
  const listingId = listing?.id ?? '';

  return `
    <a href="/product/${listingId}" data-link
       class="flex flex-col gap-2 group cursor-pointer">
      <div class="relative rounded-xl overflow-hidden w-full h-52">
        <img
          src="${img}"
          alt="${product.name}"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button
          class="absolute top-2 right-2 p-1 bg-white/70 rounded-full hover:bg-white transition"
          onclick="event.preventDefault()"
        >
          <i data-lucide="heart" class="w-4 h-4"></i>
        </button>
      </div>
      <p class="text-xs text-gray-500">${storeName}</p>
      <p class="text-sm font-semibold truncate">${product.name}</p>
      <p class="text-xs text-[#675516]">${price}</p>
      <div class="flex gap-0.5">${starsHtml(rating)}</div>
    </a>`;
}

// ── sidebar ────────────────────────────────────────────────────────────────

function sidebar(currentFilters, categoryName) {
  const colorOptions = [
    'Red', 'Blue', 'Green', 'White', 'Black',
    'Brown', 'Beige', 'Gray', 'Cream', 'Yellow',
  ];

  const categoryOptions = CATEGORIES.map(
    (c) => `<option value="${c.id}" ${c.id === currentFilters.category ? 'selected' : ''}>${c.name}</option>`,
  ).join('');

  const colorOptionHtml = colorOptions.map(
    (col) => `<option value="${col}" ${col === currentFilters.color ? 'selected' : ''}>${col}</option>`,
  ).join('');

  return `
    <aside class="w-64 shrink-0 flex flex-col gap-5 bg-white/60 rounded-2xl p-5 shadow-sm self-start sticky top-4">
      <div class="flex items-center gap-2 text-lg font-semibold">
        <i data-lucide="sliders-horizontal" class="w-5 h-5"></i>
        Filter
      </div>

      <!-- Category -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Category</label>
        <select id="filter-category"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#675516]">
          <option value="">All categories</option>
          ${categoryOptions}
        </select>
      </div>

      <!-- Colors -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Colors</label>
        <select id="filter-color"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#675516]">
          <option value="">Any color</option>
          ${colorOptionHtml}
        </select>
      </div>

      <!-- Min Price (UI only, not wired) -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Price</label>
        <label class="text-xs text-gray-500">Min Price</label>
        <input type="number" id="filter-min-price" min="0" value="${currentFilters._minPrice ?? ''}" placeholder="0"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" />
        <label class="text-xs text-gray-500 mt-1">Max Price</label>
        <input type="number" id="filter-max-price" min="0" value="${currentFilters._maxPrice ?? ''}" placeholder="25000"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" />
      </div>

      <!-- Number of Chairs (UI only, not wired) -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Number of Chairs</label>
        <input type="number" id="filter-chairs" min="1" value="${currentFilters._chairs ?? ''}" placeholder="e.g 5"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" />
      </div>

      <!-- Min Rating -->
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700">Min. Rating</label>
        <div id="rating-picker" class="flex gap-1 cursor-pointer">
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<i data-lucide="star" class="w-6 h-6 rating-star ${n <= (currentFilters.minRating || 0) ? 'text-yellow-400' : 'text-gray-300'}" data-value="${n}"></i>`,
            )
            .join('')}
        </div>
        <input type="hidden" id="filter-min-rating" value="${currentFilters.minRating ?? ''}" />
      </div>

      <!-- Show Results -->
      <button id="apply-filters-btn"
        class="w-full bg-[#675516] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#9B864A] transition duration-200">
        Show Results
        <i data-lucide="chevron-right" class="w-4 h-4"></i>
      </button>
    </aside>`;
}

// ── hero banner ────────────────────────────────────────────────────────────

function heroBanner(categoryName) {
  return `
    <div class="w-full h-36 relative overflow-hidden mb-6">
      <img
        src="https://picsum.photos/seed/cat-banner-${categoryName}/1600/300"
        alt="${categoryName}"
        class="w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
        <h1 class="text-3xl font-bold">Trending ${categoryName} Aesthetics</h1>
        <p class="text-sm mt-1 opacity-80">What's catching our eye</p>
      </div>
    </div>`;
}

// ── pagination bar ─────────────────────────────────────────────────────────

function paginationBar(hasPrev, hasNext) {
  return `
    <div class="flex items-center justify-center gap-4 mt-8 pb-6">
      <button id="prev-page-btn"
        class="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        ${hasPrev ? '' : 'disabled'}>
        <i data-lucide="chevron-left" class="w-4 h-4"></i>
        Prev
      </button>
      <button id="next-page-btn"
        class="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        ${hasNext ? '' : 'disabled'}>
        Next
        <i data-lucide="chevron-right" class="w-4 h-4"></i>
      </button>
    </div>`;
}

// ── footer ─────────────────────────────────────────────────────────────────

function footer() {
  return `
    <footer class="w-full p-8 flex gap-4 bg-[#92766B] items-center justify-between mt-4">
      <div class="w-1/3">
        <img src="../../assets/logo.jpg" alt="Bonyan" class="h-16 object-contain" />
      </div>
      <div class="text-white">
        <p class="font-semibold text-xl mb-2">Contact Us</p>
        <ul class="space-y-1 text-sm">
          <li>+1065460252</li>
          <li>roody.khaled135@gmail.com</li>
          <li>Mansoura</li>
        </ul>
      </div>
      <div class="text-white">
        <p class="font-semibold text-xl mb-2">Customer support</p>
        <ul class="space-y-1 text-sm">
          <li>Shopping Policy</li>
          <li>Return Policy</li>
        </ul>
      </div>
    </footer>`;
}

// ── main load/render logic ─────────────────────────────────────────────────

async function loadProducts(filters) {
  const query = buildQuery({
    category:  filters.category  || undefined,
    color:     filters.color     || undefined,
    minRating: filters.minRating || undefined,
    cursor:    filters.cursor    || undefined,
  });

  const [productsRes, listingsRes] = await Promise.all([
    get(`/products${query}`),
    get('/listings'),
  ]);

  // Index listings by productId for O(1) lookup per card
  const listingByProductId = {};
  (Array.isArray(listingsRes) ? listingsRes : listingsRes?.items ?? []).forEach((l) => {
    if (l.productId && !(l.productId in listingByProductId)) {
      listingByProductId[l.productId] = l;
    }
  });

  return {
    items: productsRes.items ?? [],
    nextCursor: productsRes.nextCursor ?? null,
    listingByProductId,
  };
}

async function renderProducts(container, filters, categoryName) {
  const gridEl = container.querySelector('#product-grid');
  const paginationEl = container.querySelector('#pagination-bar');
  if (!gridEl) return;

  gridEl.innerHTML = skeletonGrid();

  let result;
  try {
    result = await loadProducts(filters);
  } catch (err) {
    console.error(err);
    gridEl.innerHTML = `<p class="col-span-3 text-center text-gray-500 py-12">Could not load products. Please try again.</p>`;
    return;
  }

  const { items, nextCursor, listingByProductId } = result;

  if (items.length === 0) {
    gridEl.innerHTML = `<p class="col-span-3 text-center text-gray-500 py-12">No products found for the selected filters.</p>`;
    if (paginationEl) paginationEl.innerHTML = paginationBar(!!filters.cursor, false);
  } else {
    gridEl.innerHTML = items
      .map((p) => productCard(p, listingByProductId[p.id]))
      .join('');
    if (paginationEl) paginationEl.innerHTML = paginationBar(!!filters.cursor, !!nextCursor);
  }

  createIcons({ icons: APP_ICONS });
  wirePagination(container, filters, categoryName, nextCursor);
}

function wirePagination(container, filters, categoryName, nextCursor) {
  const prevBtn = container.querySelector('#prev-page-btn');
  const nextBtn = container.querySelector('#next-page-btn');

  // History stack for prev navigation
  if (!container._cursorHistory) container._cursorHistory = [];

  if (nextBtn && !nextBtn.disabled) {
    nextBtn.addEventListener('click', () => {
      container._cursorHistory.push(filters.cursor ?? null);
      renderProducts(container, { ...filters, cursor: nextCursor }, categoryName);
    });
  }

  if (prevBtn && !prevBtn.disabled) {
    prevBtn.addEventListener('click', () => {
      const prevCursor = container._cursorHistory.pop() ?? null;
      renderProducts(container, { ...filters, cursor: prevCursor || undefined }, categoryName);
    });
  }
}

function wireFilters(container, filters, categoryName) {
  const applyBtn = container.querySelector('#apply-filters-btn');
  if (!applyBtn) return;

  // Rating star picker
  const stars = container.querySelectorAll('.rating-star');
  const ratingInput = container.querySelector('#filter-min-rating');

  stars.forEach((star) => {
    star.addEventListener('click', () => {
      const val = Number(star.dataset.value);
      ratingInput.value = val;
      stars.forEach((s) => {
        const sVal = Number(s.dataset.value);
        s.classList.toggle('text-yellow-400', sVal <= val);
        s.classList.toggle('text-gray-300', sVal > val);
      });
    });
  });

  applyBtn.addEventListener('click', () => {
    container._cursorHistory = [];
    const newFilters = {
      category:  container.querySelector('#filter-category')?.value || '',
      color:     container.querySelector('#filter-color')?.value || '',
      minRating: container.querySelector('#filter-min-rating')?.value || '',
      // These are UI-only, not sent to the API:
      _minPrice: container.querySelector('#filter-min-price')?.value || '',
      _maxPrice: container.querySelector('#filter-max-price')?.value || '',
      _chairs:   container.querySelector('#filter-chairs')?.value || '',
    };
    renderProducts(container, newFilters, categoryName);
  });
}

// ── exported render ────────────────────────────────────────────────────────

export async function render(params, container) {
  const categoryName = decodeURIComponent(params.name ?? '');
  const categoryId   = categoryIdByName(categoryName);

  const initialFilters = {
    category:  categoryId ?? '',
    color:     '',
    minRating: '',
  };

  // Render the static shell (sidebar + empty grid + pagination slots) immediately
  container.innerHTML = `
    ${heroBanner(categoryName)}

    <div class="w-[95vw] mx-auto flex gap-6 mt-4">
      ${sidebar(initialFilters, categoryName)}

      <div class="flex-1 flex flex-col">
        <div id="product-grid" class="grid grid-cols-3 gap-6">
          ${skeletonGrid()}
        </div>
        <div id="pagination-bar">
          ${paginationBar(false, false)}
        </div>
      </div>
    </div>

    ${footer()}
  `;

  createIcons({ icons: APP_ICONS });
  wireFilters(container, initialFilters, categoryName);

  // Kick off the first data load
  await renderProducts(container, initialFilters, categoryName);
}