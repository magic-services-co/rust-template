using System;
using System.Reflection;
using HarmonyLib;

namespace MagicCore.Patches
{
    [HarmonyPatch]
    internal static class CollectiblePickupPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() =>
            PatchTargets.Bindable(PatchTargets.Find(typeof(CollectibleEntity), "DoPickup", "Pickup"), "reciever");

        static void Postfix(CollectibleEntity __instance, BasePlayer reciever)
        {
            try
            {
                if (!StatsService.Enabled || __instance == null || reciever == null)
                {
                    return;
                }

                var collectibleName = (__instance.ShortPrefabName ?? string.Empty).Split('-')[0];
                var amount = 0;
                if (__instance.itemList != null && __instance.itemList.Length > 0)
                {
                    amount = (int)__instance.itemList[0].amount;
                }

                var stats = StatsService.For(reciever);
                if (stats == null)
                {
                    return;
                }

                switch (collectibleName)
                {
                    case "wood":
                        stats.WoodFarmed += amount;
                        break;
                    case "metal":
                        stats.MetalFarmed += amount;
                        break;
                    case "stone":
                        stats.StoneFarmed += amount;
                        break;
                    case "hemp":
                        stats.ClothCollected += amount;
                        break;
                    case "mushroom":
                        stats.MushroomsHarvested += amount;
                        break;
                    case "berry":
                        stats.BerriesHarvested += amount;
                        break;
                    case "pumpkin":
                        stats.PumpkinsHarvested += amount;
                        break;
                    case "corn":
                        stats.CornHarvested += amount;
                        break;
                    case "potato":
                        stats.PotatoesHarvested += amount;
                        break;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "CollectiblePickup");
            }
        }
    }

    [HarmonyPatch]
    internal static class DispenserGatherPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() =>
            PatchTargets.Bindable(PatchTargets.Find(typeof(ResourceDispenser), "ApplyItemOwnership"), "player", "item");

        static void Postfix(BasePlayer player, Item item)
        {
            try
            {
                if (!StatsService.Enabled || player == null || item?.info == null)
                {
                    return;
                }

                ApplyGather(player, item.info.shortname, item.amount);
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "DispenserGather");
            }
        }

        internal static void ApplyGather(BasePlayer player, string shortname, int amount)
        {
            if (!StatsService.Enabled)
            {
                return;
            }

            var stats = StatsService.For(player);
            if (stats == null)
            {
                return;
            }

            switch (shortname)
            {
                case "leather":
                    stats.LeatherCollected += amount;
                    break;
                case "cloth":
                    stats.ClothCollected += amount;
                    break;
                case "wood":
                    stats.WoodFarmed += amount;
                    break;
                case "sulfur.ore":
                    stats.SulfurFarmed += amount;
                    break;
                case "stones":
                    stats.StoneFarmed += amount;
                    break;
                case "metal.ore":
                    stats.MetalFarmed += amount;
                    break;
                case "hq.metal.ore":
                    stats.HqmFarmed += amount;
                    break;
            }
        }
    }

    [HarmonyPatch]
    internal static class FishGutPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() =>
            PatchTargets.Bindable(PatchTargets.Find(typeof(Item), "DoAction"), "action", "player");

        static void Postfix(Item __instance, string action, BasePlayer player)
        {
            try
            {
                if (!StatsService.Enabled || player == null || action != "Gut" || __instance?.info == null)
                {
                    return;
                }

                if ((__instance.info.shortname ?? string.Empty).IndexOf("fish", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    var stats = StatsService.For(player);
                    if (stats != null)
                    {
                        stats.FishGutted++;
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "FishGut");
            }
        }
    }
}
