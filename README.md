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

Search automatically combines keyword matches with semantic matches for non-empty
queries. Keyword results appear first; the browser worker updates them after
embedding the query. Date/video filters and alphabetical sorting still apply.
If model loading fails, keyword search remains available.

The quantized multilingual E5-small retrieval model runs locally in a Web Worker
using Transformers.js. Its first use downloads approximately 118 MB of model
weights from Hugging Face, plus the tokenizer and WASM runtime. The browser caches
model files for subsequent searches. Queries are processed locally, without an
API key. This improves relevance; it does not reduce the model download size.

Titles and session descriptions have separate embeddings (75% title, 25%
description). E5 uses `query: ` and `passage: ` prefixes. A small word-match bonus
uses corpus word frequencies to distinguish close semantic candidates, with
accent/plural normalization. Similarity and relative-score cutoffs remove weak
matches. Exact keyword matches, including speakers, remain first. The model
revision is pinned in the generated index so index and query embeddings agree.
Semantic-only cards show « Très pertinent » for hybrid scores of at least 0.92,
and « Sujet proche » otherwise. This conservative display threshold is a
heuristic for the current model, not calibrated confidence. The numeric ranking
score remains available in a tooltip on hover or keyboard focus.
Rapid typing replaces queued queries, and the worker caches the last 20 query
vectors so changing filters does not require another inference.

After changing `static/json/event.json`, regenerate and verify the committed index:

```sh
bun run search:index
node scripts/test-search.mjs
bun test tests/semantic.test.ts
```

Index generation uses Node.js and caches its model under `.cache/transformers/`.
The same quantized model and mean pooling are used for indexing and queries.
To inspect individual query rankings:

```sh
node scripts/evaluate-search.mjs
```

On the 24 hand-authored French development queries in `tests/search-queries.json`,
compared with the MiniLM index in commit `92a74ba`, semantic-stage top-one hits
improved from 10/24 to 19/24, and top-three hits from
14/24 to 21/24. A separate 12-query set in `tests/search-holdout.json`, evaluated
after tuning, had 12/12 top-one hits. These are title-pattern relevance checks,
not independent clinical judgments or a guarantee for arbitrary queries. The
regression test also checks index integrity and rejects three unrelated queries.

Known weak queries remain: paraphrases about radiation exposure, leg veins, and
testicular pain. Further tuning should use new examples and user feedback rather
than loosening the relevance checks for those cases.
