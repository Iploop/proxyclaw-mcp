FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY dist/ ./dist/

ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/index.js"]