import { backendApi } from "@/lib/api";
import type { Product } from "@/types/store";

export type GetProductsOptions = {
  countryCode?: string;
};

export async function getProducts(
  options?: GetProductsOptions
): Promise<{ data: Product[] }> {
  const params = new URLSearchParams();
  if (options?.countryCode) {
    params.set("countryCode", options.countryCode);
  }
  const query = params.toString();
  const url = query ? `${backendApi("store/products")}?${query}` : backendApi("store/products");
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300, tags: ["public-pages"] },
  });
  if (!res.ok) return { data: [] };
  const json = await res.json();
  const data: Product[] = Array.isArray(json?.data) ? json.data : [];
  return { data };
}
