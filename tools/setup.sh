#!/bin/sh
set -e

# Build URLs from non-secret parts (env) + secret passwords (files)
if [ -n "$RABBITMQ_PASSWORD_FILE" ]; then
  export RABBITMQ_URL="amqp://${RABBITMQ_USER}:$(cat "$RABBITMQ_PASSWORD_FILE")@rabbitmq:5672"
fi

if [ -n "$DB_PASSWORD_FILE" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:$(cat "$DB_PASSWORD_FILE")@database:5432/${DB_NAME}?schema=${DB_SCHEMA}"
fi

# if [ -n "$JWT_ACCESS_SECRET_FILE" ]; then
#   export JWT_ACCESS_SECRET="$(cat "$JWT_ACCESS_SECRET_FILE")"
# fi

exec "$@"   # hand over to the real command so signals (SIGTERM) reach Node