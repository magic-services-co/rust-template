using System;
using UnityEngine;

namespace MagicCore
{
    internal static class Log
    {
        public static void Info(string message)
        {
            Debug.Log("[MagicCore] " + message);
        }

        public static void Warn(string message)
        {
            Debug.LogWarning("[MagicCore] " + message);
        }

        public static void Error(string message)
        {
            Debug.LogError("[MagicCore] " + message);
        }

        public static void Exception(Exception ex, string context = null)
        {
            Debug.LogError("[MagicCore] " + (context ?? "Exception") + ": " + ex);
        }

        public static void DebugMsg(string message)
        {
            if (ModConfig.Current == null || !ModConfig.Current.Debug)
            {
                return;
            }

            Debug.Log("[MagicCore] " + DateTime.Now.ToString("HH:mm:ss") + " " + message);
        }
    }
}
