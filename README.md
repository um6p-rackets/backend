# Backend

NestJS monorepo containing the backend microservices. Each service is built and deployed as its own Docker image.

## Structure

```
backend/
├── apps/
│   ├── auth-service/
│   ├── club-service/
│   └── notification-service/
├── Dockerfile
├── nest-cli.json
├── package.json
└── tsconfig.json
```

| Service | Path |
|---|---|
| auth-service | `apps/auth-service` |
| club-service | `apps/club-service` |
| notification-service | `apps/notification-service` |

## Requirements

- Node.js 24+
- npm
- Docker

## Local development

```bash
npm ci

# run a service in watch mode
npm run start:dev auth-service

# build a service
npm run build auth-service
```

Build output goes to `dist/apps/<service-name>`.

## Docker

One `Dockerfile` serves all services. Pick the service with the `APP_NAME` build arg (must match a project name in `nest-cli.json`).

### Build

```bash
docker build --build-arg APP_NAME=auth-service -t auth:latest .
```

Other services:

```bash
docker build --build-arg APP_NAME=club-service -t club:latest .
docker build --build-arg APP_NAME=notification-service -t notification:latest .
```

### Run

```bash
docker run -p 3000:3000 -it auth:latest
```

The service is then available at `http://localhost:3000`.

To run several services at once, map each to a different host port:

```bash
docker run -p 3001:3000 club:latest
```

### How the image works

1. **Build stage:** installs all dependencies with `npm ci` and runs `npm run build <APP_NAME>`.
2. **Final stage:** installs production dependencies only (`--omit=dev`), copies the built service from `dist/apps/<APP_NAME>`, and runs it as the non-root `node` user.

## Scripts

| Command | Description |
|---|---|
| `npm run build <service>` | Build one service |
| `npm run start:dev <service>` | Run one service in watch mode |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Vitest) |
| `npm run lint` | Lint (oxlint) |

> Adjust script names to match your `package.json`.