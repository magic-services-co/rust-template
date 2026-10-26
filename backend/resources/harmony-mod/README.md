# MagicCore Harmony

Rust **Harmony mod** (not an Oxide plugin) for Magic template sites: leaderboard stats, Discord/Steam linking roles, and website bans.

It still **uses Oxide or Carbon’s permission system** at runtime to create groups, grant roles, and revoke them. The game hooks themselves are Harmony patches, so the DLL lives in `HarmonyMods/` instead of `oxide/plugins/`.

## Why Harmony

The old MagicCore plugin was an Oxide `RustPlugin`. This build:

- Loads with Facepunch’s Harmony loader (`harmony.load MagicCore`)
- Patches the server directly instead of Oxide hooks
- Talks to the website off the game thread so role grants can land in about a second without hitching ticks
- Calls Oxide/Carbon `Permission` (or `oxide.*` / `c.*` console commands) only for groups

## Install

1. Build `MagicCore.dll` (see below) or copy a release DLL.
2. Put it in `HarmonyMods/` next to `RustDedicated.exe`.
3. Start the server, or run `harmony.load MagicCore`.
4. Edit `HarmonyMods_Data/MagicCore/MagicCore.json` (created on first load).
5. Restart once, or `harmony.unload MagicCore` then `harmony.load MagicCore`.

Oxide or Carbon must also be installed if you want real permission groups. Vanilla Harmony-only servers can still collect stats and bans; group grant/revoke will no-op besides log lines.

### Carbon

Carbon also uses Harmony. This mod only patches game methods plus, after Carbon is up, the permission library. Do not also keep the old `MagicCore.cs` Oxide plugin installed.

## Config

```json
{
  "API_END_POINT": "https://your-site.example/api",
  "SERVER_ID": "the-server-id-from-the-site",
  "API_KEY": "64-char-site-api-key",
  "DEBUG": false,
  "QUEUE_POLL_SECONDS": 1.5,
  "STATS_FLUSH_SECONDS": 300,
  "MAX_CONCURRENT_HTTP": 4,
  "HTTP_TIMEOUT_SECONDS": 8,
  "BAN_SYSTEM_ENABLED": true,
  "LEADERBOARD_ENABLED": true
}
```

`API_END_POINT` may be the site origin or `…/api`. The mod appends `/api` when needed.

API key permissions on the site:

- `public.users.oxide` — role queue + player groups
- `public.bans.check` — ban checks
- `public.siteData.stats` — leaderboard ingest
- `public.siteData.wipes.create` — wipe trigger (optional)

## How it talks to the website

Nothing in this mod blocks a server tick waiting on HTTP. Requests run on the thread pool (max 4 in flight, 8s timeout). Results are applied a few at a time each frame.

| Feature | Path | Cadence |
|---|---|---|
| Role grants from the site | `GET /api/oxide/queue` + `POST /api/oxide/queue/ack` | ~1.5s idle, ~0.6s while the queue is busy |
| Groups on connect | `GET /api/oxide/player?steamId=&serverId=` | connect |
| Tracked groups | `GET /api/admin/roles` | every 10 minutes |
| Bans | `GET /api/bans/check-batch-fast` | connect + batched queue |
| Stats | `POST /api/leaderboard/stats/batch` | 5 minutes, disconnect, save. Skipped when `LEADERBOARD_ENABLED` is false |
| Wipes | `GET/POST /api/wipes` | boot + map wipe |
| Linked kit | `GET/POST /api/oxide/linked-kit` | boot, then every 5 minutes |

Website role changes are queued in `RoleOxideGroupQueue`. The mod pulls that queue instead of scraping admin logs, so a store purchase or Discord link can grant an Oxide group almost immediately without a full player resync.

Set `ROLE_SAFETY_SYNC_MINUTES` to something like `30` only if you want a periodic full resync. Default `0` leaves that off.

## Linked kit

The site Link page can show the real contents of one Kits plugin kit. In admin site settings, choose **From the game server**, pick the server, and enter the kit name (for example `linked`).

This mod reads that kit from the Kits data file on the server that matches `SERVER_ID`:

- `oxide/data/Kits/kits_data.json`
- `carbon/data/Kits/kits_data.json`

It uses the same `public.users.oxide` API key permission as the role queue. Item icons on the site come from the item shortname. Rebuild and replace `MagicCore.dll` after pulling this change.

## Commands

In chat or F1:

- `/link` — refresh this player’s website roles
- `/checkban <steamid>` — admin
- `/bansystem <enable\|disable\|status>` — admin
- `/leaderboard <enable\|disable\|status>` — admin. Disable stops this server from sending stats to the website.

Console: `magiccore.link`, `magiccore.checkban`, `magiccore.bansystem`, `magiccore.leaderboard`, `rusttemplate.update`.

## Updates

The mod asks the site for a newer MagicCore about a minute after boot, then every `UPDATE_CHECK_MINUTES` (default 30). When the site is serving a newer `MagicCore.dll`, the mod downloads it, writes it over `HarmonyMods/MagicCore.dll`, and reloads. Set `AUTO_UPDATE` to `false` to only update when you ask.

Server console:

```
rusttemplate.update
```

The admin Harmony mod page shows the version and the notes for that release.

## Build

Requires the server’s `RustDedicated_Data/Managed` assemblies (Harmony, Assembly-CSharp, Unity, Newtonsoft.Json).

```bash
# copy Managed DLLs next to this repo, or:
export RUST_MANAGED_DIR=/path/to/RustDedicated_Data/Managed
dotnet build MagicCore.Harmony.sln -c Release
```

Copy `src/MagicCore.Harmony/bin/Release/MagicCore.dll` into `HarmonyMods/`.

You do **not** need to publicize assemblies. Harmony `AccessTools` is used for private game methods.

## Permissions backend

At server ready the mod looks for:

1. `Oxide.Core.Interface.Oxide.GetLibrary<Permission>()`
2. Carbon’s Oxide-compatible `Permission` type
3. Fallback console: `oxide.usergroup add` or `c.usergroup add`

It then Harmony-patches `AddUserGroup` / `RemoveUserGroup` so **in-game** `oxide.usergroup` changes can be reported back to the site, without echoing grants the mod itself just applied from the queue.

## Replacing the Oxide plugin

Remove `oxide/plugins/MagicCore.cs` (and any merged `MagicCore.cs`). Keep the same `SERVER_ID` and API key. Existing Oxide groups stay; this mod reuses them.
