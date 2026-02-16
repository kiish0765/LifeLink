import { WebSocketServer } from 'ws';
import type WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { verifyToken } from '../modules/auth/auth.service.js';
import type { JwtPayload } from '../shared/types.js';
import { getAuthUser } from '../modules/auth/auth.service.js';
import { setPresence } from '../db/redis.js';

export interface WsClient {
  ws: WebSocket;
  userId: string;
  role: string;
  donorId?: string;
  lastPing: number;
}

let wss: WebSocketServer | null = null;
const clients = new Map<string, WsClient>();

export function getWsServer(): WsServerImpl | null {
  return wss ? new WsServerImpl() : null;
}

class WsServerImpl {
  broadcastToDonors(donorUserIds: Set<string>, payload: object): void {
    const msg = JSON.stringify(payload);
    for (const userId of donorUserIds) {
      const client = clients.get(userId);
      if (client?.ws.readyState === 1) {
        client.ws.send(msg);
      }
    }
  }

  sendToUser(userId: string, payload: object): void {
    const client = clients.get(userId);
    if (client?.ws.readyState === 1) {
      client.ws.send(JSON.stringify(payload));
    }
  }
}

function getTokenFromReq(req: IncomingMessage): string | null {
  const url = parse(req.url ?? '', true);
  const token = url.query?.token as string | undefined;
  if (token) return token;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function initWsServer(server: import('http').Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const token = getTokenFromReq(req);
    if (!token) {
      ws.close(4001, 'Unauthorized');
      return;
    }
    let payload: JwtPayload;
    try {
      payload = verifyToken(token) as JwtPayload;
      if (payload.type !== 'access') throw new Error('Invalid token type');
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }
    const authUser = await getAuthUser(payload.sub);
    if (!authUser) {
      ws.close(4002, 'User not found');
      return;
    }
    const client: WsClient = {
      ws,
      userId: authUser.id,
      role: authUser.role,
      donorId: authUser.donorId,
      lastPing: Date.now(),
    };
    clients.set(authUser.id, client);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type: string; lat?: number; lon?: number };
        if (msg.type === 'ping' || msg.type === 'location') {
          client.lastPing = Date.now();
          if (msg.lat != null && msg.lon != null) {
            setPresence(authUser.id, msg.lat, msg.lon);
          }
          ws.send(JSON.stringify({ type: 'pong', at: Date.now() }));
        }
      } catch {
        // ignore
      }
    });

    ws.on('close', () => {
      clients.delete(authUser.id);
    });

    ws.on('error', () => {
      clients.delete(authUser.id);
    });
  });
}

export function getOnlineDonorUserIds(): Set<string> {
  const set = new Set<string>();
  for (const [userId, client] of clients) {
    if (client.role === 'donor') set.add(userId);
  }
  return set;
}
