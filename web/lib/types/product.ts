export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  originalPrice?: number;
  badge?: string;
  store: string;
  color: string;
  tier: string;
  city: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface FilterState {
  brands: string[];
  colors: string[];
  tiers: string[];
  priceMin: string;
  priceMax: string;
  cities: string[];
}

export const emptyFilterState: FilterState = {
  brands: [],
  colors: [],
  tiers: [],
  priceMin: "",
  priceMax: "",
  cities: [],
};
