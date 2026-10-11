using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace MagicCore
{
    internal static class ApiClient
    {
        private static readonly HttpClient Client = CreateClient();
        private static SemaphoreSlim _gate = new SemaphoreSlim(4, 4);

        public readonly struct Response
        {
            public readonly int Status;
            public readonly string Body;
            public readonly bool Ok;

            public Response(int status, string body)
            {
                Status = status;
                Body = body ?? string.Empty;
                Ok = status >= 200 && status < 300 && !string.IsNullOrEmpty(body);
            }

            public T Json<T>(T fallback = default)
            {
                if (string.IsNullOrWhiteSpace(Body) || Body.TrimStart().StartsWith("<", StringComparison.Ordinal))
                {
                    return fallback;
                }

                try
                {
                    return JsonConvert.DeserializeObject<T>(Body);
                }
                catch (Exception ex)
                {
                    Log.DebugMsg("JSON parse failed: " + ex.Message);
                    return fallback;
                }
            }

            public JToken Token()
            {
                if (string.IsNullOrWhiteSpace(Body))
                {
                    return null;
                }

                try
                {
                    return JToken.Parse(Body);
                }
                catch
                {
                    return null;
                }
            }
        }

        public static void ApplyLimits()
        {
            var max = Math.Max(1, Math.Min(8, ModConfig.Current?.MaxConcurrentHttp ?? 4));
            _gate = new SemaphoreSlim(max, max);
        }

        public static void Get(string path, Action<Response> then)
        {
            Send(HttpMethod.Get, path, null, then);
        }

        public static void GetBytes(string path, int timeoutSeconds, Action<int, byte[]> then)
        {
            var cfg = ModConfig.Current;
            if (cfg == null || !cfg.HasApi())
            {
                if (then != null)
                {
                    MainThread.Run(() => then(0, null));
                }

                return;
            }

            var url = BuildUrl(cfg.NormalizedEndpoint(), path);
            Task.Run(() => SendBytesAsync(url, timeoutSeconds, cfg, then));
        }

        public static void Post(string path, object body, Action<Response> then)
        {
            string json = null;
            if (body != null)
            {
                json = body as string ?? JsonConvert.SerializeObject(body, Formatting.None, new JsonSerializerSettings
                {
                    NullValueHandling = NullValueHandling.Ignore
                });
            }

            Send(HttpMethod.Post, path, json, then);
        }

        private static void Send(HttpMethod method, string path, string json, Action<Response> then)
        {
            var cfg = ModConfig.Current;
            if (cfg == null || !cfg.HasApi())
            {
                Log.DebugMsg("HTTP skipped, API endpoint or key missing");
                return;
            }

            var url = BuildUrl(cfg.NormalizedEndpoint(), path);
            Task.Run(() => SendAsync(method, url, json, cfg, then));
        }

        private static async Task SendAsync(HttpMethod method, string url, string json, ModConfig cfg, Action<Response> then)
        {
            await _gate.WaitAsync().ConfigureAwait(false);
            try
            {
                using (var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Max(3, cfg.HttpTimeoutSeconds))))
                using (var request = new HttpRequestMessage(method, url))
                {
                    request.Headers.TryAddWithoutValidation("x-api-key", cfg.MagicApiKey ?? string.Empty);
                    request.Headers.TryAddWithoutValidation("Accept", "application/json");
                    if (!string.IsNullOrEmpty(json))
                    {
                        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                    }

                    Log.DebugMsg(method.Method + " " + url);
                    using (var response = await Client.SendAsync(request, timeout.Token).ConfigureAwait(false))
                    {
                        var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        var wrapped = new Response((int)response.StatusCode, body);
                        if (!wrapped.Ok)
                        {
                            Log.DebugMsg("HTTP " + wrapped.Status + " " + url + " " + Truncate(body));
                        }

                        if (then != null)
                        {
                            MainThread.Run(() => then(wrapped));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log.DebugMsg("HTTP error " + url + ": " + ex.Message);
                if (then != null)
                {
                    MainThread.Run(() => then(new Response(0, ex.Message)));
                }
            }
            finally
            {
                _gate.Release();
            }
        }

        private static async Task SendBytesAsync(string url, int timeoutSeconds, ModConfig cfg, Action<int, byte[]> then)
        {
            await _gate.WaitAsync().ConfigureAwait(false);
            try
            {
                using (var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Max(15, timeoutSeconds))))
                using (var request = new HttpRequestMessage(HttpMethod.Get, url))
                {
                    request.Headers.TryAddWithoutValidation("x-api-key", cfg.MagicApiKey ?? string.Empty);
                    request.Headers.TryAddWithoutValidation("Accept", "application/octet-stream");
                    Log.DebugMsg("GET " + url);
                    using (var response = await Client.SendAsync(request, timeout.Token).ConfigureAwait(false))
                    {
                        var body = await response.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
                        var status = (int)response.StatusCode;
                        if (then != null)
                        {
                            MainThread.Run(() => then(status, body));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log.DebugMsg("HTTP error " + url + ": " + ex.Message);
                if (then != null)
                {
                    MainThread.Run(() => then(0, null));
                }
            }
            finally
            {
                _gate.Release();
            }
        }

        private static HttpClient CreateClient()
        {
            try
            {
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                ServicePointManager.DefaultConnectionLimit = Math.Max(ServicePointManager.DefaultConnectionLimit, 16);
            }
            catch
            {
            }

            var client = new HttpClient();
            client.Timeout = Timeout.InfiniteTimeSpan;
            client.DefaultRequestHeaders.ExpectContinue = false;
            return client;
        }

        private static string BuildUrl(string endpoint, string path)
        {
            if (path.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                return path;
            }

            return endpoint.TrimEnd('/') + "/" + (path ?? string.Empty).TrimStart('/');
        }

        private static string Truncate(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            return value.Length <= 180 ? value : value.Substring(0, 180) + "...";
        }

        public static string Query(string path, Dictionary<string, string> query)
        {
            if (query == null || query.Count == 0)
            {
                return path;
            }

            var sb = new StringBuilder(path);
            var first = !path.Contains("?");
            foreach (var pair in query)
            {
                if (string.IsNullOrEmpty(pair.Value))
                {
                    continue;
                }

                sb.Append(first ? "?" : "&");
                first = false;
                sb.Append(Uri.EscapeDataString(pair.Key));
                sb.Append("=");
                sb.Append(Uri.EscapeDataString(pair.Value));
            }

            return sb.ToString();
        }
    }
}
