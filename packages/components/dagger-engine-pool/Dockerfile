# Dagger Engine Pool - FIPS/STIG Compliant Container Image
# Multi-stage build for production-ready Dagger Engine deployment

# Stage 1: Build stage with FIPS-enabled base
FROM registry/org/platform-runner:1.5.0 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
  curl \
  ca-certificates \
  gnupg \
  lsb-release \
  && rm -rf /var/lib/apt/lists/*

# Install Dagger CLI (FIPS-compliant version)
RUN curl -L https://dl.dagger.io/dagger/install.sh | \
  DAGGER_VERSION=0.9.7 sh && \
  mv bin/dagger /usr/local/bin/

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the component
RUN pnpm build

# Stage 2: Production stage
FROM registry/org/platform-runner:1.5.0 AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
  ca-certificates \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# Install Dagger CLI for runtime
RUN curl -L https://dl.dagger.io/dagger/install.sh | \
  DAGGER_VERSION=0.9.7 sh && \
  mv bin/dagger /usr/local/bin/

# Create non-root user for security
RUN groupadd -r dagger && useradd -r -g dagger dagger

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy configuration files
COPY --from=builder /app/audit ./audit
COPY --from=builder /app/observability ./observability

# Set ownership
RUN chown -R dagger:dagger /app

# Switch to non-root user
USER dagger

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD dagger --version || exit 1

# Default command
CMD ["node", "dist/index.js"]

# Labels for compliance and metadata
LABEL org.opencontainers.image.title="Dagger Engine Pool"
LABEL org.opencontainers.image.description="FIPS/STIG compliant Dagger Engine deployment component"
LABEL org.opencontainers.image.vendor="Platform Team"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.schema-version="1.0"
LABEL com.platform.component.type="dagger-engine-pool"
LABEL com.platform.compliance.framework="fedramp-moderate"
LABEL com.platform.compliance.fips="true"
LABEL com.platform.compliance.stig="true"
