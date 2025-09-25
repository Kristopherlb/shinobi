#!/bin/bash

# Backstage App Setup (No Docker)
# This script sets up Backstage app structure for local development

set -e

echo "🏠 Setting up Backstage Portal (App Only)"
echo "========================================="

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

echo "✅ Prerequisites check passed"

# Create local environment file
echo "📝 Creating local environment configuration..."

cat > .env.local << EOF
# Local Backstage Development Environment
NODE_ENV=development

# Database Configuration (using SQLite for simplicity)
DATABASE_URL=file:./dev.db

# GitHub OAuth (optional for local development)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Backstage Configuration
BACKEND_URL=http://localhost:7007
FRONTEND_URL=http://localhost:3000
EOF

echo "✅ Local environment file created"

# Create Backstage app directory
echo "📁 Creating Backstage app directory..."
mkdir -p backstage-app
cd backstage-app

# Create a simple Backstage app using npx
echo "🚀 Creating Backstage app with npx..."
echo "This may take a few minutes..."

# Use npx to create the app
npx @backstage/create-app@latest . --skip-install

echo "✅ Backstage app created"

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Create app-config.local.yaml for local development
echo "⚙️  Creating local configuration..."

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
  client: sqlite3
  connection:
    filename: './dev.db'

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

# Create a start script
echo "📝 Creating start script..."

cat > start-local.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Backstage Portal locally"
echo "===================================="

# Load environment variables
if [ -f "../.env.local" ]; then
    source ../.env.local
fi

echo "The Backstage portal will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:7007"
echo ""
echo "Press Ctrl+C to stop the services"
echo ""

# Start Backstage
yarn dev
EOF

chmod +x start-local.sh

echo "✅ Start script created"

echo ""
echo "🎉 Backstage setup completed!"
echo ""
echo "To start the Backstage portal:"
echo "  cd backstage-app"
echo "  ./start-local.sh"
echo ""
echo "Or run directly:"
echo "  cd backstage-app && yarn dev"
echo ""
echo "The portal will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:7007"
echo ""
echo "Happy coding! 🚀"
