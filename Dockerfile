# this is build stage
FROM node:24.21.0-alpine3.24 AS build

WORKDIR /usr/src/app

COPY package*.json ./

# install dependencies, CI is used to install exact versions of dependencies from package-lock.json, which is important for reproducible builds
# and this helps also to avoid any issues with peer dependencies, as npm ci will fail if there are any unmet peer dependencies
RUN npm ci

COPY . .

ARG APP_NAME


RUN npm run build ${APP_NAME}

# Final image for production
FROM node:24.21.0-alpine3.24

WORKDIR /usr/src/app
ARG APP_NAME

# explain later
ENV NODE_ENV=production
ENV EXEC_PATH=/usr/src/app/${APP_NAME}/main.js

COPY --chown=node:node package*.json ./

# install production dependencies and clean npm cache to reduce image size, --omit=dev flag is used to skip dev dependencies
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node  /usr/src/app/dist/apps/${APP_NAME} ./${APP_NAME}

# this command for 
USER node

EXPOSE 3000

CMD ["sh", "-c", "exec node $EXEC_PATH"]