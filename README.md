# Backend

NestJS monorepo containing the backend microservices. The architecture utilizes an **API Gateway** to handle public HTTP requests and route them to internal microservices (Auth, Club, Notification) over **RabbitMQ (AMQP)**.

Each application is built and deployed as its own highly optimized Docker image using Rspack.

## Architecture & Structure

```
backend/
├── apps/
│   ├── api-gateway/          # Public HTTP entrypoint (REST)
│   ├── auth-service/         # Internal AMQP microservice
│   ├── club-service/         # Internal AMQP microservice
│   └── notification-service/ # Internal AMQP microservice
├── libs/
│   ├── common/               # Shared utilities (e.g., RpcToHttp filters)
│   ├── contracts/            # Global DTOs, interfaces, and Queue names
│   └── rmq/                  # RabbitMQ connection bootstrappers
├── Dockerfile                # Single root Dockerfile for all apps
├── nest-cli.json             # Workspace configuration
├── package.json              
└── tsconfig.json             # Root TypeScript config (Nodenext)

```

| Service | Protocol | Role |
| --- | --- | --- |
| **api-gateway** | HTTP (Port 3001) | Authenticates requests, validates DTOs, proxies via RPC. |
| **auth-service** | AMQP (No Port) | Handles user registration, JWT generation, and 42 OAuth. |
| **club-service** | AMQP (No Port) | Manages club logic and Postgres database interactions. |
| **notification** | AMQP (No Port) | Processes background events and WebSocket emissions. |

## Requirements

* Node.js 24+
* npm
* Docker & Docker Compose (for RabbitMQ / PostgreSQL)

## Local Development

Because the services communicate via RabbitMQ, you must have a message broker running locally before starting the apps.

1. **Start RabbitMQ:**
```bash
docker run -d --name dev-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine

```


2. **Setup Environment:**
Create a `.env` file at the root. The apps use Fail-Fast configuration (Joi); they will crash immediately if `RABBITMQ_URL` or `DATABASE_URL` is missing.
3. **Install Dependencies:**
```bash
npm ci

```


4. **Run Services (Requires separate terminals):**
```bash
npm run start:dev api-gateway
npm run start:dev auth-service

```



Build output goes to `dist/apps/<service-name>`.

## Docker Deployment

One single `Dockerfile` serves all services. Pick the service to build using the `APP_NAME` build argument (must exactly match the project name in `nest-cli.json`).

### Build

```bash
docker build --build-arg APP_NAME=api-gateway -t ft_api_gateway:latest .
docker build --build-arg APP_NAME=auth-service -t ft_auth_service:latest .

```

### Run

> **⚠️ CRITICAL ARCHITECTURE NOTE:**
> Do **not** expose ports (`-p`) when running internal microservices like `auth-service`. They communicate exclusively over the Docker bridge network via RabbitMQ. Only the `api-gateway` should expose a port to the host machine.

**Run the API Gateway (Public):**

```bash
docker run -p 3001:3000 --env-file .env ft_api_gateway:latest

```

**Run an Internal Microservice (Private):**

```bash
docker run --env-file .env ft_auth_service:latest

```

*(Notice the absence of the `-p` flag. The Auth service connects to RabbitMQ seamlessly in the background).*

### How the Image Works

1. **Build stage:** Installs all dependencies with `npm ci` (catching peer-dependency issues) and runs `npm run build <APP_NAME>`. Rspack bundles the app and any imported `libs/` into a single lightweight directory.
2. **Final stage:** Installs production dependencies only (`--omit=dev`), cleans the npm cache, copies the specific built service from `dist/apps/<APP_NAME>`, and executes it as the secure, non-root `node` user.

## Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Build all projects |
| `npm run start:dev <service>` | Run a specific service in watch mode |
| `npm run format` | Prettier auto-formatting across `apps/` and `libs/` |
| `npm run lint` | Lightning-fast linting using oxlint |
| `npm run test` | Run Unit tests via Vitest |
| `npm run test:e2e` | Run E2E tests via Vitest |
