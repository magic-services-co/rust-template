using System;
using System.Collections.Generic;
using System.Linq;

namespace MagicCore
{
    internal static class BanService
    {
        private static readonly object Gate = new object();
        private static readonly Dictionary<ulong, BanInfo> Cache = new Dictionary<ulong, BanInfo>();
        private static readonly Queue<ulong> Pending = new Queue<ulong>();
        private static bool _checking;

        public static void Enqueue(BasePlayer player)
        {
            if (player == null || ModConfig.Current == null || !ModConfig.Current.BanSystemEnabled)
            {
                return;
            }

            var id = Players.SteamIdUlong(player);
            lock (Gate)
            {
                if (Cache.TryGetValue(id, out var cached) && IsFresh(cached))
                {
                    if (cached.Banned)
                    {
                        Kick(player, cached.Reason);
                    }

                    return;
                }

                if (!Pending.Contains(id))
                {
                    Pending.Enqueue(id);
                }
            }
        }

        public static void Tick()
        {
            if (ModConfig.Current == null || !ModConfig.Current.BanSystemEnabled || _checking)
            {
                return;
            }

            var batch = new List<BasePlayer>();
            lock (Gate)
            {
                var size = Math.Max(1, ModConfig.Current.BanBatchSize);
                while (Pending.Count > 0 && batch.Count < size)
                {
                    var id = Pending.Dequeue();
                    var player = Players.Find(id.ToString());
                    if (player != null)
                    {
                        batch.Add(player);
                    }
                }
            }

            if (batch.Count == 0)
            {
                return;
            }

            CheckBatch(batch);
        }

        public static void CheckOnline()
        {
            if (ModConfig.Current == null || !ModConfig.Current.BanSystemEnabled)
            {
                return;
            }

            foreach (var player in Players.Online())
            {
                Enqueue(player);
            }

            Cleanup();
        }

        public static void Forget(BasePlayer player)
        {
            if (player == null)
            {
                return;
            }

            lock (Gate)
            {
                Cache.Remove(Players.SteamIdUlong(player));
            }
        }

        public static void CheckSteamId(string steamId, BasePlayer admin)
        {
            if (admin == null)
            {
                return;
            }

            if (!ModConfig.Current.BanSystemEnabled)
            {
                admin.ChatMessage("Ban system is disabled.");
                return;
            }

            var path = ApiClient.Query("bans/check-fast", new Dictionary<string, string>
            {
                { "steamId", steamId },
                { "serverId", ModConfig.Current.ServerId }
            });
            ApiClient.Get(path, response =>
            {
                if (!response.Ok)
                {
                    admin.ChatMessage("Ban check API error: " + response.Status);
                    return;
                }

                var data = response.Json<BanResponse>();
                var status = data != null && data.Banned ? "BANNED - " + data.Reason : "NOT BANNED";
                admin.ChatMessage("Ban check for " + steamId + ": " + status);
            });
        }

        private static void CheckBatch(List<BasePlayer> players)
        {
            _checking = true;
            var steamIds = players.Select(Players.SteamId).Where(Players.IsSteamId).ToList();
            var map = players.ToDictionary(Players.SteamId, p => p);
            var path = ApiClient.Query("bans/check-batch-fast", new Dictionary<string, string>
            {
                { "steamIds", string.Join(",", steamIds) },
                { "serverId", ModConfig.Current.ServerId }
            });

            ApiClient.Get(path, response =>
            {
                _checking = false;
                if (!response.Ok)
                {
                    Log.DebugMsg("Ban batch failed: " + response.Status);
                    return;
                }

                var payload = response.Json<BanBatchResponse>();
                if (payload?.Results == null)
                {
                    return;
                }

                foreach (var steamId in steamIds)
                {
                    if (!payload.Results.TryGetValue(steamId, out var ban) || !map.TryGetValue(steamId, out var player))
                    {
                        continue;
                    }

                    var info = Store(player, ban);
                    if (info.Banned)
                    {
                        Kick(player, info.Reason);
                    }
                }
            });
        }

        private static BanInfo Store(BasePlayer player, BanResponse ban)
        {
            DateTime? expires = null;
            if (!string.IsNullOrEmpty(ban?.Expires) && DateTime.TryParse(ban.Expires, out var parsed))
            {
                expires = parsed.ToUniversalTime();
            }

            var info = new BanInfo
            {
                Banned = ban != null && ban.Banned,
                Type = ban?.Type,
                Reason = ban?.Reason,
                Expires = expires,
                CachedAt = DateTime.UtcNow,
                SteamId = Players.SteamId(player)
            };

            lock (Gate)
            {
                Cache[Players.SteamIdUlong(player)] = info;
            }

            return info;
        }

        private static bool IsFresh(BanInfo info)
        {
            return DateTime.UtcNow.Subtract(info.CachedAt).TotalMinutes < ModConfig.Current.BanCheckCacheMinutes;
        }

        private static void Cleanup()
        {
            lock (Gate)
            {
                var cutoff = DateTime.UtcNow.AddMinutes(-ModConfig.Current.BanCheckCacheMinutes * 2);
                var expired = Cache.Where(kvp => kvp.Value.CachedAt < cutoff).Select(kvp => kvp.Key).ToList();
                foreach (var key in expired)
                {
                    Cache.Remove(key);
                }
            }
        }

        private static void Kick(BasePlayer player, string reason)
        {
            if (player == null)
            {
                return;
            }

            player.Kick("You are banned from this server.\nReason: " + (reason ?? "Banned"));
            Log.Info("Kicked banned player " + Players.SafeName(player) + " (" + Players.SteamId(player) + ")");
        }
    }
}
