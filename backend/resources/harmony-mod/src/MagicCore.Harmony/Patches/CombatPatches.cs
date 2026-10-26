using System;
using System.Reflection;
using HarmonyLib;
using Rust;

namespace MagicCore.Patches
{
    [HarmonyPatch]
    internal static class EntityDiePatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() =>
            PatchTargets.Bindable(PatchTargets.Find(typeof(BaseCombatEntity), "Die", "OnKilled"), "info");

        static void Postfix(BaseCombatEntity __instance, HitInfo info)
        {
            try
            {
                if (!StatsService.Enabled || __instance == null || info == null)
                {
                    return;
                }

                var attacker = info.Initiator as BasePlayer;
                if (attacker == null)
                {
                    return;
                }

                var stats = StatsService.For(attacker);
                if (stats == null)
                {
                    return;
                }

                if (__instance is BaseAnimalNPC)
                {
                    stats.AnimalKills++;
                    return;
                }

                if (__instance is PatrolHelicopter)
                {
                    stats.HeliKills++;
                    return;
                }

                if (__instance is BradleyAPC)
                {
                    stats.BradleyKills++;
                    return;
                }

                var victim = __instance as BasePlayer;
                if (victim == null)
                {
                    return;
                }

                if (victim.IsNpc)
                {
                    stats.NpcKills++;
                    return;
                }

                var victimStats = StatsService.For(victim);
                if (victimStats == null)
                {
                    return;
                }

                if (victim.lastDamage == DamageType.Suicide)
                {
                    victimStats.Suicides++;
                }

                victimStats.Deaths++;
                if (!attacker.IsNpc && victim.lastDamage != DamageType.Suicide)
                {
                    stats.Kills++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "Die");
            }
        }
    }

    [HarmonyPatch]
    internal static class EntityAttackedPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() =>
            PatchTargets.Bindable(
                PatchTargets.FindSignature(typeof(BaseCombatEntity), "OnAttacked", typeof(HitInfo)),
                "info");

        static void Postfix(BaseCombatEntity __instance, HitInfo info)
        {
            try
            {
                if (!StatsService.Enabled || __instance is not BasePlayer || info?.Initiator is not BasePlayer attacker || !info.isHeadshot)
                {
                    return;
                }

                var stats = StatsService.For(attacker);
                if (stats != null)
                {
                    stats.HeadShots++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "OnAttacked");
            }
        }
    }

    [HarmonyPatch]
    internal static class WeaponFiredPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() =>
            PatchTargets.Find(typeof(BaseProjectile), "LaunchProjectile", "CreateProjectileFiredEvents", "ServerUse");

        static void Postfix(BaseProjectile __instance)
        {
            try
            {
                if (!StatsService.Enabled)
                {
                    return;
                }

                var owner = __instance?.GetOwnerPlayer();
                var stats = owner == null ? null : StatsService.For(owner);
                if (stats != null)
                {
                    stats.BulletsFired++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "WeaponFired");
            }
        }
    }

    [HarmonyPatch]
    internal static class RocketLaunchPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod()
        {
            var launcher = PatchTargets.Type("BaseLauncher");
            return PatchTargets.Find(launcher ?? typeof(BaseProjectile), "SV_Launch", "LaunchProjectile");
        }

        static void Postfix(object __instance)
        {
            try
            {
                if (!StatsService.Enabled)
                {
                    return;
                }

                var entity = __instance as BaseEntity;
                var owner = entity == null ? null : entity.ToPlayer() ?? (entity as HeldEntity)?.GetOwnerPlayer();
                var stats = owner == null || entity == null ? null : StatsService.For(owner);
                if (stats == null)
                {
                    return;
                }

                switch (entity.ShortPrefabName)
                {
                    case "rocket_hv":
                        stats.HvRocketsFired++;
                        break;
                    case "rocket_fire":
                        stats.IncendiaryRocketsFired++;
                        break;
                    case "rocket_smoke":
                        stats.SmokeRocketsFired++;
                        break;
                    case "40mm_grenade_he":
                        stats.HeGrenadeFired++;
                        break;
                    default:
                        if ((entity.ShortPrefabName ?? string.Empty).IndexOf("rocket", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            stats.RocketsFired++;
                        }

                        break;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "RocketLaunch");
            }
        }
    }

    [HarmonyPatch]
    internal static class ExplosiveThrownPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(ThrownWeapon), "DoThrow", "DoDrop");

        static void Postfix(ThrownWeapon __instance)
        {
            try
            {
                if (!StatsService.Enabled)
                {
                    return;
                }

                var owner = __instance?.GetOwnerPlayer();
                if (owner == null || __instance == null)
                {
                    return;
                }

                var name = (__instance.ShortPrefabName ?? __instance.name ?? string.Empty).ToLowerInvariant();
                var stats = StatsService.For(owner);
                if (stats == null)
                {
                    return;
                }
                if (name.Contains("timed") || name.Contains("explosive.timed") || name.Contains("c4"))
                {
                    stats.TimedExplosivesThrown++;
                }
                else if (name.Contains("supplysignal") || name.Contains("supply.signal"))
                {
                    stats.SupplySignalThrown++;
                }
                else if (name.Contains("satchel"))
                {
                    stats.SatchelChargesThrown++;
                }
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "ExplosiveThrown");
            }
        }
    }
}
