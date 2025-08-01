FROM node:22-slim

# Install OpenSSL, netcat and other required system dependencies
RUN apt-get update -y && apt-get install -y openssl libssl-dev netcat-traditional && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (including dev dependencies for build)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=./src/infrastructure/database/prisma/schema.prisma

# Build TypeScript
RUN npm run build

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]