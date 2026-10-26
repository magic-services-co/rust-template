using System.Collections.Generic;
using Newtonsoft.Json;

namespace MagicCore
{
    public sealed class ModConfig
    {
        public static ModConfig Current { get; internal set; } = new ModConfig();

        [JsonProperty("API_END_POINT")]
        public string ApiEndpoint { get; set; } = "https://yoursite.example/api";

        [JsonProperty("SERVER_ID")]
        public string ServerId { get; set; } = string.Empty;

        [JsonProperty("API_KEY")]
        public string MagicApiKey { get; set; } = string.Empty;

        [JsonProperty("DEBUG")]
        public bool Debug { get; set; }

        [JsonProperty("QUEUE_POLL_SECONDS")]
        public float QueuePollSeconds { get; set; } = 1.5f;

        [JsonProperty("STATS_FLUSH_SECONDS")]
        public float StatsFlushSeconds { get; set; } = 300f;

        [JsonProperty("LEADERBOARD_ENABLED")]
        public bool LeaderboardEnabled { get; set; } = true;

        [JsonProperty("TRACKED_ROLES_REFRESH_MINUTES")]
        public int TrackedRolesRefreshMinutes { get; set; } = 10;

        [JsonProperty("ROLE_SAFETY_SYNC_MINUTES")]
        public int RoleSafetySyncMinutes { get; set; }

        [JsonProperty("MAX_CONCURRENT_HTTP")]
        public int MaxConcurrentHttp { get; set; } = 4;

        [JsonProperty("HTTP_TIMEOUT_SECONDS")]
        public int HttpTimeoutSeconds { get; set; } = 8;

        [JsonProperty("HTTP_CALLBACKS_PER_FRAME")]
        public int HttpCallbacksPerFrame { get; set; } = 24;

        [JsonProperty("BAN_SYSTEM_ENABLED")]
        public bool BanSystemEnabled { get; set; } = true;

        [JsonProperty("BAN_CHECK_CACHE_MINUTES")]
        public int BanCheckCacheMinutes { get; set; } = 5;

        [JsonProperty("BAN_PERIODIC_CHECK_MINUTES")]
        public int BanPeriodicCheckMinutes { get; set; } = 10;

        [JsonProperty("BAN_BATCH_SIZE")]
        public int BanBatchSize { get; set; } = 10;

        [JsonProperty("AUTO_UPDATE")]
        public bool AutoUpdate { get; set; } = true;

        [JsonProperty("UPDATE_CHECK_MINUTES")]
        public int UpdateCheckMinutes { get; set; } = 30;

        [JsonProperty("HEARTBEAT_MINUTES")]
        public int HeartbeatMinutes { get; set; } = 5;

        [JsonProperty("DEFAULT_GROUP")]
        public string DefaultGroup { get; set; } = "default";

        [JsonProperty("STATS_SOURCE")]
        public string StatsSource { get; set; } = "core";

        [JsonProperty("RoleCommonNames")]
        public Dictionary<string, string> RoleCommonNames { get; set; } = new Dictionary<string, string>
        {
            { "admin", "Admin" },
            { "linked", "Linked" }
        };

        public string NormalizedEndpoint()
        {
            var endpoint = (ApiEndpoint ?? string.Empty).Trim().TrimEnd('/');
            if (endpoint.EndsWith("/api"))
            {
                return endpoint;
            }

            return string.IsNullOrEmpty(endpoint) ? string.Empty : endpoint + "/api";
        }

        public bool HasApi()
        {
            return !string.IsNullOrWhiteSpace(NormalizedEndpoint()) && !string.IsNullOrWhiteSpace(MagicApiKey);
        }
    }
}
