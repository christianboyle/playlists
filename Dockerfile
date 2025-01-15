# Build stage
FROM node:20-slim as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

ARG SOUNDCLOUD_CLIENT_ID
ARG NODE_ENV=production

ENV SOUNDCLOUD_CLIENT_ID=${SOUNDCLOUD_CLIENT_ID}
ENV NODE_ENV=${NODE_ENV}

RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY server.js .
COPY index.js .
COPY index.html .
COPY styles.css .
COPY soundcloud-audio.js .
COPY playlists.json .
COPY favicon.ico .

# Pass environment variables to runtime
ARG SOUNDCLOUD_CLIENT_ID
ENV SOUNDCLOUD_CLIENT_ID=${SOUNDCLOUD_CLIENT_ID}

RUN npm ci --only=production

# Create entrypoint script
RUN echo '#!/bin/sh\n\
echo "Generating config.js with client credentials..."\n\
cat > /app/dist/config.js << EOL\n\
window.APP_CONFIG = {\n\
  clientId: "${SOUNDCLOUD_CLIENT_ID}"\n\
};\n\
EOL\n\
echo "Config generated. Starting server..."\n\
exec node server.js' > /entrypoint.sh && \
chmod +x /entrypoint.sh

EXPOSE 8087

CMD ["/entrypoint.sh"] 