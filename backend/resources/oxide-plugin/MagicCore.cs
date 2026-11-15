using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using HarmonyLib;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Oxide.Core;
using Oxide.Core.Libraries;
using Oxide.Core.Plugins;
using Rust;
using UnityEngine;

namespace Oxide.Plugins
{
    [Info("MagicCore", "Magic Services // Vinni P.", "1.0.0")]
    [Description("Website roles, bans, leaderboard stats, wipes, linked kits, presence, and self-update.")]
    public class MagicCore : RustPlugin
    {
        public const string Version = "1.0.0";
        private const string HarmonyId = "com.magicservices.magiccore.oxide";

        public static MagicCore Instance { get; private set; }

        private MagicCoreConfig _cfg = MagicCoreConfig.Create();
        private Timer _loop;
        private Harmony _harmony;
        private bool _ready;
        private bool _patched;

        private float _queueElapsed;
        private float _banTickElapsed;
        private float _banElapsed;
        private float _statsElapsed;
        private float _rolesElapsed;
        private float _safetyElapsed;
        private float _kitElapsed;
        private float _updateElapsed;
        private float _updateBootElapsed;
        private float _heartbeatElapsed;
        private bool _updateBootChecked;

        private int _inFlight;
        private bool _pumping;
        private readonly Queue<Action> _httpWait = new Queue<Action>();

        private readonly HashSet<string> _tracked = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private int _suppress;
        private bool _polling;
        private bool _fastPoll;

        private readonly Dictionary<ulong, BanInfo> _banCache = new Dictionary<ulong, BanInfo>();
        private readonly Queue<ulong> _banPending = new Queue<ulong>();
        private bool _banChecking;

        private readonly Dictionary<ulong, PlayerStat> _stats = new Dictionary<ulong, PlayerStat>();
        private bool _flushing;
        private int? _wipeId;

        private string _kitSignature = string.Empty;
        private readonly object _kitGate = new object();

        private bool _updateBusy;
        private string _announcedVersion;
        private bool _reloadAttempted;
        private string _announcedHeartbeatUpdate;
        private string _runtimeSent;

        protected override void LoadDefaultConfig()
        {
            _cfg = MagicCoreConfig.Create();
            SaveConfig();
        }

        protected override void LoadConfig()
        {
            base.LoadConfig();
            try
            {
                _cfg = Config.ReadObject<MagicCoreConfig>();
            }
            catch (Exception ex)
            {
                PrintWarning("Config could not be read (" + ex.Message + "). Using defaults.");
                _cfg = null;
            }

            if (_cfg == null)
            {
                _cfg = MagicCoreConfig.Create();
                SaveConfig();
            }
        }

        protected override void SaveConfig()
        {
            Config.WriteObject(_cfg ?? MagicCoreConfig.Create(), true);
        }

        private void Init()
        {
            Instance = this;
        }

        private void OnServerInitialized()
        {
            Boot();
        }

        private void OnServerInitialized(bool initial)
        {
            Boot();
        }

        private void Boot()
        {
            if (_ready)
            {
                return;
            }

            _ready = true;
            Puts("MagicCore " + Version + " ready. Config: " + Interface.Oxide.ConfigDirectory + "/MagicCore.json");
            if (!HasApi() || string.IsNullOrWhiteSpace(ServerId()))
            {
                PrintWarning("Set API_END_POINT, SERVER_ID, and API_KEY. Do not also load the MagicCore Harmony mod.");
            }

            if (PresenceOn())
            {
                SendHeartbeat();
                SendRuntime();
            }

            if (WipesOn())
            {
                RefreshWipe();
            }

            if (RolesOn())
            {
                RefreshTracked();
            }

            if (KitOn())
            {
                PollKit();
            }

            if (StatsOn())
            {
                ApplyPatches();
            }

            foreach (var player in BasePlayer.activePlayerList)
            {
                if (player != null && player.IsConnected)
                {
                    OnPlayerConnected(player);
                }
            }

            _loop = timer.Every(0.5f, Tick);
        }

        private void Unload()
        {
            _ready = false;
            if (_loop != null)
            {
                _loop.Destroy();
                _loop = null;
            }

            try
            {
                FlushStats();
            }
            catch
            {
            }

            try
            {
                if (_harmony != null)
                {
                    _harmony.UnpatchAll(HarmonyId);
                }
            }
            catch
            {
            }

            Instance = null;
        }

        private void Tick()
        {
            if (_cfg == null)
            {
                return;
            }

            const float dt = 0.5f;
            _heartbeatElapsed += dt;
            var heartbeatEvery = Math.Max(1, _cfg.HEARTBEAT_MINUTES) * 60f;
            if (PresenceOn() && _heartbeatElapsed >= heartbeatEvery)
            {
                _heartbeatElapsed = 0f;
                SendHeartbeat();
            }

            if (!_ready)
            {
                return;
            }

            _queueElapsed += dt;
            _banTickElapsed += dt;
            _banElapsed += dt;
            _statsElapsed += dt;
            _rolesElapsed += dt;
            _safetyElapsed += dt;
            _kitElapsed += dt;
            _updateElapsed += dt;
            if (!_updateBootChecked)
            {
                _updateBootElapsed += dt;
            }

            var queueEvery = _fastPoll
                ? Math.Max(0.4f, _cfg.QUEUE_POLL_SECONDS * 0.4f)
                : Math.Max(0.75f, _cfg.QUEUE_POLL_SECONDS);
            if (RolesOn() && _queueElapsed >= queueEvery)
            {
                _queueElapsed = 0f;
                PollQueue();
            }

            if (_banTickElapsed >= 2f)
            {
                _banTickElapsed = 0f;
                TickBans();
            }

            if (_cfg.BAN_SYSTEM_ENABLED && _cfg.BAN_PERIODIC_CHECK_MINUTES > 0 &&
                _banElapsed >= _cfg.BAN_PERIODIC_CHECK_MINUTES * 60f)
            {
                _banElapsed = 0f;
                CheckOnlineBans();
            }

            if (_cfg.LEADERBOARD_ENABLED && _cfg.STATS_FLUSH_SECONDS > 0 && _statsElapsed >= _cfg.STATS_FLUSH_SECONDS)
            {
                _statsElapsed = 0f;
                FlushStats();
            }

            if (RolesOn() && _cfg.TRACKED_ROLES_REFRESH_MINUTES > 0 && _rolesElapsed >= _cfg.TRACKED_ROLES_REFRESH_MINUTES * 60f)
            {
                _rolesElapsed = 0f;
                RefreshTracked();
            }

            if (_kitElapsed >= 300f)
            {
                _kitElapsed = 0f;
                if (KitOn())
                {
                    PollKit();
                }

                if (PresenceOn())
                {
                    SendRuntime();
                }
            }

            if (!_updateBootChecked && _updateBootElapsed >= 45f)
            {
                _updateBootChecked = true;
                if (_cfg.AUTO_UPDATE)
                {
                    CheckUpdate(false, null);
                }
            }

            var updateEvery = Math.Max(5, _cfg.UPDATE_CHECK_MINUTES) * 60f;
            if (_cfg.AUTO_UPDATE && _updateElapsed >= updateEvery)
            {
                _updateElapsed = 0f;
                CheckUpdate(false, null);
            }

            if (RolesOn() && _cfg.ROLE_SAFETY_SYNC_MINUTES > 0 && _safetyElapsed >= _cfg.ROLE_SAFETY_SYNC_MINUTES * 60f)
            {
                _safetyElapsed = 0f;
                SyncOnline();
            }
        }

        #region Commands

        [ChatCommand("link")]
        private void ChatLink(BasePlayer player, string command, string[] args)
        {
            if (!RolesOn())
            {
                Reply(player, "Website roles are disabled in the MagicCore config.");
                return;
            }

            SyncPlayer(player);
            Reply(player, "Syncing your linked roles...");
        }

        [ChatCommand("checkban")]
        private void ChatCheckBan(BasePlayer player, string command, string[] args)
        {
            HandleCheckBan(player, args);
        }

        [ChatCommand("bansystem")]
        private void ChatBanSystem(BasePlayer player, string command, string[] args)
        {
            HandleBanSystem(player, args);
        }

        [ChatCommand("leaderboard")]
        private void ChatLeaderboard(BasePlayer player, string command, string[] args)
        {
            HandleLeaderboard(player, args);
        }

        [ConsoleCommand("magiccore.link")]
        private void ConsoleLink(ConsoleSystem.Arg arg)
        {
            var player = arg == null ? null : arg.Player();
            if (player == null)
            {
                Reply(null, "magiccore.link must be used by a player.");
                return;
            }

            if (!RolesOn())
            {
                Reply(player, "Website roles are disabled in the MagicCore config.");
                return;
            }

            SyncPlayer(player);
            Reply(player, "Syncing your linked roles...");
        }

        [ConsoleCommand("magiccore.checkban")]
        private void ConsoleCheckBan(ConsoleSystem.Arg arg)
        {
            HandleCheckBan(arg == null ? null : arg.Player(), CommandArgs(arg));
        }

        [ConsoleCommand("magiccore.bansystem")]
        private void ConsoleBanSystem(ConsoleSystem.Arg arg)
        {
            HandleBanSystem(arg == null ? null : arg.Player(), CommandArgs(arg));
        }

        [ConsoleCommand("magiccore.leaderboard")]
        private void ConsoleLeaderboard(ConsoleSystem.Arg arg)
        {
            HandleLeaderboard(arg == null ? null : arg.Player(), CommandArgs(arg));
        }

        [ConsoleCommand("magiccore.update")]
        private void ConsoleUpdate(ConsoleSystem.Arg arg)
        {
            var player = arg == null ? null : arg.Player();
            if (player != null && !player.IsAdmin)
            {
                Reply(player, "You don't have permission to use this command.");
                return;
            }

            if (!UpdatesOn())
            {
                Reply(player, "Self-update is disabled in the MagicCore config.");
                return;
            }

            CheckUpdate(true, player);
        }

        private void HandleCheckBan(BasePlayer player, string[] args)
        {
            if (!IsAdmin(player))
            {
                Reply(player, "You don't have permission to use this command.");
                return;
            }

            if (args == null || args.Length < 1 || !IsSteamId(args[0]))
            {
                Reply(player, "Usage: /checkban <steamid>");
                return;
            }

            CheckSteamId(args[0], player);
        }

        private void HandleBanSystem(BasePlayer player, string[] args)
        {
            if (!IsAdmin(player))
            {
                Reply(player, "You don't have permission to use this command.");
                return;
            }

            if (args == null || args.Length < 1)
            {
                var status = _cfg.BAN_SYSTEM_ENABLED ? "ENABLED" : "DISABLED";
                Reply(player, "Ban system is currently " + status + "\nUsage: /bansystem <enable|disable|status>");
                return;
            }

            switch (args[0].ToLowerInvariant())
            {
                case "enable":
                    _cfg.BAN_SYSTEM_ENABLED = true;
                    SaveConfig();
                    Reply(player, "Ban system ENABLED");
                    break;
                case "disable":
                    _cfg.BAN_SYSTEM_ENABLED = false;
                    SaveConfig();
                    Reply(player, "Ban system DISABLED");
                    break;
                case "status":
                    Reply(player,
                        "Ban system is currently " + (_cfg.BAN_SYSTEM_ENABLED ? "ENABLED" : "DISABLED") + "\n" +
                        "Ban API: " + Endpoint() + "\n" +
                        "Cache TTL: " + _cfg.BAN_CHECK_CACHE_MINUTES + " minutes\n" +
                        "Periodic check: Every " + _cfg.BAN_PERIODIC_CHECK_MINUTES + " minutes\n" +
                        "Queue poll: " + _cfg.QUEUE_POLL_SECONDS + "s\n" +
                        "Permission backend: " + RuntimeName());
                    break;
                default:
                    Reply(player, "Usage: /bansystem <enable|disable|status>");
                    break;
            }
        }

        private void HandleLeaderboard(BasePlayer player, string[] args)
        {
            if (!IsAdmin(player))
            {
                Reply(player, "You don't have permission to use this command.");
                return;
            }

            if (args == null || args.Length < 1)
            {
                var status = _cfg.LEADERBOARD_ENABLED ? "ENABLED" : "DISABLED";
                Reply(player, "Leaderboard stats are currently " + status + "\nUsage: /leaderboard <enable|disable|status>");
                return;
            }

            switch (args[0].ToLowerInvariant())
            {
                case "enable":
                    _cfg.LEADERBOARD_ENABLED = true;
                    SaveConfig();
                    ApplyPatches();
                    Puts("Leaderboard stats ENABLED");
                    Reply(player, "Leaderboard stats ENABLED");
                    break;
                case "disable":
                    _cfg.LEADERBOARD_ENABLED = false;
                    SaveConfig();
                    ClearStats();
                    Puts("Leaderboard stats DISABLED");
                    Reply(player, "Leaderboard stats DISABLED. This server will not track stats or send them to the website.");
                    break;
                case "status":
                    Reply(player, "Leaderboard stats are currently " + (_cfg.LEADERBOARD_ENABLED ? "ENABLED" : "DISABLED"));
                    break;
                default:
                    Reply(player, "Usage: /leaderboard <enable|disable|status>");
                    break;
            }
        }

        private static string[] CommandArgs(ConsoleSystem.Arg arg)
        {
            if (arg == null || arg.Args == null)
            {
                return null;
            }

            var source = arg.Args;
            var result = new string[source.Length];
            for (var i = 0; i < source.Length; i++)
            {
                result[i] = (string)source[i];
            }

            return result;
        }

        private static bool IsAdmin(BasePlayer player)
        {
            return player == null || player.IsAdmin;
        }

        private void Reply(BasePlayer player, string message)
        {
            if (string.IsNullOrEmpty(message))
            {
                return;
            }

            if (player == null || !player.IsConnected)
            {
                Puts(message);
                return;
            }

            player.ChatMessage(message);
        }

        #endregion

        #region Http

        private bool HasApi()
        {
            return _cfg != null && !string.IsNullOrWhiteSpace(Endpoint()) && !string.IsNullOrWhiteSpace(_cfg.API_KEY);
        }

        private string Endpoint()
        {
            var endpoint = (_cfg == null ? string.Empty : _cfg.API_END_POINT ?? string.Empty).Trim().TrimEnd('/');
            if (endpoint.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
            {
                return endpoint;
            }

            return string.IsNullOrEmpty(endpoint) ? string.Empty : endpoint + "/api";
        }

        private string ServerId()
        {
            return _cfg == null ? string.Empty : (_cfg.SERVER_ID ?? string.Empty).Trim();
        }

        private void Get(string path, Action<int, string> then, float timeout = 0f)
        {
            Send("GET", path, null, then, timeout);
        }

        private void Post(string path, object body, Action<int, string> then)
        {
            string json = null;
            if (body != null)
            {
                json = body as string ?? JsonConvert.SerializeObject(body, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });
            }

            Send("POST", path, json, then, 0f);
        }

        private void Send(string method, string path, string body, Action<int, string> then, float timeout)
        {
            if (!HasApi())
            {
                Debug("HTTP skipped, API endpoint or key missing");
                return;
            }

            var url = BuildUrl(path);
            Action start = () =>
            {
                _inFlight++;
                var headers = new Dictionary<string, string>
                {
                    { "x-api-key", _cfg.API_KEY ?? string.Empty },
                    { "Accept", "application/json" }
                };
                if (!string.IsNullOrEmpty(body))
                {
                    headers["Content-Type"] = "application/json";
                }

                var requestMethod = method == "POST" ? RequestMethod.POST : RequestMethod.GET;
                var seconds = timeout > 0f ? timeout : Math.Max(3, _cfg.HTTP_TIMEOUT_SECONDS);
                Debug(method + " " + url);
                webrequest.Enqueue(url, body ?? string.Empty, (code, response) =>
                {
                    _inFlight = Math.Max(0, _inFlight - 1);
                    PumpHttp();
                    if (!IsOk(code, response))
                    {
                        Debug("HTTP " + code + " " + url + " " + Truncate(response));
                    }

                    if (then != null)
                    {
                        then(code, response);
                    }
                }, this, requestMethod, headers, seconds);
            };

            if (_inFlight >= MaxHttp())
            {
                _httpWait.Enqueue(start);
            }
            else
            {
                start();
            }
        }

        private void PumpHttp()
        {
            if (_pumping)
            {
                return;
            }

            _pumping = true;
            try
            {
                while (_inFlight < MaxHttp() && _httpWait.Count > 0)
                {
                    _httpWait.Dequeue()();
                }
            }
            finally
            {
                _pumping = false;
            }
        }

        private int MaxHttp()
        {
            var max = _cfg == null ? 4 : _cfg.MAX_CONCURRENT_HTTP;
            if (max < 1)
            {
                max = 1;
            }

            if (max > 8)
            {
                max = 8;
            }

            return max;
        }

        private string BuildUrl(string path)
        {
            if (!string.IsNullOrEmpty(path) && path.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                return path;
            }

            return Endpoint().TrimEnd('/') + "/" + (path ?? string.Empty).TrimStart('/');
        }

        private static string Query(string path, Dictionary<string, string> query)
        {
            if (query == null || query.Count == 0)
            {
                return path;
            }

            var sb = new StringBuilder(path);
            var first = path.IndexOf('?') < 0;
            foreach (var pair in query)
            {
                if (string.IsNullOrEmpty(pair.Value))
                {
                    continue;
                }

                sb.Append(first ? "?" : "&");
                first = false;
                sb.Append(Uri.EscapeDataString(pair.Key));
                sb.Append("=");
                sb.Append(Uri.EscapeDataString(pair.Value));
            }

            return sb.ToString();
        }

        private static bool IsOk(int code, string body)
        {
            return code >= 200 && code < 300 && !string.IsNullOrEmpty(body);
        }

        private T Parse<T>(string body) where T : class
        {
            if (string.IsNullOrWhiteSpace(body) || body.TrimStart().StartsWith("<", StringComparison.Ordinal))
            {
                return null;
            }

            try
            {
                return JsonConvert.DeserializeObject<T>(body);
            }
            catch (Exception ex)
            {
                Debug("JSON parse failed: " + ex.Message);
                return null;
            }
        }

        private JToken Token(string body)
        {
            if (string.IsNullOrWhiteSpace(body))
            {
                return null;
            }

            try
            {
                return JToken.Parse(body);
            }
            catch
            {
                return null;
            }
        }

        private static string Truncate(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            return value.Length <= 180 ? value : value.Substring(0, 180) + "...";
        }

        private void Debug(string message)
        {
            if (_cfg != null && _cfg.DEBUG)
            {
                Puts(message);
            }
        }

        #endregion

        #region Roles

        private bool RolesOn()
        {
            return _cfg == null || _cfg.ROLES_ENABLED;
        }

        private bool WipesOn()
        {
            return _cfg == null || _cfg.WIPES_ENABLED;
        }

        private bool KitOn()
        {
            return _cfg == null || _cfg.LINKED_KIT_ENABLED;
        }

        private bool PresenceOn()
        {
            return _cfg == null || _cfg.PRESENCE_ENABLED;
        }

        private bool UpdatesOn()
        {
            return _cfg == null || _cfg.AUTO_UPDATE;
        }

        private void RefreshTracked()
        {
            if (!RolesOn())
            {
                return;
            }

            var query = new Dictionary<string, string>();
            if (!IsGlobal())
            {
                query["serverId"] = ServerId();
            }

            Get(Query("admin/roles", query), (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    _tracked.Add(DefaultGroup());
                    return;
                }

                var roles = Parse<List<TrackedRole>>(body) ?? new List<TrackedRole>();
                _tracked.Clear();
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
                            _tracked.Add(group.Trim());
                        }
                    }
                }

                _tracked.Add(DefaultGroup());
                Puts("Tracked Oxide groups: " + string.Join(", ", _tracked.ToArray()));
            });
        }

        private void PollQueue()
        {
            if (!RolesOn() || _polling || !HasApi())
            {
                return;
            }

            _polling = true;
            var path = Query("oxide/queue", new Dictionary<string, string>
            {
                { "serverId", ServerId() },
                { "limit", "50" }
            });

            Get(path, (code, body) =>
            {
                _polling = false;
                if (!IsOk(code, body))
                {
                    _fastPoll = false;
                    return;
                }

                var items = Parse<QueuePullResponse>(body)?.Items;
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
                        if (item == null || string.IsNullOrEmpty(item.SteamId) || string.IsNullOrEmpty(item.GroupName))
                        {
                            if (item != null && !string.IsNullOrEmpty(item.Id))
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
                    Post("oxide/queue/ack", new { ids = applied }, null);
                }
            });
        }

        private void SyncOnline()
        {
            foreach (var player in OnlinePlayers())
            {
                SyncPlayer(player);
            }
        }

        private void SyncPlayer(BasePlayer player)
        {
            if (!RolesOn() || player == null || !HasApi())
            {
                return;
            }

            var steamId = SteamId(player);
            var path = Query("oxide/player", new Dictionary<string, string>
            {
                { "steamId", steamId },
                { "playerId", steamId },
                { "serverId", ServerId() }
            });

            Get(path, (code, body) =>
            {
                if (code == 404 || code == 403)
                {
                    SyncPlayerLegacy(player, steamId);
                    return;
                }

                var groups = new List<string>();
                if (IsOk(code, body))
                {
                    var payload = Parse<PlayerGroupsResponse>(body);
                    groups = payload == null ? groups : payload.Groups ?? payload.OxideGroups ?? groups;
                }

                ApplyDesiredGroups(player, groups);
            });
        }

        private void SyncPlayerLegacy(BasePlayer player, string steamId)
        {
            Get("user/search/" + Uri.EscapeDataString(steamId), (code, body) =>
            {
                var groups = new List<string>();
                if (IsOk(code, body))
                {
                    var roles = Token(body)?["roles"];
                    if (roles != null)
                    {
                        foreach (var role in roles)
                        {
                            foreach (var link in role["oxideGroups"] ?? new JArray())
                            {
                                string group;
                                string server = null;
                                if (link.Type == JTokenType.String)
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

                                var serverId = ServerId();
                                if (!string.IsNullOrEmpty(server) &&
                                    !string.IsNullOrEmpty(serverId) &&
                                    !server.Equals(serverId, StringComparison.OrdinalIgnoreCase) &&
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

        private void ApplyDesiredGroups(BasePlayer player, List<string> groups)
        {
            groups = groups ?? new List<string>();
            var def = DefaultGroup();
            if (!string.IsNullOrEmpty(def) && !groups.Contains(def, StringComparer.OrdinalIgnoreCase))
            {
                groups.Add(def);
            }

            ApplyDesired(player, groups);
        }

        private void ApplyDesired(BasePlayer player, List<string> desired)
        {
            if (player == null)
            {
                return;
            }

            var steamId = SteamId(player);
            var added = new List<string>();
            var removed = new List<string>();
            _suppress++;
            try
            {
                foreach (var role in desired.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    if (permission.UserHasGroup(steamId, role))
                    {
                        continue;
                    }

                    EnsureGroup(role);
                    permission.AddUserGroup(steamId, role);
                    added.Add(role);
                }

                foreach (var current in permission.GetUserGroups(steamId) ?? new string[0])
                {
                    if (desired.Contains(current, StringComparer.OrdinalIgnoreCase) || !_tracked.Contains(current))
                    {
                        continue;
                    }

                    permission.RemoveUserGroup(steamId, current);
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
            Reply(player, string.Join("\n", lines.ToArray()));
        }

        private void ApplyQueueItem(QueueItem item)
        {
            var revoke = string.Equals(item.Action, "revoke", StringComparison.OrdinalIgnoreCase)
                         || string.Equals(item.Action, "removed", StringComparison.OrdinalIgnoreCase);
            if (revoke)
            {
                permission.RemoveUserGroup(item.SteamId, item.GroupName);
                Debug("Queue revoked " + item.GroupName + " from " + item.SteamId);
            }
            else
            {
                EnsureGroup(item.GroupName);
                permission.AddUserGroup(item.SteamId, item.GroupName);
                Debug("Queue granted " + item.GroupName + " to " + item.SteamId);
            }

            var player = FindPlayer(item.SteamId);
            if (player != null)
            {
                var label = DisplayName(item.GroupName);
                Reply(player, revoke ? "RoleRemoved: " + label : "RoleAdded: " + label);
            }
        }

        private void OnUserGroupAdded(string id, string groupName)
        {
            ReportGroup(id, groupName, true);
        }

        private void OnUserGroupRemoved(string id, string groupName)
        {
            ReportGroup(id, groupName, false);
        }

        private void ReportGroup(string steamId, string groupName, bool added)
        {
            if (!RolesOn() || _suppress > 0 || string.IsNullOrEmpty(steamId) || string.IsNullOrEmpty(groupName) || !_tracked.Contains(groupName))
            {
                return;
            }

            Post("admin/logs/action", new
            {
                action = added ? "ROLE_ASSIGNED" : "ROLE_REVOKED",
                details = new
                {
                    steamId,
                    oxideGroupNames = groupName,
                    serverIds = ServerId(),
                    source = "oxide"
                }
            }, null);
        }

        private void EnsureGroup(string group)
        {
            if (string.IsNullOrWhiteSpace(group) || permission.GroupExists(group))
            {
                return;
            }

            permission.CreateGroup(group, DisplayName(group), 0);
        }

        private string DisplayName(string group)
        {
            string pretty;
            if (_cfg.RoleCommonNames != null && _cfg.RoleCommonNames.TryGetValue(group, out pretty) && !string.IsNullOrEmpty(pretty))
            {
                return pretty;
            }

            return group;
        }

        private string DefaultGroup()
        {
            return string.IsNullOrWhiteSpace(_cfg.DEFAULT_GROUP) ? "default" : _cfg.DEFAULT_GROUP;
        }

        private bool IsGlobal()
        {
            var id = ServerId();
            return string.IsNullOrWhiteSpace(id) || id.Equals("global", StringComparison.OrdinalIgnoreCase);
        }

        #endregion

        #region Bans

        private void OnPlayerConnected(BasePlayer player)
        {
            if (player == null)
            {
                return;
            }

            if (StatsOn())
            {
                ForStat(player);
                Announce(player);
            }

            if (RolesOn())
            {
                SyncPlayer(player);
            }

            EnqueueBan(player);
        }

        private void OnPlayerDisconnected(BasePlayer player, string reason)
        {
            if (player == null)
            {
                return;
            }

            ForgetStat(player, true);
            ForgetBan(player);
        }

        private void EnqueueBan(BasePlayer player)
        {
            if (player == null || _cfg == null || !_cfg.BAN_SYSTEM_ENABLED)
            {
                return;
            }

            var id = SteamIdUlong(player);
            BanInfo cached;
            if (_banCache.TryGetValue(id, out cached) && BanFresh(cached))
            {
                if (cached.Banned)
                {
                    KickBanned(player, cached.Reason);
                }

                return;
            }

            if (!_banPending.Contains(id))
            {
                _banPending.Enqueue(id);
            }
        }

        private void TickBans()
        {
            if (_cfg == null || !_cfg.BAN_SYSTEM_ENABLED || _banChecking)
            {
                return;
            }

            var batch = new List<BasePlayer>();
            var size = Math.Max(1, _cfg.BAN_BATCH_SIZE);
            while (_banPending.Count > 0 && batch.Count < size)
            {
                var id = _banPending.Dequeue();
                var player = FindPlayer(id.ToString());
                if (player != null)
                {
                    batch.Add(player);
                }
            }

            if (batch.Count == 0)
            {
                return;
            }

            CheckBanBatch(batch);
        }

        private void CheckOnlineBans()
        {
            if (_cfg == null || !_cfg.BAN_SYSTEM_ENABLED)
            {
                return;
            }

            foreach (var player in OnlinePlayers())
            {
                EnqueueBan(player);
            }

            CleanupBans();
        }

        private void ForgetBan(BasePlayer player)
        {
            if (player == null)
            {
                return;
            }

            _banCache.Remove(SteamIdUlong(player));
        }

        private void CheckSteamId(string steamId, BasePlayer admin)
        {
            if (!_cfg.BAN_SYSTEM_ENABLED)
            {
                Reply(admin, "Ban system is disabled.");
                return;
            }

            var path = Query("bans/check-fast", new Dictionary<string, string>
            {
                { "steamId", steamId },
                { "serverId", ServerId() }
            });
            Get(path, (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    Reply(admin, "Ban check API error: " + code);
                    return;
                }

                var data = Parse<BanResponse>(body);
                var status = data != null && data.Banned ? "BANNED - " + data.Reason : "NOT BANNED";
                Reply(admin, "Ban check for " + steamId + ": " + status);
            });
        }

        private void CheckBanBatch(List<BasePlayer> players)
        {
            _banChecking = true;
            var steamIds = new List<string>();
            var map = new Dictionary<string, BasePlayer>();
            foreach (var player in players)
            {
                var steamId = SteamId(player);
                if (!IsSteamId(steamId) || map.ContainsKey(steamId))
                {
                    continue;
                }

                steamIds.Add(steamId);
                map[steamId] = player;
            }

            var path = Query("bans/check-batch-fast", new Dictionary<string, string>
            {
                { "steamIds", string.Join(",", steamIds.ToArray()) },
                { "serverId", ServerId() }
            });

            Get(path, (code, body) =>
            {
                _banChecking = false;
                if (!IsOk(code, body))
                {
                    Debug("Ban batch failed: " + code);
                    return;
                }

                var payload = Parse<BanBatchResponse>(body);
                if (payload == null || payload.Results == null)
                {
                    return;
                }

                foreach (var steamId in steamIds)
                {
                    BanResponse ban;
                    BasePlayer player;
                    if (!payload.Results.TryGetValue(steamId, out ban) || !map.TryGetValue(steamId, out player))
                    {
                        continue;
                    }

                    var info = StoreBan(player, ban);
                    if (info.Banned)
                    {
                        KickBanned(player, info.Reason);
                    }
                }
            });
        }

        private BanInfo StoreBan(BasePlayer player, BanResponse ban)
        {
            var info = new BanInfo
            {
                Banned = ban != null && ban.Banned,
                Reason = ban == null ? null : ban.Reason,
                CachedAt = DateTime.UtcNow
            };
            _banCache[SteamIdUlong(player)] = info;
            return info;
        }

        private bool BanFresh(BanInfo info)
        {
            return DateTime.UtcNow.Subtract(info.CachedAt).TotalMinutes < _cfg.BAN_CHECK_CACHE_MINUTES;
        }

        private void CleanupBans()
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-_cfg.BAN_CHECK_CACHE_MINUTES * 2);
            var expired = new List<ulong>();
            foreach (var pair in _banCache)
            {
                if (pair.Value.CachedAt < cutoff)
                {
                    expired.Add(pair.Key);
                }
            }

            foreach (var key in expired)
            {
                _banCache.Remove(key);
            }
        }

        private void KickBanned(BasePlayer player, string reason)
        {
            if (player == null)
            {
                return;
            }

            player.Kick("You are banned from this server.\nReason: " + (reason ?? "Banned"));
            Puts("Kicked banned player " + SafeName(player) + " (" + SteamId(player) + ")");
        }

        #endregion

        #region Stats

        private bool StatsOn()
        {
            return _cfg == null || _cfg.LEADERBOARD_ENABLED;
        }

        private void OnEntityDeath(BaseCombatEntity entity, HitInfo info)
        {
            try
            {
                if (!StatsOn() || entity == null || info == null)
                {
                    return;
                }

                var attacker = info.Initiator as BasePlayer;
                if (attacker == null)
                {
                    return;
                }

                var stats = ForStat(attacker);
                if (stats == null)
                {
                    return;
                }

                if (entity is BaseAnimalNPC)
                {
                    stats.AnimalKills++;
                    return;
                }

                if (entity is PatrolHelicopter)
                {
                    stats.HeliKills++;
                    return;
                }

                if (entity is BradleyAPC)
                {
                    stats.BradleyKills++;
                    return;
                }

                var victim = entity as BasePlayer;
                if (victim == null)
                {
                    return;
                }

                if (victim.IsNpc)
                {
                    stats.NpcKills++;
                    return;
                }

                var victimStats = ForStat(victim);
                if (victimStats == null)
                {
                    return;
                }

                if (victim.lastDamage == DamageType.Suicide)
                {
                    victimStats.Suicides++;
                }

                victimStats.Deaths++;
                if (!attacker.IsNpc && victim.lastDamage != DamageType.Suicide)
                {
                    stats.Kills++;
                }
            }
            catch (Exception ex)
            {
                PrintWarning("Die: " + ex.Message);
            }
        }

        private void OnEntityTakeDamage(BaseCombatEntity entity, HitInfo info)
        {
            try
            {
                var victim = entity as BasePlayer;
                var attacker = info == null ? null : info.Initiator as BasePlayer;
                if (!StatsOn() || victim == null || attacker == null || info == null || !info.isHeadshot)
                {
                    return;
                }

                var stats = ForStat(attacker);
                if (stats != null)
                {
                    stats.HeadShots++;
                }
            }
            catch (Exception ex)
            {
                PrintWarning("OnAttacked: " + ex.Message);
            }
        }

        private void OnWeaponFired(BaseProjectile projectile, BasePlayer player, ItemModProjectile mod, object projectiles)
        {
            try
            {
                if (!StatsOn())
                {
                    return;
                }

                var stats = ForStat(player);
                if (stats != null)
                {
                    stats.BulletsFired++;
                }
            }
            catch (Exception ex)
            {
                PrintWarning("WeaponFired: " + ex.Message);
            }
        }

        private void OnRocketLaunched(BasePlayer player, BaseEntity entity)
        {
            try
            {
                if (!StatsOn() || player == null || entity == null)
                {
                    return;
                }

                var stats = ForStat(player);
                if (stats == null)
                {
                    return;
                }

                var name = entity.ShortPrefabName ?? string.Empty;
                if (name == "rocket_hv")
                {
                    stats.HvRocketsFired++;
                }
                else if (name == "rocket_fire")
                {
                    stats.IncendiaryRocketsFired++;
                }
                else if (name == "rocket_smoke")
                {
                    stats.SmokeRocketsFired++;
                }
                else if (name == "40mm_grenade_he")
                {
                    stats.HeGrenadeFired++;
                }
                else if (name.IndexOf("rocket", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    stats.RocketsFired++;
                }
            }
            catch (Exception ex)
            {
                PrintWarning("RocketLaunch: " + ex.Message);
            }
        }

        private void OnExplosiveThrown(BasePlayer player, BaseEntity entity, ThrownWeapon item)
        {
            NoteThrown(player, item);
        }

        private void OnExplosiveDropped(BasePlayer player, BaseEntity entity, ThrownWeapon item)
        {
            NoteThrown(player, item);
        }

        private void NoteThrown(BasePlayer player, ThrownWeapon weapon)
        {
            try
            {
                if (!StatsOn() || player == null || weapon == null)
                {
                    return;
                }

                var stats = ForStat(player);
                if (stats == null)
                {
                    return;
                }

                var name = (weapon.ShortPrefabName ?? weapon.name ?? string.Empty).ToLowerInvariant();
                if (name.Contains("timed") || name.Contains("explosive.timed") || name.Contains("c4"))
                {
                    stats.TimedExplosivesThrown++;
                }
                else if (name.Contains("supplysignal") || name.Contains("supply.signal"))
                {
                    stats.SupplySignalThrown++;
                }
                else if (name.Contains("satchel"))
                {
                    stats.SatchelChargesThrown++;
                }
            }
            catch (Exception ex)
            {
                PrintWarning("ExplosiveThrown: " + ex.Message);
            }
        }

        private void OnDispenserGather(ResourceDispenser dispenser, BaseEntity entity, Item item)
        {
            var player = entity as BasePlayer;
            if (player == null && entity != null)
            {
                player = entity.ToPlayer();
            }

            NoteGather(player, item);
        }

        private void OnDispenserBonus(ResourceDispenser dispenser, BasePlayer player, Item item)
        {
            NoteGather(player, item);
        }

        private void NoteGather(BasePlayer player, Item item)
        {
            try
            {
                if (!StatsOn() || player == null || item == null || item.info == null)
                {
                    return;
                }

                AddResource(player, item.info.shortname, item.amount);
            }
            catch (Exception ex)
            {
                PrintWarning("DispenserGather: " + ex.Message);
            }
        }

        private void OnCollectiblePickup(CollectibleEntity collectible, BasePlayer player)
        {
            try
            {
                if (!StatsOn() || collectible == null || player == null)
                {
                    return;
                }

                var name = (collectible.ShortPrefabName ?? string.Empty).Split('-')[0];
                var amount = 0;
                if (collectible.itemList != null && collectible.itemList.Length > 0)
                {
                    amount = (int)collectible.itemList[0].amount;
                }

                AddCollectible(player, name, amount);
            }
            catch (Exception ex)
            {
                PrintWarning("CollectiblePickup: " + ex.Message);
            }
        }

        private void OnItemAction(Item item, string action, BasePlayer player)
        {
            try
            {
                if (!StatsOn() || player == null || action != "Gut" || item == null || item.info == null)
                {
                    return;
                }

                var shortname = item.info.shortname ?? string.Empty;
                if (shortname.IndexOf("fish", StringComparison.OrdinalIgnoreCase) < 0)
                {
                    return;
                }

                var stats = ForStat(player);
                if (stats != null)
                {
                    stats.FishGutted++;
                }
            }
            catch (Exception ex)
            {
                PrintWarning("FishGut: " + ex.Message);
            }
        }

        private void OnServerSave()
        {
            FlushStats();
        }

        public void NoteCrate(HackableLockedCrate crate)
        {
            if (!StatsOn() || crate == null)
            {
                return;
            }

            BasePlayer hacker = null;
            var field = crate.GetType().GetField("originalHackerPlayerId", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (field != null)
            {
                var raw = field.GetValue(crate);
                var id = raw is ulong ? (ulong)raw : 0UL;
                if (id != 0)
                {
                    hacker = BasePlayer.FindByID(id) ?? BasePlayer.FindSleeping(id);
                }
            }

            var stats = ForStat(hacker);
            if (stats != null)
            {
                stats.HackedCratesLooted++;
            }
        }

        public void NoteMission(bool completed, BasePlayer player)
        {
            var stats = !StatsOn() || player == null ? null : ForStat(player);
            if (stats == null)
            {
                return;
            }

            if (completed)
            {
                stats.MissionsCompleted++;
            }
            else
            {
                stats.MissionsStarted++;
            }
        }

        public void NoteVehicle(string prefab, BasePlayer player)
        {
            if (!StatsOn() || string.IsNullOrEmpty(prefab) || player == null || !IsSteamId(player.UserIDString))
            {
                return;
            }

            var stats = ForStat(player);
            if (stats == null)
            {
                return;
            }

            if (prefab.IndexOf("boat", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                stats.BoatsPurchased++;
            }
            else if (prefab.IndexOf("submarine", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                stats.SubPurchased++;
            }
            else if (prefab.IndexOf("copter", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                stats.HelisPurchased++;
            }
        }

        private void AddCollectible(BasePlayer player, string name, int amount)
        {
            var stats = ForStat(player);
            if (stats == null)
            {
                return;
            }

            switch (name)
            {
                case "wood": stats.WoodFarmed += amount; break;
                case "metal": stats.MetalFarmed += amount; break;
                case "stone": stats.StoneFarmed += amount; break;
                case "hemp": stats.ClothCollected += amount; break;
                case "mushroom": stats.MushroomsHarvested += amount; break;
                case "berry": stats.BerriesHarvested += amount; break;
                case "pumpkin": stats.PumpkinsHarvested += amount; break;
                case "corn": stats.CornHarvested += amount; break;
                case "potato": stats.PotatoesHarvested += amount; break;
            }
        }

        private void AddResource(BasePlayer player, string shortname, int amount)
        {
            var stats = ForStat(player);
            if (stats == null)
            {
                return;
            }

            switch (shortname)
            {
                case "leather": stats.LeatherCollected += amount; break;
                case "cloth": stats.ClothCollected += amount; break;
                case "wood": stats.WoodFarmed += amount; break;
                case "sulfur.ore": stats.SulfurFarmed += amount; break;
                case "stones": stats.StoneFarmed += amount; break;
                case "metal.ore": stats.MetalFarmed += amount; break;
                case "hq.metal.ore": stats.HqmFarmed += amount; break;
            }
        }

        private PlayerStat ForStat(BasePlayer player)
        {
            if (!StatsOn() || player == null)
            {
                return null;
            }

            var id = SteamIdUlong(player);
            PlayerStat stat;
            if (!_stats.TryGetValue(id, out stat))
            {
                stat = new PlayerStat
                {
                    SteamId = id,
                    LoginTime = DateTime.Now,
                    UserName = SafeName(player)
                };
                _stats[id] = stat;
            }

            return stat;
        }

        private void Announce(BasePlayer player)
        {
            if (!StatsOn() || player == null || !HasApi())
            {
                return;
            }

            var stat = ForStat(player);
            if (stat == null || stat.SteamId == 0)
            {
                return;
            }

            Post("leaderboard/stats", new
            {
                source = StatsSource(),
                steam_id = stat.SteamId.ToString(),
                server_id = ServerId(),
                wipe_id = _wipeId ?? 0,
                username = stat.UserName,
                stats = new Dictionary<string, int>()
            }, (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    Debug("Player announce failed: " + code + " " + body);
                }
            });
        }

        private void ClearStats()
        {
            _stats.Clear();
            _flushing = false;
        }

        private void ForgetStat(BasePlayer player, bool flush)
        {
            if (player == null)
            {
                return;
            }

            var id = SteamIdUlong(player);
            PlayerStat stat;
            if (!_stats.TryGetValue(id, out stat))
            {
                return;
            }

            stat.LogoffTime = DateTime.Now;
            stat.UserName = SafeName(player);
            if (flush && StatsOn())
            {
                SendStats(new List<PlayerStat> { stat }, false);
            }

            _stats.Remove(id);
        }

        private void FlushStats()
        {
            if (!StatsOn() || _flushing || _stats.Count == 0)
            {
                return;
            }

            SendStats(_stats.Values.ToList(), true);
        }

        private void SendStats(List<PlayerStat> stats, bool reset)
        {
            if (!StatsOn() || stats == null || stats.Count == 0 || !HasApi())
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
                    server_id = ServerId(),
                    wipe_id = _wipeId ?? 0,
                    username = stat.UserName,
                    stats = stat.ToPayload()
                });
            }

            if (players.Count == 0)
            {
                return;
            }

            _flushing = true;
            Post("leaderboard/stats/batch", new
            {
                source = StatsSource(),
                players
            }, (code, body) =>
            {
                if (code == 404)
                {
                    SendStatsLegacy(stats, reset, now);
                    return;
                }

                _flushing = false;
                if (!IsOk(code, body))
                {
                    Debug("Stats flush failed: " + code + " " + body);
                    return;
                }

                Debug("Stats sent for " + players.Count + " players");
                if (!reset)
                {
                    return;
                }

                foreach (var stat in stats)
                {
                    if (_stats.ContainsKey(stat.SteamId))
                    {
                        stat.ResetTimer(now);
                    }
                }
            });
        }

        private void SendStatsLegacy(List<PlayerStat> stats, bool reset, DateTime now)
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
                Post("leaderboard/stats", new
                {
                    source = StatsSource(),
                    steam_id = captured.SteamId.ToString(),
                    server_id = ServerId(),
                    wipe_id = _wipeId ?? 0,
                    username = captured.UserName,
                    stats = captured.ToPayload()
                }, (code, body) =>
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
                        if (_stats.ContainsKey(item.SteamId))
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

        private string StatsSource()
        {
            return _cfg == null || string.IsNullOrEmpty(_cfg.STATS_SOURCE) ? "core" : _cfg.STATS_SOURCE;
        }

        #endregion

        #region Wipes

        private void OnNewSave(string filename)
        {
            if (!WipesOn())
            {
                return;
            }

            Puts("Wipe detected");
            TriggerWipe(null);
        }

        private void RefreshWipe()
        {
            if (!WipesOn() || string.IsNullOrWhiteSpace(ServerId()))
            {
                return;
            }

            var path = Query("wipes", new Dictionary<string, string>
            {
                { "server", ServerId() },
                { "serverId", ServerId() }
            });

            Get(path, (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    Debug("Wipe fetch failed: " + code);
                    return;
                }

                var list = Parse<WipeListResponse>(body)?.Data;
                if (list == null)
                {
                    list = Parse<List<WipeData>>(body);
                }

                WipeData wipe = null;
                if (list != null)
                {
                    foreach (var item in list)
                    {
                        if (item != null && item.IsActive && item.Id > 0)
                        {
                            wipe = item;
                            break;
                        }
                    }

                    if (wipe == null)
                    {
                        foreach (var item in list)
                        {
                            if (item != null && item.Id > 0)
                            {
                                wipe = item;
                                break;
                            }
                        }
                    }
                }

                if (wipe != null)
                {
                    _wipeId = wipe.Id;
                    Puts("Current wipe #" + wipe.Id + " " + wipe.Name);
                }
            });
        }

        private void TriggerWipe(string name)
        {
            if (!WipesOn() || string.IsNullOrWhiteSpace(ServerId()))
            {
                return;
            }

            Post("wipes", new
            {
                server_id = ServerId(),
                serverId = ServerId(),
                name = name ?? ("Wipe " + DateTime.Now.ToString("MM/dd/yyyy"))
            }, (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    Debug("Wipe trigger failed: " + code + " " + body);
                    return;
                }

                var token = Token(body);
                var id = token?["id"]?.Value<int?>() ?? token?["wipe"]?["id"]?.Value<int?>();
                if (id.HasValue && id.Value > 0)
                {
                    _wipeId = id;
                }

                Puts("Wipe triggered (" + (_wipeId.HasValue ? _wipeId.Value.ToString() : "unknown") + ")");
            });
        }

        #endregion

        #region Linked kit

        private void PollKit()
        {
            if (!KitOn() || string.IsNullOrWhiteSpace(ServerId()) || !HasApi())
            {
                return;
            }

            var serverId = ServerId();
            var path = Query("oxide/linked-kit", new Dictionary<string, string>
            {
                { "serverId", serverId }
            });

            Get(path, (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    Debug("Linked kit config failed: " + code);
                    return;
                }

                var kitName = Token(body)?["kitName"]?.ToString();
                if (string.IsNullOrWhiteSpace(kitName))
                {
                    return;
                }

                ReadAndPostKit(ServerRoot(), kitName.Trim(), serverId);
            });
        }

        private void ReadAndPostKit(string root, string kitName, string serverId)
        {
            List<KitItem> items;
            try
            {
                items = ReadKit(root, kitName);
            }
            catch (Exception ex)
            {
                Debug("Linked kit read failed: " + ex.Message);
                return;
            }

            if (items == null)
            {
                Debug("Linked kit '" + kitName + "' was not found under " + root);
                return;
            }

            var signature = kitName.ToLowerInvariant() + "|" + KitSignature(items);
            lock (_kitGate)
            {
                if (signature == _kitSignature)
                {
                    return;
                }
            }

            var payloadItems = new List<object>();
            foreach (var item in items)
            {
                payloadItems.Add(new { shortname = item.Shortname, amount = item.Amount });
            }

            Post("oxide/linked-kit", new
            {
                serverId,
                kitName,
                items = payloadItems
            }, (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    Debug("Linked kit sync failed: " + code + " " + body);
                    return;
                }

                var ignoredToken = Token(body)?["ignored"];
                var ignored = ignoredToken != null && ignoredToken.Value<bool>();
                if (ignored)
                {
                    return;
                }

                lock (_kitGate)
                {
                    _kitSignature = signature;
                }

                Puts("Linked kit '" + kitName + "' synced (" + items.Count + " items)");
            });
        }

        private static string KitSignature(List<KitItem> items)
        {
            var parts = new string[items.Count];
            for (var i = 0; i < items.Count; i++)
            {
                parts[i] = items[i].Shortname + "x" + items[i].Amount;
            }

            return string.Join(",", parts);
        }

        private static List<KitItem> ReadKit(string root, string kitName)
        {
            var relatives = new[]
            {
                Path.Combine("oxide", "data", "Kits", "kits_data.json"),
                Path.Combine("carbon", "data", "Kits", "kits_data.json"),
                Path.Combine("oxide", "data", "Kits.json"),
                Path.Combine("carbon", "data", "Kits.json")
            };

            foreach (var relative in relatives)
            {
                var path = Path.Combine(root, relative);
                if (!File.Exists(path))
                {
                    continue;
                }

                var rootToken = JToken.Parse(File.ReadAllText(path));
                var kit = FindKit(rootToken, kitName);
                if (kit == null)
                {
                    continue;
                }

                var items = new List<KitItem>();
                CollectKitItems(kit, items, 0);
                return items;
            }

            return null;
        }

        private static JToken FindKit(JToken token, string kitName)
        {
            var obj = token as JObject;
            if (obj != null)
            {
                foreach (var prop in obj.Properties())
                {
                    if (prop.Value is JObject && string.Equals(prop.Name, kitName, StringComparison.OrdinalIgnoreCase))
                    {
                        return prop.Value;
                    }

                    var value = prop.Value;
                    var named = value == null ? null : value["Name"] ?? value["name"] ?? value["KitName"];
                    if (named != null && string.Equals(named.ToString(), kitName, StringComparison.OrdinalIgnoreCase))
                    {
                        return value;
                    }
                }

                var keys = new[] { "kits", "Kits", "_kits", "data" };
                foreach (var key in keys)
                {
                    var child = obj[key];
                    if (child == null)
                    {
                        continue;
                    }

                    var found = FindKit(child, kitName);
                    if (found != null)
                    {
                        return found;
                    }
                }
            }
            else
            {
                var array = token as JArray;
                if (array != null)
                {
                    foreach (var child in array)
                    {
                        var found = FindKit(child, kitName);
                        if (found != null)
                        {
                            return found;
                        }
                    }
                }
            }

            return null;
        }

        private static void CollectKitItems(JToken token, List<KitItem> items, int depth)
        {
            if (token == null || depth > 6 || items.Count >= 48)
            {
                return;
            }

            var array = token as JArray;
            if (array != null)
            {
                foreach (var child in array)
                {
                    if (items.Count >= 48)
                    {
                        return;
                    }

                    KitItem item;
                    if (TryKitItem(child, out item))
                    {
                        items.Add(item);
                    }
                    else
                    {
                        CollectKitItems(child, items, depth + 1);
                    }
                }

                return;
            }

            var obj = token as JObject;
            KitItem parsed;
            if (obj == null || TryKitItem(obj, out parsed))
            {
                return;
            }

            foreach (var prop in obj.Properties())
            {
                if (prop.Value is JArray || prop.Name.IndexOf("item", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    CollectKitItems(prop.Value, items, depth + 1);
                }
            }
        }

        private static bool TryKitItem(JToken token, out KitItem item)
        {
            item = null;
            var obj = token as JObject;
            if (obj == null)
            {
                return false;
            }

            string shortname = null;
            var keys = new[] { "Shortname", "shortname", "ShortName", "itemShortname" };
            foreach (var key in keys)
            {
                var value = obj[key] == null ? null : obj[key].ToString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    shortname = value.Trim().ToLowerInvariant();
                    break;
                }
            }

            if (string.IsNullOrEmpty(shortname) || !System.Text.RegularExpressions.Regex.IsMatch(shortname, "^[a-z0-9._-]{1,64}$"))
            {
                return false;
            }

            item = new KitItem
            {
                Shortname = shortname,
                Amount = ReadKitAmount(obj)
            };
            return true;
        }

        private static int ReadKitAmount(JObject obj)
        {
            var keys = new[] { "Amount", "amount", "Count", "count" };
            foreach (var key in keys)
            {
                var token = obj[key];
                if (token == null || token.Type == JTokenType.Null)
                {
                    continue;
                }

                if (token.Type == JTokenType.Integer)
                {
                    return Math.Max(1, token.Value<int>());
                }

                if (token.Type == JTokenType.Float)
                {
                    return Math.Max(1, (int)Math.Round(token.Value<double>()));
                }

                int parsed;
                if (int.TryParse(token.ToString(), out parsed))
                {
                    return Math.Max(1, parsed);
                }
            }

            return 1;
        }

        #endregion

        #region Presence and updates

        private void SendHeartbeat()
        {
            if (!PresenceOn() || !HasApi() || string.IsNullOrWhiteSpace(ServerId()))
            {
                return;
            }

            var runtime = RuntimeName();
            Post("oxide/heartbeat", new
            {
                serverId = ServerId(),
                version = Version,
                runtime,
                product = "oxide"
            }, (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    Debug("Heartbeat failed: " + code + " " + body);
                    return;
                }

                var result = Parse<HeartbeatResult>(body);
                if (!UpdatesOn() || result == null || !result.UpdateAvailable || string.IsNullOrWhiteSpace(result.Latest))
                {
                    _announcedHeartbeatUpdate = null;
                    return;
                }

                if (string.Equals(_announcedHeartbeatUpdate, result.Latest, StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }

                _announcedHeartbeatUpdate = result.Latest;
                Puts("MagicCore " + Version + " is behind " + result.Latest + " on the website.");
            });
        }

        private void SendRuntime()
        {
            if (!PresenceOn() || !HasApi() || string.IsNullOrWhiteSpace(ServerId()))
            {
                return;
            }

            var runtime = RuntimeName();
            if (string.Equals(_runtimeSent, runtime, StringComparison.Ordinal))
            {
                return;
            }

            var serverId = ServerId();
            Post("oxide/runtime", new
            {
                serverId,
                runtime
            }, (code, body) =>
            {
                if (!IsOk(code, body))
                {
                    Debug("Runtime report failed: " + code + " " + body);
                    return;
                }

                _runtimeSent = runtime;
                Puts("Reported " + runtime + " for server " + serverId);
            });
        }

        private void CheckUpdate(bool manual, BasePlayer player)
        {
            if (!UpdatesOn())
            {
                Reply(player, "Self-update is disabled in the MagicCore config.");
                return;
            }

            if (_updateBusy)
            {
                Reply(player, "MagicCore update is already running.");
                return;
            }

            if (!HasApi())
            {
                Reply(player, "MagicCore update needs API_END_POINT and API_KEY in the MagicCore config.");
                return;
            }

            _updateBusy = true;
            Get("oxide/plugin-release?version=" + Uri.EscapeDataString(Version), (code, body) =>
            {
                var downloading = false;
                try
                {
                    if (!IsOk(code, body))
                    {
                        Reply(player, "Could not check for a MagicCore update" + (code > 0 ? " (HTTP " + code + ")." : "."));
                        return;
                    }

                    var release = Parse<PluginRelease>(body);
                    if (release == null || string.IsNullOrWhiteSpace(release.Version))
                    {
                        Reply(player, "The site did not return a MagicCore version.");
                        return;
                    }

                    if (!IsNewer(release.Version, Version))
                    {
                        if (manual)
                        {
                            Reply(player, "MagicCore " + Version + " is up to date.");
                        }

                        return;
                    }

                    LogRelease(release);
                    if (!release.PluginReady)
                    {
                        if (_announcedVersion != release.Version || manual)
                        {
                            _announcedVersion = release.Version;
                            Reply(player, "MagicCore " + release.Version + " is published, but this site is not serving MagicCore.cs yet.");
                        }

                        return;
                    }

                    var installed = ReadStamp();
                    if (string.Equals(installed, release.Version, StringComparison.OrdinalIgnoreCase))
                    {
                        if (manual || !_reloadAttempted)
                        {
                            _reloadAttempted = true;
                            Reply(player, "MagicCore " + release.Version + " is already downloaded. Reloading.");
                            ReloadSelf();
                        }

                        return;
                    }

                    downloading = true;
                    Reply(player, "Downloading MagicCore " + release.Version + ".");
                    Get("oxide/plugin-download", (status, text) =>
                    {
                        try
                        {
                            if (!IsOk(status, text) || !IsPluginSource(text))
                            {
                                Reply(player, "MagicCore download failed" + (status > 0 ? " (HTTP " + status + ")." : "."));
                                return;
                            }

                            if (!InstallPlugin(text, release.Version))
                            {
                                return;
                            }

                            Reply(player, "MagicCore " + release.Version + " downloaded. Reloading.");
                            ReloadSelf();
                        }
                        finally
                        {
                            _updateBusy = false;
                        }
                    }, 120f);
                }
                finally
                {
                    if (!downloading)
                    {
                        _updateBusy = false;
                    }
                }
            });
        }

        private void LogRelease(PluginRelease release)
        {
            var when = string.IsNullOrWhiteSpace(release.ReleasedAt) ? string.Empty : " (" + release.ReleasedAt + ")";
            Puts("MagicCore update " + release.Version + when + ". This server is running " + Version + ".");
            LogLines("Notes", release.Notes);
            LogLines("Added", release.Added);
            LogLines("Changed", release.Changed);
            LogLines("Removed", release.Removed);
        }

        private void LogLines(string title, string[] lines)
        {
            if (lines == null || lines.Length == 0)
            {
                return;
            }

            Puts(title + ":");
            for (var i = 0; i < lines.Length; i++)
            {
                if (!string.IsNullOrWhiteSpace(lines[i]))
                {
                    Puts("- " + lines[i]);
                }
            }
        }

        private bool InstallPlugin(string text, string version)
        {
            try
            {
                var dest = PluginPath();
                var dir = Path.GetDirectoryName(dest);
                if (string.IsNullOrEmpty(dir))
                {
                    Reply(null, "Could not find the plugins folder.");
                    return false;
                }

                Directory.CreateDirectory(dir);
                var pending = dest + ".pending";
                File.WriteAllText(pending, text, new UTF8Encoding(false));
                File.Copy(pending, dest, true);
                try
                {
                    File.Delete(pending);
                }
                catch
                {
                }

                File.WriteAllText(Path.Combine(dir, "MagicCore.version"), version ?? string.Empty, new UTF8Encoding(false));
                return true;
            }
            catch (Exception ex)
            {
                PrintWarning("MagicCore update failed: " + ex.Message);
                Reply(null, "Downloaded MagicCore but could not replace the plugin file. The new file is MagicCore.cs.pending.");
                return false;
            }
        }

        private string ReadStamp()
        {
            try
            {
                var path = Path.Combine(Path.GetDirectoryName(PluginPath()) ?? string.Empty, "MagicCore.version");
                return File.Exists(path) ? File.ReadAllText(path).Trim() : string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        private void ReloadSelf()
        {
            timer.Once(1f, () =>
            {
                try
                {
                    Interface.Oxide.ReloadPlugin(Name);
                }
                catch (Exception ex)
                {
                    var command = RuntimeName() == "carbon" ? "c.reload MagicCore" : "oxide.reload MagicCore";
                    PrintWarning("MagicCore was downloaded. Run " + command + ". " + ex.Message);
                }
            });
        }

        private string PluginPath()
        {
            var directory = Interface.Oxide.PluginDirectory;
            var nested = Path.Combine(directory, "MagicCore", "MagicCore.cs");
            if (File.Exists(nested))
            {
                return nested;
            }

            return Path.Combine(directory, "MagicCore.cs");
        }

        private static bool IsPluginSource(string text)
        {
            if (string.IsNullOrEmpty(text) || text.Length < 200)
            {
                return false;
            }

            var head = text.Length > 8000 ? text.Substring(0, 8000) : text;
            if (head.IndexOf("<html", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return false;
            }

            return head.IndexOf("namespace Oxide.Plugins", StringComparison.Ordinal) >= 0
                   && head.IndexOf("class MagicCore", StringComparison.Ordinal) >= 0;
        }

        private static bool IsNewer(string remote, string local)
        {
            var left = VersionParts(remote);
            var right = VersionParts(local);
            var length = Math.Max(left.Length, right.Length);
            for (var i = 0; i < length; i++)
            {
                var a = i < left.Length ? left[i] : 0;
                var b = i < right.Length ? right[i] : 0;
                if (a > b)
                {
                    return true;
                }

                if (a < b)
                {
                    return false;
                }
            }

            return false;
        }

        private static int[] VersionParts(string version)
        {
            var text = (version ?? string.Empty).Trim();
            if (text.StartsWith("v", StringComparison.OrdinalIgnoreCase))
            {
                text = text.Substring(1);
            }

            var bits = text.Split('.');
            var numbers = new int[bits.Length];
            for (var i = 0; i < bits.Length; i++)
            {
                var token = bits[i];
                var end = 0;
                while (end < token.Length && char.IsDigit(token[end]))
                {
                    end++;
                }

                int value;
                numbers[i] = end > 0 && int.TryParse(token.Substring(0, end), out value) ? value : 0;
            }

            return numbers;
        }

        private void ApplyPatches()
        {
            if (_patched)
            {
                return;
            }

            _patched = true;
            try
            {
                _harmony = new Harmony(HarmonyId);
                _harmony.CreateClassProcessor(typeof(CratePatch)).Patch();
                _harmony.CreateClassProcessor(typeof(MissionStartPatch)).Patch();
                _harmony.CreateClassProcessor(typeof(MissionDonePatch)).Patch();
                _harmony.CreateClassProcessor(typeof(VehiclePatch)).Patch();
                Puts("Stat patches: crate=" + YesNo(CratePatch.Ready) +
                     " missions=" + YesNo(MissionStartPatch.Ready && MissionDonePatch.Ready) +
                     " vehicles=" + YesNo(VehiclePatch.Ready));
            }
            catch (Exception ex)
            {
                PrintWarning("Some stat hooks could not be patched: " + ex.Message);
            }
        }

        private static string YesNo(bool value)
        {
            return value ? "yes" : "no";
        }

        private static string RuntimeName()
        {
            var assemblies = AppDomain.CurrentDomain.GetAssemblies();
            for (var i = 0; i < assemblies.Length; i++)
            {
                var name = assemblies[i].GetName().Name ?? string.Empty;
                if (name.StartsWith("Carbon", StringComparison.OrdinalIgnoreCase))
                {
                    return "carbon";
                }
            }

            return "oxide";
        }

        private static string ServerRoot()
        {
            try
            {
                var data = UnityEngine.Application.dataPath;
                if (!string.IsNullOrEmpty(data))
                {
                    return Path.GetFullPath(Path.Combine(data, ".."));
                }
            }
            catch
            {
            }

            return Directory.GetCurrentDirectory();
        }

        private static string SteamId(BasePlayer player)
        {
            return player == null ? string.Empty : player.UserIDString;
        }

        private static ulong SteamIdUlong(BasePlayer player)
        {
            ulong value;
            return ulong.TryParse(SteamId(player), out value) ? value : 0UL;
        }

        private static bool IsSteamId(string value)
        {
            if (string.IsNullOrEmpty(value) || value.Length != 17)
            {
                return false;
            }

            for (var i = 0; i < value.Length; i++)
            {
                if (value[i] < '0' || value[i] > '9')
                {
                    return false;
                }
            }

            return value.StartsWith("7656", StringComparison.Ordinal);
        }

        private static BasePlayer FindPlayer(string steamId)
        {
            if (string.IsNullOrEmpty(steamId) || BasePlayer.activePlayerList == null)
            {
                return null;
            }

            foreach (var player in BasePlayer.activePlayerList)
            {
                if (player != null && player.UserIDString == steamId)
                {
                    return player;
                }
            }

            return null;
        }

        private static List<BasePlayer> OnlinePlayers()
        {
            var result = new List<BasePlayer>();
            if (BasePlayer.activePlayerList == null)
            {
                return result;
            }

            foreach (var player in BasePlayer.activePlayerList)
            {
                if (player != null && player.IsConnected)
                {
                    result.Add(player);
                }
            }

            return result;
        }

        private static string SafeName(BasePlayer player)
        {
            var name = player == null || string.IsNullOrEmpty(player.displayName) ? "Unknown" : player.displayName;
            return name.Replace("\"", "'").Replace("\\", "/").Replace("\n", " ").Replace("\r", " ");
        }

        #endregion

        #region Nested types

        private class MagicCoreConfig
        {
            public string API_END_POINT = "https://yoursite.example/api";
            public string SERVER_ID = string.Empty;
            public string API_KEY = string.Empty;
            public bool DEBUG;
            public float QUEUE_POLL_SECONDS = 1.5f;
            public float STATS_FLUSH_SECONDS = 300f;
            public bool ROLES_ENABLED = true;
            public bool LEADERBOARD_ENABLED = true;
            public bool WIPES_ENABLED = true;
            public bool LINKED_KIT_ENABLED = true;
            public bool PRESENCE_ENABLED = true;
            public int TRACKED_ROLES_REFRESH_MINUTES = 10;
            public int ROLE_SAFETY_SYNC_MINUTES;
            public int MAX_CONCURRENT_HTTP = 4;
            public int HTTP_TIMEOUT_SECONDS = 8;
            public bool BAN_SYSTEM_ENABLED = true;
            public int BAN_CHECK_CACHE_MINUTES = 5;
            public int BAN_PERIODIC_CHECK_MINUTES = 10;
            public int BAN_BATCH_SIZE = 10;
            public bool AUTO_UPDATE = true;
            public int UPDATE_CHECK_MINUTES = 30;
            public int HEARTBEAT_MINUTES = 5;
            public string DEFAULT_GROUP = "default";
            public string STATS_SOURCE = "core";
            public Dictionary<string, string> RoleCommonNames = new Dictionary<string, string>
            {
                { "admin", "Admin" },
                { "linked", "Linked" }
            };

            public static MagicCoreConfig Create()
            {
                return new MagicCoreConfig();
            }
        }

        private class BanInfo
        {
            public bool Banned;
            public string Reason;
            public DateTime CachedAt;
        }

        private class BanResponse
        {
            [JsonProperty("banned")] public bool Banned { get; set; }
            [JsonProperty("type")] public string Type { get; set; }
            [JsonProperty("reason")] public string Reason { get; set; }
            [JsonProperty("expires")] public string Expires { get; set; }
            [JsonProperty("steamId")] public string SteamId { get; set; }
        }

        private class BanBatchResponse
        {
            [JsonProperty("results")] public Dictionary<string, BanResponse> Results { get; set; }
        }

        private class QueuePullResponse
        {
            [JsonProperty("items")] public List<QueueItem> Items { get; set; }
        }

        private class QueueItem
        {
            [JsonProperty("id")] public string Id { get; set; }
            [JsonProperty("steamId")] public string SteamId { get; set; }
            [JsonProperty("serverId")] public string ServerId { get; set; }
            [JsonProperty("groupName")] public string GroupName { get; set; }
            [JsonProperty("action")] public string Action { get; set; }
        }

        private class PlayerGroupsResponse
        {
            [JsonProperty("groups")] public List<string> Groups { get; set; }
            [JsonProperty("oxideGroups")] public List<string> OxideGroups { get; set; }
        }

        private class WipeListResponse
        {
            [JsonProperty("data")] public List<WipeData> Data { get; set; }
        }

        private class WipeData
        {
            [JsonProperty("id")] public int Id { get; set; }
            [JsonProperty("server_id")] public string ServerId { get; set; }
            [JsonProperty("name")] public string Name { get; set; }
            [JsonProperty("is_active")] public bool IsActive { get; set; }
        }

        private class TrackedRole
        {
            [JsonProperty("name")] public string Name { get; set; }
            [JsonProperty("serverIds")] public List<string> ServerIds { get; set; }
            [JsonProperty("oxideGroupNames")] public List<string> OxideGroupNames { get; set; }
        }

        private class HeartbeatResult
        {
            [JsonProperty("updateAvailable")] public bool UpdateAvailable { get; set; }
            [JsonProperty("latest")] public string Latest { get; set; }
            [JsonProperty("version")] public string Version { get; set; }
        }

        private class PluginRelease
        {
            [JsonProperty("version")] public string Version { get; set; }
            [JsonProperty("releasedAt")] public string ReleasedAt { get; set; }
            [JsonProperty("notes")] public string[] Notes { get; set; }
            [JsonProperty("added")] public string[] Added { get; set; }
            [JsonProperty("changed")] public string[] Changed { get; set; }
            [JsonProperty("removed")] public string[] Removed { get; set; }
            [JsonProperty("pluginReady")] public bool PluginReady { get; set; }
        }

        private class KitItem
        {
            public string Shortname;
            public int Amount;
        }

        public class PlayerStat
        {
            [JsonIgnore] public ulong SteamId;
            [JsonIgnore] public DateTime LoginTime;
            [JsonIgnore] public DateTime? LogoffTime;
            [JsonIgnore] public string UserName;

            public int Kills;
            public int Deaths;
            public int Suicides;
            public int BulletsFired;
            public int HeadShots;
            public int TimedExplosivesThrown;
            public int RocketsFired;
            public int HvRocketsFired;
            public int IncendiaryRocketsFired;
            public int SmokeRocketsFired;
            public int SatchelChargesThrown;
            public int HeGrenadeFired;
            public int WoodFarmed;
            public int StoneFarmed;
            public int MetalFarmed;
            public int HqmFarmed;
            public int SulfurFarmed;
            public int CornHarvested;
            public int PotatoesHarvested;
            public int PumpkinsHarvested;
            public int MushroomsHarvested;
            public int BerriesHarvested;
            public int FishGutted;
            public int ClothCollected;
            public int LeatherCollected;
            public int HackedCratesLooted;
            public int HeliKills;
            public int BradleyKills;
            public int MissionsStarted;
            public int MissionsCompleted;
            public int NpcKills;
            public int BoatsPurchased;
            public int SubPurchased;
            public int HelisPurchased;
            public int AnimalKills;
            public int SupplySignalThrown;

            public int PlayTimeSeconds
            {
                get { return (int)((LogoffTime ?? DateTime.Now) - LoginTime).TotalSeconds + 1; }
            }

            public bool HasActivity()
            {
                return Kills + Deaths + Suicides + BulletsFired + HeadShots
                       + TimedExplosivesThrown + RocketsFired + HvRocketsFired + IncendiaryRocketsFired
                       + SmokeRocketsFired + SatchelChargesThrown + HeGrenadeFired
                       + WoodFarmed + StoneFarmed + MetalFarmed + HqmFarmed + SulfurFarmed
                       + CornHarvested + PotatoesHarvested + PumpkinsHarvested + MushroomsHarvested
                       + BerriesHarvested + FishGutted + ClothCollected + LeatherCollected
                       + HackedCratesLooted + HeliKills + BradleyKills + MissionsStarted + MissionsCompleted
                       + NpcKills + BoatsPurchased + SubPurchased + HelisPurchased + AnimalKills
                       + SupplySignalThrown > 0;
            }

            public Dictionary<string, int> ToPayload()
            {
                var map = new Dictionary<string, int>();
                Add(map, "kills", "A1", Kills);
                Add(map, "deaths", "A2", Deaths);
                Add(map, "suicides", "A3", Suicides);
                Add(map, "bullets_fired", "A4", BulletsFired);
                Add(map, "headshots", "A5", HeadShots);
                Add(map, "c4_thrown", "B1", TimedExplosivesThrown);
                Add(map, "rockets_fired", "B2", RocketsFired);
                Add(map, "hv_rockets_fired", "B3", HvRocketsFired);
                Add(map, "incendiary_rockets_fired", "B4", IncendiaryRocketsFired);
                Add(map, "smoke_rockets_fired", "B5", SmokeRocketsFired);
                Add(map, "satches_thrown", "B6", SatchelChargesThrown);
                Add(map, "he_grenades_fired", "B7", HeGrenadeFired);
                Add(map, "wood_farmed", "C1", WoodFarmed);
                Add(map, "stone_farmed", "C2", StoneFarmed);
                Add(map, "metal_frags_farmed", "C3", MetalFarmed);
                Add(map, "hqm_farmed", "C4", HqmFarmed);
                Add(map, "sulfur_farmed", "C5", SulfurFarmed);
                Add(map, "corn_harvested", "D1", CornHarvested);
                Add(map, "potatoes_harvested", "D2", PotatoesHarvested);
                Add(map, "pumpkins_harvested", "D3", PumpkinsHarvested);
                Add(map, "mushrooms_harvested", "D4", MushroomsHarvested);
                Add(map, "berries_harvested", "D5", BerriesHarvested);
                Add(map, "fish_gutted", "D6", FishGutted);
                Add(map, "cloth_collected", "D7", ClothCollected);
                Add(map, "leather_harvested", "D8", LeatherCollected);
                Add(map, "hacked_crates_looted", "E1", HackedCratesLooted);
                Add(map, "heli_kills", "E2", HeliKills);
                Add(map, "bradley_kills", "E3", BradleyKills);
                Add(map, "missions_started", "E4", MissionsStarted);
                Add(map, "missions_completed", "E5", MissionsCompleted);
                Add(map, "npc_kills", "E6", NpcKills);
                Add(map, "time_played", "F1", PlayTimeSeconds);
                Add(map, "boats_purchased", "F2", BoatsPurchased);
                Add(map, "subs_purchased", "F3", SubPurchased);
                Add(map, "helis_purchased", "F4", HelisPurchased);
                Add(map, "animal_kills", "F5", AnimalKills);
                Add(map, "supply_signals_called", "F6", SupplySignalThrown);
                return map;
            }

            private static void Add(Dictionary<string, int> map, string key, string code, int value)
            {
                if (value == 0)
                {
                    return;
                }

                map[key] = value;
                map[code] = value;
                map[code.ToLowerInvariant()] = value;
            }

            public void ResetTimer(DateTime now)
            {
                LoginTime = now;
                LogoffTime = null;
                Kills = Deaths = Suicides = BulletsFired = HeadShots = 0;
                TimedExplosivesThrown = RocketsFired = HvRocketsFired = IncendiaryRocketsFired = 0;
                SmokeRocketsFired = SatchelChargesThrown = HeGrenadeFired = 0;
                WoodFarmed = StoneFarmed = MetalFarmed = HqmFarmed = SulfurFarmed = 0;
                CornHarvested = PotatoesHarvested = PumpkinsHarvested = MushroomsHarvested = 0;
                BerriesHarvested = FishGutted = ClothCollected = LeatherCollected = 0;
                HackedCratesLooted = HeliKills = BradleyKills = MissionsStarted = MissionsCompleted = 0;
                NpcKills = BoatsPurchased = SubPurchased = HelisPurchased = AnimalKills = SupplySignalThrown = 0;
            }
        }

        private static class PatchTargets
        {
            private const BindingFlags Declared = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;

            public static MethodBase Find(Type type, params string[] names)
            {
                if (type == null)
                {
                    return null;
                }

                foreach (var name in names)
                {
                    var method = FindNamed(type, name);
                    if (method != null)
                    {
                        return method;
                    }
                }

                return null;
            }

            public static MethodBase Bindable(MethodBase method, params string[] requiredNames)
            {
                if (method == null)
                {
                    return null;
                }

                var parameters = method.GetParameters();
                for (var i = 0; i < requiredNames.Length; i++)
                {
                    var found = false;
                    for (var p = 0; p < parameters.Length; p++)
                    {
                        if (parameters[p].Name == requiredNames[i])
                        {
                            found = true;
                            break;
                        }
                    }

                    if (!found)
                    {
                        return null;
                    }
                }

                return method;
            }

            private static MethodBase FindNamed(Type type, string name)
            {
                for (var current = type; current != null && current != typeof(object); current = current.BaseType)
                {
                    MethodInfo[] declared;
                    try
                    {
                        declared = current.GetMethods(Declared);
                    }
                    catch (Exception)
                    {
                        return null;
                    }

                    MethodInfo best = null;
                    for (var i = 0; i < declared.Length; i++)
                    {
                        var method = declared[i];
                        if (method.Name != name)
                        {
                            continue;
                        }

                        best = Prefer(best, method);
                    }

                    if (best != null)
                    {
                        return best;
                    }
                }

                return null;
            }

            private static MethodInfo Prefer(MethodInfo current, MethodInfo candidate)
            {
                if (current == null)
                {
                    return candidate;
                }

                if (candidate.GetParameters().Length < current.GetParameters().Length)
                {
                    return candidate;
                }

                return current;
            }
        }

        [HarmonyPatch]
        public static class CratePatch
        {
            public static bool Ready;

            private static bool Prepare()
            {
                Ready = TargetMethod() != null;
                return Ready;
            }

            private static MethodBase TargetMethod()
            {
                return PatchTargets.Find(typeof(HackableLockedCrate), "StartHacking", "PlayerStartedHacking", "CreateHackProgress");
            }

            private static void Postfix(HackableLockedCrate __instance)
            {
                try
                {
                    if (Instance != null)
                    {
                        Instance.NoteCrate(__instance);
                    }
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogException(ex);
                }
            }
        }

        [HarmonyPatch]
        public static class MissionStartPatch
        {
            public static bool Ready;

            private static bool Prepare()
            {
                Ready = TargetMethod() != null;
                return Ready;
            }

            private static MethodBase TargetMethod()
            {
                var type = AccessTools.TypeByName("BaseMission") ?? typeof(BaseMission);
                return PatchTargets.Bindable(PatchTargets.Find(type, "OnMissionStarted", "MissionStart"), "assignee");
            }

            private static void Postfix(BasePlayer assignee)
            {
                try
                {
                    if (Instance != null)
                    {
                        Instance.NoteMission(false, assignee);
                    }
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogException(ex);
                }
            }
        }

        [HarmonyPatch]
        public static class MissionDonePatch
        {
            public static bool Ready;

            private static bool Prepare()
            {
                Ready = TargetMethod() != null;
                return Ready;
            }

            private static MethodBase TargetMethod()
            {
                var type = AccessTools.TypeByName("BaseMission") ?? typeof(BaseMission);
                return PatchTargets.Bindable(PatchTargets.Find(type, "OnMissionSucceeded", "MissionSuccess", "OnCompleted"), "assignee");
            }

            private static void Postfix(BasePlayer assignee)
            {
                try
                {
                    if (Instance != null)
                    {
                        Instance.NoteMission(true, assignee);
                    }
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogException(ex);
                }
            }
        }

        [HarmonyPatch]
        public static class VehiclePatch
        {
            public static bool Ready;

            private static bool Prepare()
            {
                Ready = TargetMethod() != null;
                return Ready;
            }

            private static MethodBase TargetMethod()
            {
                return PatchTargets.Bindable(PatchTargets.Find(typeof(VehicleSpawner), "SpawnVehicle"), "prefabToSpawn", "newOwner");
            }

            private static void Prefix(string prefabToSpawn, BasePlayer newOwner)
            {
                try
                {
                    if (Instance != null)
                    {
                        Instance.NoteVehicle(prefabToSpawn, newOwner);
                    }
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogException(ex);
                }
            }
        }

        #endregion
    }
}
