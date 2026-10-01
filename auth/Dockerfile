# this is build stage
FROM node:24.21.0-alpine3.24 AS build

WORKDIR /app

COPY package*.json ./

# install dependencies, CI is used to install exact versions of dependencies from package-lock.json, which is important for reproducible builds
# and this helps also to avoid any issues with peer dependencies, as npm ci will fail if there are any unmet peer dependencies
RUN npm ci

COPY . .

RUN npm run build auth-service

# Final image for production
FROM node:24.21.0-alpine3.24

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

# install production dependencies and clean npm cache to reduce image size, --omit=dev flag is used to skip dev dependencies
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]