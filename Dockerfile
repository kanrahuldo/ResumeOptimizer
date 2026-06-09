# syntax=docker/dockerfile:1
FROM node:20-bookworm AS builder
WORKDIR /app

# install tectonic
RUN curl -L https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-gnu.tar.gz \
  | tar -xz -C /usr/local/bin

# Next.js build requires DATABASE_URL to exist, but Render doesn't pass env to build stage.
ENV DATABASE_URL="postgres://placeholder:placeholder@localhost:5432/placeholder"

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /usr/local/bin/tectonic /usr/local/bin/tectonic
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start"]
