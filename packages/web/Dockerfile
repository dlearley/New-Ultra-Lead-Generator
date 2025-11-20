FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/web/package.json packages/web/
COPY packages/web/tsconfig.json packages/web/tsconfig.json
COPY packages/web/next.config.js packages/web/next.config.js
COPY packages/web/tailwind.config.js packages/web/tailwind.config.js
COPY packages/web/postcss.config.js packages/web/postcss.config.js

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/web/src packages/web/src
COPY packages/web/public packages/web/public

# Build
WORKDIR /app/packages/web
RUN pnpm build

# Expose port
EXPOSE 3000

# Start
CMD ["pnpm", "start"]
