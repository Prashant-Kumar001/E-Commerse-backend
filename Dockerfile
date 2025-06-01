# Dockerfile
FROM node:20
WORKDIR /app

# install exactly what package.json declares
COPY package*.json ./
RUN npm ci      # deterministic, faster in CI

# copy source AFTER deps (keeps cache layers)
COPY . .

CMD ["npm", "run", "start"]

# runs "nodemon index.js"
