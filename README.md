# Static JFR 2026

This project aims to rehost media content for the JFR 2026 conference with nice-to-have features like instant full-text search, watch history, etc.

## Creating a project

```sh
npx sv create jfr2026
```

## Dependencies

### Upgrade dependencies

```sh
bun update
```

## Developing

```sh
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `bun run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Generating static website

```sh
bun run deploy
```

This builds locally and publishes to the `gh-pages` branch. File removals are
batched to stay within Windows' command-line limit. To serve this branch, select
**Settings → Pages → Deploy from a branch**, then `gh-pages` and `/ (root)`.

## Deploying manually with GitHub Actions

The **Deploy to GitHub Pages** workflow runs only when launched manually; pushes
do not trigger it. It builds on GitHub and deploys the `build/` artifact directly.

1. Push the workflow to the repository's default branch.
2. Select **Settings → Pages → Source → GitHub Actions**.
3. Open **Actions → Deploy to GitHub Pages → Run workflow**, select the branch to
   deploy, and click **Run workflow**.

The workflow uses the built-in `GITHUB_TOKEN`; no additional secret is needed.
The local `bun run deploy` command remains available. While the Pages source is
set to GitHub Actions, local pushes to `gh-pages` do not publish the live site;
switch the source back to **Deploy from a branch** to use local publishing.

## Semantic search

Keyword search runs locally and appears immediately. When `VITE_SEARCH_API_URL`
is configured at build time, the browser sends non-empty queries to a separate
search API and merges its ID/score results. Date/video filters and alphabetical
sorting still apply. Missing configuration, API failures, catalogue mismatches
and eight-second timeouts leave keyword search available.

Visitors download no model, inference runtime or search index. The optional
CPU service runs EmbeddingGemma 300M q8 using Transformers.js in Node.js. Its first
start downloads approximately 309 MB of weights plus tokenizer files; a persistent
Docker volume keeps those files across restarts. Search queries are sent to this
service, whose application does not log their text. Deployment instructions and
an optional Caddy example for the home lab are in [server/README.md](server/README.md).

Titles and session descriptions have separate embeddings (75% title, 25%
description). Queries use `task: search result | query: `; documents use
`title: none | text: `. The ONNX graph returns the trained `sentence_embedding`,
including pooling and dense projection. Pooling raw hidden states would skip
that projection and produce incompatible embeddings. A small word-match bonus
uses corpus word frequencies to distinguish close semantic candidates, with
accent/plural normalization. Similarity and relative-score cutoffs remove weak
matches. Model embeddings of broad medical and unrelated topics also allow
abstention when an unrelated topic clearly wins (margin 0.05), rejecting cooking,
travel and repair queries without raising the cutoff above short medical queries.
These topic anchors are not query translations or a medical synonym dictionary.
Exact keyword matches, including speakers, remain first. The model
revision is pinned in the generated index so index and query embeddings agree.
Semantic-only cards show « Très pertinent » for hybrid scores of at least 0.55,
and « Sujet proche » otherwise. This conservative display threshold is a
heuristic for the current model, not calibrated confidence. The numeric ranking
score remains available in a tooltip on hover or keyboard focus.
Rapid typing aborts superseded browser requests; stale responses are ignored.
The API serializes inference, bounds pending work, shares duplicate requests,
and caches 256 query results. Catalogue SHA-256 hashes prevent mixing results
from an outdated server index with a newer programme in the browser.

After changing `static/json/event.json`, regenerate and verify the committed index:

```sh
bun run search:index
node scripts/test-search.mjs
bun test tests/semantic.test.ts
```

Index generation uses Node.js and caches its model under `.cache/transformers/`.
Index version 3 pins the model revision, q8 precision, prompts and sentence
embedding output, and includes domain anchor vectors. Indexing and server
inference use the same representation. `data/search/index.json` is private to
the service build and is not copied into the static website.
To inspect individual query rankings:

```sh
node scripts/evaluate-search.mjs
```

To compare embedding models independently of lexical bonuses and acceptance
thresholds, generate candidate indices in `.cache/` and run:

```sh
node scripts/compare-search-models.mjs data/search/index.json .cache/candidate-index.json
```

This writes per-query ranks, top results, and CPU inference timings to
`.cache/search-model-benchmark.json`. Candidate index generation accepts model,
revision, and output path as positional arguments to `build-search-index.mjs`.

The raw embedding comparison in `tests/search-embedding-benchmark.json` uses the
same 75/25 blend and no lexical bonus, translation rules, or acceptance cutoff:

| Relevant result in top three | MPNet q8 | EmbeddingGemma q8 |
| --- | ---: | ---: |
| French development queries | 20/24 | 24/24 |
| French secondary queries | 11/12 | 12/12 |
| English-to-French queries | 20/22 | 22/22 |
| Medical terminology selection set | 17/30 | 29/30 |

Other candidates include E5-base/large, BGE-M3, Qwen3 Embedding 0.6B,
BioLORD-2023-M (locally exported with float export parity), and EmbeddingGemma q4.
Gemma q8 has the best overall results on these selection sets. The final hybrid
search also has 24/24, 12/12, 22/22 and 29/30 top-three hits, and rejects 12
unrelated queries. `kidney stones`, `renal calculi`, `renal colic`, `colique
néphrétique` and `stroke` retrieve relevant French sessions without translation.

A fresh 12-query validation set, written after model selection, has 10/12
top-three hits. Known weaknesses are `liver secondaries` and thyroid needle
sampling phrases; broad `breast` ranks pectoral anatomy above breast sessions.
These are hand-authored title-pattern checks, not independent clinical judgments
or guarantees for arbitrary queries. Models were selected using the first four
sets, so they are no longer unseen holdouts. The real HTTP API is also checked
against all 100 relevance queries, retaining those metrics. Browser checks cover
the API integration, keyword-only mode, server failure, rapid replacement, and
absence of model/index downloads. No candidate weights or export dependencies
are committed.

### Website configuration and checks

Copy `.env.example` to `.env` and set `VITE_SEARCH_API_URL` to the public HTTPS
endpoint, including `/search`, then rebuild. For the Pages workflow, use the
repository variable of the same name. Leave it empty until the API is deployed.
The URL is public and does not contain a secret.

The browser has no inference imports, worker, or model fallback. The service
uses the public Transformers.js API, pinned to 4.3.1; no internal package imports
or browser-specific ONNX stubs are needed.

```sh
bun run build
node scripts/test-client-build.mjs
node --test tests/search-service.test.mjs
```

The build check rejects model, WASM or search-index artifacts in the published
website. Service tests cover request validation, CORS, readiness, queue bounds,
deduplication, cache reuse, rate limiting, and catalogue version mismatch.
