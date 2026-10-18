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
