#!/usr/bin/env bun
/**
 * Pull the Workflowy "Playcademy Arcade" doc and write a local markdown mirror.
 *
 * Usage:
 *   bun run scripts/wf-pull.ts
 *   bun run wf:pull
 *
 * Env (Bun auto-loads .env):
 *   WORKFLOWY_API_KEY  - bearer token for https://workflowy.com/api/v1/*
 *   WORKFLOWY_ROOT_ID  - UUID of the root node to mirror
 *
 * Writes:
 *   docs/workflowy/playcademy-arcade.md
 *
 * Read-only mirror. Edits to Workflowy go through the API directly (see
 * docs/workflowy.md for the patterns) — this script never writes to Workflowy.
 */

const API_BASE = 'https://workflowy.com/api/v1';
const OUT_PATH = 'docs/workflowy/playcademy-arcade.md';

interface WorkflowyNode {
  id: string;
  name: string;
  note: string | null;
  parent_id: string | null;
  priority: number;
  completed: boolean;
  data: { layoutMode?: string };
  createdAt: number;
  modifiedAt: number;
  completedAt: number | null;
}

async function fetchExport(apiKey: string): Promise<WorkflowyNode[]> {
  const res = await fetch(`${API_BASE}/nodes-export`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) {
    throw new Error(`Workflowy API ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { nodes: WorkflowyNode[] };
  return body.nodes;
}

function buildChildIndex(nodes: WorkflowyNode[]): Map<string | null, WorkflowyNode[]> {
  const index = new Map<string | null, WorkflowyNode[]>();
  for (const n of nodes) {
    const arr = index.get(n.parent_id) ?? [];
    arr.push(n);
    index.set(n.parent_id, arr);
  }
  for (const arr of index.values()) {
    arr.sort((a, b) => a.priority - b.priority);
  }
  return index;
}

function renderTree(
  rootId: string,
  childIndex: Map<string | null, WorkflowyNode[]>
): { lines: string[]; count: number } {
  const lines: string[] = [];
  let count = 0;

  const walk = (parentId: string, depth: number) => {
    const kids = childIndex.get(parentId) ?? [];
    for (const k of kids) {
      count++;
      const indent = '  '.repeat(depth);
      const checkbox = k.completed ? '[x] ' : '';
      const name = (k.name ?? '').replaceAll('\n', ' ').trim();
      lines.push(`${indent}- ${checkbox}${name} <!--id:${k.id}-->`);
      if (k.note) {
        for (const noteLine of k.note.split('\n')) {
          lines.push(`${indent}  > ${noteLine}`);
        }
      }
      walk(k.id, depth + 1);
    }
  };

  walk(rootId, 0);
  return { lines, count };
}

async function main() {
  const apiKey = process.env.WORKFLOWY_API_KEY;
  const rootId = process.env.WORKFLOWY_ROOT_ID;
  if (!apiKey || !rootId) {
    console.error('Missing WORKFLOWY_API_KEY or WORKFLOWY_ROOT_ID in .env');
    process.exit(1);
  }

  console.log('Fetching nodes-export...');
  const nodes = await fetchExport(apiKey);

  const root = nodes.find((n) => n.id === rootId);
  if (!root) {
    console.error(`Root node ${rootId} not found in export (got ${nodes.length} nodes).`);
    process.exit(1);
  }

  const childIndex = buildChildIndex(nodes);
  const { lines: bodyLines, count } = renderTree(rootId, childIndex);

  const out =
    [
      `# ${root.name || 'Untitled'}`,
      '',
      '<!--',
      `Root ID: ${rootId}`,
      `Pulled:  ${new Date().toISOString()}`,
      `Nodes:   ${count}`,
      'Generator: scripts/wf-pull.ts (one-way mirror; do not edit — edits made here are not pushed back)',
      '-->',
      '',
      ...bodyLines
    ].join('\n') + '\n';

  await Bun.write(OUT_PATH, out);
  console.log(`Wrote ${OUT_PATH} (${count} nodes under "${root.name}")`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
