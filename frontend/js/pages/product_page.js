import { get } from '../api/client.js';

function renderImages(images = []) {
    if (images.length === 0) {
        return `<div class="w-full h-[44vh] bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">No images</div>`;
    }
    const sorted = [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    const [main, ...rest] = sorted;
    const restHtml = rest.slice(0, 4).map(img => `
        <div class="col-span-1 row-span-1">
            <img src="${img.url}" alt="" class="w-full h-full object-cover rounded-lg" />
        </div>
    `).join('');
    return `
        <div class="grid grid-cols-4 gap-4 h-[44vh]">
            <div class="col-span-2 row-span-2">
                <img src="${main.url}" alt="" class="w-full h-full object-cover rounded-lg" />
            </div>
            ${restHtml}
        </div>
    `;
}

export async function render(params) {
    let data;
    try {
        data = await get(`/listings/${params.id}`);
    } catch (err) {
        console.error(err);
        return `<p class="p-8 text-center">Could not load this product.</p>`;
    }

    const { product, store, price, effectivePrice, hasDiscount, images, inStock } = data;
    const rating = parseFloat(product.rating) || 0;

    return `
    <div class="w-full text-center text-3xl font-semibold flex flex-col gap-4 h-[30vh] p-8">
        <h1 class="text-3xl">${product.name}</h1>
        <p class="text-xl">${product.brand} · ${product.color}</p>
    </div>

    <div class="w-[95vw] m-auto">
        <div class="flex gap-2 w-full h-[15vh]">
            <div class="w-3/5 flex flex-col gap-1">
                <p>${store.name}</p>
                <div class="flex gap-1 items-center">
                    <i data-lucide="star" class="text-yellow-400"></i>
                    <span>${rating.toFixed(1)}</span>
                </div>
            </div>
            <div class="w-2/5 flex gap-3 items-center">
                <div class="flex flex-col">
                    ${hasDiscount ? `<p class="line-through text-gray-400 text-sm">${price} EGP</p>` : ''}
                    <p class="text-2xl font-semibold">${effectivePrice} EGP</p>
                </div>
                <button class="bg-[#675516] text-white rounded-2xl py-1 px-4 text-xl hover:bg-[#D6C284] transition duration-300 disabled:opacity-40" ${inStock ? '' : 'disabled'}>
                    ${inStock ? 'Add to cart' : 'Out of stock'}
                </button>
                <a href="" class="p-2"><i data-lucide="heart"></i></a>
                <button class="text-xl border-2 py-2 px-4 border-[#D6C284] flex items-center gap-1"><i data-lucide="share-2"></i> Share</button>
            </div>
        </div>
    </div>

    <div class="w-[95vw] m-auto">${renderImages(images)}</div>

    <div class="w-[95vw] m-auto">
        <div class="flex gap-4 w-full">
            <div class="w-2/3 h-[15vh] bg-white/50 backdrop-blur-md border border-gray-200/80 rounded-2xl p-4 shadow-sm">
                <h3 class="text-gray-600 font-medium text-lg pb-2">About</h3>
                <p class="text-gray-500 text-sm leading-relaxed">${product.description ?? 'No description available.'}</p>
            </div>
            <div class="w-1/3 h-[15vh] bg-white/50 backdrop-blur-md border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <h3 class="text-gray-600 font-medium text-lg">Store</h3>
                <p class="text-sm text-gray-600">${store.name} — ${store.location}, ${store.city}</p>
                <a href="tel:${store.contactNumber}" class="inline-flex items-center gap-2 border border-gray-300 rounded-full px-4 py-1.5 w-fit text-sm text-gray-700 hover:bg-gray-50 transition">
                    <i data-lucide="mail"></i><span>Contact Store</span>
                </a>
            </div>
        </div>
    </div>

    <div class="w-[95vw] m-auto">
        <div class="w-full p-4 flex flex-col gap-2 bg-white shadow-md h-[20vh]">
            <h2 class="text-2xl text-[#5B587B]">Packages</h2>
            <p class="text-gray-400 text-sm">Coming soon</p>
        </div>
    </div>

    <div class="w-[95vw] m-auto">
        <div class="w-full flex gap-2 h-[30vh]">
            <div class="p-4 w-1/2 flex flex-col gap-2 bg-white shadow-md">
                <h2 class="text-[#3F587C] text-2xl pb-4">Reviews</h2>
                <p class="text-gray-400 text-sm">No reviews yet</p>
            </div>
            <div class="p-4 w-1/2 flex flex-col gap-2 bg-white shadow-md">
                <h2 class="text-[#3F587C] text-2xl pb-4">Add Review</h2>
                <p class="text-gray-400 text-sm">Coming soon</p>
            </div>
        </div>
    </div>
    `;
}