using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace MagicCore
{
    internal static class WipeService
    {
        public static int? CurrentWipeId { get; private set; }

        public static void Refresh()
        {
            if (ModConfig.Current == null || string.IsNullOrWhiteSpace(ModConfig.Current.ServerId))
            {
                return;
            }

            var path = ApiClient.Query("wipes", new Dictionary<string, string>
            {
                { "server", ModConfig.Current.ServerId },
                { "serverId", ModConfig.Current.ServerId }
            });

            ApiClient.Get(path, response =>
            {
                if (!response.Ok)
                {
                    Log.DebugMsg("Wipe fetch failed: " + response.Status);
                    return;
                }

                var list = response.Json<WipeListResponse>()?.Data;
                if (list == null)
                {
                    list = response.Json<List<WipeData>>();
                }

                var wipe = list?.FirstOrDefault(w => w.IsActive && w.Id > 0) ?? list?.FirstOrDefault(w => w.Id > 0);
                if (wipe != null)
                {
                    CurrentWipeId = wipe.Id;
                    Log.Info("Current wipe #" + wipe.Id + " " + wipe.Name);
                }
            });
        }

        public static void Trigger(string name = null)
        {
            if (ModConfig.Current == null || string.IsNullOrWhiteSpace(ModConfig.Current.ServerId))
            {
                return;
            }

            ApiClient.Post("wipes", new
            {
                server_id = ModConfig.Current.ServerId,
                serverId = ModConfig.Current.ServerId,
                name = name ?? ("Wipe " + DateTime.Now.ToString("MM/dd/yyyy"))
            }, response =>
            {
                if (!response.Ok)
                {
                    Log.DebugMsg("Wipe trigger failed: " + response.Status + " " + response.Body);
                    return;
                }

                var token = response.Token();
                var id = token?["id"]?.Value<int?>() ?? token?["wipe"]?["id"]?.Value<int?>();
                if (id.HasValue && id.Value > 0)
                {
                    CurrentWipeId = id;
                }

                Log.Info("Wipe triggered (" + (CurrentWipeId?.ToString() ?? "unknown") + ")");
            });
        }
    }
}
