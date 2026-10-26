using System;

namespace MagicCore
{
    internal static class CommandService
    {
        public static bool TryHandle(BasePlayer player, string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return false;
            }

            raw = raw.Trim();
            if (raw.StartsWith("/", StringComparison.Ordinal) || raw.StartsWith("\\", StringComparison.Ordinal))
            {
                raw = raw.Substring(1);
            }

            var parts = raw.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0)
            {
                return false;
            }

            var command = parts[0].ToLowerInvariant();
            if (command.StartsWith("magiccore.", StringComparison.Ordinal))
            {
                command = command.Substring("magiccore.".Length);
            }

            switch (command)
            {
                case "link":
                    if (player != null)
                    {
                        RoleSyncService.SyncPlayer(player);
                        player.ChatMessage("Syncing your linked roles...");
                    }

                    return true;
                case "checkban":
                    HandleCheckBan(player, parts);
                    return true;
                case "bansystem":
                    HandleBanSystem(player, parts);
                    return true;
                case "leaderboard":
                    HandleLeaderboard(player, parts);
                    return true;
                case "rusttemplate.update":
                    if (player != null && !player.IsAdmin)
                    {
                        player.ChatMessage("You don't have permission to use this command.");
                        return true;
                    }

                    UpdateService.Check(true, player);
                    return true;
                default:
                    return false;
            }
        }

        private static void HandleCheckBan(BasePlayer player, string[] parts)
        {
            if (player != null && !player.IsAdmin)
            {
                player.ChatMessage("You don't have permission to use this command.");
                return;
            }

            if (parts.Length < 2 || !Players.IsSteamId(parts[1]))
            {
                player?.ChatMessage("Usage: /checkban <steamid>");
                return;
            }

            BanService.CheckSteamId(parts[1], player);
        }

        private static void HandleBanSystem(BasePlayer player, string[] parts)
        {
            if (player != null && !player.IsAdmin)
            {
                player.ChatMessage("You don't have permission to use this command.");
                return;
            }

            if (parts.Length < 2)
            {
                var status = ModConfig.Current.BanSystemEnabled ? "ENABLED" : "DISABLED";
                player?.ChatMessage("Ban system is currently " + status + "\nUsage: /bansystem <enable|disable|status>");
                return;
            }

            switch (parts[1].ToLowerInvariant())
            {
                case "enable":
                    ModConfig.Current.BanSystemEnabled = true;
                    ConfigStore.Save();
                    player?.ChatMessage("Ban system ENABLED");
                    break;
                case "disable":
                    ModConfig.Current.BanSystemEnabled = false;
                    ConfigStore.Save();
                    player?.ChatMessage("Ban system DISABLED");
                    break;
                case "status":
                    player?.ChatMessage(
                        "Ban system is currently " + (ModConfig.Current.BanSystemEnabled ? "ENABLED" : "DISABLED") + "\n" +
                        "Ban API: " + ModConfig.Current.NormalizedEndpoint() + "\n" +
                        "Cache TTL: " + ModConfig.Current.BanCheckCacheMinutes + " minutes\n" +
                        "Periodic check: Every " + ModConfig.Current.BanPeriodicCheckMinutes + " minutes\n" +
                        "Queue poll: " + ModConfig.Current.QueuePollSeconds + "s\n" +
                        "Permission backend: " + PermissionBridge.Engine);
                    break;
                default:
                    player?.ChatMessage("Usage: /bansystem <enable|disable|status>");
                    break;
            }
        }

        private static void HandleLeaderboard(BasePlayer player, string[] parts)
        {
            if (player != null && !player.IsAdmin)
            {
                player.ChatMessage("You don't have permission to use this command.");
                return;
            }

            if (parts.Length < 2)
            {
                var status = ModConfig.Current.LeaderboardEnabled ? "ENABLED" : "DISABLED";
                player?.ChatMessage("Leaderboard stats are currently " + status + "\nUsage: /leaderboard <enable|disable|status>");
                return;
            }

            switch (parts[1].ToLowerInvariant())
            {
                case "enable":
                    ModConfig.Current.LeaderboardEnabled = true;
                    ConfigStore.Save();
                    Log.Info("Leaderboard stats ENABLED");
                    player?.ChatMessage("Leaderboard stats ENABLED");
                    break;
                case "disable":
                    ModConfig.Current.LeaderboardEnabled = false;
                    ConfigStore.Save();
                    StatsService.Clear();
                    Log.Info("Leaderboard stats DISABLED");
                    player?.ChatMessage("Leaderboard stats DISABLED. This server will not send stats to the website.");
                    break;
                case "status":
                    player?.ChatMessage(
                        "Leaderboard stats are currently " + (ModConfig.Current.LeaderboardEnabled ? "ENABLED" : "DISABLED"));
                    break;
                default:
                    player?.ChatMessage("Usage: /leaderboard <enable|disable|status>");
                    break;
            }
        }
    }
}
