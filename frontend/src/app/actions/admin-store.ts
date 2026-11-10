import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<{ data?: T; error?: string; status?: number }> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = (data?.message ?? data?.error ?? res.statusText) as string;
    return { error: message, status: res.status };
  }
  const data = await res.json().catch(() => null);
  return { data: data?.data ?? data };
}

export async function getProducts() {
  const res = await fetch(backendApi("store/products"), {
    headers: authHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  const out = await handleResponse<unknown>(res);
  if (out.error) return { error: out.error, status: out.status };
  const list = Array.isArray(out.data) ? out.data : (out.data as { data?: unknown[] })?.data;
  return { data: list ?? [] };
}

export async function getOrders(customerId: string) {
  const res = await fetch(
    backendApi(`admin/store/customers/${encodeURIComponent(customerId)}/orders`),
    { headers: authHeaders(), credentials: "include", cache: "no-store" }
  );
  return handleResponse(res);
}

export async function getSubscriptions(customerId: string) {
  const res = await fetch(
    backendApi(`admin/store/customers/${encodeURIComponent(customerId)}/subscriptions`),
    { headers: authHeaders(), credentials: "include", cache: "no-store" }
  );
  return handleResponse(res);
}

export async function getInventory(customerId: string) {
  const res = await fetch(
    backendApi(`admin/store/customers/${encodeURIComponent(customerId)}/inventory`),
    { headers: authHeaders(), credentials: "include", cache: "no-store" }
  );
  return handleResponse(res);
}

export async function assignPackage(
  customerId: string,
  productId: string,
  steamId?: string,
  gameserverId?: string,
  expiresAt?: string,
) {
  const res = await fetch(backendApi("admin/store/command_delivery"), {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify({
      customer_id: customerId,
      steam_id: steamId || undefined,
      product_id: productId,
      quantity: 1,
      permanent: !expiresAt,
      gameserver_id: gameserverId || undefined,
      expires_at: expiresAt || undefined,
    }),
  });
  return handleResponse(res);
}
