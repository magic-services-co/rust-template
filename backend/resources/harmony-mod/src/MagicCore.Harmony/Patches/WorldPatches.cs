using System;
using System.Reflection;
using HarmonyLib;

namespace MagicCore.Patches
{
    [HarmonyPatch]
    internal static class CrateHackPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() =>
            PatchTargets.Find(typeof(HackableLockedCrate), "StartHacking", "PlayerStartedHacking", "CreateHackProgress");

        static void Postfix(HackableLockedCrate __instance, BasePlayer player)
        {
            try
            {
                var hacker = player;
                if (hacker == null && __instance != null)
                {
                    var field = AccessTools.Field(__instance.GetType(), "originalHackerPlayer")
                                ?? AccessTools.Field(__instance.GetType(), "hackerPlayer");
                    hacker = field?.GetValue(__instance) as BasePlayer;
                }

                if (hacker != null)
                {
                    StatsService.For(hacker).HackedCratesLooted++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "CrateHack");
            }
        }
    }

    [HarmonyPatch]
    internal static class MissionStartedPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod()
        {
            var type = PatchTargets.Type("BaseMission") ?? typeof(BaseMission);
            return PatchTargets.Find(type, "OnMissionStarted", "MissionStart");
        }

        static void Postfix(BasePlayer player)
        {
            try
            {
                if (player != null)
                {
                    StatsService.For(player).MissionsStarted++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "MissionStarted");
            }
        }
    }

    [HarmonyPatch]
    internal static class MissionSucceededPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod()
        {
            var type = PatchTargets.Type("BaseMission") ?? typeof(BaseMission);
            return PatchTargets.Find(type, "OnMissionSucceeded", "MissionSuccess", "OnCompleted");
        }

        static void Postfix(BasePlayer player)
        {
            try
            {
                if (player != null)
                {
                    StatsService.For(player).MissionsCompleted++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "MissionSucceeded");
            }
        }
    }

    [HarmonyPatch]
    internal static class VehiclePurchasedPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(VehicleSpawner), "SpawnVehicle");

        static void Prefix(string prefabToSpawn, BasePlayer newOwner)
        {
            try
            {
                if (string.IsNullOrEmpty(prefabToSpawn) || newOwner == null || !Players.IsSteamId(newOwner.UserIDString))
                {
                    return;
                }

                var stats = StatsService.For(newOwner);
                if (prefabToSpawn.IndexOf("boat", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    stats.BoatsPurchased++;
                }
                else if (prefabToSpawn.IndexOf("submarine", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    stats.SubPurchased++;
                }
                else if (prefabToSpawn.IndexOf("copter", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    stats.HelisPurchased++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "VehiclePurchased");
            }
        }
    }

    [HarmonyPatch]
    internal static class ServerSavePatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(SaveRestore), "DoAutomatedSave", "Save");

        static void Prefix()
        {
            try
            {
                StatsService.Flush();
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "ServerSave");
            }
        }
    }

    [HarmonyPatch]
    internal static class NewSavePatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(SaveRestore), "Load");

        static void Prefix(object __0, ref bool __state)
        {
            try
            {
                var filename = __0 as string;
                __state = !string.IsNullOrEmpty(filename) && !System.IO.File.Exists(filename);
            }
            catch
            {
                __state = false;
            }
        }

        static void Postfix(bool __state)
        {
            try
            {
                if (__state)
                {
                    Log.Info("Wipe detected");
                    WipeService.Trigger();
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "NewSave");
            }
        }
    }

    [HarmonyPatch]
    internal static class ServerReadyPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(ServerMgr), "OpenConnection", "Initialize");

        static void Postfix()
        {
            try
            {
                MagicCoreMod.Instance.OnServerReady();
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "ServerReady");
            }
        }
    }
}
