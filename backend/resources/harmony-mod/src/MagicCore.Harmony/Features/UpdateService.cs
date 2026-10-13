using System;
using System.IO;
using Newtonsoft.Json;

namespace MagicCore
{
    internal static class UpdateService
    {
        private static bool _busy;
        private static string _announcedVersion;
        private static bool _reloadAttempted;

        public static void Check(bool manual, BasePlayer player = null)
        {
            if (_busy)
            {
                Say(player, "MagicCore update is already running.");
                return;
            }

            var cfg = ModConfig.Current;
            if (cfg == null || !cfg.HasApi())
            {
                Say(player, "MagicCore update needs API_END_POINT and API_KEY in HarmonyMods_Data/MagicCore/MagicCore.json.");
                return;
            }

            _busy = true;
            ApiClient.Get("oxide/harmony-release?version=" + Uri.EscapeDataString(MagicCoreMod.Version), response =>
            {
                var downloading = false;
                try
                {
                    if (!response.Ok)
                    {
                        Say(player, "Could not check for a MagicCore update" + (response.Status > 0 ? " (HTTP " + response.Status + ")." : "."));
                        return;
                    }

                    var release = response.Json<HarmonyRelease>();
                    if (release == null || string.IsNullOrWhiteSpace(release.Version))
                    {
                        Say(player, "The site did not return a MagicCore version.");
                        return;
                    }

                    if (!IsNewer(release.Version, MagicCoreMod.Version))
                    {
                        if (manual)
                        {
                            Say(player, "MagicCore " + MagicCoreMod.Version + " is up to date.");
                        }

                        return;
                    }

                    LogRelease(release);
                    if (!release.DllReady)
                    {
                        if (_announcedVersion != release.Version || manual)
                        {
                            _announcedVersion = release.Version;
                            Say(player, "MagicCore " + release.Version + " is published, but this site is not serving MagicCore.dll yet.");
                        }

                        return;
                    }

                    var installed = ReadStamp();
                    if (string.Equals(installed, release.Version, StringComparison.OrdinalIgnoreCase))
                    {
                        if (manual || !_reloadAttempted)
                        {
                            _reloadAttempted = true;
                            Say(player, "MagicCore " + release.Version + " is already downloaded. Reloading.");
                            Reload();
                        }

                        return;
                    }

                    downloading = true;
                    Say(player, "Downloading MagicCore " + release.Version + ".");
                    ApiClient.GetBytes("oxide/harmony-download", 120, (status, bytes) =>
                    {
                        try
                        {
                            if (status < 200 || status >= 300 || !IsDll(bytes))
                            {
                                Say(player, "MagicCore download failed" + (status > 0 ? " (HTTP " + status + ")." : "."));
                                return;
                            }

                            if (!Install(bytes, release.Version))
                            {
                                return;
                            }

                            Say(player, "MagicCore " + release.Version + " downloaded. Reloading.");
                            Reload();
                        }
                        finally
                        {
                            _busy = false;
                        }
                    });
                }
                finally
                {
                    if (!downloading)
                    {
                        _busy = false;
                    }
                }
            });
        }

        private static void LogRelease(HarmonyRelease release)
        {
            var when = string.IsNullOrWhiteSpace(release.ReleasedAt) ? string.Empty : " (" + release.ReleasedAt + ")";
            Log.Info("Harmony update " + release.Version + when + ". This server is running " + MagicCoreMod.Version + ".");
            LogLines("Notes", release.Notes);
            LogLines("Added", release.Added);
            LogLines("Changed", release.Changed);
            LogLines("Removed", release.Removed);
        }

        private static void LogLines(string title, string[] lines)
        {
            if (lines == null || lines.Length == 0)
            {
                return;
            }

            Log.Info(title + ":");
            for (var i = 0; i < lines.Length; i++)
            {
                if (!string.IsNullOrWhiteSpace(lines[i]))
                {
                    Log.Info("- " + lines[i]);
                }
            }
        }

        private static bool Install(byte[] bytes, string version)
        {
            try
            {
                var dir = ConfigStore.ModsDirectory;
                if (string.IsNullOrEmpty(dir))
                {
                    Say(null, "Could not find the HarmonyMods folder.");
                    return false;
                }

                Directory.CreateDirectory(dir);
                var dest = Path.Combine(dir, "MagicCore.dll");
                var pending = dest + ".pending";
                File.WriteAllBytes(pending, bytes);
                File.Copy(pending, dest, true);
                try
                {
                    File.Delete(pending);
                }
                catch
                {
                }

                File.WriteAllText(Path.Combine(dir, "MagicCore.version"), version ?? string.Empty);
                return true;
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "MagicCore update");
                Say(null, "Downloaded MagicCore but could not replace HarmonyMods/MagicCore.dll. The new file is MagicCore.dll.pending.");
                return false;
            }
        }

        private static string ReadStamp()
        {
            try
            {
                var path = Path.Combine(ConfigStore.ModsDirectory, "MagicCore.version");
                return File.Exists(path) ? File.ReadAllText(path).Trim() : string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        private static void Reload()
        {
            try
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "harmony.unload MagicCore");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "harmony.load MagicCore");
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "MagicCore reload");
                Say(null, "MagicCore was downloaded. Run harmony.unload MagicCore and then harmony.load MagicCore.");
            }
        }

        private static bool IsDll(byte[] bytes)
        {
            if (bytes == null || bytes.Length < 128 || bytes[0] != (byte)'M' || bytes[1] != (byte)'Z')
            {
                return false;
            }

            var lfanew = bytes[0x3c] | (bytes[0x3d] << 8) | (bytes[0x3e] << 16) | (bytes[0x3f] << 24);
            if (lfanew < 64 || lfanew > bytes.Length - 4)
            {
                return false;
            }

            return bytes[lfanew] == (byte)'P'
                && bytes[lfanew + 1] == (byte)'E'
                && bytes[lfanew + 2] == 0
                && bytes[lfanew + 3] == 0;
        }

        private static bool IsNewer(string remote, string local)
        {
            var left = Parts(remote);
            var right = Parts(local);
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

        private static int[] Parts(string version)
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

        private static void Say(BasePlayer player, string message)
        {
            Log.Info(message);
            player?.ChatMessage(message);
        }
    }

    internal sealed class HarmonyRelease
    {
        [JsonProperty("version")]
        public string Version { get; set; }

        [JsonProperty("releasedAt")]
        public string ReleasedAt { get; set; }

        [JsonProperty("notes")]
        public string[] Notes { get; set; }

        [JsonProperty("added")]
        public string[] Added { get; set; }

        [JsonProperty("changed")]
        public string[] Changed { get; set; }

        [JsonProperty("removed")]
        public string[] Removed { get; set; }

        [JsonProperty("dllReady")]
        public bool DllReady { get; set; }
    }
}
