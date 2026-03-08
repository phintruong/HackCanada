/**
 * Standalone WebSocket server for ClearPath vitals (Swift app → laptop).
 * Run in dev alongside "next dev" so HMR works when opening the app by IP.
 * Listens on WS_PORT (default 3001). Set NEXT_PUBLIC_WS_PORT=3001 in .env.local.
 */
import http from 'http';
import { attachWsServer } from '../lib/clearpath/wsServer';

const port = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 3001;

const server = http.createServer((_req, res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('ClearPath vitals WebSocket server. Connect to /ws');
});

attachWsServer(server);

server.listen(port, () => {
  console.log('[ws] Vitals WebSocket server on port', port);
});
