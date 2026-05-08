# Workflowy API access

Reference for editing the **Playcademy Arcade** Workflowy doc directly via API.
Future Claude sessions: read this before driving Workflowy.

## Setup

Credentials are in `.env` (Bun auto-loads):

```
WORKFLOWY_API_KEY=...   # Bearer token from https://workflowy.com/api-key
WORKFLOWY_ROOT_ID=...   # UUID of the doc root node
```

## Quick reference

| Operation        | Method + path                        | Body / params                                                                                                       |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Export full tree | `GET /api/v1/nodes-export`           | — (rate limit **1 req/min**)                                                                                        |
| List children    | `GET /api/v1/nodes?parent_id=<id>`   | `parent_id` accepts UUID, `None` (root), `inbox`, `today`, `tomorrow`, `next_week`, `YYYY`, `YYYY-MM`, `YYYY-MM-DD` |
| Get single node  | `GET /api/v1/nodes/<id>`             | — (⚠ see gotcha below)                                                                                              |
| Create node      | `POST /api/v1/nodes`                 | `{parent_id, name, note?, position?}` → `{item_id}`                                                                 |
| Update node      | `POST /api/v1/nodes/<id>`            | `{name?, note?}` → `{status:"ok"}`                                                                                  |
| Delete node      | `DELETE /api/v1/nodes/<id>`          | — → `{status:"ok"}`                                                                                                 |
| Move node        | `POST /api/v1/nodes/<id>/move`       | `{parent_id, position?}`                                                                                            |
| Mark complete    | `POST /api/v1/nodes/<id>/complete`   | —                                                                                                                   |
| Mark uncomplete  | `POST /api/v1/nodes/<id>/uncomplete` | —                                                                                                                   |
| List shortcuts   | `GET /api/v1/targets`                | —                                                                                                                   |

Base URL: `https://workflowy.com/api/v1`. All requests need `Authorization: Bearer $WORKFLOWY_API_KEY`.

## Gotchas (verified)

1. **`GET /api/v1/nodes/<id>` returns `parent_id: null` even for non-root nodes.** Don't use it to determine parentage. Use `nodes-export` (gives correct parent_ids tree-wide) or `?parent_id=<id>` listing.
2. **Create response is `{"item_id": "..."}`, not `{"node": {...}}`** — the docs imply otherwise. The new node's other fields (parent_id, priority) are not returned; refetch via the parent's children listing if you need them.
3. **`parent_id` shortcuts auto-create system nodes lazily.** First write to `parent_id:"inbox"` materializes a real "Inbox" node at the root.
4. **Shared docs are invisible to API keys.** API only sees nodes the key holder owns. Docs shared _to_ you appear as ghost roots in `parent_id=None` listings but return `not_found` on direct fetch. To work with a shared doc, duplicate it into your own home first.
5. **Export rate limit is strict.** `/nodes-export` is 1 request per minute. Cache the result in-memory if making multiple operations in one session.

## Node shape

```ts
{
  id: string;             // UUID
  name: string;           // text content; supports inline HTML (<b>, <i>, <s>, <code>, <a>)
  note: string | null;    // optional secondary text
  parent_id: string | null;
  priority: number;       // sort key among siblings; lower = higher in list
  completed: boolean;
  data: { layoutMode?: 'bullets' | 'todo' | 'h1' | 'h2' | 'h3' | 'code-block' | 'quote-block' };
  createdAt: number;      // unix seconds
  modifiedAt: number;
  completedAt: number | null;
}
```

`name` and `note` accept Markdown that gets converted at write time:
`**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `[text](url)`, `# / ## / ###` headers,
`- [ ]` / `- [x]` todos, ` ``` ` code blocks, `>` quote blocks, `[YYYY-MM-DD]` date refs.

Multi-line names are split: first line becomes the parent, subsequent lines become child nodes (separator `\n\n` between distinct children).

## How to find a node

There is no name-search endpoint. Standard pattern:

```bash
curl -s -H "Authorization: Bearer $WORKFLOWY_API_KEY" \
  https://workflowy.com/api/v1/nodes-export \
  | jq '.nodes | map(select(.name | test("requirements"; "i"))) | .[] | {id, name, parent_id}'
```

Or for richer browsing, read the local mirror at `docs/workflowy/playcademy-arcade.md` —
each bullet has its UUID embedded as `<!--id:...-->`. Mirror is generated by
`scripts/wf-pull.ts` (`bun run wf:pull`) and may be stale; refresh before relying on IDs
for writes that depend on current tree state.

## Common write recipes

### Add a child under a known parent

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $WORKFLOWY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"parent_id":"<PARENT_UUID>","name":"New bullet text","note":"Optional note"}' \
  https://workflowy.com/api/v1/nodes
```

`position` accepts `"top"` or `"bottom"` (default `"bottom"`).

### Update name and/or note

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $WORKFLOWY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated text","note":"Updated note"}' \
  https://workflowy.com/api/v1/nodes/<NODE_UUID>
```

### Mark complete / uncomplete

```bash
curl -sS -X POST -H "Authorization: Bearer $WORKFLOWY_API_KEY" \
  https://workflowy.com/api/v1/nodes/<NODE_UUID>/complete
```

### Delete (recursive)

```bash
curl -sS -X DELETE -H "Authorization: Bearer $WORKFLOWY_API_KEY" \
  https://workflowy.com/api/v1/nodes/<NODE_UUID>
```

Deletes the node and all descendants. Irreversible via API (no trash endpoint).

### Move to a different parent

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $WORKFLOWY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"parent_id":"<NEW_PARENT_UUID>","position":"top"}' \
  https://workflowy.com/api/v1/nodes/<NODE_UUID>/move
```

## Why this is a one-way mirror, not a sync tool

`scripts/wf-pull.ts` only pulls (Workflowy → local). Edits go through the API directly,
described in conversation ("add a bullet under Requirements that says X" → I run the
curl). Reasons:

- The doc is small (~500 nodes, one root). Bulk-restructuring is rare.
- Conversational edits don't need a local-file roundtrip.
- A sync tool would need diff/merge logic and conflict handling — meaningful complexity for limited upside.

The pulled markdown exists for git history, cross-session context (reading without burning API quota), and feeding the doc to other tools/agents. Refresh with `bun run wf:pull` when the local copy is stale.
