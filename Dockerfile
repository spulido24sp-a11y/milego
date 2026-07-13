FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --production=false

COPY backend/ ./backend/
COPY admin/ ./admin/
COPY data/ ./data/
COPY gracias.html ./
COPY uploads/ ./uploads/

EXPOSE 3000

CMD ["node", "backend/src/server.js"]