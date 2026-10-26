/** Server within a category (admin server list). */
export interface Server {
  server_id: string;
  server_name: string;
  order?: number;
  image_path?: string | null;
  server_address?: string | null;
  enabled?: boolean;
  wipe_schedule?: string;
  /** RustMaps CDN thumbnail URL; overrides BattleMetrics for map preview / 3D viewer. */
  current_map_thumbnail_url?: string | null;
  pterodactyl_panel_id?: number | null;
  pterodactyl_server_identifier?: string | null;
  mod_runtime?: "oxide" | "carbon" | "vanilla" | null;
  harmony_version?: string | null;
  harmony_seen_at?: string | null;
  harmony_status?: "connected" | "stale" | "offline";
  harmony_update_available?: boolean;
  harmony_latest?: string | null;
  tags?: Array<{ id: number; name: string; image?: string | null }>;
  [key: string]: unknown;
}

/** Category with servers (admin server categories). */
export interface Category {
  id: number;
  name: string;
  order?: number;
  servers: Server[];
  [key: string]: unknown;
}
