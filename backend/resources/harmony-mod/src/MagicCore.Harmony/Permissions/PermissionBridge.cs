using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using HarmonyLib;

namespace MagicCore
{
    internal static class PermissionBridge
    {
        private static object _library;
        private static MethodInfo _addUserGroup;
        private static MethodInfo _removeUserGroup;
        private static MethodInfo _userHasGroup;
        private static MethodInfo _getUserGroups;
        private static MethodInfo _groupExists;
        private static MethodInfo _createGroup;
        private static string _engine;
        private static Harmony _harmony;

        public static bool Ready => _library != null && _addUserGroup != null;
        public static string Engine => _engine ?? "none";
        public static MethodInfo AddUserGroupMethod => _addUserGroup;
        public static MethodInfo RemoveUserGroupMethod => _removeUserGroup;

        public static void Bind()
        {
            if (TryBindOxide() || TryBindByTypeName())
            {
                Log.Info("Permission backend: " + Engine);
                return;
            }

            _engine = DetectConsoleEngine();
            Log.Warn("Oxide/Carbon permission library not found. Falling back to " + _engine + " console commands.");
        }

        public static void PatchListeners(Harmony harmony)
        {
            _harmony = harmony;
            if (_addUserGroup == null || _removeUserGroup == null)
            {
                return;
            }

            try
            {
                harmony.Patch(_addUserGroup, postfix: new HarmonyMethod(typeof(PermissionBridge), nameof(OnUserGroupAdded)));
                harmony.Patch(_removeUserGroup, postfix: new HarmonyMethod(typeof(PermissionBridge), nameof(OnUserGroupRemoved)));
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "Could not patch Oxide/Carbon group methods");
            }
        }

        public static void Unpatch()
        {
            try
            {
                _harmony?.UnpatchAll();
            }
            catch
            {
            }
        }

        public static bool GroupExists(string group)
        {
            if (string.IsNullOrWhiteSpace(group))
            {
                return false;
            }

            if (_groupExists != null && _library != null)
            {
                try
                {
                    return (bool)_groupExists.Invoke(_library, new object[] { group });
                }
                catch (Exception ex)
                {
                    Log.DebugMsg("GroupExists failed: " + ex.Message);
                }
            }

            return false;
        }

        public static void EnsureGroup(string group)
        {
            if (string.IsNullOrWhiteSpace(group) || GroupExists(group))
            {
                return;
            }

            if (_createGroup != null && _library != null)
            {
                try
                {
                    _createGroup.Invoke(_library, new object[] { group, group, 0 });
                    return;
                }
                catch (Exception ex)
                {
                    Log.DebugMsg("CreateGroup failed: " + ex.Message);
                }
            }

            Run("group add " + Quote(group));
        }

        public static bool UserHasGroup(string steamId, string group)
        {
            if (_userHasGroup != null && _library != null)
            {
                try
                {
                    return (bool)_userHasGroup.Invoke(_library, new object[] { steamId, group });
                }
                catch (Exception ex)
                {
                    Log.DebugMsg("UserHasGroup failed: " + ex.Message);
                }
            }

            var groups = GetUserGroups(steamId);
            return groups.Contains(group, StringComparer.OrdinalIgnoreCase);
        }

        public static string[] GetUserGroups(string steamId)
        {
            if (_getUserGroups != null && _library != null)
            {
                try
                {
                    var result = _getUserGroups.Invoke(_library, new object[] { steamId });
                    if (result is string[] array)
                    {
                        return array;
                    }

                    if (result is IEnumerable<string> enumerable)
                    {
                        return enumerable.ToArray();
                    }
                }
                catch (Exception ex)
                {
                    Log.DebugMsg("GetUserGroups failed: " + ex.Message);
                }
            }

            return Array.Empty<string>();
        }

        public static void AddUserGroup(string steamId, string group)
        {
            EnsureGroup(group);
            if (_addUserGroup != null && _library != null)
            {
                try
                {
                    _addUserGroup.Invoke(_library, new object[] { steamId, group });
                    return;
                }
                catch (Exception ex)
                {
                    Log.DebugMsg("AddUserGroup failed: " + ex.Message);
                }
            }

            Run("usergroup add " + steamId + " " + Quote(group));
        }

        public static void RemoveUserGroup(string steamId, string group)
        {
            if (_removeUserGroup != null && _library != null)
            {
                try
                {
                    _removeUserGroup.Invoke(_library, new object[] { steamId, group });
                    return;
                }
                catch (Exception ex)
                {
                    Log.DebugMsg("RemoveUserGroup failed: " + ex.Message);
                }
            }

            Run("usergroup remove " + steamId + " " + Quote(group));
        }

        private static bool TryBindOxide()
        {
            try
            {
                Type iface = null;
                foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
                {
                    iface = assembly.GetType("Oxide.Core.Interface") ?? iface;
                    if (iface != null)
                    {
                        break;
                    }
                }

                if (iface == null)
                {
                    return false;
                }

                var oxide = iface.GetProperty("Oxide", BindingFlags.Public | BindingFlags.Static)?.GetValue(null, null);
                if (oxide == null)
                {
                    return false;
                }

                object library = null;
                var permType = FindPermissionType();
                foreach (var method in oxide.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance))
                {
                    if (method.Name != "GetLibrary" || !method.IsGenericMethodDefinition || permType == null)
                    {
                        continue;
                    }

                    try
                    {
                        var made = method.MakeGenericMethod(permType);
                        var args = made.GetParameters().Length == 0
                            ? Array.Empty<object>()
                            : new object[] { "Permission" };
                        library = made.Invoke(oxide, args);
                        if (library != null)
                        {
                            break;
                        }
                    }
                    catch
                    {
                    }
                }

                if (library == null)
                {
                    var named = oxide.GetType().GetMethod("GetLibrary", new[] { typeof(string) });
                    library = named?.Invoke(oxide, new object[] { "Permission" });
                }

                return BindLibrary(library, DetectEngineName());
            }
            catch (Exception ex)
            {
                Log.DebugMsg("Oxide bind failed: " + ex.Message);
                return false;
            }
        }

        private static bool TryBindByTypeName()
        {
            var type = FindPermissionType();
            if (type == null)
            {
                return false;
            }

            object instance = null;
            try
            {
                var prop = type.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static);
                instance = prop?.GetValue(null, null);
            }
            catch
            {
            }

            return BindLibrary(instance, DetectEngineName());
        }

        private static bool BindLibrary(object library, string engine)
        {
            if (library == null)
            {
                return false;
            }

            var type = library.GetType();
            _library = library;
            _addUserGroup = type.GetMethod("AddUserGroup", new[] { typeof(string), typeof(string) });
            _removeUserGroup = type.GetMethod("RemoveUserGroup", new[] { typeof(string), typeof(string) });
            _userHasGroup = type.GetMethod("UserHasGroup", new[] { typeof(string), typeof(string) });
            _getUserGroups = type.GetMethod("GetUserGroups", new[] { typeof(string) });
            _groupExists = type.GetMethod("GroupExists", new[] { typeof(string) });
            _createGroup = type.GetMethod("CreateGroup", new[] { typeof(string), typeof(string), typeof(int) });
            if (_addUserGroup == null)
            {
                return false;
            }

            _engine = engine;
            return true;
        }

        private static Type FindPermissionType()
        {
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                var type = assembly.GetType("Oxide.Core.Libraries.Permission")
                           ?? assembly.GetType("Carbon.Oxide.Core.Libraries.Permission")
                           ?? assembly.GetType("Carbon.Core.Libraries.Permission");
                if (type != null)
                {
                    return type;
                }
            }

            return null;
        }

        private static string DetectEngineName()
        {
            return DetectRuntime();
        }

        private static string DetectConsoleEngine()
        {
            var runtime = DetectRuntime();
            return runtime == "none" ? "oxide" : runtime;
        }

        internal static string DetectRuntime()
        {
            var oxide = false;
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                var name = assembly.GetName().Name ?? string.Empty;
                if (name.StartsWith("Carbon", StringComparison.OrdinalIgnoreCase))
                {
                    return "carbon";
                }

                if (name.IndexOf("Oxide", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    oxide = true;
                }
            }

            return oxide ? "oxide" : "none";
        }

        private static void Run(string suffix)
        {
            var prefix = string.Equals(_engine, "carbon", StringComparison.OrdinalIgnoreCase) ? "c." : "oxide.";
            try
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, prefix + suffix);
            }
            catch (Exception ex)
            {
                Log.DebugMsg("Console " + prefix + suffix + " failed: " + ex.Message);
            }
        }

        private static string Quote(string value)
        {
            if (string.IsNullOrEmpty(value) || value.IndexOf(' ') < 0)
            {
                return value;
            }

            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        private static void OnUserGroupAdded(string id, string groupName)
        {
            RoleSyncService.OnLocalGroupChange(id, groupName, true);
        }

        private static void OnUserGroupRemoved(string id, string groupName)
        {
            RoleSyncService.OnLocalGroupChange(id, groupName, false);
        }
    }
}
