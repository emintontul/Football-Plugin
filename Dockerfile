# Multi-stage build: bundle the Vite SPA with the production VITE_API_BASE_URL
# baked in, then serve the static dist/ with nginx. Hippo's Coolify "static"
# buildpack just COPYs the repo as-is (no npm install / no build), so we own
# the build steps here.

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Vite's build inlines NEXT-style envs at compile time. Coolify passes
# is_buildtime envs as Docker build args automatically when they're declared
# here, so VITE_API_BASE_URL set in Coolify becomes the baseURL the bundle
# talks to in production.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Single-page app served on hash router — no server-side route fallback
# needed, but keep the standard SPA try_files in case routing changes.
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n  location /assets/ {\n    expires 1y;\n    add_header Cache-Control "public, immutable";\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
