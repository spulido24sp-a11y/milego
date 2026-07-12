FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --production=false

COPY backend/ ./backend/
COPY data/ ./data/
COPY gracias.html ./
COPY uploads/ ./uploads/
COPY knexfile.cjs ./backend/knexfile.cjs

EXPOSE 3000

CMD cd backend && npx knex migrate:latest && node src/server.js