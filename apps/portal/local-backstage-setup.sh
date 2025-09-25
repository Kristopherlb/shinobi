#!/bin/bash

# Local Backstage Portal Setup
# This script sets up Backstage locally for development

set -e

echo "🏠 Setting up Backstage Portal locally"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "service-backstage-portal.yml" ]; then
    echo "❌ Error: Please run this script from the Shinobi root directory."
    exit 1
fi

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

# Create local Backstage app structure
echo "📁 Creating local Backstage app structure..."

mkdir -p packages/backstage-local/{app,backend}

# Create package.json for the local Backstage app
cat > packages/backstage-local/package.json << 'EOF'
{
  "name": "backstage-local",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"yarn workspace backend dev\" \"yarn workspace app dev\"",
    "build": "yarn workspace backend build && yarn workspace app build",
    "clean": "yarn workspaces run clean",
    "test": "yarn workspaces run test"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF

# Create backend package.json
cat > packages/backstage-local/packages/backend/package.json << 'EOF'
{
  "name": "backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "backstage-cli backend:dev",
    "build": "backstage-cli backend:build",
    "clean": "backstage-cli backend:clean",
    "test": "backstage-cli test"
  },
  "dependencies": {
    "@backstage/backend-common": "^0.19.0",
    "@backstage/backend-tasks": "^0.5.0",
    "@backstage/catalog-client": "^1.4.0",
    "@backstage/catalog-model": "^1.3.0",
    "@backstage/config": "^1.0.7",
    "@backstage/plugin-app-backend": "^0.3.45",
    "@backstage/plugin-auth-backend": "^0.18.0",
    "@backstage/plugin-catalog-backend": "^1.9.0",
    "@backstage/plugin-permission-backend": "^0.5.0",
    "@backstage/plugin-proxy-backend": "^0.2.38",
    "@backstage/plugin-scaffolder-backend": "^1.13.0",
    "@backstage/plugin-search-backend": "^1.3.0",
    "@backstage/plugin-search-backend-module-pg": "^0.5.0",
    "@backstage/plugin-search-backend-node": "^1.2.0",
    "@backstage/plugin-techdocs-backend": "^1.6.0",
    "app": "workspace:^",
    "better-sqlite3": "^8.7.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-promise-router": "^4.1.1",
    "helmet": "^7.0.0",
    "knex": "^2.4.2",
    "pg": "^8.11.3",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "@backstage/cli": "^0.22.0",
    "@types/cors": "^2.8.13",
    "@types/express": "^4.17.17",
    "@types/helmet": "^4.0.0",
    "@types/knex": "^0.16.1",
    "typescript": "^5.0.4"
  }
}
EOF

# Create app package.json
cat > packages/backstage-local/packages/app/package.json << 'EOF'
{
  "name": "app",
  "version": "1.0.0",
  "main": "src/index.tsx",
  "scripts": {
    "dev": "backstage-cli app:dev",
    "build": "backstage-cli app:build",
    "clean": "backstage-cli app:clean",
    "test": "backstage-cli test"
  },
  "dependencies": {
    "@backstage/app-defaults": "^1.3.0",
    "@backstage/core-app-api": "^1.8.0",
    "@backstage/core-components": "^0.13.0",
    "@backstage/core-plugin-api": "^1.5.0",
    "@backstage/integration-react": "^1.1.15",
    "@backstage/plugin-api-docs": "^0.9.0",
    "@backstage/plugin-catalog": "^1.10.0",
    "@backstage/plugin-catalog-common": "^1.0.13",
    "@backstage/plugin-catalog-graph": "^0.2.29",
    "@backstage/plugin-catalog-import": "^0.9.0",
    "@backstage/plugin-catalog-react": "^1.5.0",
    "@backstage/plugin-github-actions": "^0.6.0",
    "@backstage/plugin-org": "^0.6.0",
    "@backstage/plugin-permission-react": "^0.4.12",
    "@backstage/plugin-scaffolder": "^1.13.0",
    "@backstage/plugin-search": "^1.2.0",
    "@backstage/plugin-tech-radar": "^0.6.3",
    "@backstage/plugin-techdocs": "^1.6.0",
    "@backstage/plugin-user-settings": "^0.7.0",
    "@backstage/theme": "^0.4.0",
    "@backstage/version-bridge": "^0.1.2",
    "@material-ui/core": "^4.12.2",
    "@material-ui/icons": "^4.11.2",
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-router": "^6.8.1",
    "react-router-dom": "^6.8.1"
  },
  "devDependencies": {
    "@backstage/cli": "^0.22.0",
    "@backstage/test-utils": "^1.3.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^12.1.5",
    "@testing-library/user-event": "^14.4.3",
    "@types/jest": "^29.5.0",
    "@types/node": "^18.16.0",
    "@types/react": "^17.0.0",
    "@types/react-dom": "^17.0.0",
    "typescript": "^5.0.4"
  }
}
EOF

echo "✅ Backstage app structure created"

# Create app configuration
echo "⚙️  Creating Backstage configuration..."

cat > packages/backstage-local/packages/app/app-config.yaml << 'EOF'
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

proxy:
  '/test':
    target: 'https://example.com'
    changeOrigin: true

techdocs:
  builder: 'local'
  generator:
    runIn: 'local'
  publisher:
    type: 'local'

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

# Create backend configuration
cat > packages/backstage-local/packages/backend/app-config.yaml << 'EOF'
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
    host: ${POSTGRES_HOST:-localhost}
    port: ${POSTGRES_PORT:-5432}
    user: ${POSTGRES_USER:-backstage}
    password: ${POSTGRES_PASSWORD:-backstage}
    database: ${POSTGRES_DB:-backstage}

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

# Create Docker Compose for local development
echo "🐳 Creating Docker Compose for local development..."

cat > docker-compose.local.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL database for Backstage
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

echo "✅ Docker Compose configuration created"

# Create start script
echo "📝 Creating start script..."

cat > start-backstage-local.sh << 'EOF'
#!/bin/bash

echo "🏠 Starting Backstage Portal locally"
echo "===================================="

# Load environment variables
if [ -f ".env.local" ]; then
    source .env.local
fi

# Start PostgreSQL
echo "🐘 Starting PostgreSQL..."
docker-compose -f docker-compose.local.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec backstage-postgres pg_isready -U backstage -d backstage; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready"

# Install dependencies
echo "📦 Installing dependencies..."
cd packages/backstage-local
yarn install

# Start Backstage
echo "🚀 Starting Backstage..."
yarn dev
EOF

chmod +x start-backstage-local.sh

echo "✅ Start script created"

echo ""
echo "🎉 Local Backstage setup completed!"
echo ""
echo "To start the Backstage portal locally:"
echo "  ./start-backstage-local.sh"
echo ""
echo "The portal will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:7007"
echo ""
echo "To stop the services:"
echo "  docker-compose -f docker-compose.local.yml down"
echo ""
echo "Happy coding! 🚀"
