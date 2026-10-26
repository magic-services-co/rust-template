import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";

export type DiscordMembershipResponse = {
  data?: { status?: "not_in_guild" | "verified" | "already_verified" };
  error?: string;
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function refreshDiscordGuildMembership(): Promise<DiscordMembershipResponse> {
  try {
    const res = await fetch(backendApi("user/discord/membership"), {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: (err as { error?: string; message?: string }).error || (err as { message?: string }).message || "Failed to refresh Discord membership" };
    }
    const data = await res.json();
    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to refresh Discord membership" };
  }
}
