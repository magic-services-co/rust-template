using System;
using System.Collections.Generic;

namespace MagicCore
{
    internal static class Players
    {
        public static string SteamId(BasePlayer player)
        {
            return player == null ? string.Empty : player.UserIDString;
        }

        public static ulong SteamIdUlong(BasePlayer player)
        {
            var id = SteamId(player);
            return ulong.TryParse(id, out var value) ? value : 0UL;
        }

        public static bool IsSteamId(string value)
        {
            if (string.IsNullOrEmpty(value) || value.Length != 17)
            {
                return false;
            }

            foreach (var c in value)
            {
                if (c < '0' || c > '9')
                {
                    return false;
                }
            }

            return value.StartsWith("7656", StringComparison.Ordinal);
        }

        public static BasePlayer Find(string steamId)
        {
            if (string.IsNullOrEmpty(steamId))
            {
                return null;
            }

            var list = BasePlayer.activePlayerList;
            if (list == null)
            {
                return null;
            }

            foreach (var player in list)
            {
                if (player != null && player.UserIDString == steamId)
                {
                    return player;
                }
            }

            return null;
        }

        public static List<BasePlayer> Online()
        {
            var result = new List<BasePlayer>();
            var list = BasePlayer.activePlayerList;
            if (list == null)
            {
                return result;
            }

            foreach (var player in list)
            {
                if (player != null && player.IsConnected)
                {
                    result.Add(player);
                }
            }

            return result;
        }

        public static string SafeName(BasePlayer player)
        {
            var name = player == null ? "Unknown" : player.displayName ?? "Unknown";
            return name.Replace("\"", "'").Replace("\\", "/").Replace("\n", " ").Replace("\r", " ");
        }
    }
}
