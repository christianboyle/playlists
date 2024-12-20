# Build stage
FROM node:20-slim as builder

WORKDIR /app
COPY . .

RUN npm ci && \
    npm run build

# Production stage
FROM node:20-slim

# Install required packages
RUN apt-get update && \
    apt-get install -y gettext-base && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY index.html ./index.html.template
COPY styles.css .
COPY soundcloud-audio.js .
COPY playlists.json .

# Install dependencies
RUN npm install -g serve

# Create entrypoint script
RUN echo '#!/bin/sh\n\
envsubst < index.html.template > index.html\n\
exec serve . -l 8087' > /entrypoint.sh && \
chmod +x /entrypoint.sh

EXPOSE 8087

CMD ["/entrypoint.sh"] 