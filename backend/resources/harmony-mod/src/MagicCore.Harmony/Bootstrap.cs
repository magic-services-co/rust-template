using System;
using UnityEngine;

namespace MagicCore
{
    internal sealed class Bootstrap : MonoBehaviour
    {
        public static int MainThreadId { get; private set; }
        public static Bootstrap Instance { get; private set; }

        private float _queueElapsed;
        private float _banElapsed;
        private float _statsElapsed;
        private float _rolesElapsed;
        private float _safetyElapsed;
        private float _kitElapsed;
        private float _updateElapsed;
        private float _updateBootElapsed;
        private bool _updateBootChecked;
        private float _banTickElapsed;
        private float _heartbeatElapsed = 100000f;
        private float _bindRetry;
        private bool _bindTried;
        private bool _ready;

        public static Bootstrap Create()
        {
            MainThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId;
            if (Instance != null)
            {
                return Instance;
            }

            var go = new GameObject("MagicCore.Harmony");
            DontDestroyOnLoad(go);
            Instance = go.AddComponent<Bootstrap>();
            return Instance;
        }

        public static void Shutdown()
        {
            try
            {
                StatsService.Flush();
            }
            catch
            {
            }

            PermissionBridge.Unpatch();
            if (Instance != null)
            {
                Destroy(Instance.gameObject);
                Instance = null;
            }
        }

        public void MarkReady()
        {
            _ready = true;
        }

        private void Update()
        {
            var cfg = ModConfig.Current;
            var dt = Time.unscaledDeltaTime;
            MainThread.Pump(cfg?.HttpCallbacksPerFrame ?? 24);
            if (cfg != null)
            {
                _heartbeatElapsed += dt;
                var heartbeatEvery = Math.Max(1, cfg.HeartbeatMinutes) * 60f;
                if (_heartbeatElapsed >= heartbeatEvery)
                {
                    _heartbeatElapsed = 0f;
                    HeartbeatService.Send();
                }
            }

            if (!_ready || cfg == null)
            {
                return;
            }
            if (!_bindTried)
            {
                _bindRetry += dt;
                if (_bindRetry >= 6f)
                {
                    _bindTried = true;
                    MagicCoreMod.Instance.RetryPermissions();
                }
            }

            _queueElapsed += dt;
            _banTickElapsed += dt;
            _banElapsed += dt;
            _statsElapsed += dt;
            _rolesElapsed += dt;
            _safetyElapsed += dt;
            _kitElapsed += dt;
            _updateElapsed += dt;
            if (!_updateBootChecked)
            {
                _updateBootElapsed += dt;
            }

            var queueEvery = RoleSyncService.FastPoll
                ? Math.Max(0.4f, cfg.QueuePollSeconds * 0.4f)
                : Math.Max(0.75f, cfg.QueuePollSeconds);
            if (_queueElapsed >= queueEvery)
            {
                _queueElapsed = 0f;
                RoleSyncService.PollQueue();
            }

            if (_banTickElapsed >= 2f)
            {
                _banTickElapsed = 0f;
                BanService.Tick();
            }

            if (cfg.BanSystemEnabled && cfg.BanPeriodicCheckMinutes > 0 &&
                _banElapsed >= cfg.BanPeriodicCheckMinutes * 60f)
            {
                _banElapsed = 0f;
                BanService.CheckOnline();
            }

            if (cfg.LeaderboardEnabled && cfg.StatsFlushSeconds > 0 && _statsElapsed >= cfg.StatsFlushSeconds)
            {
                _statsElapsed = 0f;
                StatsService.Flush();
            }

            if (cfg.TrackedRolesRefreshMinutes > 0 && _rolesElapsed >= cfg.TrackedRolesRefreshMinutes * 60f)
            {
                _rolesElapsed = 0f;
                RoleSyncService.RefreshTracked();
            }

            if (_kitElapsed >= 300f)
            {
                _kitElapsed = 0f;
                KitSyncService.Poll();
                RuntimeReport.Send();
            }

            if (!_updateBootChecked && _updateBootElapsed >= 45f)
            {
                _updateBootChecked = true;
                if (cfg.AutoUpdate)
                {
                    UpdateService.Check(false);
                }
            }

            var updateEvery = Math.Max(5, cfg.UpdateCheckMinutes) * 60f;
            if (cfg.AutoUpdate && _updateElapsed >= updateEvery)
            {
                _updateElapsed = 0f;
                UpdateService.Check(false);
            }

            if (cfg.RoleSafetySyncMinutes > 0 && _safetyElapsed >= cfg.RoleSafetySyncMinutes * 60f)
            {
                _safetyElapsed = 0f;
                RoleSyncService.SyncOnline();
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }
    }
}
