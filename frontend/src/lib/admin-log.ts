export async function logAdminAction(
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/admin/logs/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, details: details ?? {} }),
    })
  } catch {
    // ignore
  }
}

const ACTION_LABELS: Record<string, string> = {
  "PATCH /api/admin/site-settings": "Updated site settings",
  "GET /api/admin/site-settings": "Viewed site settings",
  "PATCH /api/admin/site-settings/paynow-api-key": "Updated PayNow API key",
  "GET /api/admin/site-settings/paynow-api-key": "Viewed PayNow API key status",
  "GET /api/admin/cookie-consent/copy": "Viewed cookie banner",
  "PUT /api/admin/cookie-consent/copy": "Updated cookie banner",
  "GET /api/admin/link/kit": "Viewed linked kit",
  "PUT /api/admin/link/kit": "Updated linked kit",
  "POST /api/admin/theme": "Saved theme",
  "GET /api/admin/theme": "Viewed theme",
  "POST /api/admin/bans": "Created ban",
  "DELETE /api/admin/bans": "Deleted ban",
  "POST /api/admin/roles": "Created role",
  "PUT /api/admin/roles": "Updated role",
  "DELETE /api/admin/roles": "Deleted role",
  "PUT /api/admin/roles/": "Updated role",
  "POST /api/admin/roles/reorder": "Reordered roles",
  "POST /api/admin/roles/": "Added user to role",
  "DELETE /api/admin/roles/": "Removed user from role",
  "POST /api/admin/settings/terms-of-service": "Updated terms of service",
  "POST /api/admin/settings/privacy-policy": "Updated privacy policy",
  "POST /api/admin/tickets/": "Replied to ticket",
  "DELETE /api/admin/tickets/": "Deleted ticket",
  "POST /api/admin/map-voting": "Created map vote",
  "PATCH /api/admin/map-voting/rustmaps-api-key": "Updated RustMaps settings",
  "PUT /api/admin/map-voting": "Updated map vote",
  "DELETE /api/admin/map-voting": "Deleted map vote",
  "POST /api/admin/automations": "Created automation",
  "PUT /api/admin/automations/": "Updated automation",
  "DELETE /api/admin/automations/": "Deleted automation",
  "POST /api/admin/automations/": "Ran automation",
  "POST /api/admin/servers": "Added server",
  "PUT /api/admin/servers": "Updated server",
  "DELETE /api/admin/servers": "Deleted server",
  "POST /api/admin/server-pages": "Created server page",
  "GET /api/admin/server-pages": "Viewed server pages",
  "PATCH /api/admin/server-pages/": "Updated server page",
  "DELETE /api/admin/server-pages/": "Deleted server page",
  "POST /api/admin/categories": "Created category",
  "PUT /api/admin/categories": "Updated category",
  "DELETE /api/admin/categories/": "Deleted category",
  "POST /api/admin/ticket-settings": "Created ticket category",
  "PUT /api/admin/ticket-settings": "Updated ticket settings",
  "DELETE /api/admin/ticket-settings/": "Deleted ticket category",
  "POST /api/admin/cdn/upload": "Uploaded image",
  "POST /api/admin/cdn/upload/parts": "Uploaded file part",
  "PATCH /api/admin/cdn/images/": "Updated CDN image",
  "DELETE /api/admin/cdn/images/": "Deleted CDN image",
  "PATCH /api/admin/cdn/settings": "Updated CDN settings",
  "POST /api/admin/store-settings": "Updated store settings",
  "POST /api/admin/store/command_delivery": "Gifted a PayNow product",
  "POST /api/admin/users/": "User action (ban/unban/refresh/recheck)",
  "DELETE /api/admin/users": "Deleted user(s)",
  "POST /api/admin/page-elements": "Updated page element",
  "POST /api/admin/page-elements/clear": "Cleared page elements",
  "POST /api/admin/settings/roles": "Updated roles settings",
  "PUT /api/admin/settings/steamcord": "Updated Steamcord settings",
  "PUT /api/admin/settings/servycore": "Updated ServyCore settings",
}

export function getActionLabel(action: string): string | null {
  if (!action) return null
  for (const [key, label] of Object.entries(ACTION_LABELS)) {
    if (action === key || (key.endsWith("/") && action.startsWith(key))) return label
  }
  return null
}
