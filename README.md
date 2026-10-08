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
