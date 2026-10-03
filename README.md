# healthFlip API

Fastify and PostgreSQL API for the healthFlip mobile application.

## Architecture

Each domain owns a controller, service, router, helper, and validator:

- Controllers translate Fastify requests and responses.
- Services contain business rules only.
- Routers define the HTTP routes and auth requirements.
- Helpers contain domain serialization and input-to-persistence transformations.
- Validators define the API input contract.
- `src/db/schema/` contains one Drizzle table schema per file; `src/db/repositories/`
  centralizes all reusable Drizzle data access.
- Shared modules provide configuration, auth, errors, validation, and timezone helpers.

## Local setup

Start PostgreSQL from the repository root:

```sh
docker compose up -d postgres
```

Then run the API from this directory:

```sh
DATABASE_URL=postgres://healthflip:healthflip@127.0.0.1:5432/healthflip npm run db:migrate
DATABASE_URL=postgres://healthflip:healthflip@127.0.0.1:5432/healthflip npm run dev
```

## Database workflow

The TypeScript table schemas in `src/db/schema/` are the source of truth.

```sh
npm run db:generate
DATABASE_URL=... npm run db:migrate
npm run db:check
```

Generated SQL migrations under `drizzle/` are committed. Migrations are run explicitly, never during a request.

## Tests

Create a local `healthflip_test` PostgreSQL database, apply migrations, then run:

```sh
TEST_DATABASE_URL=postgres://healthflip:healthflip@127.0.0.1:5432/healthflip_test npm run test:integration
```

## Vercel preparation

Deploy this repository as the Vercel project root. Vercel recognizes Fastify entrypoints
under `src/`; production configuration needs `DATABASE_URL` and, for live AI,
`GEMINI_API_KEY` for the managed PostgreSQL instance. Keep the Gemini key in the backend
environment only. When the key is absent, the API deliberately uses the deterministic
fallback provider for local development and tests. Optional settings are `GEMINI_MODEL`
(default `gemini-3.8-flash`) and `GEMINI_TIMEOUT_MS` (default `15000`). Deployment and
credential setup are deferred until the user authorizes them.
