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
                if (__instance == null || info == null)
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
                if (__instance is not BasePlayer || info?.Initiator is not BasePlayer attacker || !info.isHeadshot)
                {
                    return;
                }

                StatsService.For(attacker).HeadShots++;
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
                var owner = __instance?.GetOwnerPlayer();
                if (owner != null)
                {
                    StatsService.For(owner).BulletsFired++;
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
                var entity = __instance as BaseEntity;
                var owner = entity == null ? null : entity.ToPlayer() ?? (entity as HeldEntity)?.GetOwnerPlayer();

                if (owner == null || entity == null)
                {
                    return;
                }

                switch (entity.ShortPrefabName)
                {
                    case "rocket_hv":
                        StatsService.For(owner).HvRocketsFired++;
                        break;
                    case "rocket_fire":
                        StatsService.For(owner).IncendiaryRocketsFired++;
                        break;
                    case "rocket_smoke":
                        StatsService.For(owner).SmokeRocketsFired++;
                        break;
                    case "40mm_grenade_he":
                        StatsService.For(owner).HeGrenadeFired++;
                        break;
                    default:
                        if ((entity.ShortPrefabName ?? string.Empty).IndexOf("rocket", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            StatsService.For(owner).RocketsFired++;
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
                var owner = __instance?.GetOwnerPlayer();
                if (owner == null || __instance == null)
                {
                    return;
                }

                var name = (__instance.ShortPrefabName ?? __instance.name ?? string.Empty).ToLowerInvariant();
                var stats = StatsService.For(owner);
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
