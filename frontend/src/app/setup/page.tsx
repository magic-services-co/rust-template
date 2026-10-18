"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { backendApi } from "@/lib/api";
import { getAuthToken } from "@/lib/laravel-auth";
import { signIn } from "@/lib/laravel-auth-react";
import { fetchSanctumCsrfCookie, csrfHeaderInit } from "@/lib/sanctum-csrf";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SteamIcon } from "@/components/icons";

const STEPS = [
  "License",
  "Previous install",
  "Steam",
  "Sign in",
  "Discord",
  "PayNow",
  "BattleMetrics",
  "RustMaps",
  "Finish",
] as const;

const SETUP_WIZARD_STEP_KEY = "setup_wizard_step";

function readStoredSetupStep(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SETUP_WIZARD_STEP_KEY);
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n >= STEPS.length) return null;
  return n;
}

type SetupWizardSessionUser = {
  name?: string | null;
  image?: string | null;
  steamId?: string;
  roles?: { role?: { name?: string } | null }[];
};

function sessionUserIsOwner(user: SetupWizardSessionUser): boolean {
  return user.roles?.some((r) => r?.role?.name === "Owner") === true;
}

type SetupStatus = {
  wizardPending?: boolean;
  wizardCompleted?: boolean;
  hasSiteLicense?: boolean;
  steamConfigured?: boolean;
  ownerClaimed?: boolean;
  importStepResolved?: boolean;
};

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [signInSessionUser, setSignInSessionUser] = useState<SetupWizardSessionUser | null>(null);
  const setupStepRestoredRef = useRef(false);

  const [siteLicenseKey, setSiteLicenseKey] = useState("");
  const [steamSecret, setSteamSecret] = useState("");
  const [discordClientId, setDiscordClientId] = useState("");
  const [discordClientSecret, setDiscordClientSecret] = useState("");
  const [discordBotToken, setDiscordBotToken] = useState("");
  const [paynowStoreId, setPaynowStoreId] = useState("");
  const [paynowApiKey, setPaynowApiKey] = useState("");
  const [bmOrgId, setBmOrgId] = useState("");
  const [bmApiKey, setBmApiKey] = useState("");
  const [bmAuthorizeUrl, setBmAuthorizeUrl] = useState("");
  const [rustmapsApiKey, setRustmapsApiKey] = useState("");
  const [rustmapsOrgId, setRustmapsOrgId] = useState("");
  const [importDatabaseUrl, setImportDatabaseUrl] = useState("");

  const refreshStatus = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(backendApi("setup/status"), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json()) as SetupStatus;
      setStatus(data);
      return data;
    } catch {
      setLoadError("Could not reach the API. Is the backend running?");
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!status?.wizardPending) return;
    void fetchSanctumCsrfCookie();
  }, [status?.wizardPending]);

  useLayoutEffect(() => {
    if (!status?.wizardPending) return;
    if (setupStepRestoredRef.current) return;
    setupStepRestoredRef.current = true;
    const stored = readStoredSetupStep();
    if (stored !== null) {
      setStep(stored);
    }
  }, [status?.wizardPending]);

  useEffect(() => {
    if (!status?.wizardPending) return;
    if (!setupStepRestoredRef.current) return;
    sessionStorage.setItem(SETUP_WIZARD_STEP_KEY, String(step));
  }, [step, status?.wizardPending]);

  useEffect(() => {
    if (step !== 3 || !status?.wizardPending) {
      setSignInSessionUser(null);
      return;
    }
    let cancelled = false;
    const token = getAuthToken();
    void (async () => {
      try {
        const res = await fetch(backendApi("auth/session"), {
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = (await res.json().catch(() => ({}))) as { user?: SetupWizardSessionUser };
        if (cancelled) return;
        const user = json?.user;
        setSignInSessionUser(user?.steamId ? user : null);
      } catch {
        if (!cancelled) setSignInSessionUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, status?.wizardPending]);

  async function postJson(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setFormError(null);
    try {
      await fetchSanctumCsrfCookie();
      const res = await fetch(backendApi(path), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...csrfHeaderInit(),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const d = data as { message?: string; error?: string };
        setFormError(d.message ?? d.error ?? `Request failed (${res.status})`);
        return false;
      }
      return data;
    } catch {
      setFormError("Network error.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-destructive text-center">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => void refreshStatus()}>
          Retry
        </Button>
      </main>
    );
  }

  if (status && !status.wizardPending) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-center">Setup wizard is not active for this install.</p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </main>
    );
  }

  if (!status) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const stepLabel = STEPS[Math.min(step, STEPS.length - 1)];

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Site setup</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}: {stepLabel}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{stepLabel}</CardTitle>
            <CardDescription>
              {step === 0 &&
                "Activate with your site license key. License server URL and API key are set in the backend (config/license_server.php)."}
              {step === 1 &&
                "If you already ran this template elsewhere, you can copy MySQL data from that server into this database. Otherwise skip this step."}
              {step === 2 && "Steam Web API key for sign-in (stored encrypted in the database)."}
              {step === 3 &&
                "Same sign-in as the rest of the site. The first Steam account on this install becomes Owner."}
              {step === 4 && "Discord application ID, OAuth secret, and bot token."}
              {step === 5 && "PayNow store identifier and API key."}
              {step === 6 &&
                "BattleMetrics organization API token, org ID, and OAuth app URL (for RCON / org tools)."}
              {step === 7 && "RustMaps API key for map voting and previews (optional org ID)."}
              {step === 8 && "Mark setup complete and open the site."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && <p className="text-destructive text-sm">{formError}</p>}

            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="site-key">Site license key</Label>
                  <Input
                    id="site-key"
                    value={siteLicenseKey}
                    onChange={(e) => setSiteLicenseKey(e.target.value)}
                    placeholder="Activates this domain/instance"
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  disabled={busy || !siteLicenseKey.trim()}
                  onClick={async () => {
                    const data = await postJson("setup/license", {
                      siteLicenseKey: siteLicenseKey.trim(),
                    });
                    if (!data) return;
                    if ((data as { success?: boolean }).success === true) {
                      await refreshStatus();
                      setStep(1);
                    } else {
                      setFormError((data as { message?: string }).message ?? "License activation failed.");
                    }
                  }}
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  This will <span className="text-foreground font-medium">replace</span> data in this install’s
                  database with rows from the old server (same template). Your{" "}
                  <span className="text-foreground font-medium">license key you just entered is kept</span>.
                  Encrypted fields from the old site were saved with its <code className="text-xs">NEXTAUTH_SECRET</code>. After setup, Import data can read them with that secret.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1"
                    disabled={busy}
                    onClick={async () => {
                      const data = await postJson("setup/import-skip", {});
                      if (data && (data as { success?: boolean }).success) {
                        await refreshStatus();
                        setStep(2);
                      }
                    }}
                  >
                    No — this is a new install
                  </Button>
                </div>
                <div className="border-border/60 space-y-3 rounded-lg border border-dashed p-4">
                  <Label htmlFor="import-db-url" className="text-foreground">
                    Yes — source MySQL URL
                  </Label>
                  <Input
                    id="import-db-url"
                    type="password"
                    value={importDatabaseUrl}
                    onChange={(e) => setImportDatabaseUrl(e.target.value)}
                    placeholder="mysql://user:password@host:3306/database_name"
                    className="font-mono text-xs"
                    autoComplete="off"
                  />
                  <p className="text-muted-foreground text-xs">
                    URL-encode special characters in the password. Source must be this same product (tables like{" "}
                    <code className="text-xs">User</code>, <code className="text-xs">SiteSettings</code>).
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={busy || !importDatabaseUrl.trim()}
                    onClick={async () => {
                      const data = await postJson("setup/migrate-database", {
                        databaseUrl: importDatabaseUrl.trim(),
                      });
                      if (data && (data as { success?: boolean }).success) {
                        await refreshStatus();
                        setStep(2);
                      }
                    }}
                  >
                    Import data from that database
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="steam-secret">Steam Web API key</Label>
                  <Input
                    id="steam-secret"
                    type="password"
                    value={steamSecret}
                    onChange={(e) => setSteamSecret(e.target.value)}
                    placeholder="Steam Web API key"
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  disabled={busy || !steamSecret.trim()}
                  onClick={async () => {
                    const data = await postJson("setup/steam-secret", { steamSecret: steamSecret.trim() });
                    if (data && (data as { success?: boolean }).success) {
                      await refreshStatus();
                      setStep(3);
                    }
                  }}
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {signInSessionUser?.steamId ? (
                  <div className="border-border/80 space-y-3 rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border border-border/60">
                        {signInSessionUser.image ? (
                          <AvatarImage src={signInSessionUser.image} alt="" />
                        ) : null}
                        <AvatarFallback className="text-lg">
                          {(signInSessionUser.name ?? "S").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {signInSessionUser.name?.trim() || "Steam user"}
                        </p>
                        <p className="text-muted-foreground truncate font-mono text-xs">
                          {signInSessionUser.steamId}
                        </p>
                        {sessionUserIsOwner(signInSessionUser) && (
                          <Badge variant="active" className="mt-2">
                            Owner
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      You are signed in. This Steam account is the site owner for this install.
                    </p>
                  </div>
                ) : null}
                <Button
                  type="button"
                  onClick={() => {
                    if (typeof window === "undefined") return;
                    sessionStorage.setItem("setup_wizard_post_auth_redirect", "/setup");
                    signIn("steam");
                  }}
                  variant="outline"
                  size="lg"
                  className="group h-auto w-full justify-center gap-3 border-2 border-green-500/85 bg-card py-6 text-base font-semibold text-green-500 shadow-sm transition-all duration-200 hover:border-green-500 hover:bg-green-500 hover:text-white hover:shadow-[0_0_28px_rgba(34,197,94,0.22)] focus-visible:ring-2 focus-visible:ring-green-500/45"
                >
                  <SteamIcon className="h-7 w-auto shrink-0 text-green-500 transition-colors group-hover:text-white" />
                  Sign in with Steam
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border/60 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  disabled={busy}
                  onClick={async () => {
                    await refreshStatus();
                    const s = await fetch(backendApi("auth/session"), {
                      credentials: "include",
                      headers: { Accept: "application/json" },
                    }).then((r) => r.json());
                    const user = s?.user;
                    if (user?.steamId) {
                      setStep(4);
                    } else {
                      setFormError("No Steam session yet. Complete Steam sign-in, then click again.");
                    }
                  }}
                >
                  I signed in — continue
                </Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dc-id">Discord application ID</Label>
                  <Input
                    id="dc-id"
                    value={discordClientId}
                    onChange={(e) => setDiscordClientId(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="dc-secret">Discord client secret</Label>
                  <Input
                    id="dc-secret"
                    type="password"
                    value={discordClientSecret}
                    onChange={(e) => setDiscordClientSecret(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="dc-bot">Discord bot token</Label>
                  <Input
                    id="dc-bot"
                    type="password"
                    value={discordBotToken}
                    onChange={(e) => setDiscordBotToken(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  disabled={
                    busy || !discordClientId.trim() || !discordClientSecret.trim() || !discordBotToken.trim()
                  }
                  onClick={async () => {
                    const data = await postJson("setup/discord", {
                      clientId: discordClientId.trim(),
                      clientSecret: discordClientSecret.trim(),
                      botToken: discordBotToken.trim(),
                    });
                    if (data && (data as { success?: boolean }).success) setStep(5);
                  }}
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pn-store">PayNow store ID</Label>
                  <Input
                    id="pn-store"
                    value={paynowStoreId}
                    onChange={(e) => setPaynowStoreId(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="pn-key">PayNow API key</Label>
                  <Input
                    id="pn-key"
                    type="password"
                    value={paynowApiKey}
                    onChange={(e) => setPaynowApiKey(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  disabled={busy || !paynowStoreId.trim() || !paynowApiKey.trim()}
                  onClick={async () => {
                    const data = await postJson("setup/paynow", {
                      storeId: paynowStoreId.trim(),
                      apiKey: paynowApiKey.trim(),
                    });
                    if (data && (data as { success?: boolean }).success) setStep(6);
                  }}
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bm-org">BattleMetrics organization ID</Label>
                  <Input
                    id="bm-org"
                    value={bmOrgId}
                    onChange={(e) => setBmOrgId(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="bm-key">BattleMetrics API key</Label>
                  <Input
                    id="bm-key"
                    type="password"
                    value={bmApiKey}
                    onChange={(e) => setBmApiKey(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="bm-oauth">OAuth authorize URL (paste from BattleMetrics app)</Label>
                  <Textarea
                    id="bm-oauth"
                    value={bmAuthorizeUrl}
                    onChange={(e) => setBmAuthorizeUrl(e.target.value)}
                    placeholder={`https://www.battlemetrics.com/authorize?response_type=code&client_id=…&redirect_uri=…&scope=…`}
                    className="mt-1 min-h-[100px] font-mono text-xs"
                    autoComplete="off"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Register an OAuth app with a redirect URI you control (for example your control panel URL).
                    Pasting the full authorize link saves <code className="text-xs">client_id</code> and{" "}
                    <code className="text-xs">redirect_uri</code> for reference.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy || !bmOrgId.trim() || !bmApiKey.trim()}
                    onClick={async () => {
                      const data = await postJson("setup/battlemetrics", {
                        orgId: bmOrgId.trim(),
                        apiKey: bmApiKey.trim(),
                        oauthAuthorizeUrl: bmAuthorizeUrl.trim() || undefined,
                      });
                      if (data && (data as { success?: boolean }).success) setStep(7);
                    }}
                  >
                    Continue
                  </Button>
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => setStep(7)}>
                    Skip BattleMetrics
                  </Button>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rm-key">RustMaps API key</Label>
                  <Input
                    id="rm-key"
                    type="password"
                    value={rustmapsApiKey}
                    onChange={(e) => setRustmapsApiKey(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="rm-org">RustMaps organization ID (optional)</Label>
                  <Input
                    id="rm-org"
                    value={rustmapsOrgId}
                    onChange={(e) => setRustmapsOrgId(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy || !rustmapsApiKey.trim()}
                    onClick={async () => {
                      const data = await postJson("setup/rustmaps", {
                        apiKey: rustmapsApiKey.trim(),
                        orgId: rustmapsOrgId.trim() || undefined,
                      });
                      if (data && (data as { success?: boolean }).success) setStep(8);
                    }}
                  >
                    Continue
                  </Button>
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => setStep(8)}>
                    Skip RustMaps
                  </Button>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  This clears the install pending flag. You can change any of these values later in the admin
                  panel.
                </p>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const data = await postJson("setup/complete", {});
                    if (data && (data as { success?: boolean }).success) {
                      sessionStorage.removeItem(SETUP_WIZARD_STEP_KEY);
                      window.location.href = "/";
                    }
                  }}
                >
                  Finish setup
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
