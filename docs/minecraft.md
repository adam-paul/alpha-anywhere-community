# Minecraft Private Servers

Reference for the Minecraft side of the platform. Captures the running test server, the architectural decisions behind it, and the path forward to per-group private servers integrated with the community.

Status as of writing: standalone test server running, no platform integration yet, no plugins installed.

## Context

Minecraft is one of the games in the community arcade. The model: persistent worlds, accessible to students who've cleared work-wall gating, with admin tooling tied to existing roles (`student`, `admin`).

The roadmap places this under **Tier 3: Game Extensibility** (`docs/roadmap.md:154`). The open question on `docs/roadmap.md:321` ("Bedrock vs Java? Realms vs self-hosted?") is answered by the decisions below.

## Decisions

| Question               | Decision                                 | Reasoning                                                                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Edition                | **Java**                                 | Paper plugin ecosystem is required for the customization we'll need (whitelist sync from D1, gating hooks, in-game admin tooling). Bedrock has add-ons but no equivalent server-side modding depth.                                                    |
| Hosting model          | **Self-hosted**                          | Realms forbids plugins. End-to-end control needed.                                                                                                                                                                                                     |
| Distribution           | **Paper**                                | Performance + plugin compatibility. Vanilla `server.jar` would force us to rebuild any moderation/admin tooling from scratch.                                                                                                                          |
| Cloud provider         | **DigitalOcean**                         | Consolidates with existing LiveKit deployment. Hetzner is ~2-3× cheaper but the multi-cloud cost wasn't worth it at this stage. Reversible — Minecraft data is portable.                                                                               |
| Droplet shape          | **Separate droplet from LiveKit**        | Resource contention (LiveKit is bursty UDP, Paper is tick-bound), blast radius isolation, attack-surface separation.                                                                                                                                   |
| Cross-platform clients | **Java now, GeyserMC + Floodgate later** | Keeps a single Java + Paper base. Geyser plugin lets Bedrock clients (iPad, ChromeOS, mobile, consoles) connect when we want broader device support.                                                                                                   |
| Education Edition      | **Rejected as base**                     | Tenant-bound identity collides with our custom auth. $36/user/year recurring vs $30/student one-time for Java. 40-player cap. No real plugin API. May reappear as an overlay for specific structured-curriculum programs but not as the platform base. |

## Infrastructure

### Droplet

| Field    | Value                                                |
| -------- | ---------------------------------------------------- |
| Hostname | `mc-servers-ubuntu-s-2vcpu-4gb-amd-sfo3`             |
| Region   | SFO3 (matches LiveKit)                               |
| Type     | Premium AMD, 2 vCPU                                  |
| RAM      | 4 GB                                                 |
| Disk     | 80 GB NVMe                                           |
| OS       | Ubuntu 24.04 LTS                                     |
| Cost     | ~$28/mo                                              |
| VPC      | Default for SFO3 (same as LiveKit)                   |
| Backups  | Off — turn on once we have a real world worth saving |

**Memory headroom is tight.** Paper hits ~3.4 GB peak with our heap config; that leaves ~600 MB for OS + page cache + sshd + journald. We hit a memory-thrash incident once that wedged SSH. When it bites again:

- Drop JVM heap to `-Xms2500M -Xmx2500M` in the systemd unit, `daemon-reload`, restart.
- Or resize to 8 GB ($48/mo) — same data, ~5 min downtime, no migration.

A 2 GB swap file was added as a soft mitigation:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Network / firewall

DO Cloud Firewall attached to the droplet:

| Direction | Protocol | Port              | Sources            |
| --------- | -------- | ----------------- | ------------------ |
| Inbound   | TCP      | 22 (SSH)          | All IPv4, All IPv6 |
| Inbound   | TCP      | 25565 (Minecraft) | All IPv4, All IPv6 |
| Outbound  | All      | All               | All (default)      |

SSH is open to the world but **key-only**. `/etc/ssh/sshd_config` retains DO's defaults: `PasswordAuthentication no`, `PermitRootLogin prohibit-password`. We declined to lock SSH to a specific IP because home ISP IPs shift and the lockout risk outweighs the security delta.

DNS not configured — connect by IP. Add an A record (`mc-test.<domain> → <droplet-ip>`) when we want a friendlier address.

### Users

| User   | Type                      | Role                              |
| ------ | ------------------------- | --------------------------------- |
| `root` | SSH-accessible (key-only) | Service management, system config |
| `mc`   | System user, no password  | Runs the Minecraft JVM            |

`mc` was created with `adduser --system --group --home /home/mc --shell /bin/bash mc`. As a system user it cannot sudo and cannot authenticate interactively — by design.

**Access pattern:**

- SSH in: `ssh root@<droplet-ip>`
- Switch to mc for file edits in `/home/mc/server`: `sudo -u mc bash`
- Back to root: `exit`
- All `systemctl` operations happen as root

## Software

### Java

`openjdk-25-jre-headless` from Ubuntu 24.04 repos. Java 25 was chosen forward-looking — Paper 1.21.11 only requires Java 21, but Paper 26.1+ (when it ships) will require Java 25. Java 25 runs 1.21.11 fine due to JVM backwards compatibility.

Eclipse Temurin (`temurin-25-jre` via the Adoptium PPA) is the fallback if the Ubuntu repo doesn't carry it.

### Paper

Version: **1.21.11 build #130**.

Paper has not yet shipped builds for Minecraft 26.1.x (Mojang vanilla is on 26.1.2 but Paper trails). The 1.21.x line is the current Paper-supported branch.

**Download URL pattern.** PaperMC migrated from the v2 API to "fill" — content-addressed CDN:

```
https://fill-data.papermc.io/v1/objects/<sha256>/paper-<version>-<build>.jar
```

Easiest path: visit <https://papermc.io/downloads/paper>, right-click **Download** → **Copy Link Address**, then:

```bash
curl -L -o paper.jar '<copied-url>'
sha256sum paper.jar  # should match the hash embedded in the URL
```

The old `api.papermc.io/v2/...` pattern returns `{"error":"Build not found."}` — do not use.

### File layout under `/home/mc/server`

| Path                                        | Purpose                              |
| ------------------------------------------- | ------------------------------------ |
| `paper.jar`                                 | Server JAR                           |
| `eula.txt`                                  | Mojang EULA acceptance (`eula=true`) |
| `server.properties`                         | Main config                          |
| `ops.json`                                  | Server operators                     |
| `whitelist.json`                            | Allowed players                      |
| `banned-players.json` / `banned-ips.json`   | Bans                                 |
| `world/`, `world_nether/`, `world_the_end/` | World data                           |
| `logs/latest.log` (rotated)                 | Server logs                          |
| `plugins/`                                  | (empty) Future plugin JARs           |
| `cache/`, `libraries/`, `versions/`         | Paper internals                      |

### `server.properties` — what we changed

| Key                 | Value                 | Why                                                                                  |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `white-list`        | `true`                | Private server fence                                                                 |
| `enforce-whitelist` | `true`                | Removing a player from whitelist kicks them immediately if online                    |
| `motd`              | `Alpha Anywhere Test` | Cosmetic identifier in client server list                                            |
| `difficulty`        | `normal`              | Standard mob/hunger behavior. Could drop to `easy` for a more forgiving environment. |
| `view-distance`     | `10`                  | Default. Single biggest server-load knob; scales ~quadratically.                     |

`online-mode=true` is the default and untouched. Mojang authentication is enabled — connections are validated against Microsoft/Mojang.

### systemd unit

Lives at `/etc/systemd/system/minecraft.service`. Runs Paper as `mc:mc`, drops privileges before exec, uses Aikar's flags for G1GC tuning.

Key directives:

- `User=mc`, `Group=mc` — drop from root before exec
- `Type=simple` — direct foreground process, no daemonization
- `Restart=on-failure`, `RestartSec=10` — auto-restart on crash, not on clean stop
- `KillSignal=SIGTERM`, `TimeoutStopSec=60` — Paper's shutdown hook saves world cleanly on SIGTERM; 60s before SIGKILL escalation
- `WantedBy=multi-user.target` — start at boot

Heap: `-Xms3G -Xmx3G` (equal — JVM never grows mid-tick). Aikar's flags follow.

The unit file currently lives only on the droplet. **TODO:** vendor a copy under `infra/minecraft/` if/when we move to declarative infra.

## Operations

### Service commands (run as root)

```bash
systemctl status minecraft           # current state
systemctl --no-pager status minecraft
systemctl start minecraft
systemctl stop minecraft             # SIGTERM, graceful save, up to 60s
systemctl restart minecraft

journalctl -u minecraft -f                       # live tail
journalctl -u minecraft -n 100 --no-pager        # last 100 lines
journalctl -u minecraft --since "10 min ago"
journalctl -k --since "30 min ago" | grep -iE 'oom|killed'   # OOM check
```

### In-game commands (op required)

| Command                                              | Effect                               |
| ---------------------------------------------------- | ------------------------------------ |
| `/op <name>` / `/deop <name>`                        | Grant / revoke operator              |
| `/whitelist add <name>` / `/whitelist remove <name>` | Whitelist management                 |
| `/whitelist list` / `/whitelist reload`              | List / reload from disk              |
| `/kick <name> [reason]`                              | Boot player                          |
| `/ban <name> [reason]` / `/pardon <name>`            | Ban / unban                          |
| `/tp <player>`                                       | Teleport you to player               |
| `/tp <p1> <p2>`                                      | Teleport p1 to p2                    |
| `/tp <player> <x> <y> <z>`                           | Teleport to coords (`~` is relative) |
| `/time set day` / `noon` / `night`                   | Time control                         |
| `/weather clear` / `rain` / `thunder`                | Weather control (resets on cycle)    |
| `/gamerule doDaylightCycle false`                    | Lock day/night                       |
| `/gamerule doWeatherCycle false`                     | Lock weather                         |
| `/gamerule keepInventory true`                       | No item drop on death                |
| `/gamerule playersSleepingPercentage 1`              | One sleeper skips the night          |
| `/seed`                                              | Show world seed                      |

### Adding new ops/whitelist entries (current procedure)

The systemd service has no stdin attached, so commands can't be sent to the running JVM. Two options:

1. **Stop, run interactively, op, restart** (~30 sec downtime):

   ```bash
   systemctl stop minecraft
   sudo -u mc bash -c 'cd /home/mc/server && java -Xms3G -Xmx3G -jar paper.jar nogui'
   # In the console:
   > whitelist add <minecraft-profile-name>
   > op <minecraft-profile-name>
   > stop
   systemctl start minecraft
   ```

2. **Edit `/home/mc/server/whitelist.json` directly**, then `whitelist reload` — works if the server is reachable in-game by another op. Need the player's UUID.

**For productionizing**: enable RCON in `server.properties` and use `mcrcon` (or any RCON client library from the SvelteKit server) to send commands to the running service. That's the path to programmatic admin from the platform.

### Recovery — when SSH wedges

Symptoms: SSH hangs, existing shell unresponsive. Cause is almost always memory thrash on this 4GB droplet.

1. **Open DO web console** (Dashboard → droplet → Access → Launch Droplet Console). Talks to the hypervisor, bypasses SSH.
2. Once logged in: `systemctl stop minecraft` to release memory.
3. If web console also hangs: hard power-cycle from the **Power** tab (Power Off → Power On). Risk of small world-state loss but Paper is reasonably resilient.

### `apt upgrade` conffile prompts

When a system package's config conflicts with DO's hardened defaults (most often `/etc/ssh/sshd_config`), dpkg prompts. **Pick "keep the local version currently installed"** to preserve DO hardening (key-only SSH). The maintainer version typically re-enables password auth.

To skip the prompt entirely:

```bash
apt-get -o Dpkg::Options::="--force-confold" upgrade
```

## Identity and connection

| Identity                | What it is                                                                | Where used                       |
| ----------------------- | ------------------------------------------------------------------------- | -------------------------------- |
| Microsoft account email | Login for the Microsoft launcher                                          | Auth only, never appears in-game |
| Xbox Gamertag           | Microsoft consumer-facing identity                                        | Microsoft.com profile pages      |
| **Java profile name**   | **In-game identity, what `op`/`whitelist` resolves against Mojang's API** | All server-side commands         |

The Java profile name is set at <https://www.minecraft.net/en-us/msaprofile> and shown top-right in the launcher. The Xbox Gamertag and Java profile name are different fields — don't conflate.

Connection: Minecraft client v1.21.11 → Multiplayer → Add Server → `<droplet-ip>` (port 25565 default).

Server and client Minecraft versions must match. When Paper ships 26.1+, both sides move together.

## Forward direction

### Plugins worth installing once we're past pure-vanilla testing

| Plugin              | Purpose                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **CoreProtect**     | Block change logging + rollback. Highest-value single plugin for any community server (lets us reverse griefing incidents). |
| **LuckPerms**       | Permissions / groups. Industry standard.                                                                                    |
| **GriefPrevention** | Player-driven land claims (golden shovel UX). Standard for community SMPs.                                                  |
| **WorldGuard**      | Admin-defined regions (e.g., spawn read-only). Optional alongside or instead of GriefPrevention.                            |
| **DiscordSRV**      | Bidirectional Discord chat bridge. Useful if/when there's a community Discord.                                              |

Drop JARs into `/home/mc/server/plugins/`, restart the service. Each plugin auto-creates its config under `plugins/<name>/`.

### Bedrock cross-platform: GeyserMC + Floodgate

When we want students on iPads, Chromebooks, consoles, or mobile to join:

- **Geyser-Spigot.jar** in `plugins/` — translates Bedrock protocol ↔ Java protocol on the same Paper server
- **Floodgate.jar** — lets Bedrock-account holders join without buying a Java license

Single Paper server, single world, single identity model — Bedrock players appear alongside Java players. ~30 min of setup. Doesn't require switching to Bedrock or to MEE.

### Project integration sketch (not yet implemented)

The platform layer needs to:

1. **Provision a server per group.** Current shape (one droplet per server) doesn't scale. Move to one Docker container per group on a larger droplet (or set), using `itzg/minecraft-server` (the de-facto standard image — supports Paper natively, handles EULA/version/plugin install via env vars).
2. **Whitelist provisioning.** Sync allowed players from the D1 user model, gated by LWAI/Timeback work-wall status. Two paths:
   - Write `whitelist.json` directly + `whitelist reload` (simple, polling)
   - RCON connection from the SvelteKit server with `whitelist add/remove` (real-time, requires RCON enabled per server)
3. **Inline admin tooling.** Per project conventions, Minecraft management lives on the existing arcade page for admins, not a separate dashboard. Likely surfaces: server list, per-server whitelist sync status, restart button, log tail.
4. **Auth bridge.** Students authenticate via existing custom auth; their Minecraft profile name (or UUID) is stored on the user record and used for whitelist provisioning. They still need a Minecraft Java license; the platform doesn't sell or proxy that.
5. **Voice integration.** LiveKit rooms scoped to game servers, respecting the existing one-room-at-a-time rule. Likely a separate room per Minecraft server, joined when a player enters. To be designed.

### Open decisions to revisit

- **Droplet sizing:** stay 4 GB with reduced heap, or resize to 8 GB? Probably 8 GB before any students touch it.
- **Bare-metal vs Docker:** keep bare-metal systemd as long as we have one server; switch to `itzg/minecraft-server` containers when we need >1 server.
- **RCON or in-process plugin** for programmatic admin? RCON is simpler and standard. In-process plugin gives finer control but adds a build pipeline. Probably RCON to start.
- **Bedrock cross-play timing:** add Geyser when we know we have non-Java students, not before.

## References

- `docs/roadmap.md:154` — Tier 3: Game Extensibility
- `docs/roadmap.md:321` — open question, answered by this doc
- Paper docs: <https://docs.papermc.io>
- Paper downloads: <https://papermc.io/downloads/paper> (use the page's content-addressed CDN URLs, not the old v2 API)
- `itzg/minecraft-server` Docker reference image: <https://github.com/itzg/docker-minecraft-server>
- Geyser: <https://geysermc.org>
