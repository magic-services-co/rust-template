"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { prepareSanctumMutationHeaders } from "@/lib/sanctum-csrf";
import { siteSettingsQueryKey } from "@/hooks/use-site-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UpdateStatus = {
  running?: boolean;
  pid?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  exitCode?: number | null;
  ok?: boolean;
  log?: string;
};

type ReleasePayload = {
  currentVersion?: string;
  latestVersion?: string;
  isUpToDate?: boolean;
  updateAvailable?: boolean;
  manifestFetchError?: string | null;
  localReleasedAt?: string | null;
  latestReleasedAt?: string | null;
  latestNotes?: string[];
  latestAdded?: string[];
  latestChanged?: string[];
  latestRemoved?: string[];
  manifestUrl?: string;
  autoUpdateTemplate?: boolean;
  update?: UpdateStatus;
};

function ChangelogSection({
  title,
  items,
  titleClassName,
}: {
  title: string;
  items: string[];
  titleClassName?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className={cn("mb-2 text-sm font-medium", titleClassName)}>{title}</h3>
      <ul className="text-muted-foreground list-inside list-disc text-sm">
        {items.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminUpdatePage() {
  const queryClient = useQueryClient();
  const logRef = useRef<HTMLPreElement>(null);
  const wasRunning = useRef(false);

  const releaseQuery = useQuery({
    queryKey: ["admin", "system", "release"],
    queryFn: async (): Promise<ReleasePayload> => {
      const res = await fetch(backendApi("admin/system/release"), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("release");
      return (await res.json()) as ReleasePayload;
    },
  });

  const statusQuery = useQuery({
    queryKey: ["admin", "system", "update-status"],
    queryFn: async (): Promise<UpdateStatus> => {
      const res = await fetch(backendApi("admin/system/update"), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("status");
      return (await res.json()) as UpdateStatus;
    },
    refetchInterval: (query) => (query.state.data?.running ? 1500 : false),
  });

  const status = statusQuery.data;
  const running = !!status?.running;

  useEffect(() => {
    if (running) wasRunning.current = true;
    if (wasRunning.current && status && !running) {
      wasRunning.current = false;
      if (status.ok) {
        toast.success("Update finished.");
      } else {
        toast.error(status.exitCode != null ? `Update failed (exit ${status.exitCode}).` : "Update failed.");
      }
      void queryClient.invalidateQueries({ queryKey: ["admin", "system", "release"] });
    }
  }, [running, status, queryClient]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [status?.log]);

  const autoMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const headers = await prepareSanctumMutationHeaders({
        json: true,
        bearerToken: getAuthToken(),
      });
      const res = await fetch(backendApi("admin/site-settings"), {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ autoUpdateTemplate: enabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Preference saved.");
      void queryClient.invalidateQueries({ queryKey: siteSettingsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["admin", "system", "release"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const headers = await prepareSanctumMutationHeaders({
        bearerToken: getAuthToken(),
      });
      const res = await fetch(backendApi("admin/system/update"), {
        method: "POST",
        credentials: "include",
        headers,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { message?: string }).message ?? "Update failed");
      }
      return body as { message?: string };
    },
    onSuccess: () => {
      toast.message("Update started. Live log is below — you can refresh this page.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "system", "update-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const r = releaseQuery.data;
  const hasAnyChangelog =
    (r?.latestNotes?.length ?? 0) > 0 ||
    (r?.latestAdded?.length ?? 0) > 0 ||
    (r?.latestChanged?.length ?? 0) > 0 ||
    (r?.latestRemoved?.length ?? 0) > 0;
  const showLog = running || Boolean(status?.log);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Template update</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Compare this install to the published manifest on{" "}
          <span className="text-foreground">rust-template-prod</span>. Run updates only on servers where
          git, Composer, and Node builds are supported.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current release</CardTitle>
          <CardDescription>
            {releaseQuery.isLoading && "Loading…"}
            {releaseQuery.isError && "Could not load release information."}
            {!releaseQuery.isLoading && !releaseQuery.isError && r?.manifestFetchError && (
              <span className="text-amber-600 dark:text-amber-400">{r.manifestFetchError}</span>
            )}
            {!releaseQuery.isLoading && !releaseQuery.isError && !r?.manifestFetchError && (
              <>
                This install: <strong>v{r?.currentVersion}</strong>
                {r?.localReleasedAt ? ` (${r.localReleasedAt})` : ""}
                <br />
                Latest published: <strong>v{r?.latestVersion}</strong>
                {r?.latestReleasedAt ? ` (${r.latestReleasedAt})` : ""}
                {r?.isUpToDate ? (
                  <span className="text-green-600 dark:text-green-400"> — up to date.</span>
                ) : (
                  <span className="text-destructive"> — newer version available.</span>
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasAnyChangelog && (
            <div className="space-y-5">
              <ChangelogSection title="Notes" items={r?.latestNotes ?? []} />
              <ChangelogSection
                title="Added"
                items={r?.latestAdded ?? []}
                titleClassName="text-green-600 dark:text-green-400"
              />
              <ChangelogSection
                title="Changed"
                items={r?.latestChanged ?? []}
                titleClassName="text-sky-600 dark:text-sky-400"
              />
              <ChangelogSection
                title="Removed"
                items={r?.latestRemoved ?? []}
                titleClassName="text-destructive"
              />
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-update">Automatic updates</Label>
                <p className="text-muted-foreground text-xs">
                  Off by default. When on, the daily scheduler runs{" "}
                  <code className="text-xs">template:auto-update-check</code> if this server has cron calling{" "}
                  <code className="text-xs">php artisan schedule:run</code>.
                </p>
              </div>
              <Switch
                id="auto-update"
                checked={!!r?.autoUpdateTemplate}
                disabled={autoMutation.isPending || releaseQuery.isLoading}
                onCheckedChange={(v) => autoMutation.mutate(v)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              disabled={updateMutation.isPending || running || !r?.updateAvailable || !!r?.manifestFetchError}
              onClick={() => updateMutation.mutate()}
            >
              {running || updateMutation.isPending ? "Running update…" : "Run update now"}
            </Button>
            {running && (
              <p className="text-muted-foreground text-xs">
                Update is running in the background. You can refresh this page — the log will keep updating.
              </p>
            )}
            {!running && !r?.updateAvailable && !r?.manifestFetchError && (
              <p className="text-muted-foreground text-xs">Already on the latest published version.</p>
            )}
          </div>

          {showLog && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {running ? "Live output" : "Last update output"}
              </p>
              <pre
                ref={logRef}
                className="bg-muted/50 max-h-80 overflow-auto rounded-md border border-border/60 p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap"
              >
                {status?.log?.trim() ? status.log : "Waiting for output…"}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
