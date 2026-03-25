FROM node:20-alpine AS builder

WORKDIR /app

# Install root dependencies
COPY package.json ./
RUN npm install --production=false

# Build client
COPY client/package.json client/
RUN cd client && npm install
COPY client/ client/
RUN cd client && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --production

COPY server/ server/
COPY scripts/ scripts/
COPY --from=builder /app/client/dist client/dist

# Create data directory
RUN mkdir -p data

EXPOSE 5000

CMD ["node", "server/index.js"]
