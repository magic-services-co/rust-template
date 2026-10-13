using System;
using System.Collections.Generic;
using System.Linq;

namespace MagicCore
{
    internal static class StatsService
    {
        private static readonly Dictionary<ulong, PlayerStat> Stats = new Dictionary<ulong, PlayerStat>();
        private static bool _flushing;

        public static PlayerStat For(BasePlayer player)
        {
            if (player == null)
            {
                return null;
            }

            var id = Players.SteamIdUlong(player);
            if (!Stats.TryGetValue(id, out var stat))
            {
                stat = new PlayerStat
                {
                    SteamId = id,
                    LoginTime = DateTime.Now,
                    UserName = Players.SafeName(player)
                };
                Stats[id] = stat;
            }

            return stat;
        }

        public static void Announce(BasePlayer player)
        {
            if (player == null || ModConfig.Current == null || !ModConfig.Current.HasApi())
            {
                return;
            }

            var stat = For(player);
            if (stat == null || stat.SteamId == 0)
            {
                return;
            }

            ApiClient.Post("leaderboard/stats", new
            {
                source = string.IsNullOrEmpty(ModConfig.Current.StatsSource) ? "core" : ModConfig.Current.StatsSource,
                steam_id = stat.SteamId.ToString(),
                server_id = ModConfig.Current.ServerId,
                wipe_id = WipeService.CurrentWipeId ?? 0,
                username = stat.UserName,
                stats = new Dictionary<string, int>()
            }, response =>
            {
                if (!response.Ok)
                {
                    Log.DebugMsg("Player announce failed: " + response.Status + " " + response.Body);
                }
            });
        }

        public static PlayerStat For(ulong steamId)
        {
            if (steamId == 0)
            {
                return null;
            }

            if (!Stats.TryGetValue(steamId, out var stat))
            {
                stat = new PlayerStat { SteamId = steamId, LoginTime = DateTime.Now };
                Stats[steamId] = stat;
            }

            return stat;
        }

        public static void Forget(BasePlayer player, bool flush)
        {
            if (player == null)
            {
                return;
            }

            var id = Players.SteamIdUlong(player);
            if (!Stats.TryGetValue(id, out var stat))
            {
                return;
            }

            stat.LogoffTime = DateTime.Now;
            stat.UserName = Players.SafeName(player);
            if (flush)
            {
                Send(new List<PlayerStat> { stat }, false);
            }

            Stats.Remove(id);
        }

        public static void Flush()
        {
            if (_flushing || Stats.Count == 0)
            {
                return;
            }

            Send(Stats.Values.ToList(), true);
        }

        private static void Send(List<PlayerStat> stats, bool reset)
        {
            if (stats == null || stats.Count == 0 || ModConfig.Current == null || !ModConfig.Current.HasApi())
            {
                return;
            }

            var now = DateTime.Now;
            var players = new List<object>();
            foreach (var stat in stats)
            {
                if (!stat.HasActivity() && stat.PlayTimeSeconds < 5)
                {
                    continue;
                }

                players.Add(new
                {
                    steam_id = stat.SteamId.ToString(),
                    server_id = ModConfig.Current.ServerId,
                    wipe_id = WipeService.CurrentWipeId ?? 0,
                    username = stat.UserName,
                    stats = stat.ToPayload()
                });
            }

            if (players.Count == 0)
            {
                return;
            }

            _flushing = true;
            ApiClient.Post("leaderboard/stats/batch", new
            {
                source = string.IsNullOrEmpty(ModConfig.Current.StatsSource) ? "core" : ModConfig.Current.StatsSource,
                players
            }, response =>
            {
                if (response.Status == 404)
                {
                    SendLegacy(stats, reset, now);
                    return;
                }

                _flushing = false;
                if (!response.Ok)
                {
                    Log.DebugMsg("Stats flush failed: " + response.Status + " " + response.Body);
                    return;
                }

                Log.DebugMsg("Stats sent for " + players.Count + " players");
                if (!reset)
                {
                    return;
                }

                foreach (var stat in stats)
                {
                    if (Stats.ContainsKey(stat.SteamId))
                    {
                        stat.ResetTimer(now);
                    }
                }
            });
        }

        private static void SendLegacy(List<PlayerStat> stats, bool reset, DateTime now)
        {
            var remaining = 0;
            foreach (var stat in stats)
            {
                if (!stat.HasActivity() && stat.PlayTimeSeconds < 5)
                {
                    continue;
                }

                remaining++;
                var captured = stat;
                ApiClient.Post("leaderboard/stats", new
                {
                    source = string.IsNullOrEmpty(ModConfig.Current.StatsSource) ? "core" : ModConfig.Current.StatsSource,
                    steam_id = captured.SteamId.ToString(),
                    server_id = ModConfig.Current.ServerId,
                    wipe_id = WipeService.CurrentWipeId ?? 0,
                    username = captured.UserName,
                    stats = captured.ToPayload()
                }, _ =>
                {
                    remaining--;
                    if (remaining > 0)
                    {
                        return;
                    }

                    _flushing = false;
                    if (!reset)
                    {
                        return;
                    }

                    foreach (var item in stats)
                    {
                        if (Stats.ContainsKey(item.SteamId))
                        {
                            item.ResetTimer(now);
                        }
                    }
                });
            }

            if (remaining == 0)
            {
                _flushing = false;
            }
        }
    }
}
