FROM node:20-alpine

WORKDIR /app

# instala deps primeiro (cache de layer)
COPY package*.json ./
RUN npm install --omit=dev

# codigo
COPY server ./server
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]
