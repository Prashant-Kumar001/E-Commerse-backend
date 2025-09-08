FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci      # deterministic, faster in CI

COPY . .
CMD ["npm", "run", "start"]

