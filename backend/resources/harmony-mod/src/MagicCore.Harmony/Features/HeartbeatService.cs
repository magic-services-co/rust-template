using System;

namespace MagicCore
{
    internal static class HeartbeatService
    {
        private static string _announcedUpdate;

        private sealed class HeartbeatResult
        {
            public bool updateAvailable { get; set; }
            public string latest { get; set; }
            public string version { get; set; }
        }

        public static void Send()
        {
            var cfg = ModConfig.Current;
            if (cfg == null || !cfg.HasApi() || string.IsNullOrWhiteSpace(cfg.ServerId))
            {
                return;
            }

            var runtime = PermissionBridge.DetectRuntime();
            if (runtime != "oxide" && runtime != "carbon")
            {
                runtime = "vanilla";
            }

            ApiClient.Post("oxide/heartbeat", new
            {
                serverId = cfg.ServerId.Trim(),
                version = MagicCoreMod.Version,
                runtime
            }, response =>
            {
                if (!response.Ok)
                {
                    Log.DebugMsg("Heartbeat failed: " + response.Status + " " + response.Body);
                    return;
                }

                var result = response.Json<HeartbeatResult>();
                if (result == null || !result.updateAvailable || string.IsNullOrWhiteSpace(result.latest))
                {
                    _announcedUpdate = null;
                    return;
                }

                if (string.Equals(_announcedUpdate, result.latest, StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }

                _announcedUpdate = result.latest;
                Log.Info("MagicCore " + MagicCoreMod.Version + " is behind " + result.latest + " on the website.");
            });
        }
    }
}
