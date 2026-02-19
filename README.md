# GPMS Todo API

A NestJS starter kit with production-ready patterns — caching, event-driven architecture, job queues, security, and observability baked in.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 |
| HTTP | Fastify 5 |
| Database | MongoDB + Mongoose |
| Cache | Redis (cache-manager-redis-yet) |
| Job Queue | BullMQ |
| Events | @nestjs/event-emitter |
| Scheduling | @nestjs/schedule |
| Logging | nestjs-pino |
| Docs | Swagger + Scalar |
| Package Manager | pnpm |

## Modules

### Todos
CRUD operations for todo items.

- `POST /todos` — create a todo
- `GET /todos` — paginated list
- `GET /todos/:id` — get one
- `PATCH /todos/:id` — update
- `DELETE /todos/:id` — soft delete

**Schema:** `title`, `description`, `status` (`pending` | `completed`), `isDeleted`, timestamps

### Notifications
Async job processor using BullMQ. Triggered by todo events (`todo.created`, `todo.completed`). Retries up to 3 times with exponential backoff on failure.

### Health
- `GET /health` — checks MongoDB and Redis connectivity

## Patterns in Use

- **Redis caching** — caches todo list and individual items with smart invalidation
- **Event-driven** — `TodosListener` reacts to todo events and enqueues BullMQ jobs
- **Soft deletes** — `BaseService` filters `isDeleted: true` at the base level
- **Pagination** — `PaginatedResult` with `page`, `limit` (max 100), `total`, `totalPages`
- **Cron jobs** — `TodosJob` as a placeholder for scheduled tasks
- **Global error handling** — `AllExceptionsFilter` catches all errors with a consistent response shape
- **Event enums** — `TodoEvent` enum for all event names, no magic strings
- **ObjectId validation** — `ParseObjectIdPipe` validates route params before hitting Mongoose

## Security

- **Helmet** — sets HTTP security headers on every response
- **Rate limiting** — 100 requests/minute per IP globally (`@nestjs/throttler`)
- **CORS** — open in development, locked down in production
- **Payload size limit** — 10MB max request body
- **Env validation** — Joi schema validates all required env vars at startup

> Per-route throttle override: `@Throttle({ default: { limit: N, ttl: 60_000 } })`
> Skip throttle on a route: `@SkipThrottle()`

## Logging

Uses `nestjs-pino` throughout. No `console.log` anywhere.

| Environment | Format | Level |
|-------------|--------|-------|
| Development | pino-pretty (colorized, timestamped) | debug |
| Production | JSON (structured, aggregator-ready) | warn |

## Setup

### Prerequisites
- Node.js
- MongoDB
- Redis
- pnpm

### Install

```bash
pnpm install
```

### Environment

Copy `.env.example` and fill in values:

```bash
cp .env.example .env.development
```

Required vars:

```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/gpms-todo
REDIS_URL=redis://localhost:6379
```

App will fail fast at startup if any required var is missing.

### Run

```bash
# development
pnpm run start:dev

# production
pnpm run start:prod
```

### API Docs

Available at `http://localhost:<PORT>/docs` (Scalar UI) when running.

## Tests

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# coverage
pnpm run test:cov
```
