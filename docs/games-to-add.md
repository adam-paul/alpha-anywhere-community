# Games to Add with Private Servers

Reference list of games from the original mock data. Each needs a private server with `accessCode` (UUID) and `linkCode` (numeric string) before adding to the database.

## Side-by-Side (Rung 1) - Solo play near others

| Game                | Place ID   | Status                  |
| ------------------- | ---------- | ----------------------- |
| Bee Swarm Simulator | 1537690962 | ✅ Added                |
| Adopt Me!           | 920587237  | ⏳ Needs private server |

## Town Square (Rung 2) - Unstructured hangout

| Game                | Place ID   | Status                  |
| ------------------- | ---------- | ----------------------- |
| Brookhaven          | 4924922222 | ⏳ Needs private server |
| Welcome to Bloxburg | 185655149  | ⏳ Needs private server |

## Ice Breaker (Rung 3) - Short rounds, shared fate

| Game                      | Place ID        | Status                  |
| ------------------------- | --------------- | ----------------------- |
| Natural Disaster Survival | 189707          | ⏳ Needs private server |
| Regretevator              | (needs real ID) | ⏳ Needs private server |

## Trust Builder (Rung 4) - Cooperative play

| Game                      | Place ID  | Status                  |
| ------------------------- | --------- | ----------------------- |
| Work at a Pizza Place     | 192800    | ⏳ Needs private server |
| Build A Boat For Treasure | 537413528 | ⏳ Needs private server |

## Rivalry (Rung 5) - Team competition

| Game    | Place ID   | Status                  |
| ------- | ---------- | ----------------------- |
| BedWars | 6872265039 | ⏳ Needs private server |
| Arsenal | 286090429  | ⏳ Needs private server |

---

## How to Get Private Server Credentials

1. Go to the game on Roblox.com
2. Click the "..." menu → "Create Private Server" (may require Robux)
3. Copy the share link: `https://www.roblox.com/share?code=XXXXXXXX&type=Server`
4. Open the share link in a browser with DevTools open (Console tab)
5. Look for both values in the console logs:
   - `accessCode`: UUID like `365ac2f6-cde8-41b1-82ff-93dafd34258a`
   - `linkCode`: Numeric string like `32872177519509092753493698228788`
6. The `placeId` is the game's numeric ID (visible in the game URL)

**Both `accessCode` AND `linkCode` are required** - the deep link won't work with just one.

## Deep Link Format

```
roblox://placeId={placeId}&accessCode={accessCode}&linkCode={linkCode}
```

## Adding a Game to the Database

```sql
INSERT INTO games (id, title, thumbnail_url, type, engagement_category, launch_url, place_id, private_server_access_code, link_code, description)
VALUES (
  'game-slug',
  'Game Title',
  'https://tr.rbxcdn.com/...',  -- Get from Roblox game page
  'roblox',
  'side-by-side',  -- or: town-square, ice-breaker, trust-builder, rivalry
  'https://www.roblox.com/games/XXXXXX/Game-Name',  -- Web fallback URL
  'XXXXXX',  -- Roblox place ID (numeric string)
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- accessCode (UUID)
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',  -- linkCode (numeric string)
  'Short description'
);
```
