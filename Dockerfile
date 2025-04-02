FROM node:22.14.0

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
COPY src ./
COPY build.sh ./
COPY vite.config.mjs ./

RUN npm install
RUN npm run build

RUN rm -rf src
RUN rm -rf node_modules

CMD ["node", "./dist/main.es.js"]