using System;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace MagicCore
{
    internal static class ConfigStore
    {
        private static string _path;

        public static string ModsDirectory => System.IO.Path.Combine(ServerRoot(), "HarmonyMods");

        public static string Path
        {
            get
            {
                if (!string.IsNullOrEmpty(_path))
                {
                    return _path;
                }

                var dir = System.IO.Path.Combine(ServerRoot(), "HarmonyMods_Data", "MagicCore");
                try
                {
                    Directory.CreateDirectory(dir);
                }
                catch (Exception ex)
                {
                    Log.Exception(ex, "Failed to create HarmonyMods_Data/MagicCore");
                }

                _path = System.IO.Path.Combine(dir, "MagicCore.json");
                return _path;
            }
        }

        public static ModConfig Load()
        {
            try
            {
                MigrateLegacy();
                if (File.Exists(Path))
                {
                    var json = File.ReadAllText(Path);
                    var loaded = JsonConvert.DeserializeObject<ModConfig>(json);
                    if (loaded != null)
                    {
                        ModConfig.Current = loaded;
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "Failed to read MagicCore.json, using defaults");
                ModConfig.Current = new ModConfig();
            }

            Save();
            return ModConfig.Current;
        }

        public static void Save()
        {
            try
            {
                var dir = System.IO.Path.GetDirectoryName(Path);
                if (!string.IsNullOrEmpty(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                var json = JsonConvert.SerializeObject(ModConfig.Current ?? new ModConfig(), Formatting.Indented);
                File.WriteAllText(Path, json);
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "Failed to write MagicCore.json");
            }
        }

        static void MigrateLegacy()
        {
            if (File.Exists(Path))
            {
                return;
            }

            var legacy = System.IO.Path.Combine(ModsDirectory, "MagicCore.json");
            if (!File.Exists(legacy))
            {
                return;
            }

            try
            {
                File.Copy(legacy, Path);
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "Failed to copy HarmonyMods/MagicCore.json into HarmonyMods_Data/MagicCore");
            }
        }

        static string ServerRoot()
        {
            var root = System.IO.Path.Combine(Application.dataPath ?? ".", "..");
            try
            {
                return System.IO.Path.GetFullPath(root);
            }
            catch
            {
                return ".";
            }
        }
    }
}
