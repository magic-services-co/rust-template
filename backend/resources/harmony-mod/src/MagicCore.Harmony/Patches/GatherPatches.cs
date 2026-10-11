using System;
using System.Reflection;
using HarmonyLib;

namespace MagicCore.Patches
{
    [HarmonyPatch]
    internal static class CollectiblePickupPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(CollectibleEntity), "DoPickup", "Pickup");

        static void Postfix(CollectibleEntity __instance, BasePlayer player)
        {
            try
            {
                if (__instance == null || player == null)
                {
                    return;
                }

                var collectibleName = (__instance.ShortPrefabName ?? string.Empty).Split('-')[0];
                var amount = 0;
                if (__instance.itemList != null && __instance.itemList.Length > 0)
                {
                    amount = (int)__instance.itemList[0].amount;
                }

                var stats = StatsService.For(player);
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
            PatchTargets.Find(typeof(ResourceDispenser), "GiveResourceFromItem", "AssignFinishBonus");

        static void Postfix(ResourceDispenser __instance, object entity, Item item)
        {
            try
            {
                var player = (entity as BaseEntity)?.ToPlayer() ?? entity as BasePlayer;
                if (player == null || item?.info == null)
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
            var stats = StatsService.For(player);
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
    internal static class DispenserBonusPatch
    {
        static bool Prepare()
        {
            var gather = PatchTargets.Find(typeof(ResourceDispenser), "GiveResourceFromItem");
            var bonus = PatchTargets.Find(typeof(ResourceDispenser), "AssignFinishBonus");
            return gather != null && bonus != null;
        }

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(ResourceDispenser), "AssignFinishBonus");

        static void Postfix(ResourceDispenser __instance, BasePlayer player, Item item)
        {
            try
            {
                if (player == null || item?.info == null)
                {
                    return;
                }

                DispenserGatherPatch.ApplyGather(player, item.info.shortname, item.amount);
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "DispenserBonus");
            }
        }
    }

    [HarmonyPatch]
    internal static class FishGutPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(Item), "UseItem", "DoAction");

        static void Postfix(Item __instance, string action, BasePlayer player)
        {
            try
            {
                if (player == null || action != "Gut" || __instance?.info == null)
                {
                    return;
                }

                if ((__instance.info.shortname ?? string.Empty).IndexOf("fish", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    StatsService.For(player).FishGutted++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "FishGut");
            }
        }
    }
}
