FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S simulator && adduser -S simulator -G simulator
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY simulator.js ./
USER simulator
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["npm", "start"]
