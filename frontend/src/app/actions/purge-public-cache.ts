"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getServerSession } from "@/lib/get-server-session";
import { hasPermission, type RoleLike } from "@/lib/permissions/permissions";
import { PUBLIC_CACHE_TAG } from "@/lib/public-cache";

export async function purgePublicCache(): Promise<{ ok: boolean; message: string }> {
  const session = await getServerSession();
  const roles = (session?.user?.roles ?? undefined) as RoleLike[] | undefined;
  const allowed = await hasPermission(roles, { resource: "admin", action: "read" });
  if (!allowed) {
    return { ok: false, message: "You do not have permission to purge the public cache." };
  }

  updateTag(PUBLIC_CACHE_TAG);
  revalidatePath("/", "layout");

  return { ok: true, message: "Public pages will show the latest changes." };
}
