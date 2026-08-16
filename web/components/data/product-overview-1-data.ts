export interface Product {
  id: string
  brand: string
  name: string
  description: string
  price: number
  currency: string
  rating: number
  images: {
    id: number
    src: string
    alt: string
  }[]
  sizes: number[]
  colors: {
    name: string
    value: string
  }[]
}

export const productDetails: Product = {
  id: 'high-tops-black',
  brand: 'Adidas',
  name: 'Black technical knit fabric high-tops',
  description: 'Running sneakers with thin elastic laces.',
  price: 450,
  currency: '$',
  rating: 4,
  images: [
    {
      id: 1,
      src: 'https://assets.shadcnstore.com/shadcnstore.com/stock/e-commerce/nike-zig-kinetica-3-front-view-2.800w.e3c867.avif',
      alt: 'Black technical knit fabric high-tops - View 1',
    },
    {
      id: 2,
      src: 'https://assets.shadcnstore.com/shadcnstore.com/stock/e-commerce/nike-zig-kinetica-3-side-view.800w.e023db.avif',
      alt: 'Black technical knit fabric high-tops - View 2',
    },
    {
      id: 3,
      src: 'https://assets.shadcnstore.com/shadcnstore.com/stock/e-commerce/nike-zig-kinetica-3-front-view.800w.75705b.avif',
      alt: 'Black technical knit fabric high-tops - View 3',
    },
    {
      id: 4,
      src: 'https://assets.shadcnstore.com/shadcnstore.com/stock/e-commerce/nike-zig-kinetica-3-back-view.800w.4d3306.avif',
      alt: 'Black technical knit fabric high-tops - View 4',
    },
  ],
  sizes: [37, 38, 39, 40, 41],
  colors: [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Black', value: '#000000' },
    { name: 'Gray', value: '#6B7280' },
  ],
}