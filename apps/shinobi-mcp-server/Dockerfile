# Shinobi MCP Server Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy workspace files
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy platform-kb directory (needed by MCP server)
COPY platform-kb ./platform-kb

# Copy packages that the MCP server depends on
COPY packages/core ./packages/core
COPY packages/contracts ./packages/contracts
COPY packages/standards ./packages/standards
COPY packages/observability-handlers ./packages/observability-handlers

# Copy MCP server source
COPY apps/shinobi-mcp-server ./apps/shinobi-mcp-server

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build packages individually to avoid nx issues
RUN npx nx repair
RUN npx nx build @shinobi/core
RUN npx nx build @shinobi/contracts
RUN npx nx build @shinobi/standards
RUN npx nx build @shinobi/observability-handlers

# Build the MCP server
WORKDIR /app/apps/shinobi-mcp-server
RUN npm run build

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