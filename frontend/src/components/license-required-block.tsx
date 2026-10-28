"use client";

import { useState } from "react";
import { backendApi } from "@/lib/api";

export function LicenseRequiredBlock({ message }: { message?: string }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!key.trim()) return;
    setLoading(true);
    try {
      const body: { key: string; domain?: string } = { key: key.trim() };
      if (typeof window !== "undefined" && window.location?.host) {
        body.domain = window.location.host;
      }
      const res = await fetch(backendApi("licenses/activate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setKey("");
        window.location.reload();
        return;
      }
      setError(
        typeof data?.message === "string" && data.message.trim() !== ""
          ? data.message
          : "Activation failed.",
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">License activated. Reloading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">License required</h1>
        <p className="text-muted-foreground text-sm">
          {message ?? "No valid license is configured for this site. Enter your license key to continue."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="license-key" className="mb-1 block text-sm font-medium">
              License key
            </label>
            <input
              id="license-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "#F042FA", color: "#ffffff" }}
          >
            {loading ? "Activating…" : "Activate license"}
          </button>
        </form>
      </div>
    </div>
  );
}
