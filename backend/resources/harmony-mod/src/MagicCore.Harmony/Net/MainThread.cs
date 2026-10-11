using System;
using System.Collections.Concurrent;
using System.Threading;

namespace MagicCore
{
    internal static class MainThread
    {
        private static readonly ConcurrentQueue<Action> Queue = new ConcurrentQueue<Action>();

        public static bool IsMain => Thread.CurrentThread.ManagedThreadId == Bootstrap.MainThreadId;

        public static void Run(Action action)
        {
            if (action == null)
            {
                return;
            }

            if (IsMain)
            {
                try
                {
                    action();
                }
                catch (Exception ex)
                {
                    Log.Exception(ex, "Main thread action");
                }

                return;
            }

            Queue.Enqueue(action);
        }

        public static void Pump(int budget)
        {
            var remaining = Math.Max(1, budget);
            while (remaining-- > 0 && Queue.TryDequeue(out var action))
            {
                try
                {
                    action();
                }
                catch (Exception ex)
                {
                    Log.Exception(ex, "Main thread pump");
                }
            }
        }
    }
}
