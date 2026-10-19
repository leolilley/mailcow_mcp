# syntax=docker/dockerfile:1

# Pinned to a major so a rebuild cannot silently jump LTS lines; 24 is the line
# this server has been exercised against. Alpine is safe here because every
# runtime dependency is pure JavaScript, so there is no musl/glibc exposure.
ARG NODE_VERSION=24-alpine

# ---------------------------------------------------------------------------
# Build stage: full dependency tree, TypeScript compile, then prune to prod.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build

WORKDIR /app

# Manifests first: editing src/ then leaves this layer cached instead of forcing
# a full reinstall on every build.
COPY package.json package-lock.json ./

# --ignore-scripts blocks arbitrary lifecycle scripts from the dependency tree at
# build time. Nothing here needs a native build step; revisit if a dependency
# with a compiled component is ever added.
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

# tsconfig.json sets rootDir "." and include ["src/**/*", "tests/**/*"], so tsc
# emits dist/<path relative to rootDir> -- that is, dist/src/index.js, which is
# why the start script points there and the package.json "main" field does not.
# tests/ is withheld by .dockerignore, so nothing test-shaped lands in dist/.
RUN npm run build

# Reinstall without devDependencies in place, so the runtime stage can take this
# node_modules directly and never needs npm or registry access of its own.
RUN npm ci --omit=dev --ignore-scripts

# ---------------------------------------------------------------------------
# Runtime stage: production deps plus compiled output, nothing else.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime

# dumb-init becomes PID 1 so SIGTERM reaches node, which installs its own
# SIGTERM/SIGINT handlers for graceful shutdown, and so any orphaned child is
# reaped instead of accumulating in the container PID namespace.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# This image only ever serves the HTTP transport: stdio mode is meaningless in a
# detached container with nothing attached to its stdin.
ENV MCP_TRANSPORT=http
ENV MCP_HTTP_PORT=3000

# The app defaults to 127.0.0.1, which inside a container is reachable only from
# the container itself, so a published port would never connect. Actual exposure
# is constrained by the loopback-bound port mapping in docker-compose.yml.
ENV MCP_HTTP_HOST=0.0.0.0

WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist/src ./dist/src

# Carried for version/provenance and so `npm start` still resolves; no install is
# ever run from it in this stage.
COPY --chown=node:node package.json ./

# uid/gid 1000 ships with the base image, so no extra passwd layer is needed and
# ownership stays predictable if a volume is ever attached.
USER node

EXPOSE 3000

# Liveness only, against the unauthenticated /healthz endpoint. Written against
# the node binary that is already present so neither curl nor wget has to be
# added to the runtime image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "const p=process.env.MCP_HTTP_PORT||3000;const r=require('http').get({host:'127.0.0.1',port:p,path:'/healthz',timeout:4000},s=>{s.resume();process.exit(s.statusCode===200?0:1)});r.on('timeout',()=>{r.destroy();process.exit(1)});r.on('error',()=>process.exit(1))"]

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
