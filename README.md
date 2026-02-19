# GPMS Todo API

A NestJS REST API serving as a learning sandbox for backend patterns — caching, event-driven architecture, job queues, and scheduled tasks.

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
Async job processor using BullMQ. Triggered by todo events (`todo.created`, `todo.completed`).

## Patterns in Use

- **Redis caching** — caches todo list and individual items with smart invalidation
- **Event-driven** — `TodosListener` reacts to todo events and enqueues notification jobs
- **Soft deletes** — `BaseService` filters `isDeleted: true` at the base level
- **Pagination** — `PaginatedResult` with `page`, `limit`, `total`, `totalPages`
- **Cron jobs** — `TodosJob` runs every 10 seconds
- **Global error handling** — `HttpExceptionFilter` + `ResponseInterceptor`

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

### Run

```bash
# development
pnpm run start:dev

# production
pnpm run start:prod
```

### API Docs

Available at `http://localhost:<PORT>/api` (Scalar UI) when running.

## Tests

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# coverage
pnpm run test:cov
```
