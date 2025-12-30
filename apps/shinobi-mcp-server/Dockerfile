# Shinobi MCP Server Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy workspace files
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy platform-kb directory (needed by MCP server)
COPY platform-kb ./platform-kb

# Copy ALL packages (MCP server has many dependencies)
COPY packages ./packages

# Copy MCP server source
COPY apps/shinobi-mcp-server ./apps/shinobi-mcp-server

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build core dependencies first
RUN pnpm --filter @platform/logger build
RUN pnpm --filter @platform/contracts build
RUN pnpm --filter @shinobi/core build

# Build the MCP server (will build other dependencies as needed)
RUN pnpm --filter @shinobi/mcp-server build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S shinobi -u 1001

# Change ownership of the app directory
RUN chown -R shinobi:nodejs /app
USER shinobi

# Set working directory back to MCP server
WORKDIR /app/apps/shinobi-mcp-server

# Start the MCP server
CMD ["node", "dist/index.js"]