#!/bin/bash

# Simple Local Backstage Setup
# This script sets up Backstage locally for development

set -e

echo "🏠 Starting Backstage Portal locally (Simple Setup)"
echo "=================================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn is not installed. Please install Yarn."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create local environment file
echo "📝 Creating local environment configuration..."

cat > .env.local << EOF
# Local Backstage Development Environment
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://backstage:backstage@localhost:5432/backstage

# GitHub OAuth (optional for local development)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Backstage Configuration
BACKEND_URL=http://localhost:7007
FRONTEND_URL=http://localhost:3000
EOF

echo "✅ Local environment file created"

# Start PostgreSQL with Docker
echo "🐘 Starting PostgreSQL with Docker..."

# Create a simple docker-compose for just PostgreSQL
cat > docker-compose.postgres.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: backstage-postgres
    environment:
      POSTGRES_DB: backstage
      POSTGRES_USER: backstage
      POSTGRES_PASSWORD: backstage
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U backstage -d backstage"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker compose -f docker-compose.postgres.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec backstage-postgres pg_isready -U backstage -d backstage; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready"

# Create a simple Backstage app using npx
echo "🚀 Creating Backstage app..."

# Create a temporary directory for the app
mkdir -p temp-backstage
cd temp-backstage

# Create a simple Backstage app
echo "📦 Creating Backstage app with npx..."
npx @backstage/create-app@latest backstage-app --skip-install

cd backstage-app

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Create app-config.local.yaml for local development
cat > app-config.local.yaml << 'EOF'
app:
  title: Shinobi Developer Portal
  baseUrl: http://localhost:3000

organization:
  name: Shinobi Platform

backend:
  baseUrl: http://localhost:7007
  listen:
    port: 7007
    host: 0.0.0.0
  csp:
    connect-src: ["'self'", 'http:', 'https:']
  cors:
    origin: http://localhost:3000
    methods: [GET, HEAD, PATCH, POST, PUT, DELETE]
    credentials: true

database:
  client: pg
  connection:
    host: localhost
    port: 5432
    user: backstage
    password: backstage
    database: backstage

auth:
  environment: development
  providers:
    github:
      development:
        clientId: ${GITHUB_CLIENT_ID}
        clientSecret: ${GITHUB_CLIENT_SECRET}

catalog:
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchName: backstage-integration
  rules:
    - allow: [Component, System, API, Resource, Domain]
  locations:
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/all.yaml

scaffolder:
  github:
    token: ${GITHUB_TOKEN}
    visibility: public
    defaultCommitMessage: 'chore: created by Backstage'

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
EOF

echo "✅ Backstage configuration created"

# Start Backstage
echo "🚀 Starting Backstage..."
echo ""
echo "The Backstage portal will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:7007"
echo ""
echo "Press Ctrl+C to stop the services"
echo ""

# Load environment variables
if [ -f "../../.env.local" ]; then
    source ../../.env.local
fi

# Start Backstage
yarn dev
