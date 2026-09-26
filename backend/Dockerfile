FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
CMD sh -c "node src/server.js"
