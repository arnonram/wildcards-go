# Wild Cards Go, self-hosted: one container, data in the /data volume.
# See docs/self-hosting.md.

FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
# Builds the app and its service worker. No env is needed: everything is
# configured when the container runs.
RUN NEXT_OUTPUT_STANDALONE=1 bun run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/wcg.db
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
