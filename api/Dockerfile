FROM node:20-alpine AS build
WORKDIR /app

# Prisma's schema engine binary is dynamically linked against OpenSSL and
# libc; alpine ships neither by default, which makes `prisma db push` exit
# with "Could not parse schema engine response" on boot.
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Same OpenSSL requirement at runtime — the schema engine is invoked again
# by `prisma db push` in the entrypoint.
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
