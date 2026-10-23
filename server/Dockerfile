FROM node:22-bookworm-slim
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/*.mjs ./server/
COPY scripts/search-extractor.mjs ./scripts/
COPY scripts/benchmark-search-api.mjs ./scripts/
COPY src/lib/search-scoring.mjs ./src/lib/
COPY data/search/index.json ./data/search/index.json
RUN mkdir -p /app/.cache/transformers && chown -R node:node /app/.cache
USER node
ENV HOST=0.0.0.0 PORT=3000 SEARCH_MODEL_CACHE=/app/.cache/transformers
EXPOSE 3000
CMD ["node", "server/start.mjs"]
