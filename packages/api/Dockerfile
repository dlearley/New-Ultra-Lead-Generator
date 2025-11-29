FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/api/tsconfig.json packages/api/tsconfig.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/api/src packages/api/src

# Build
WORKDIR /app/packages/api
RUN pnpm build

# Expose port
EXPOSE 3001

# Start
CMD ["node", "dist/main.js"]
