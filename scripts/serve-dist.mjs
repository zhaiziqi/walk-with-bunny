#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), '../dist');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.avif': 'image/avif', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
};

export function parseArguments(args) {
  const options = { root: defaultRoot, port: 4173, help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (arg !== '--root' && arg !== '--port') throw new Error(`Unknown option: ${arg}`);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--root') options.root = resolve(value);
    else {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
        throw new Error('The port must be an integer from 1 to 65535.');
      }
      options.port = Number(value);
    }
  }
  return options;
}

function inside(root, path) {
  const part = relative(root, path);
  return part !== '..' && !part.startsWith(`..${sep}`) && !isAbsolute(part);
}

/** Serve this directory only. There is no SPA fallback, directory listing or proxy. */
export function createStaticHandler(root, port) {
  return async (request, response) => {
    const send = (status, message, extra = {}) => {
      response.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra,
      });
      response.end(request.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(request.headers.host)) return send(403, 'Local preview only');
    try {
      const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
      if (pathname.includes('\0') || pathname.includes('\\')) return send(400, 'Invalid path');
      // Decode before joining so encoded separators cannot escape the root.
      const candidate = resolve(root, `.${pathname}`);
      if (!inside(root, candidate)) return send(403, 'Path outside preview');
      let file = await realpath(candidate);
      if (!inside(root, file)) return send(403, 'Path outside preview');
      let info = await stat(file);
      if (info.isDirectory()) {
        file = await realpath(resolve(file, 'index.html'));
        if (!inside(root, file)) return send(403, 'Path outside preview');
        info = await stat(file);
      }
      if (!info.isFile()) return send(404, 'Not found');
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': info.size, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (request.method === 'HEAD') { response.end(); return; }
      const stream = createReadStream(file);
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error instanceof URIError || error.code === 'ERR_INVALID_URL') send(400, 'Invalid path');
      else if (['ENOENT', 'ENOTDIR'].includes(error.code)) send(404, 'Not found');
      else if (['EACCES', 'EPERM'].includes(error.code)) send(403, 'File unavailable');
      else send(500, 'Could not read preview file');
    }
  };
}

export async function startServer(options) {
  const root = await realpath(options.root);
  const entry = await realpath(resolve(root, 'index.html'));
  if (!inside(root, entry) || !(await stat(entry)).isFile()) throw new Error('The preview root needs its built index.html.');
  const server = createServer(createStaticHandler(root, options.port));
  await new Promise((yes, no) => {
    server.once('error', no);
    server.listen(options.port, '127.0.0.1', () => { server.removeListener('error', no); yes(); });
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log('Usage: node scripts/serve-dist.mjs [--port 4173] [--root /absolute/path/to/dist]\nServes ../dist relative to this script on 127.0.0.1. No dependencies required.');
    } else {
      await startServer(options);
      console.log(`Local preview: http://127.0.0.1:${options.port}/\nFiles: ${options.root}\nKeep this terminal open. Press Ctrl+C to stop.`);
    }
  } catch (error) {
    const message = error.code === 'EADDRINUSE'
      ? 'That port is already in use. Stop its existing server or choose an explicit --port; no alternate port was opened.'
      : error.code === 'ENOENT' ? 'Built files were not found. Run the project build first, or pass --root with the built directory.' : error.message;
    console.error(`Preview could not start: ${message}`);
    process.exitCode = 1;
  }
}
