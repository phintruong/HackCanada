import http from 'http';
import next from 'next';
import { attachWsServer } from './lib/clearpath/wsServer';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));
  attachWsServer(server);
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
