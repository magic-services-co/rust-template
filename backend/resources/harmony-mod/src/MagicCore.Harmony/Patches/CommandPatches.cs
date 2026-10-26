using System;
using System.Reflection;
using HarmonyLib;

namespace MagicCore.Patches
{
    [HarmonyPatch]
    internal static class ChatSayAsPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod()
        {
            var chat = PatchTargets.Type("ConVar.Chat");
            if (chat == null)
            {
                return null;
            }

            return PatchTargets.Bindable(PatchTargets.Find(chat, "sayAs", "SayAs"), "message", "player");
        }

        static bool Prefix(string message, BasePlayer player)
        {
            try
            {
                if (string.IsNullOrEmpty(message) || (!message.StartsWith("/") && !message.StartsWith("\\")))
                {
                    return true;
                }

                return !CommandService.TryHandle(player, message);
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "ChatSayAs");
                return true;
            }
        }
    }

    [HarmonyPatch]
    internal static class ConsoleRunPatch
    {
        static bool Prepare() => TargetMethod() != null;

        static MethodBase TargetMethod() => PatchTargets.Find(typeof(ConsoleSystem), "Run");

        static bool Prefix(ConsoleSystem.Option __0, string __1, ref string __result)
        {
            try
            {
                var command = __1;
                if (string.IsNullOrEmpty(command))
                {
                    return true;
                }

                var trimmed = command.Trim();
                if (!trimmed.StartsWith("magiccore", StringComparison.OrdinalIgnoreCase)
                    && !trimmed.StartsWith("link", StringComparison.OrdinalIgnoreCase)
                    && !trimmed.StartsWith("checkban", StringComparison.OrdinalIgnoreCase)
                    && !trimmed.StartsWith("bansystem", StringComparison.OrdinalIgnoreCase)
                    && !trimmed.StartsWith("leaderboard", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                BasePlayer player = null;
                try
                {
                    player = __0.Connection?.player as BasePlayer;
                }
                catch
                {
                }

                if (!CommandService.TryHandle(player, trimmed))
                {
                    return true;
                }

                __result = string.Empty;
                return false;
            }
            catch (Exception ex)
            {
                Log.Exception(ex, "ConsoleRun");
                return true;
            }
        }
    }
}
