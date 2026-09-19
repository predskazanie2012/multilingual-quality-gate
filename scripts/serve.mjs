import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Serve only the explicit demo assets, never arbitrary workspace files.
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ...['app.mjs', 'evaluation.mjs', 'mock-evaluators.mjs', 'fixture.mjs'].map(name => ['/' + name, [name, 'text/javascript; charset=utf-8']])
]);
export function createDemoServer() {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    const asset = assets.get(request.url?.split('?')[0]);
    if (!asset) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const bytes = await readFile(new URL('../demo/' + asset[0], import.meta.url));
      response.writeHead(200, { 'Content-Type': asset[1], 'Content-Length': bytes.length });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(500); response.end('Demo asset unavailable');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] || 3040);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Choose a local port from 1024 to 65535.');
  const host = 'localhost';
  const server = createDemoServer();
  server.on('error', () => { console.error('Could not start the local demo. Try another port.'); process.exitCode = 1; });
  server.listen(port, host, () => {
    console.log('Synthetic showcase running locally. No model connections.');
    console.log(['http:', '', host + ':' + port].join('/'));
  });
}
