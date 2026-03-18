#!/bin/bash
# Setup mock Prisma client for development
mkdir -p node_modules/@prisma/client
cat > node_modules/@prisma/client/index.d.ts << 'INNER'
export class PrismaClient {
  constructor() {}
  \$connect() { return Promise.resolve(); }
  \$disconnect() { return Promise.resolve(); }
  user = { findUnique: async () => null, findMany: async () => [], create: async (d: any) => d.data, count: async () => 0 };
  refreshToken = { findUnique: async () => null, create: async (d: any) => d.data, deleteMany: async () => ({ count: 0 }) };
  businessLead = { findMany: async () => [], count: async () => 0 };
}
INNER
echo '{"name": "@prisma/client"}' > node_modules/@prisma/client/package.json
echo "Mock Prisma client ready"
