using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace MagicCore
{
    internal static class KitSyncService
    {
        private static readonly object Gate = new object();
        private static string _lastSignature = string.Empty;

        public static void Poll()
        {
            var cfg = ModConfig.Current;
            if (cfg == null || string.IsNullOrWhiteSpace(cfg.ServerId) || !cfg.HasApi())
            {
                return;
            }

            var serverId = cfg.ServerId.Trim();
            var path = ApiClient.Query("oxide/linked-kit", new Dictionary<string, string>
            {
                { "serverId", serverId }
            });

            ApiClient.Get(path, response =>
            {
                if (!response.Ok)
                {
                    Log.DebugMsg("Linked kit config failed: " + response.Status);
                    return;
                }

                var kitName = response.Token()?["kitName"]?.ToString();
                if (string.IsNullOrWhiteSpace(kitName))
                {
                    return;
                }

                var root = ServerRoot();
                Task.Run(() => ReadAndPost(root, kitName.Trim(), serverId));
            });
        }

        private static void ReadAndPost(string root, string kitName, string serverId)
        {
            List<KitItem> items;
            try
            {
                items = ReadKit(root, kitName);
            }
            catch (Exception ex)
            {
                Log.DebugMsg("Linked kit read failed: " + ex.Message);
                return;
            }

            if (items == null)
            {
                Log.DebugMsg("Linked kit '" + kitName + "' was not found under " + root);
                return;
            }

            var signature = kitName.ToLowerInvariant() + "|" + Signature(items);
            lock (Gate)
            {
                if (signature == _lastSignature)
                {
                    return;
                }
            }

            ApiClient.Post("oxide/linked-kit", new
            {
                serverId,
                kitName,
                items = items.ConvertAll(item => new { shortname = item.Shortname, amount = item.Amount })
            }, response =>
            {
                if (!response.Ok)
                {
                    Log.DebugMsg("Linked kit sync failed: " + response.Status + " " + response.Body);
                    return;
                }

                var ignored = response.Token()?["ignored"]?.Value<bool>() ?? false;
                if (ignored)
                {
                    return;
                }

                lock (Gate)
                {
                    _lastSignature = signature;
                }

                Log.Info("Linked kit '" + kitName + "' synced (" + items.Count + " items)");
            });
        }

        private static string Signature(List<KitItem> items)
        {
            var parts = new string[items.Count];
            for (var i = 0; i < items.Count; i++)
            {
                parts[i] = items[i].Shortname + "x" + items[i].Amount;
            }

            return string.Join(",", parts);
        }

        private static string ServerRoot()
        {
            try
            {
                var data = Application.dataPath;
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

        private static List<KitItem> ReadKit(string root, string kitName)
        {
            foreach (var relative in new[]
            {
                Path.Combine("oxide", "data", "Kits", "kits_data.json"),
                Path.Combine("carbon", "data", "Kits", "kits_data.json"),
                Path.Combine("oxide", "data", "Kits.json"),
                Path.Combine("carbon", "data", "Kits.json")
            })
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
                CollectItems(kit, items, 0);
                return items;
            }

            return null;
        }

        private static JToken FindKit(JToken token, string kitName)
        {
            if (token is JObject obj)
            {
                foreach (var prop in obj.Properties())
                {
                    if (prop.Value is JObject && string.Equals(prop.Name, kitName, StringComparison.OrdinalIgnoreCase))
                    {
                        return prop.Value;
                    }

                    var named = prop.Value?["Name"] ?? prop.Value?["name"] ?? prop.Value?["KitName"];
                    if (named != null && string.Equals(named.ToString(), kitName, StringComparison.OrdinalIgnoreCase))
                    {
                        return prop.Value;
                    }
                }

                foreach (var key in new[] { "kits", "Kits", "_kits", "data" })
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
            else if (token is JArray array)
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

            return null;
        }

        private static void CollectItems(JToken token, List<KitItem> items, int depth)
        {
            if (token == null || depth > 6 || items.Count >= 48)
            {
                return;
            }

            if (token is JArray array)
            {
                foreach (var child in array)
                {
                    if (items.Count >= 48)
                    {
                        return;
                    }

                    if (TryItem(child, out var item))
                    {
                        items.Add(item);
                    }
                    else
                    {
                        CollectItems(child, items, depth + 1);
                    }
                }

                return;
            }

            if (token is not JObject obj || TryItem(obj, out _))
            {
                return;
            }

            foreach (var prop in obj.Properties())
            {
                if (prop.Value is JArray || prop.Name.IndexOf("item", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    CollectItems(prop.Value, items, depth + 1);
                }
            }
        }

        private static bool TryItem(JToken token, out KitItem item)
        {
            item = null;
            if (token is not JObject obj)
            {
                return false;
            }

            string shortname = null;
            foreach (var key in new[] { "Shortname", "shortname", "ShortName", "itemShortname" })
            {
                var value = obj[key]?.ToString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    shortname = value.Trim().ToLowerInvariant();
                    break;
                }
            }

            if (string.IsNullOrEmpty(shortname) || !Regex.IsMatch(shortname, @"^[a-z0-9._-]{1,64}$"))
            {
                return false;
            }

            item = new KitItem
            {
                Shortname = shortname,
                Amount = ReadAmount(obj)
            };
            return true;
        }

        private static int ReadAmount(JObject obj)
        {
            foreach (var key in new[] { "Amount", "amount", "Count", "count" })
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

                if (int.TryParse(token.ToString(), out var parsed))
                {
                    return Math.Max(1, parsed);
                }
            }

            return 1;
        }

        private sealed class KitItem
        {
            public string Shortname;
            public int Amount;
        }
    }
}
