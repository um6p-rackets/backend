# Auth Service

Microservice handling user identity, JWT authentication, and profiles for Racket UM6P.

## ⚙️ Environment Variables

Create a `.env` in the `racket-backend` root:

```env
DATABASE_URL="postgres://user:pass@localhost:5432/db_auth"
JWT_SECRET="your_secret_key"
```

## 🚀 Run Outside Docker (Local Dev)

Execute these commands from the `racket-backend` root folder:

```bash
npm install
npm run start:dev auth-service

```

## 🐳 Run Inside Docker

This service is orchestrated by the `racket-infra` repository. To run it inside its container alone you can:

```bash
cd auth
docker build -t auth-service .
docker run -p 3000:3000 --env-file ../.env auth-service
```

* listens on `http://localhost:3000`
