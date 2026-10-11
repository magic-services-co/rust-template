using System;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace MagicCore
{
    internal static class ConfigStore
    {
        private static string _path;

        public static string Path
        {
            get
            {
                if (!string.IsNullOrEmpty(_path))
                {
                    return _path;
                }

                var dir = System.IO.Path.Combine(Application.dataPath ?? ".", "..", "HarmonyMods");
                try
                {
                    dir = System.IO.Path.GetFullPath(dir);
                }
                catch
                {
                    dir = "HarmonyMods";
                }

                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                _path = System.IO.Path.Combine(dir, "MagicCore.json");
                return _path;
            }
        }

        public static ModConfig Load()
        {
            try
            {
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
                var json = JsonConvert.SerializeObject(ModConfig.Current ?? new ModConfig(), Formatting.Indented);
                File.WriteAllText(Path, json);
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "Failed to write MagicCore.json");
            }
        }
    }
}
