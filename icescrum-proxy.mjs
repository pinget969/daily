/**
 * Proxy local para evitar CORS al consumir la API de iceScrum desde daily.html.
 *
 * Uso:
 *   node icescrum-proxy.mjs
 *   Abrir http://localhost:3456/daily.html
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 3456;
const ICE_ORIGIN = 'https://cloud.icescrum.com';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json'
};

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, x-icescrum-token, Content-Type');
}

const server = http.createServer(async (req, res) => {
    setCors(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname.startsWith('/ws/')) {
        const token = req.headers['x-icescrum-token'];
        try {
            const upstream = await fetch(`${ICE_ORIGIN}${url.pathname}${url.search}`, {
                headers: {
                    Accept: 'application/json',
                    'x-icescrum-token': token || ''
                }
            });
            const body = await upstream.text();
            res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
            res.end(body);
        } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    let filePath = url.pathname === '/' ? '/daily.html' : url.pathname;
    filePath = path.join(__dirname, path.normalize(filePath).replace(/^(\.\.[/\\])+/, ''));

    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`iceScrum proxy: http://localhost:${PORT}/daily.html`);
});
