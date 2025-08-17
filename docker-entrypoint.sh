#!/bin/sh

# Wait for postgres to be ready
echo "Waiting for postgres..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy --schema=./src/infrastructure/database/prisma/schema.prisma

# Note: Database seeding removed from automatic startup
# Use manual script: ./scripts/seed-database.sh if needed

# Start the application
echo "Starting application..."
npm start