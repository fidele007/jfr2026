import { createServer } from 'node:http';
import { SearchBusyError } from './engine.mjs';

export function createSearchServer({ getEngine, allowedOrigins, trustProxy = false, requestsPerMinute = 120 }) {
  const clients = new Map();
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (code, body) => { if (!res.destroyed) res.writeHead(code).end(JSON.stringify(body)); };
    const path = new URL(req.url || '/', 'http://localhost').pathname;
    if (path === '/healthz' && req.method === 'GET') {
      const engine = getEngine();
      reply(engine ? 200 : 503, { ready: Boolean(engine), catalogueHash: engine?.index.sourceHash });
      return;
    }
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) { reply(403, { error: 'origin_not_allowed' }); return; }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    if (path !== '/search') { reply(404, { error: 'not_found' }); return; }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
      res.writeHead(204).end(); return;
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); reply(405, { error: 'method_not_allowed' }); return; }
    const engine = getEngine();
    if (!engine) { res.setHeader('Retry-After', '5'); reply(503, { error: 'warming_up' }); return; }
    const forwarded = req.headers['x-forwarded-for'];
    const ip = trustProxy && typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
    const now = Date.now();
    let client = clients.get(ip);
    if (!client || client.until <= now) {
      if (clients.size >= 10000) {
        for (const [key, value] of clients) if (value.until <= now) clients.delete(key);
        if (clients.size >= 10000) { reply(503, { error: 'busy' }); return; }
      }
      client = { count: 0, until: now + 60000 }; clients.set(ip, client);
    }
    if (++client.count > requestsPerMinute) {
      res.setHeader('Retry-After', String(Math.ceil((client.until - now) / 1000)));
      reply(429, { error: 'rate_limited' }); return;
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
      reply(415, { error: 'json_required' }); return;
    }
    try {
      let size = 0; const chunks = [];
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > 4096) {
          res.setHeader('Connection', 'close'); req.resume(); reply(413, { error: 'body_too_large' }); return;
        }
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { reply(400, { error: 'invalid_json' }); return; }
      if (!input || typeof input.query !== 'string' || !input.query.trim() || input.query.length > 256) {
        reply(400, { error: 'invalid_query' }); return;
      }
      if (input.catalogueHash !== engine.index.sourceHash) { reply(409, { error: 'catalogue_mismatch' }); return; }
      const scores = await engine.search(input.query);
      reply(200, { catalogueHash: engine.index.sourceHash, scores });
    } catch (error) {
      if (error instanceof SearchBusyError) { res.setHeader('Retry-After', '1'); reply(503, { error: 'busy' }); }
      else reply(500, { error: 'search_failed' });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 30;
  return server;
}
