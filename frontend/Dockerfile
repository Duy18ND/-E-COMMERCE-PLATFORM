# ─────────────────────────────────────────────────────────────
#  Multi-stage Dockerfile — Frontend (React 18 + Vite 5 + Nginx)
#  Stage 1: Build React SPA with Node.js 20
#  Stage 2: Serve static bundle & reverse proxy API with Nginx
# ─────────────────────────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests first (Docker layer caching)
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy source code
COPY . .

# Build-time environment variables for Vite
# Default '/api/v1' routes API requests through Nginx Reverse Proxy to API Gateway
ARG VITE_API_URL=/api/v1
ARG VITE_USE_MOCK_AUTH=false
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_USE_MOCK_AUTH=${VITE_USE_MOCK_AUTH}

# Build production bundle into /app/dist
RUN npm run build

# Stage 2: Runtime (Nginx)
FROM nginx:1.27-alpine AS runtime

# Remove default Nginx configuration and replace with SPA + Reverse Proxy config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O - http://127.0.0.1/healthz | grep -q OK || exit 1

CMD ["nginx", "-g", "daemon off;"]
