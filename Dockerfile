FROM node:22-slim AS base
RUN npm install -g pnpm@12.3.4
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY server.mjs ./
EXPOSE 3000
CMD ["node", "server.mjs"]
