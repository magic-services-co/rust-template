using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace MagicCore
{
    internal sealed class BanInfo
    {
        public bool Banned;
        public string Type;
        public string Reason;
        public DateTime? Expires;
        public DateTime CachedAt;
        public string SteamId;
    }

    internal sealed class BanResponse
    {
        [JsonProperty("banned")] public bool Banned { get; set; }
        [JsonProperty("type")] public string Type { get; set; }
        [JsonProperty("reason")] public string Reason { get; set; }
        [JsonProperty("expires")] public string Expires { get; set; }
        [JsonProperty("steamId")] public string SteamId { get; set; }
    }

    internal sealed class BanBatchResponse
    {
        [JsonProperty("results")] public Dictionary<string, BanResponse> Results { get; set; }
    }

    internal sealed class QueuePullResponse
    {
        [JsonProperty("items")] public List<QueueItem> Items { get; set; }
    }

    internal sealed class QueueItem
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("steamId")] public string SteamId { get; set; }
        [JsonProperty("serverId")] public string ServerId { get; set; }
        [JsonProperty("groupName")] public string GroupName { get; set; }
        [JsonProperty("action")] public string Action { get; set; }
    }

    internal sealed class PlayerGroupsResponse
    {
        [JsonProperty("groups")] public List<string> Groups { get; set; }
        [JsonProperty("oxideGroups")] public List<string> OxideGroups { get; set; }
    }

    internal sealed class WipeListResponse
    {
        [JsonProperty("data")] public List<WipeData> Data { get; set; }
    }

    internal sealed class WipeData
    {
        [JsonProperty("id")] public int Id { get; set; }
        [JsonProperty("server_id")] public string ServerId { get; set; }
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("is_active")] public bool IsActive { get; set; }
    }

    internal sealed class TrackedRole
    {
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("serverIds")] public List<string> ServerIds { get; set; }
        [JsonProperty("oxideGroupNames")] public List<string> OxideGroupNames { get; set; }
    }
}
