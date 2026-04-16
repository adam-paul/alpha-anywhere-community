import { DurableObject } from 'cloudflare:workers';
import type { ClientRequest, ConnectionMeta, PresenceSnapshotMessage } from '@alpha/shared/types';
import type { Env } from './types';

export class RealtimeChannel extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const displayName = url.searchParams.get('displayName');
    if (!userId || !displayName) {
      return new Response('Missing user metadata', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const meta: ConnectionMeta = { userId, displayName, currentLobby: null };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(meta);

    // Broadcast join to all other clients
    this.broadcast(
      {
        type: 'system:join',
        userId,
        displayName,
        timestamp: Date.now()
      },
      server
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;

    let parsed: ClientRequest;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (!parsed.type) return;

    // Respond to snapshot requests with the current list of connected users
    if (parsed.type === 'presence:snapshot-request') {
      const users: PresenceSnapshotMessage['users'] = [];
      for (const existing of this.ctx.getWebSockets()) {
        if (existing === ws) continue;
        const existingMeta: ConnectionMeta | null = existing.deserializeAttachment();
        if (existingMeta) {
          users.push({
            userId: existingMeta.userId,
            displayName: existingMeta.displayName,
            currentLobby: existingMeta.currentLobby ?? null
          });
        }
      }
      ws.send(
        JSON.stringify({
          type: 'presence:snapshot',
          users,
          timestamp: Date.now()
        } satisfies PresenceSnapshotMessage)
      );
      return;
    }

    // Lobby membership state lives on the connection's attachment and is
    // broadcast so other clients can derive per-game tile counts.
    if (parsed.type === 'lobby:enter') {
      const currentMeta: ConnectionMeta = ws.deserializeAttachment();
      const nextMeta: ConnectionMeta = { ...currentMeta, currentLobby: parsed.lobbyId };
      ws.serializeAttachment(nextMeta);
      this.broadcast({
        type: 'lobby:state',
        userId: currentMeta.userId,
        lobbyId: parsed.lobbyId,
        timestamp: Date.now()
      });
      return;
    }
    if (parsed.type === 'lobby:leave') {
      const currentMeta: ConnectionMeta = ws.deserializeAttachment();
      const nextMeta: ConnectionMeta = { ...currentMeta, currentLobby: null };
      ws.serializeAttachment(nextMeta);
      this.broadcast({
        type: 'lobby:state',
        userId: currentMeta.userId,
        lobbyId: null,
        timestamp: Date.now()
      });
      return;
    }

    const meta: ConnectionMeta = ws.deserializeAttachment();
    const outbound = { ...parsed, senderId: meta.userId, timestamp: Date.now() };
    this.broadcast(outbound, ws);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const meta: ConnectionMeta | null = ws.deserializeAttachment();
    if (meta) {
      this.broadcast({
        type: 'system:leave',
        userId: meta.userId,
        displayName: meta.displayName,
        timestamp: Date.now()
      });
    }
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const meta: ConnectionMeta | null = ws.deserializeAttachment();
    if (meta) {
      this.broadcast({
        type: 'system:leave',
        userId: meta.userId,
        displayName: meta.displayName,
        timestamp: Date.now()
      });
    }
    ws.close(1011, 'WebSocket error');
  }

  private broadcast(message: object, exclude?: WebSocket): void {
    const payload = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== exclude) {
        try {
          ws.send(payload);
        } catch {
          // Dead connection — webSocketClose will fire
        }
      }
    }
  }
}
