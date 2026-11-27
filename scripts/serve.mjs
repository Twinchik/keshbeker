import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const routes = /^(?:index\.html|sw\.js|manifest\.webmanifest|js\/[\w-]+\.js|css\/[\w-]+\.css|icons\/[\w-]+\.png|ocr\/[\w-]+\.traineddata)$/;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};
const port = Number(process.env.KESHBEKER_PORT ?? '4173');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Укажите допустимый KESHBEKER_PORT.');

createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!routes.test(file)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile(path.join(root, file));
    response.writeHead(200, {
      'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
    }).end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
