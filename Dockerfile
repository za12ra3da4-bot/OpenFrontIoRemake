# rebuild
# Use an official Node runtime as the base image
FROM node:20-slim AS prod-deps

# base
FROM node:20-slim AS base
WORKDIR /usr/src/app
COPY package*.json ./
RUN mkdir -p static && echo "$GIT_COMMIT" > static/commit.txt
# deps
FROM base AS prod-deps
RUN npm install --production

# build stage
FROM base AS build
RUN npm install
COPY . .

# final
FROM node:20-slim
WORKDIR /usr/src/app

COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app .

CMD ["node", "server.js"]

# Production dependencies stage - separate from build
FROM base AS prod-deps
ENV HUSKY=0
RUN npm install --omit=dev --ignore-scripts

RUN apt-get update && apt-get install -y procps
ENV NPM_CONFIG_IGNORE_SCRIPTS=1
COPY package*.json ./
RUN npm ci --omit=dev

# Final production image
FROM base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    curl \
    wget \
    supervisor \
    apache2-utils \
    && rm -rf /var/lib/apt/lists/*

# Update worker_connections in nginx.conf
RUN sed -i 's/worker_connections [0-9]*/worker_connections 8192/' /etc/nginx/nginx.conf

# Setup supervisor configuration
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Copy production node_modules from prod-deps stage (cached separately from build)
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY package*.json ./

# Copy built artifacts from build stage
COPY --from=build /usr/src/app ./

COPY resources ./resources

# Remove maps because they are not used by the server.
RUN rm -rf ./resources/maps
COPY tsconfig.json ./
COPY src ./src


ARG GIT_COMMIT=unknown
RUN echo "$GIT_COMMIT" > static/commit.txt

ENV GIT_COMMIT="$GIT_COMMIT"

RUN <<'EOF' tee /usr/local/bin/start.sh
#!/bin/sh
if [ "$DOMAIN" = openfront.dev ] && [ "$SUBDOMAIN" != main ]; then
    exec timeout 18h /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
else
    exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
fi
EOF
RUN chmod +x /usr/local/bin/start.sh
ENTRYPOINT ["/usr/local/bin/start.sh"]
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
CMD ["node", "server.js"]
