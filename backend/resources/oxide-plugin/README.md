# MagicCore Oxide / Carbon plugin

Rust **Oxide or Carbon plugin** for Magic template sites. It covers the same website features as the Harmony mod: roles, bans, leaderboard stats, wipes, the linked kit, server check-in, and self-update.

Load **one** of them. If both the Harmony mod and this plugin are installed, stats and role grants run twice.

## Install

1. Copy `MagicCore.cs` to `oxide/plugins/` or `carbon/plugins/`.
2. Restart the server, or run `oxide.reload MagicCore` / `c.reload MagicCore`.
3. Edit the generated config (`oxide/config/MagicCore.json` or `carbon/configs/MagicCore.json`). See `MagicCore.json.example`.
4. Reload the plugin once.

The API key on the site needs the same permissions as the Harmony mod:

- `public.users.oxide` — role queue, linked kit, check-in, and this plugin's update
- `public.bans.check` — ban checks
- `public.siteData.stats` — leaderboard ingest
- `public.siteData.wipes.create` — wipe trigger

`API_END_POINT` may be the site origin or `…/api`. The plugin appends `/api` when needed.

Set any of these to `false` to stop that feature completely. A disabled feature does not poll, hook, or call the website. `/bansystem` and `/leaderboard` can turn those two back on without editing the file. The others stay off until the config is `true` and the plugin is reloaded.

| Config | Turns off |
|---|---|
| `ROLES_ENABLED` | Role queue, connect sync, `/link`, and reporting in-game group changes |
| `BAN_SYSTEM_ENABLED` | Ban checks and kicks |
| `LEADERBOARD_ENABLED` | Stat counting and uploads |
| `WIPES_ENABLED` | Reading the current wipe and creating one on map wipe |
| `LINKED_KIT_ENABLED` | Reading the Kits file and posting it |
| `PRESENCE_ENABLED` | Check-in and the Oxide/Carbon report |
| `AUTO_UPDATE` | Update checks, downloads, and `magiccore.update` |

## What it does

| Feature | Path | When |
|---|---|---|
| Role grants from the site | `GET /api/oxide/queue` + `POST /api/oxide/queue/ack` | ~1.5s, faster while the queue is busy |
| Groups on connect | `GET /api/oxide/player` | connect, `/link` |
| Tracked groups | `GET /api/admin/roles` | every 10 minutes |
| In-game group changes | `POST /api/admin/logs/action` | when someone uses Oxide/Carbon group commands |
| Bans | `GET /api/bans/check-batch-fast` | connect, then about every 10 minutes |
| Stats | `POST /api/leaderboard/stats/batch` | 5 minutes, disconnect, server save |
| Check-in | `POST /api/oxide/heartbeat` | load, then every 5 minutes (`product` is `oxide`) |
| Framework | `POST /api/oxide/runtime` | Oxide or Carbon |
| Wipes | `GET/POST /api/wipes` | boot, and when the map wipes |
| Linked kit | `GET/POST /api/oxide/linked-kit` | boot, then every 5 minutes |
| Self-update | `GET /api/oxide/plugin-release` + `GET /api/oxide/plugin-download` | ~45s after boot, then every 30 minutes |

Website role changes still land through `RoleOxideGroupQueue`. Set `ROLE_SAFETY_SYNC_MINUTES` (for example `30`) only if you also want a full resync. `0` leaves that off.

Leaderboard counters match the Harmony mod: combat, explosives, farming, collectibles, hacked crates, heli, Bradley, NPCs, animals, missions, vehicle purchases, supply signals, and play time. Crate, mission, and vehicle counts use small Harmony patches inside this plugin because Oxide has no hooks for them. Unload removes only those patches.

The linked kit is read from `oxide/data/Kits/kits_data.json` or `carbon/data/Kits/kits_data.json` for the kit name configured on the site.

## Commands

Chat or F1:

- `/link` — refresh this player's website roles
- `/checkban <steamid>` — admin
- `/bansystem <enable|disable|status>` — admin
- `/leaderboard <enable|disable|status>` — admin

Server console: `magiccore.link`, `magiccore.checkban`, `magiccore.bansystem`, `magiccore.leaderboard`, `magiccore.update`.

`AUTO_UPDATE` defaults to true. Set it to false to update only when someone runs `magiccore.update`.

## Shipping a new plugin build

Bump all three together:

- `[Info(..., "x.y.z")]` and `public const string Version` in `MagicCore.cs`
- `version` and notes in `release.json`

The site serves `MagicCore.cs` from this folder. After `php artisan migrate`, server cards label a plugin check-in as `MagicCore x.y.z · Oxide plugin` (or Carbon) and compare that version to `release.json` here, not to the Harmony mod.
