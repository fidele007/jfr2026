// Run on the target host after /healthz reports ready. No model is loaded here.
const base = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/$/, '');
const health = await fetch(`${base}/healthz`);
if (!health.ok) throw new Error('Search service is not ready');
const { catalogueHash } = await health.json();
const queries = ['kidney stones', 'breast imaging', 'stroke', 'MRI multiple sclerosis', 'renal colic', 'adrenal incidentaloma', 'blood clot in the lung', 'pancreatic cysts'];
const request = async query => {
  const start = performance.now();
  const response = await fetch(`${base}/search`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, catalogueHash })
  });
  if (!response.ok) throw new Error(`Search returned ${response.status}`);
  const data = await response.json();
  return { query, ms: Math.round(performance.now() - start), results: data.scores.length };
};
console.log('Sequential (first requests are uncached only after a service restart):');
for (const query of queries) console.log(await request(query));
console.log('Concurrent cached requests:', await Promise.all(queries.map(request)));
console.log('Concurrent new queries:', await Promise.all([
  'hepatic metastases', 'bowel obstruction', 'deep vein thrombosis Doppler', 'lymphoma imaging'
].map(request)));
