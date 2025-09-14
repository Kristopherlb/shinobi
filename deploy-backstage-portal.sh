#!/bin/bash

# Deploy Backstage Portal using Shinobi Platform
# This script deploys the Backstage portal using the Shinobi platform components

set -e

echo "🚀 Deploying Backstage Portal with Shinobi Platform Components"
echo "=============================================================="

# Check if we're in the right directory
if [ ! -f "service-backstage-portal.yml" ]; then
    echo "❌ Error: service-backstage-portal.yml not found. Please run this script from the Shinobi root directory."
    exit 1
fi

# Check if required tools are installed
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

# Set up environment variables
echo "🔧 Setting up environment variables..."

# Check if .env file exists, if not create a template
if [ ! -f ".env" ]; then
    echo "📝 Creating .env template file..."
    cat > .env << EOF
# Backstage Portal Environment Variables
# Copy this file to .env.local and fill in your values

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Database Configuration
RDS_MASTER_PASSWORD=your_secure_password_here

# AWS Configuration (if not using default profile)
# AWS_PROFILE=your_aws_profile
# AWS_REGION=us-east-1
# AWS_ACCOUNT_ID=123456789012
EOF
    echo "⚠️  Please edit .env file with your actual values before continuing"
    echo "   You can copy .env to .env.local and modify it there"
    exit 1
fi

# Load environment variables
if [ -f ".env.local" ]; then
    echo "📁 Loading environment variables from .env.local"
    source .env.local
elif [ -f ".env" ]; then
    echo "📁 Loading environment variables from .env"
    source .env
fi

# Validate required environment variables
echo "🔍 Validating environment variables..."

required_vars=("GITHUB_CLIENT_ID" "GITHUB_CLIENT_SECRET" "RDS_MASTER_PASSWORD")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "your_${var,,}_here" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing or invalid environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please update your .env or .env.local file with the correct values."
    exit 1
fi

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Build the platform
echo "🔨 Building Shinobi platform..."
yarn build

# Deploy the Backstage portal service
echo "🚀 Deploying Backstage portal service..."

# Check if we have the Shinobi CLI available
if command -v shinobi &> /dev/null; then
    echo "Using Shinobi CLI to deploy service..."
    shinobi deploy service-backstage-portal.yml
else
    echo "⚠️  Shinobi CLI not found. Using CDK directly..."
    
    # Create a CDK app for the Backstage portal
    cat > backstage-portal-app.ts << 'EOF'
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackstagePortalStack } from './backstage-portal-stack';

const app = new cdk.App();
new BackstagePortalStack(app, 'BackstagePortalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
EOF

    # Create the CDK stack
    cat > backstage-portal-stack.ts << 'EOF'
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackstagePortalComponent } from './packages/components/backstage-portal/src/backstage-portal.component';

export class BackstagePortalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const context = {
      serviceName: 'backstage-portal',
      account: this.account,
      region: this.region,
      environment: 'dev',
      complianceFramework: 'commercial'
    };

    const spec = {
      portal: {
        name: 'Shinobi Developer Portal',
        organization: 'Shinobi Platform',
        description: 'Developer portal for Shinobi platform components and services',
        baseUrl: 'https://backstage.shinobi.local'
      },
      database: {
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        backupRetentionDays: 7,
        multiAz: false,
        deletionProtection: true
      },
      backend: {
        desiredCount: 2,
        cpu: 512,
        memory: 1024,
        healthCheckPath: '/health',
        healthCheckInterval: 30
      },
      frontend: {
        desiredCount: 2,
        cpu: 256,
        memory: 512,
        healthCheckPath: '/',
        healthCheckInterval: 30
      },
      auth: {
        provider: 'github',
        github: {
          clientId: process.env.GITHUB_CLIENT_ID || '',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
          organization: 'shinobi-platform'
        }
      },
      catalog: {
        providers: [{
          type: 'github',
          id: 'shinobi-platform',
          org: 'shinobi-platform',
          catalogPath: '/catalog-info.yaml'
        }]
      }
    };

    new BackstagePortalComponent(this, 'BackstagePortal', context, spec);
  }
}
EOF

    # Deploy with CDK
    echo "Deploying with CDK..."
    npx cdk deploy BackstagePortalStack --require-approval never
fi

echo ""
echo "🎉 Backstage Portal deployment completed!"
echo ""
echo "Next steps:"
echo "1. Wait for the ECS services to be healthy"
echo "2. Get the load balancer URL from the AWS console"
echo "3. Update your DNS to point to the load balancer"
echo "4. Access your Backstage portal at the configured URL"
echo ""
echo "To check the deployment status:"
echo "  aws ecs list-services --cluster backstage-portal-backstage-cluster"
echo ""
echo "To view logs:"
echo "  aws logs tail /aws/ecs/backstage-portal/backstage-backend --follow"
echo "  aws logs tail /aws/ecs/backstage-portal/backstage-frontend --follow"
echo ""
echo "Happy coding! 🚀"
