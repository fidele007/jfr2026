# Home lab search service

The website remains static. Only this CPU service downloads and runs EmbeddingGemma.
It loads the pinned model once, warms it before readiness, and caches files in a
Docker volume. Queries return matching ID/score pairs, bounded by the catalogue
size (currently 612). The client applies date/video filters before limiting
semantic results to 50. Visitors download no
model, inference runtime, or search index. Search queries are sent to this server;
the application does not log their text.

## Run on Ubuntu

With Docker Engine and the Compose plugin installed, run from the repository's
`server/` folder. For first-time setup:

```sh
cd server
cp env.example .env
# Edit SEARCH_ALLOWED_ORIGINS to the exact website origin (no URL path).
docker compose up -d
docker compose logs -f search
curl http://127.0.0.1:3080/healthz
```

Compose reads `server/.env` automatically. Keep your existing `.env` when
updating. The `pull_policy: build` setting rebuilds the image on `up`, reusing
Docker's build cache and including the current committed search index. The build
context is the repository root; no ZIP or extracted deployment folder is needed.

The first start downloads approximately 309 MB of weights, plus tokenizer files.
`/healthz` returns 503 during loading and 200 when inference is ready. Restarts reuse
the volume; removing that volume requires another download. Initial limits are two
CPU cores, two inference threads and 4 GB RAM; these are starting settings, not
measurements from the ASUS. The service uses CPU inference and needs no NVIDIA setup.

Benchmark the actual host, including uncached, cached and concurrent queries:

```sh
docker compose exec search \
  node scripts/benchmark-search-api.mjs http://127.0.0.1:3000
docker stats --no-stream
```

## Public endpoint

The ASUS already runs Nginx on port 80. Reuse that installation with a separate
virtual host for `api.forcefidele.com`. The supplied port check showed no
listener on local port 443; check whether HTTPS terminates on another machine
or still needs configuring. First confirm DNS and how your router handles
incoming connections. A domain alone does not expose the service.

`nginx.conf.example` proxies only `/search` and `/healthz` to the localhost API.
After the local service works and routing is confirmed, on Ubuntu:

```sh
# Check this filename is unused before copying/enabling the separate site.
sudo cp -n nginx.conf.example /etc/nginx/sites-available/jfr-search
sudo ln -s /etc/nginx/sites-available/jfr-search /etc/nginx/sites-enabled/jfr-search
sudo nginx -t && sudo systemctl reload nginx
curl -H 'Host: api.forcefidele.com' http://127.0.0.1/healthz
```

Point the hostname's DNS at the public address that routes to this server, then
make HTTP reachable from outside your home network. If this Nginx instance will
terminate TLS, follow the [Certbot Nginx instructions](https://certbot.eff.org/instructions?ws=nginx&os=snap)
to obtain a certificate for `api.forcefidele.com` and configure HTTPS. Only
connect the public website after the HTTPS endpoint works. If TLS already
terminates upstream, integrate that existing route instead.

This example overwrites forwarded IP headers. With Nginx directly facing clients
and API port 3080 restricted to localhost, set `SEARCH_TRUST_PROXY=1` in
`server/.env`, then recreate the service. If a tunnel or another proxy is in front
of Nginx, configure trusted real-client IP handling before enabling it.

`Caddyfile.example` remains an alternative for a host without an existing proxy;
do not start Caddy on this machine's occupied port 80. If incoming connections
are unavailable, use a tunnel instead.

The API binds to localhost port 3080 through Compose. A proxy in another Docker
container should join a shared Docker network and route to `search:3000` instead;
adjust Compose for that network rather than exposing 3080 publicly.

CORS allows only `SEARCH_ALLOWED_ORIGINS`. There is no secret embedded in the
browser. CORS is not authentication: the public API also limits request bodies
to 4 KB, queries to 256 characters, inference to one active request plus seven
waiting requests, the result cache to 256 queries, and clients to 120 requests
per minute. Excess requests return 429/503 and the website keeps keyword results.
Duplicate concurrent queries share inference. Catalogue hash mismatches return
409 so an outdated API cannot silently supply ranks for a changed programme.

`SEARCH_TRUST_PROXY=0` ignores forwarded IP headers. Enable it only when a trusted
proxy overwrites `X-Forwarded-For` and direct API access is blocked. Otherwise
rate limits apply to the proxy's address; shared-IP traffic may need rate tuning.

## Connect the website

Once the HTTPS endpoint is reachable:

```dotenv
VITE_SEARCH_API_URL=https://api.forcefidele.com/search
```

For local builds, put this in the root `.env` and rebuild. For GitHub Pages Actions,
set the repository variable `VITE_SEARCH_API_URL`, then run the deployment workflow.
This is a public URL, not a secret. Leave it empty to disable semantic requests.
The browser shows keyword results immediately, cancels superseded requests,
ignores stale responses, and falls back after failures or an eight-second timeout.

## Update and verify

For routine deployment, pull the latest source from the repository root, then
start the service from `server/`:

```sh
git pull --ff-only
cd server
docker compose up -d
docker compose logs -f search
```

Wait for `Search ready` in the logs, then check `/healthz`. Keep the existing
`server/.env` and `model-cache` volume. If moving from an extracted bundle, copy
its `server/.env` into this checkout's `server/` folder before starting Compose.

After changing the programme or session detail files in `static/json/`, regenerate `data/search/index.json` with
`bun run search:index`, rebuild the API image and deploy the website from the same
catalogue revision. The private index is copied into the service image, never the
static site. Keep the `model-cache` volume when updating.

Run source verification from the repository root:

```sh
node --test tests/search-service.test.mjs
node scripts/test-search.mjs
bun run check
bun run build
node scripts/test-client-build.mjs
```

The Node API and browser integration can be tested locally. The Docker image must
also be built and benchmarked on the target server before public deployment.
