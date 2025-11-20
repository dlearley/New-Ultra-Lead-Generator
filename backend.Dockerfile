# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY backend/dist ./dist
COPY backend/package*.json ./

USER nodejs

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]