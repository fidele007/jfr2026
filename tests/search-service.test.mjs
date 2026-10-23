import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { SearchEngine, SearchBusyError } from '../server/engine.mjs';
import { createSearchServer } from '../server/http.mjs';

const index = { sourceHash: 'catalogue', queryPrefix: '', ids: ['a'], documents: [{ title: 'sein', body: '' }], vectors: [[1,0]], titleVectors: [[1,0]] };

test('retains candidates before the client applies date and video filters', async () => {
  const ids = Array.from({length:60}, (_,i)=>String(i));
  const scoped = {...index,ids,documents:ids.map(()=>({title:'sein',body:''})),vectors:ids.map(()=>[1,0]),titleVectors:ids.map(()=>[1,0])};
  const engine = new SearchEngine(scoped,async()=>({data:[1,0]}));
  assert.equal((await engine.search('sein')).length,60);
});

test('deduplicates and serializes inference, bounds queue and recovers after errors', async () => {
  let calls = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const engine = new SearchEngine(index, async () => { calls++; await gate; return { data: [1,0] }; }, { maxPending: 1, cacheSize: 1 });
  const a = engine.search('sein');
  const duplicate = engine.search('sein');
  await assert.rejects(engine.search('autre'), SearchBusyError);
  release();
  assert.deepEqual(await a, await duplicate);
  await engine.search('sein');
  assert.equal(calls, 1);
  let attempts = 0;
  const retry = new SearchEngine(index, async () => { if (++attempts === 1) throw new Error('failed'); return {data:[1,0]}; });
  await assert.rejects(retry.search('sein'));
  assert.equal((await retry.search('sein'))[0][0], 'a');
});

test('validates CORS, readiness, catalogue, request limits and exposes only scores', async () => {
  let engine;
  const server = createSearchServer({ getEngine: () => engine, allowedOrigins: ['https://site.example'], requestsPerMinute: 20 });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (body, headers = {}) => fetch(base + '/search', { method: 'POST', headers: {'content-type':'application/json', origin:'https://site.example', ...headers}, body: typeof body === 'string' ? body : JSON.stringify(body) });
  try {
    assert.equal((await fetch(base+'/healthz')).status, 503);
    assert.equal((await send({query:'sein'})).status, 503);
    engine = new SearchEngine(index, async () => ({data:[1,0]}));
    assert.equal((await fetch(base+'/healthz')).status, 200);
    const preflight = await fetch(base+'/search', {method:'OPTIONS', headers:{origin:'https://site.example'}});
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('access-control-allow-origin'),'https://site.example');
    assert.equal((await send({query:'sein'}, {origin:'https://wrong.example'})).status,403);
    assert.equal((await send({query:'sein',catalogueHash:'old'})).status,409);
    assert.equal((await send('{')).status,400);
    assert.equal((await send({query:' '.repeat(300)})).status,400);
    assert.equal((await send('x'.repeat(5000))).status,413);
    assert.equal((await send('{}', {'content-type':'text/plain'})).status,415);
    const response = await send({query:'sein',catalogueHash:'catalogue'});
    assert.equal(response.status,200);
    assert.deepEqual(Object.keys(await response.json()).sort(), ['catalogueHash','scores']);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('limits direct clients without trusting forwarded addresses', async () => {
  const server=createSearchServer({getEngine:()=>new SearchEngine(index,async()=>({data:[1,0]})),allowedOrigins:[],requestsPerMinute:1});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}/search`;
  const send=ip=>fetch(url,{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':ip},body:JSON.stringify({query:'sein',catalogueHash:'catalogue'})});
  try{assert.equal((await send('1.1.1.1')).status,200);const response=await send('2.2.2.2');assert.equal(response.status,429);assert(response.headers.has('retry-after'));}
  finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
