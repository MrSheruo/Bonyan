export interface Category {
  id: string;
  name: string;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8080";

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${BASE_URL}/categories`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((c) => ({
        id: String(c?.id ?? ""),
        name: String(c?.name ?? ""),
      })).filter((c) => c.id && c.name);
    }
    return [];
  } catch {
    return [];
  }
}
