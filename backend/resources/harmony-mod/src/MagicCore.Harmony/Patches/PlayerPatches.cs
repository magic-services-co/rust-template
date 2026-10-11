using System;
using System.Reflection;
using HarmonyLib;

namespace MagicCore.Patches
{
    [HarmonyPatch]
    internal static class PlayerInitPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(BasePlayer), "PlayerInit");

        static void Postfix(BasePlayer __instance)
        {
            try
            {
                MagicCoreMod.Instance.OnPlayerConnected(__instance);
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "PlayerInit");
            }
        }
    }

    [HarmonyPatch]
    internal static class PlayerDisconnectedPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(BasePlayer), "OnDisconnected", "Disconnected");

        static void Postfix(BasePlayer __instance)
        {
            try
            {
                MagicCoreMod.Instance.OnPlayerDisconnected(__instance);
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "OnDisconnected");
            }
        }
    }
}
