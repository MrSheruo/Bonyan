// js/pages/fashion.js
// Fully static page – no API calls.

function trendCard(label, seed) {
  return `
    <div class="flex flex-col items-center gap-2 cursor-pointer group">
      <div class="w-28 h-28 rounded-2xl overflow-hidden">
        <img
          src="https://picsum.photos/seed/${seed}/200/200"
          alt="${label}"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <p class="text-sm font-medium text-center">${label}</p>
    </div>`;
}

function sectionCard(name, subtitle, seed) {
  return `
    <div class="flex flex-col gap-2 cursor-pointer group">
      <div class="rounded-xl overflow-hidden aspect-4/3">
        <img
          src="https://picsum.photos/seed/${seed}/500/375"
          alt="${name}"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <p class="font-semibold text-base">${name}</p>
      <p class="text-sm text-gray-500">${subtitle}</p>
    </div>`;
}

function section(title, cards) {
  const cardsHtml = cards
    .map(([name, sub, seed]) => sectionCard(name, sub, seed))
    .join('');
  return `
    <section class="w-[95vw] mx-auto mb-10">
      <h2 class="text-2xl font-semibold mb-5">${title}</h2>
      <div class="grid grid-cols-3 gap-6">
        ${cardsHtml}
      </div>
    </section>`;
}

function footer() {
  return `
    <footer class="w-full p-8 flex gap-4 bg-[#92766B] items-center justify-between mt-8">
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

export async function render() {
  const trendStrip = [
    ['Everyday Comfort',  'fashion-trend-1'],
    ['Timeless Comfort',  'fashion-trend-2'],
    ['Furnished Living',  'fashion-trend-3'],
    ['Living Essentials', 'fashion-trend-4'],
    ['Home Essentials',   'fashion-trend-5'],
  ];

  const sections = [
    {
      title: 'The most Important',
      cards: [
        ['Refrigerator',    'Modern Home Power',   'fashion-fridge'],
        ['Washing Machine', 'Powering Daily Life',  'fashion-washer'],
        ['Cooker',          'Modern Home Power',   'fashion-cooker'],
      ],
    },
    {
      title: 'Design your central hub',
      cards: [
        ['Sofa',    'Cozy Corner',    'fashion-sofa'],
        ['Table',   'Shared Moments', 'fashion-table'],
        ['TV Unit', 'Modern Display', 'fashion-tvunit'],
      ],
    },
    {
      title: 'Design your dream space',
      cards: [
        ['Bed',        'Peaceful Rest',       'fashion-bed'],
        ['Wardrobe',   'Smart Storage',       'fashion-wardrobe'],
        ['Nightstand', 'Always Within Reach', 'fashion-nightstand'],
      ],
    },
    {
      title: 'Smart tech for modern homes',
      cards: [
        ['Washing Machine', 'Pure Care',        'fashion-wm2'],
        ['Vacuum Cleaner',  'Effortless Clean',  'fashion-vacuum'],
        ['Iron',            'Smooth Style',      'fashion-iron'],
      ],
    },
    {
      title: 'Drape your space in style',
      cards: [
        ['Curtains', 'Light Filter',   'fashion-curtains'],
        ['Rugs',     'Warm Footsteps', 'fashion-rugs'],
        ['Bedding',  'Soft Touch',     'fashion-bedding'],
      ],
    },
    {
      title: 'Brighten your space with elegance',
      cards: [
        ['Lighting Lamps', 'Warm Glow',      'fashion-lamps'],
        ['Chandelier',     'Grand Elegance',  'fashion-chandelier'],
        ['Pendant Light',  'Modern Drop',     'fashion-pendant'],
      ],
    },
  ];

  const trendHtml = trendStrip
    .map(([label, seed]) => trendCard(label, seed))
    .join('');

  const sectionsHtml = sections
    .map(({ title, cards }) => section(title, cards))
    .join('');

  return `
    <!-- Hero / trend header -->
    <div class="w-full text-center py-8 pb-2">
      <h1 class="text-3xl font-bold">The Latest Home Furnishing Trends</h1>
      <p class="text-gray-500 mt-1">What's on our radar</p>
    </div>

    <!-- Trend strip -->
    <div class="w-[95vw] mx-auto flex justify-between mb-10 px-4">
      ${trendHtml}
    </div>

    <!-- Product sections -->
    ${sectionsHtml}

    <!-- Footer -->
    ${footer()}
  `;
}