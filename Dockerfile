FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev || npm install
COPY . .
# snapshot at build time so /snapshot has data even before first live fetch
RUN node snapshot.js --limit 120 >/dev/null 2>&1 || true
ENV PORT=8787
EXPOSE 8787
CMD ["node","server.js"]
