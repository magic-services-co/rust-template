using System;
using System.Reflection;
using HarmonyLib;

namespace MagicCore
{
    internal static class PatchTargets
    {
        const BindingFlags Declared = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;

        public static bool Exists(Type type, params string[] names)
        {
            return Find(type, names) != null;
        }

        public static MethodBase Find(Type type, params string[] names)
        {
            if (type == null)
            {
                return null;
            }

            foreach (var name in names)
            {
                var method = FindNamed(type, name);
                if (method != null)
                {
                    return method;
                }
            }

            return null;
        }

        public static MethodBase FindSignature(Type type, string name, params Type[] parameters)
        {
            if (type == null || string.IsNullOrEmpty(name))
            {
                return null;
            }

            try
            {
                var method = AccessTools.Method(type, name, parameters);
                if (method != null)
                {
                    return method;
                }
            }
            catch (AmbiguousMatchException)
            {
            }
            catch (Exception)
            {
                return null;
            }

            return FindNamed(type, name);
        }

        public static Type Type(string name)
        {
            return AccessTools.TypeByName(name);
        }

        public static MethodBase Bindable(MethodBase method, params string[] requiredNames)
        {
            if (method == null)
            {
                return null;
            }

            var parameters = method.GetParameters();
            for (var i = 0; i < requiredNames.Length; i++)
            {
                var found = false;
                for (var p = 0; p < parameters.Length; p++)
                {
                    if (parameters[p].Name == requiredNames[i])
                    {
                        found = true;
                        break;
                    }
                }

                if (!found)
                {
                    return null;
                }
            }

            return method;
        }

        static MethodBase FindNamed(Type type, string name)
        {
            for (var current = type; current != null && current != typeof(object); current = current.BaseType)
            {
                MethodInfo[] declared;
                try
                {
                    declared = current.GetMethods(Declared);
                }
                catch (Exception)
                {
                    return null;
                }

                MethodInfo best = null;
                for (var i = 0; i < declared.Length; i++)
                {
                    var method = declared[i];
                    if (method.Name != name)
                    {
                        continue;
                    }

                    best = Prefer(best, method);
                }

                if (best != null)
                {
                    return best;
                }
            }

            return null;
        }

        static MethodInfo Prefer(MethodInfo current, MethodInfo candidate)
        {
            if (current == null)
            {
                return candidate;
            }

            if (candidate.GetParameters().Length < current.GetParameters().Length)
            {
                return candidate;
            }

            return current;
        }
    }
}
