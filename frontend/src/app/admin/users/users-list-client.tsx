"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Check, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type SteamProspect = {
  steamId: string;
  name: string;
  image: string | null;
};

type ListUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  steamId: string | null;
  discordId: string | null;
  roles: { id: string; name: string; color?: string | null }[];
  createdAt: string;
  lastSeenAt: string | null;
};

function useUsers(page: number, pageSize: number, search: string, roleId: string, sortBy: string, sortOrder: string) {
  return useQuery({
    queryKey: ["admin-users", page, pageSize, search, roleId, sortBy, sortOrder],
    queryFn: async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search, role: roleId, sortBy, sortOrder });
      const res = await fetch(backendApi(`admin/users?${params}`), { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<{ users: ListUser[]; total: number; steamProspect?: SteamProspect | null }>;
    },
  });
}

function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(backendApi("admin/settings/roles"), { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

function RowActions({ user }: { user: ListUser }) {
  const [open, setOpen] = useState(false);
  const handleDelete = async () => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(backendApi(`admin/users?id=${user.id}`), { method: "DELETE", credentials: "include", headers });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("User deleted");
      setOpen(false);
      window.location.reload();
    } catch {
      toast.error("Failed to delete user");
    }
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/admin/users/${user.steamId || user.id}`}>View profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SteamProspectRow({ prospect }: { prospect: SteamProspect }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addUser = useMutation({
    mutationFn: async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(backendApi("admin/users/from-steam"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ steamId: prospect.steamId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || "Could not add this Steam account");
      }
      return res.json() as Promise<{ user: { steamId: string; name: string | null } }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`${result.user.name || prospect.name} was added to the site`);
      router.push(`/admin/users/${result.user.steamId || prospect.steamId}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={prospect.image ?? undefined} alt="" />
            <AvatarFallback>{prospect.name.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p>{prospect.name}</p>
            <p className="text-xs text-muted-foreground">Not on the site yet</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">{prospect.steamId}</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell>
        <Button size="sm" disabled={addUser.isPending} onClick={() => addUser.mutate()}>
          {addUser.isPending ? "Adding…" : "Add to site"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function RecheckAllRolesButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function waitForRecheck(jobId: string): Promise<{ granted?: number; revoked?: number; users?: number }> {
    const started = Date.now();
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(backendApi(`admin/users/recheck-roles/${jobId}`), { credentials: "include", headers });
      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        status?: string;
        message?: string;
        result?: { granted?: number; revoked?: number; users?: number };
      } | null;
      if (data?.status === "done") return data.result ?? {};
      if (!response.ok || data?.status === "failed" || !data?.success) {
        throw new Error(data?.message || "Role check failed");
      }
      if (data.status === "queued" && Date.now() - started > 30_000) {
        throw new Error("Role check did not start.");
      }
    }
  }

  async function run() {
    setBusy(true);
    setOpen(false);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(backendApi("admin/users/recheck-roles"), {
        method: "POST",
        credentials: "include",
        headers,
      });
      const started = (await response.json().catch(() => null)) as { success?: boolean; jobId?: string; message?: string } | null;
      if (!response.ok || !started?.success || !started.jobId) {
        throw new Error(started?.message || "Role check failed");
      }
      const result = await waitForRecheck(started.jobId);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Roles rechecked — ${result.users ?? 0} users, granted ${result.granted ?? 0}, revoked ${result.revoked ?? 0}`);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Role check failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" className="ml-auto" disabled={busy} onClick={() => setOpen(true)}>
        <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Rechecking roles..." : "Recheck roles"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recheck roles for every user?</AlertDialogTitle>
            <AlertDialogDescription>
              PayNow ranks and roles linked to a Discord role are checked for every user. Roles can be granted or removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Recheck roles</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function UsersListClientInner() {
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState("pageSize", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [roleFilter, setRoleFilter] = useQueryState("role", { defaultValue: "" });
  const [sortBy, setSortBy] = useQueryState("sortBy", { defaultValue: "createdAt" });
  const [sortOrder, setSortOrder] = useQueryState("sortOrder", { defaultValue: "desc" });
  const debouncedSearch = useDebouncedCallback((v: string) => { setSearch(v || ""); setPage(1); }, 300);
  const { data, isLoading } = useUsers(page, pageSize, search ?? "", roleFilter ?? "", sortBy ?? "createdAt", sortOrder ?? "desc");
  const { data: roles = [] } = useRoles();
  const handleSort = useCallback((col: string) => {
    const next = sortBy === col && sortOrder === "desc" ? "asc" : "desc";
    setSortBy(col);
    setSortOrder(next);
    setPage(1);
  }, [sortBy, sortOrder, setSortBy, setSortOrder, setPage]);
  const users = data?.users ?? [];
  const steamProspect = data?.steamProspect ?? null;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-4 flex flex-wrap items-center gap-4">
        <Input type="search" placeholder="Search name, email, Steam, Discord..." className="max-w-xs" defaultValue={search ?? ""} onChange={(e) => debouncedSearch(e.target.value)} />
        <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all"><span className="flex items-center gap-2">{!roleFilter ? <Check className="h-4 w-4" /> : null} All roles</span></SelectItem>
            {roles.map((r: { id: string; name: string; color?: string }) => (
              <SelectItem key={r.id} value={r.id}>
                <span className="flex items-center gap-2">{roleFilter === r.id ? <Check className="h-4 w-4" /> : null}{r.color ? <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} /> : null}{r.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RecheckAllRolesButton />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}</TableHead>
            <TableHead>Steam ID</TableHead>
            <TableHead>Discord ID</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("createdAt")}>Created {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading…</TableCell></TableRow>
          ) : users.length === 0 && !steamProspect ? (
            <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No users found.</TableCell></TableRow>
          ) : (
            <>
            {steamProspect ? <SteamProspectRow prospect={steamProspect} /> : null}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link href={`/admin/users/${user.steamId || user.id}`} className="flex items-center gap-3 hover:opacity-90">
                    <Avatar className="h-8 w-8"><AvatarImage src={user.image ?? undefined} alt="" /><AvatarFallback>{user.name?.charAt(0) ?? "?"}</AvatarFallback></Avatar>
                    <span>{user.name ?? "—"}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">{user.steamId ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">{user.discordId ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(user.roles ?? []).slice(0, 3).map((r) => (
                      <span key={r.id} className="rounded-md border px-2 py-0.5 text-xs font-medium" style={r.color ? { borderColor: r.color, color: r.color } : undefined}>{r.name}</span>
                    ))}
                    {(user.roles ?? []).length > 3 && <span className="text-muted-foreground text-xs">+{(user.roles ?? []).length - 3}</span>}
                    {(user.roles ?? []).length === 0 && "—"}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{format(new Date(user.createdAt), "MM/dd/yyyy")}</TableCell>
                <TableCell><RowActions user={user} /></TableCell>
              </TableRow>
            ))}
            </>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between gap-4 p-4 border-t flex-wrap">
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          {total === 0 ? (steamProspect ? "Not on the site yet" : "No users") : `${from}–${to} of ${total}`}
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[70px] h-8 inline-flex"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          per page
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</Button>
        </div>
      </div>
    </div>
  );
}

export default function UsersListClient() {
  return <UsersListClientInner />;
}
