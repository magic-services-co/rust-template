using System;
using System.Collections.Generic;
using System.Linq;

namespace MagicCore
{
    internal static class RoleSyncService
    {
        private static readonly HashSet<string> Tracked = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private static int _suppress;
        private static bool _polling;
        private static bool _fastPoll;

        public static bool FastPoll => _fastPoll;

        public static void RefreshTracked()
        {
            var query = new Dictionary<string, string>();
            if (!IsGlobal())
            {
                query["serverId"] = ModConfig.Current.ServerId;
            }

            ApiClient.Get(ApiClient.Query("admin/roles", query), response =>
            {
                if (!response.Ok)
                {
                    Tracked.Add(ModConfig.Current.DefaultGroup ?? "default");
                    return;
                }

                var roles = response.Json<List<TrackedRole>>() ?? new List<TrackedRole>();
                Tracked.Clear();
                foreach (var role in roles)
                {
                    if (role.OxideGroupNames == null)
                    {
                        continue;
                    }

                    foreach (var group in role.OxideGroupNames)
                    {
                        if (!string.IsNullOrWhiteSpace(group))
                        {
                            Tracked.Add(group.Trim());
                        }
                    }
                }

                Tracked.Add(ModConfig.Current.DefaultGroup ?? "default");
                Log.Info("Tracked Oxide groups: " + string.Join(", ", Tracked));
            });
        }

        public static void PollQueue()
        {
            if (_polling || ModConfig.Current == null || !ModConfig.Current.HasApi())
            {
                return;
            }

            _polling = true;
            var path = ApiClient.Query("oxide/queue", new Dictionary<string, string>
            {
                { "serverId", ModConfig.Current.ServerId },
                { "limit", "50" }
            });

            ApiClient.Get(path, response =>
            {
                _polling = false;
                if (!response.Ok)
                {
                    _fastPoll = false;
                    return;
                }

                var payload = response.Json<QueuePullResponse>();
                var items = payload?.Items;
                if (items == null || items.Count == 0)
                {
                    _fastPoll = false;
                    return;
                }

                _fastPoll = true;
                var applied = new List<string>();
                _suppress++;
                try
                {
                    foreach (var item in items)
                    {
                        if (string.IsNullOrEmpty(item?.SteamId) || string.IsNullOrEmpty(item.GroupName))
                        {
                            if (!string.IsNullOrEmpty(item?.Id))
                            {
                                applied.Add(item.Id);
                            }

                            continue;
                        }

                        ApplyQueueItem(item);
                        if (!string.IsNullOrEmpty(item.Id))
                        {
                            applied.Add(item.Id);
                        }
                    }
                }
                finally
                {
                    _suppress--;
                }

                if (applied.Count > 0)
                {
                    ApiClient.Post("oxide/queue/ack", new { ids = applied }, null);
                }
            });
        }

        public static void SyncPlayer(BasePlayer player)
        {
            if (player == null)
            {
                return;
            }

            var steamId = Players.SteamId(player);
            var path = ApiClient.Query("oxide/player", new Dictionary<string, string>
            {
                { "steamId", steamId },
                { "playerId", steamId },
                { "serverId", ModConfig.Current.ServerId }
            });

            ApiClient.Get(path, response =>
            {
                if (response.Status == 404 || response.Status == 403)
                {
                    SyncPlayerLegacy(player, steamId);
                    return;
                }

                var groups = new List<string>();
                if (response.Ok)
                {
                    var payload = response.Json<PlayerGroupsResponse>();
                    groups = payload?.Groups ?? payload?.OxideGroups ?? groups;
                }

                ApplyDesiredGroups(player, groups);
            });
        }

        private static void SyncPlayerLegacy(BasePlayer player, string steamId)
        {
            ApiClient.Get("user/search/" + Uri.EscapeDataString(steamId), response =>
            {
                var groups = new List<string>();
                if (response.Ok)
                {
                    var token = response.Token();
                    var roles = token?["roles"];
                    if (roles != null)
                    {
                        foreach (var role in roles)
                        {
                            foreach (var link in role["oxideGroups"] ?? new Newtonsoft.Json.Linq.JArray())
                            {
                                string group;
                                string server = null;
                                if (link.Type == Newtonsoft.Json.Linq.JTokenType.String)
                                {
                                    group = (string)link;
                                }
                                else
                                {
                                    group = (string)(link["groupName"] ?? link["group"] ?? link);
                                    server = (string)link["serverId"];
                                }
                                if (string.IsNullOrWhiteSpace(group))
                                {
                                    continue;
                                }

                                if (!string.IsNullOrEmpty(server) &&
                                    !string.IsNullOrEmpty(ModConfig.Current.ServerId) &&
                                    !server.Equals(ModConfig.Current.ServerId, StringComparison.OrdinalIgnoreCase) &&
                                    !server.Equals("global", StringComparison.OrdinalIgnoreCase))
                                {
                                    continue;
                                }

                                groups.Add(group);
                            }
                        }
                    }
                }

                ApplyDesiredGroups(player, groups);
            });
        }

        private static void ApplyDesiredGroups(BasePlayer player, List<string> groups)
        {
            var def = ModConfig.Current.DefaultGroup;
            if (!string.IsNullOrEmpty(def) && !groups.Contains(def, StringComparer.OrdinalIgnoreCase))
            {
                groups.Add(def);
            }

            ApplyDesired(player, groups);
        }

        public static void SyncOnline()
        {
            foreach (var player in Players.Online())
            {
                SyncPlayer(player);
            }
        }

        public static void OnLocalGroupChange(string steamId, string groupName, bool added)
        {
            if (_suppress > 0 || string.IsNullOrEmpty(steamId) || string.IsNullOrEmpty(groupName))
            {
                return;
            }

            if (!Tracked.Contains(groupName))
            {
                return;
            }

            ApiClient.Post("admin/logs/action", new
            {
                action = added ? "ROLE_ASSIGNED" : "ROLE_REVOKED",
                details = new
                {
                    steamId,
                    oxideGroupNames = groupName,
                    serverIds = ModConfig.Current.ServerId,
                    source = "harmony"
                }
            }, response =>
            {
                if (response.Status != 0 && !response.Ok)
                {
                    Log.DebugMsg("Local group push failed: " + response.Status);
                }
            });
        }

        private static void ApplyQueueItem(QueueItem item)
        {
            var revoke = string.Equals(item.Action, "revoke", StringComparison.OrdinalIgnoreCase)
                         || string.Equals(item.Action, "removed", StringComparison.OrdinalIgnoreCase);
            if (revoke)
            {
                PermissionBridge.RemoveUserGroup(item.SteamId, item.GroupName);
                Log.DebugMsg("Queue revoked " + item.GroupName + " from " + item.SteamId);
            }
            else
            {
                PermissionBridge.AddUserGroup(item.SteamId, item.GroupName);
                Log.DebugMsg("Queue granted " + item.GroupName + " to " + item.SteamId);
            }

            var player = Players.Find(item.SteamId);
            if (player != null)
            {
                var label = DisplayName(item.GroupName);
                player.ChatMessage(revoke ? "RoleRemoved: " + label : "RoleAdded: " + label);
            }
        }

        private static void ApplyDesired(BasePlayer player, List<string> desired)
        {
            var steamId = Players.SteamId(player);
            var added = new List<string>();
            var removed = new List<string>();
            _suppress++;
            try
            {
                foreach (var role in desired.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    if (PermissionBridge.UserHasGroup(steamId, role))
                    {
                        continue;
                    }

                    PermissionBridge.AddUserGroup(steamId, role);
                    added.Add(role);
                }

                foreach (var current in PermissionBridge.GetUserGroups(steamId))
                {
                    if (desired.Contains(current, StringComparer.OrdinalIgnoreCase) || !Tracked.Contains(current))
                    {
                        continue;
                    }

                    PermissionBridge.RemoveUserGroup(steamId, current);
                    removed.Add(current);
                }
            }
            finally
            {
                _suppress--;
            }

            if (added.Count == 0 && removed.Count == 0)
            {
                return;
            }

            var lines = new List<string>();
            lines.AddRange(added.Select(r => "RoleAdded: " + DisplayName(r)));
            lines.AddRange(removed.Select(r => "RoleRemoved: " + DisplayName(r)));
            player.ChatMessage(string.Join("\n", lines));
        }

        private static string DisplayName(string group)
        {
            if (ModConfig.Current.RoleCommonNames != null &&
                ModConfig.Current.RoleCommonNames.TryGetValue(group, out var pretty) &&
                !string.IsNullOrEmpty(pretty))
            {
                return pretty;
            }

            return group;
        }

        private static bool IsGlobal()
        {
            var id = ModConfig.Current.ServerId;
            return string.IsNullOrWhiteSpace(id) || id.Equals("global", StringComparison.OrdinalIgnoreCase);
        }
    }
}
