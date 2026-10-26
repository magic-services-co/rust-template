export interface UserSession {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  steamId?: string | null;
  discordId?: string | null;
  joinedSteamGroup?: boolean;
  isBoosting?: boolean;
  needsDiscordJoin?: boolean;
  roles?: Array<{ roleId?: string; role?: { order?: number; name?: string; color?: string | null } }>;
  [key: string]: unknown;
}
