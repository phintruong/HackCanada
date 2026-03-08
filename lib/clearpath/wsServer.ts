import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';

/** Messages from clients (laptop or phone) */
export interface LaptopMessage {
  type: 'laptop';
  sessionId: string;
}

export interface VitalsMessage {
  type: 'vitals';
  sessionId: string;
  hr: number;
  rr: number;
  stress: number;
}

export type ClientMessage = LaptopMessage | VitalsMessage;

/** Message forwarded to the laptop (no sessionId) */
export interface ForwardedVitals {
  type: 'vitals';
  hr: number;
  rr: number;
  stress: number;
}

const SESSION_TTL_MS = 120_000; // 120 seconds
const HR_MIN = 30;
const HR_MAX = 220;
const RR_MIN = 5;
const RR_MAX = 60;
const STRESS_MIN = 0;
const STRESS_MAX = 1;

/** Session state: CREATED when laptop registers, ACTIVE while ws open, CLOSED on disconnect / vitals forwarded / TTL */
export interface SessionEntry {
  ws: WebSocket;
  timeoutId: ReturnType<typeof setTimeout>;
  receivedVitals: boolean;
}

const sessions = new Map<string, SessionEntry>();

function clearSession(sessionId: string): void {
  const entry = sessions.get(sessionId);
  if (entry) {
    clearTimeout(entry.timeoutId);
    sessions.delete(sessionId);
    console.log('[ws] session closed:', sessionId);
  }
}

function isValidNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && !Number.isNaN(n);
}

function isLaptopMessage(data: unknown): data is LaptopMessage {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return false;
  const o = data as Record<string, unknown>;
  return o.type === 'laptop' && typeof o.sessionId === 'string' && o.sessionId.trim() !== '';
}

function isVitalsMessage(data: unknown): data is VitalsMessage {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return false;
  const o = data as Record<string, unknown>;
  if (o.type !== 'vitals') return false;
  if (typeof o.sessionId !== 'string' || o.sessionId.trim() === '') return false;
  if (!isValidNumber(o.hr) || o.hr < HR_MIN || o.hr > HR_MAX) return false;
  if (!isValidNumber(o.rr) || o.rr < RR_MIN || o.rr > RR_MAX) return false;
  if (!isValidNumber(o.stress) || o.stress < STRESS_MIN || o.stress > STRESS_MAX) return false;
  return true;
}

function handleMessage(ws: WebSocket, raw: string | Buffer): void {
  let data: unknown;
  try {
    data = JSON.parse(raw.toString());
  } catch {
    return;
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) return;
  const o = data as Record<string, unknown>;
  const type = o.type;

  if (type === 'laptop') {
    if (!isLaptopMessage(data)) return;
    const { sessionId } = data;

    clearSession(sessionId);
    const timeoutId = setTimeout(() => {
      sessions.delete(sessionId);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      console.log('[ws] session closed:', sessionId);
    }, SESSION_TTL_MS);

    sessions.set(sessionId, { ws, timeoutId, receivedVitals: false });
    console.log('[ws] session created, laptop connected:', sessionId);

    ws.on('close', () => clearSession(sessionId));
    ws.on('error', () => clearSession(sessionId));
    return;
  }

  if (type === 'vitals') {
    if (!isVitalsMessage(data)) return;

    const { sessionId, hr, rr, stress } = data;
    const entry = sessions.get(sessionId);
    if (!entry) return;

    if (entry.receivedVitals) return;
    entry.receivedVitals = true;

    console.log('[ws] vitals received:', sessionId);
    const payload: ForwardedVitals = { type: 'vitals', hr, rr, stress };

    try {
      if (entry.ws.readyState === WebSocket.OPEN) {
        entry.ws.send(JSON.stringify(payload));
        console.log('[ws] vitals forwarded:', sessionId);
      }
    } catch {
      /* ignore */
    }
    clearSession(sessionId);
    return;
  }

  // ignore unknown message types
}

export function attachWsServer(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = req.url ?? '';
    const pathname = url.split('?')[0];
    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    ws.on('message', (raw: string | Buffer) => {
      try {
        handleMessage(ws, raw);
      } catch {
        /* never crash */
      }
    });
  });
}
