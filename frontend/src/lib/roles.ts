export type Permission = {
  id: string;
  title?: string;
  description?: string;
  resource?: string;
  action?: string;
  category: PermissionCategory;
};

export type PermissionCategory =
  | "Admin"
  | "Users"
  | "Bans"
  | "Servers"
  | "Tickets"
  | "Logs"
  | "Leaderboard"
  | "SEO"
  | "Settings"
  | "CDN"
  | "Map Voting";

export const permissions: Permission[] = [
  { id: "admin:read", title: "Admin Access", description: "Access the admin panel", resource: "admin", action: "read", category: "Admin" },
  { id: "user:manage", title: "Manage Users", description: "Manage users information", resource: "user", action: "manage", category: "Users" },
  { id: "user_linked:read", title: "View Linked Accounts", description: "View linked accounts", resource: "user_linked", action: "read", category: "Users" },
  { id: "user_full:read", title: "View Full User Details", description: "View full user details, including transactions.", resource: "user_full", action: "read", category: "Users" },
  { id: "user_store:grant", title: "Grant Store Packages", description: "Grant store packages to users", resource: "user_grant", action: "create", category: "Users" },
  { id: "bans:manage", title: "Manage Bans", description: "View, create, remove, and sync bans", resource: "bans", action: "manage", category: "Bans" },
  { id: "servers:manage", title: "Manage Servers", description: "Manage game servers", resource: "servers", action: "manage", category: "Servers" },
  { id: "automation:manage", title: "Manage Automation", description: "Manage server automations and wipe workflows", resource: "automation", action: "manage", category: "Servers" },
  { id: "mapvoting:manage", title: "Manage Map Voting", description: "Manage map voting", resource: "mapvoting", action: "manage", category: "Map Voting" },
  { id: "tickets:read", title: "View Tickets", description: "View support tickets", resource: "tickets", action: "read", category: "Tickets" },
  { id: "tickets:manage", title: "Manage Tickets", description: "Manage support tickets", resource: "tickets", action: "manage", category: "Tickets" },
  { id: "logs:read", title: "View Logs", description: "View Admin Logs", resource: "logs", action: "read", category: "Logs" },
  { id: "leaderboard:manage", title: "Manage Leaderboard", description: "Manage leaderboard settings", resource: "leaderboard", action: "manage", category: "Leaderboard" },
  { id: "seo:manage", title: "Manage SEO", description: "Manage SEO settings", resource: "seo", action: "manage", category: "SEO" },
  { id: "settings:manage", title: "Manage Settings", description: "Manage site settings", resource: "settings", action: "manage", category: "Settings" },
  { id: "settings_roles:manage", title: "Manage Roles", description: "Manage roles and their permissions", resource: "settings_roles", action: "manage", category: "Settings" },
  { id: "cdn:upload", title: "Upload Images", description: "Upload images to CDN", resource: "cdn", action: "upload", category: "CDN" },
  { id: "cdn:read", title: "View Images", description: "View uploaded images", resource: "cdn", action: "read", category: "CDN" },
  { id: "cdn:update", title: "Update Images", description: "Update image metadata", resource: "cdn", action: "update", category: "CDN" },
  { id: "cdn:delete", title: "Delete Images", description: "Delete images from CDN", resource: "cdn", action: "delete", category: "CDN" },
];
