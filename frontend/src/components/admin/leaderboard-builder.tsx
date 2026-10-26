"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, GripVertical, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Metric = {
  id: number;
  sourceId: number;
  metricKey: string;
  label: string;
  statCode: string | null;
  agg: string;
  format: string;
  storageType: string;
};

type Source = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
};

type BuilderColumn = {
  id?: number;
  columnKey: string;
  columnLabel: string;
  order: number;
  icon?: string | null;
  metricId?: number | null;
  format?: string | null;
};

type BuilderTab = {
  id?: number;
  tabKey: string;
  tabLabel: string;
  order: number;
  icon?: string | null;
  sourceId?: number | null;
  columns: BuilderColumn[];
  originalTabKey?: string;
};

type BuilderPayload = {
  sources: Source[];
  metrics: Metric[];
  tabs: BuilderTab[];
};

async function authHeaders(json = false): Promise<Record<string, string>> {
  const token = getAuthToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function fetchBuilder(): Promise<BuilderPayload> {
  const res = await fetch(backendApi("admin/leaderboard/builder"), {
    credentials: "include",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load leaderboard builder");
  return res.json();
}

async function saveTabs(tabs: BuilderTab[], deletedTabKeys: string[]): Promise<void> {
  const res = await fetch(backendApi("admin/leaderboard-settings"), {
    method: "POST",
    credentials: "include",
    headers: await authHeaders(true),
    body: JSON.stringify({ tabs, deletedTabKeys, deletedColumnKeys: [] }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to save tabs"));
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === "string" && data.message !== "") return data.message;
  } catch {
    /* response had no JSON body */
  }
  return fallback;
}

async function createSource(data: {
  slug: string;
  name: string;
  description: string;
}): Promise<void> {
  const res = await fetch(backendApi("admin/leaderboard/sources"), {
    method: "POST",
    credentials: "include",
    headers: await authHeaders(true),
    body: JSON.stringify({ ...data, enabled: true }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to create source"));
}

async function updateSource(
  id: number,
  data: { slug: string; name: string; description: string | null; enabled: boolean },
): Promise<void> {
  const res = await fetch(backendApi(`admin/leaderboard/sources/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: await authHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to update source"));
}

async function deleteSource(id: number): Promise<void> {
  const res = await fetch(backendApi(`admin/leaderboard/sources/${id}`), {
    method: "DELETE",
    credentials: "include",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to delete source"));
}

async function createMetric(data: Record<string, unknown>): Promise<void> {
  const res = await fetch(backendApi("admin/leaderboard/metrics"), {
    method: "POST",
    credentials: "include",
    headers: await authHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create metric");
}

async function bootstrapMetrics(): Promise<void> {
  const res = await fetch(backendApi("admin/leaderboard/bootstrap-metrics"), {
    method: "POST",
    credentials: "include",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to bootstrap metrics");
}

export function LeaderboardBuilder() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard-builder"],
    queryFn: fetchBuilder,
  });

  const [localTabs, setLocalTabs] = useState<BuilderTab[]>([]);
  const [deletedTabKeys, setDeletedTabKeys] = useState<string[]>([]);
  const [selectedTabKey, setSelectedTabKey] = useState<string>("");
  const tabsDirty = useRef(false);

  useEffect(() => {
    if (!data?.tabs || tabsDirty.current) return;
    setLocalTabs(data.tabs.map((tab) => ({ ...tab, originalTabKey: tab.tabKey })));
    setDeletedTabKeys([]);
    setSelectedTabKey((current) => {
      if (current && data.tabs.some((tab) => tab.tabKey === current)) return current;
      return data.tabs[0]?.tabKey ?? "";
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const keys = localTabs.map((tab) => tab.tabKey.trim());
      if (keys.some((key) => key === "")) {
        throw new Error("Every tab needs a key.");
      }
      if (new Set(keys).size !== keys.length) {
        throw new Error("Tab keys have to be unique.");
      }
      const renamed = localTabs
        .filter((tab) => tab.originalTabKey && tab.originalTabKey !== tab.tabKey)
        .map((tab) => tab.originalTabKey as string);
      return saveTabs(
        localTabs.map((tab, index) => ({ ...tab, tabKey: tab.tabKey.trim(), order: index })),
        [...new Set([...deletedTabKeys, ...renamed])],
      );
    },
    onSuccess: () => {
      tabsDirty.current = false;
      toast.success("Leaderboard layout saved");
      queryClient.invalidateQueries({ queryKey: ["leaderboard-builder"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard-tabs"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboardTabs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bootstrapMutation = useMutation({
    mutationFn: bootstrapMetrics,
    onSuccess: () => {
      toast.success("Core metrics synced from stat tables");
      queryClient.invalidateQueries({ queryKey: ["leaderboard-builder"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const metricsBySource = useMemo(() => {
    const map = new Map<number, Metric[]>();
    for (const m of data?.metrics ?? []) {
      const list = map.get(m.sourceId) ?? [];
      list.push(m);
      map.set(m.sourceId, list);
    }
    return map;
  }, [data?.metrics]);

  const selectedTab = localTabs.find((t) => t.tabKey === selectedTabKey);

  const addTab = () => {
    const key = `tab_${Date.now()}`;
    const tab: BuilderTab = {
      tabKey: key,
      tabLabel: "New Tab",
      order: localTabs.length,
      columns: [],
    };
    tabsDirty.current = true;
    setLocalTabs([...localTabs, tab]);
    setSelectedTabKey(key);
  };

  const removeTab = (tabKey: string) => {
    const tab = localTabs.find((item) => item.tabKey === tabKey);
    if (!tab) return;
    tabsDirty.current = true;
    const savedKey = tab.originalTabKey;
    if (savedKey) {
      setDeletedTabKeys((current) => (current.includes(savedKey) ? current : [...current, savedKey]));
    }
    const remaining = localTabs.filter((item) => item.tabKey !== tabKey);
    setLocalTabs(remaining);
    if (selectedTabKey === tabKey) {
      setSelectedTabKey(remaining[0]?.tabKey ?? "");
    }
  };

  const updateSelectedTab = (patch: Partial<BuilderTab>) => {
    tabsDirty.current = true;
    setLocalTabs(
      localTabs.map((tab) => (tab.tabKey === selectedTabKey ? { ...tab, ...patch } : tab)),
    );
    if (patch.tabKey !== undefined) {
      setSelectedTabKey(patch.tabKey);
    }
  };

  const addColumnFromMetric = (metric: Metric) => {
    if (!selectedTab) return;
    const col: BuilderColumn = {
      columnKey: metric.metricKey,
      columnLabel: metric.label,
      order: selectedTab.columns.length,
      metricId: metric.id,
      format: metric.format,
    };
    tabsDirty.current = true;
    setLocalTabs(
      localTabs.map((t) =>
        t.tabKey === selectedTabKey
          ? { ...t, columns: [...t.columns, col] }
          : t,
      ),
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Failed to load builder. Run database migrations first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Leaderboard Builder</h3>
          <p className="text-sm text-muted-foreground">
            Configure tabs, columns, stat sources, and plugin metrics — no hardcoded tables.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => bootstrapMutation.mutate()}
            disabled={bootstrapMutation.isPending}
          >
            Sync core metrics
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save layout"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="layout">
        <TabsList>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="sources">Sources & metrics</TabsTrigger>
          <TabsTrigger value="api">Plugin API</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tabs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {localTabs.map((tab) => (
                  <div
                    key={tab.originalTabKey ?? tab.tabKey}
                    className={`flex w-full items-center gap-1 rounded-md pr-1 text-sm ${
                      selectedTabKey === tab.tabKey ? "bg-primary/15" : "hover:bg-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTabKey(tab.tabKey)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{tab.tabLabel}</span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeTab(tab.tabKey)}
                      aria-label={`Remove ${tab.tabLabel}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" onClick={addTab}>
                  <Plus className="mr-1 h-4 w-4" /> Add tab
                </Button>
              </CardContent>
            </Card>

            {selectedTab && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">Edit tab</CardTitle>
                  <Button variant="destructive" size="sm" onClick={() => removeTab(selectedTab.tabKey)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Remove tab
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Tab label</Label>
                      <Input
                        value={selectedTab.tabLabel}
                        onChange={(e) => updateSelectedTab({ tabLabel: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Tab key (URL)</Label>
                      <Input
                        value={selectedTab.tabKey}
                        onChange={(e) => updateSelectedTab({ tabKey: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Source</Label>
                      <Select
                        value={selectedTab.sourceId ? String(selectedTab.sourceId) : "none"}
                        onValueChange={(value) =>
                          updateSelectedTab({ sourceId: value === "none" ? null : Number(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No source</SelectItem>
                          {(data?.sources ?? []).map((source) => (
                            <SelectItem key={source.id} value={String(source.id)}>
                              {source.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Columns on this tab</Label>
                    <ul className="space-y-2">
                      {selectedTab.columns.map((col, idx) => (
                        <li
                          key={`${col.columnKey}-${idx}`}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <span>
                            {col.columnLabel}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({col.columnKey})
                            </span>
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              tabsDirty.current = true;
                              setLocalTabs(
                                localTabs.map((t) =>
                                  t.tabKey === selectedTabKey
                                    ? {
                                        ...t,
                                        columns: t.columns.filter((_, i) => i !== idx),
                                      }
                                    : t,
                                ),
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Label className="mb-2 block">Add column from metric</Label>
                    <Select
                      onValueChange={(v) => {
                        const metric = data?.metrics.find((m) => String(m.id) === v);
                        if (metric) addColumnFromMetric(metric);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a metric…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(data?.metrics ?? []).map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.label} ({m.metricKey})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sources">
          <SourcesPanel
            sources={data?.sources ?? []}
            metricsBySource={metricsBySource}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["leaderboard-builder"] })}
          />
        </TabsContent>

        <TabsContent value="api">
          <PluginApiDocs sources={data?.sources ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourcesPanel({
  sources,
  metricsBySource,
  onRefresh,
}: {
  sources: Source[];
  metricsBySource: Map<number, Metric[]>;
  onRefresh: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Source | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const createSourceMutation = useMutation({
    mutationFn: () => createSource({ slug, name, description }),
    onSuccess: () => {
      toast.success("Source created");
      setSlug("");
      setName("");
      setDescription("");
      onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSourceMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("No source selected");
      return updateSource(editing.id, {
        slug: editSlug.trim(),
        name: editName.trim(),
        description: editDescription.trim() === "" ? null : editDescription.trim(),
        enabled: editEnabled,
      });
    },
    onSuccess: () => {
      toast.success("Source updated");
      setEditing(null);
      onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      toast.success("Source removed");
      onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (source: Source) => {
    setEditing(source);
    setEditSlug(source.slug);
    setEditName(source.name);
    setEditDescription(source.description ?? "");
    setEditEnabled(source.enabled);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New plugin source</CardTitle>
          <CardDescription>
            Each source is a plugin or stat provider. Metrics under a source use dynamic storage unless synced from legacy tables.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="raid-tracker" />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Raid Tracker" />
          </div>
          <div className="sm:col-span-3">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <Button
            onClick={() => createSourceMutation.mutate()}
            disabled={!slug || !name || createSourceMutation.isPending}
          >
            Create source
          </Button>
        </CardContent>
      </Card>

      {sources.map((source) => (
        <Card key={source.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="truncate">{source.name}</span>
                {!source.enabled ? (
                  <span className="text-xs font-normal text-muted-foreground">Disabled</span>
                ) : null}
              </CardTitle>
              <code className="text-xs text-muted-foreground">{source.slug}</code>
              {source.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{source.description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(source)}>
                <Pencil className="mr-1 h-4 w-4" /> Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteSourceMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Remove the source “${source.name}” and its metrics?`)) {
                    deleteSourceMutation.mutate(source.id);
                  }
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Remove
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AddMetricForm sourceId={source.id} onCreated={onRefresh} />
            <ul className="mt-4 space-y-1 text-sm">
              {(metricsBySource.get(source.id) ?? []).map((m) => (
                <li key={m.id} className="flex justify-between border-b py-1">
                  <span>
                    {m.label}{" "}
                    <code className="text-xs text-muted-foreground">{m.metricKey}</code>
                    {m.statCode ? (
                      <span className="ml-2 text-xs text-muted-foreground">[{m.statCode}]</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">{m.format} / {m.agg}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit source</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="source-enabled">Enabled</Label>
              <Switch id="source-enabled" checked={editEnabled} onCheckedChange={setEditEnabled} />
            </div>
            <Button
              onClick={() => updateSourceMutation.mutate()}
              disabled={!editSlug.trim() || !editName.trim() || updateSourceMutation.isPending}
            >
              {updateSourceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save source"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddMetricForm({
  sourceId,
  onCreated,
}: {
  sourceId: number;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [metricKey, setMetricKey] = useState("");
  const [label, setLabel] = useState("");
  const [statCode, setStatCode] = useState("");
  const [format, setFormat] = useState("number");
  const [agg, setAgg] = useState("sum");

  const mutation = useMutation({
    mutationFn: () =>
      createMetric({
        sourceId,
        metricKey,
        label,
        statCode: statCode || null,
        format,
        agg,
        storageType: "dynamic",
      }),
    onSuccess: () => {
      toast.success("Metric created");
      setOpen(false);
      setMetricKey("");
      setLabel("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add metric
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New metric</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Metric key</Label>
            <Input value={metricKey} onChange={(e) => setMetricKey(e.target.value)} placeholder="raid_score" />
          </div>
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Raid Score" />
          </div>
          <div>
            <Label>Stat code (optional, for compact plugin payloads)</Label>
            <Input value={statCode} onChange={(e) => setStatCode(e.target.value)} placeholder="R1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="weapon">Weapon</SelectItem>
                  <SelectItem value="percent">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aggregation</Label>
              <Select value={agg} onValueChange={setAgg}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!metricKey || !label}>
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PluginApiDocs({ sources }: { sources: Source[] }) {
  const example = `POST /api/leaderboard/sources/YOUR_SLUG/stats
Authorization: Bearer <api_key with public.siteData.stats>

{
  "steam_id": "76561198000000000",
  "server_id": "main",
  "wipe_id": 1,
  "username": "PlayerName",
  "stats": {
    "raid_score": 10,
    "R1": 5
  }
}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plugin ingestion API</CardTitle>
        <CardDescription>
          Post stat deltas using metric keys or stat codes. Core source uses slug <code>core</code> and legacy table columns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">Registered sources:</p>
        <ul className="list-disc pl-5 text-sm">
          {sources.map((s) => (
            <li key={s.id}>
              <code>{s.slug}</code> — {s.name}
            </li>
          ))}
        </ul>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{example}</pre>
      </CardContent>
    </Card>
  );
}
