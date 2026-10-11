using System;

namespace MagicCore
{
    internal static class RuntimeReport
    {
        private static string _sent;

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
                return;
            }

            if (string.Equals(_sent, runtime, StringComparison.Ordinal))
            {
                return;
            }

            var serverId = cfg.ServerId.Trim();
            ApiClient.Post("oxide/runtime", new
            {
                serverId,
                runtime
            }, response =>
            {
                if (!response.Ok)
                {
                    Log.DebugMsg("Runtime report failed: " + response.Status + " " + response.Body);
                    return;
                }

                _sent = runtime;
                Log.Info("Reported " + runtime + " for server " + serverId);
            });
        }
    }
}
