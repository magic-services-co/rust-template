using System;
using System.Collections.Generic;
using HarmonyLib;

namespace MagicCore
{
    internal static class PatchTargets
    {
        public static bool Exists(Type type, params string[] names)
        {
            return Find(type, names) != null;
        }

        public static System.Reflection.MethodBase Find(Type type, params string[] names)
        {
            if (type == null)
            {
                return null;
            }

            foreach (var name in names)
            {
                var method = AccessTools.Method(type, name);
                if (method != null)
                {
                    return method;
                }
            }

            return null;
        }

        public static Type Type(string name)
        {
            return AccessTools.TypeByName(name);
        }
    }
}
