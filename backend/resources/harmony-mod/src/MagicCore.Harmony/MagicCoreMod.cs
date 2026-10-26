using System;
using HarmonyLib;
using UnityEngine;

namespace MagicCore
{
    public sealed class MagicCoreMod : IHarmonyModHooks
    {
        public const string Version = "2.1.6";
        public const string HarmonyId = "com.magicservices.magiccore";

        private static MagicCoreMod _instance;
        public static MagicCoreMod Instance => _instance ?? (_instance = new MagicCoreMod());

        private Harmony _harmony;
        private bool _started;
        private bool _serverReady;

        public MagicCoreMod()
        {
            _instance = this;
        }

        public void OnLoaded(OnHarmonyModLoadedArgs args)
        {
            _instance = this;
            Start();
        }

        public void OnUnloaded(OnHarmonyModUnloadedArgs args)
        {
            Stop();
        }

        internal void Start()
        {
            if (_started)
            {
                return;
            }

            _started = true;
            try
            {
                ConfigStore.Load();
                ApiClient.ApplyLimits();
                Bootstrap.Create();
                _harmony = new Harmony(HarmonyId);
                Log.Info("MagicCore Harmony " + Version + " loaded. Config: " + ConfigStore.Path);
            }
            catch (Exception ex)
            {
                Debug.LogException(ex);
            }
        }

        internal void Stop()
        {
            _started = false;
            _serverReady = false;
            Bootstrap.Shutdown();
            try
            {
                _harmony?.UnpatchAll();
            }
            catch
            {
            }
            Log.Info("MagicCore Harmony unloaded");
        }

        internal void OnServerReady()
        {
            if (_serverReady)
            {
                return;
            }

            Start();
            _serverReady = true;
            PermissionBridge.Bind();
            PermissionBridge.PatchListeners(_harmony ?? new Harmony(HarmonyId + ".perms"));
            Bootstrap.Instance?.MarkReady();
            WipeService.Refresh();
            RoleSyncService.RefreshTracked();
            KitSyncService.Poll();
            RuntimeReport.Send();

            foreach (var player in Players.Online())
            {
                OnPlayerConnected(player);
            }

            Log.Info("Server ready. Permissions=" + PermissionBridge.Engine + " endpoint=" + ModConfig.Current.NormalizedEndpoint());
        }

        internal void RetryPermissions()
        {
            if (PermissionBridge.Ready)
            {
                return;
            }

            PermissionBridge.Bind();
            PermissionBridge.PatchListeners(_harmony ?? new Harmony(HarmonyId + ".perms"));
            RuntimeReport.Send();
            Log.Info("Permission backend retry: " + PermissionBridge.Engine);
        }

        internal void OnPlayerConnected(BasePlayer player)
        {
            if (player == null)
            {
                return;
            }

            StatsService.For(player);
            StatsService.Announce(player);
            RoleSyncService.SyncPlayer(player);
            BanService.Enqueue(player);
        }

        internal void OnPlayerDisconnected(BasePlayer player)
        {
            if (player == null)
            {
                return;
            }

            StatsService.Forget(player, true);
            BanService.Forget(player);
        }
    }
}
