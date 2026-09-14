# Macky Merch API

A RESTful inventory API for **Macky Merch**, the official merchandise of the
La Salle Computer Society. Built for the 41st LSCS Backend Development
Challenge (Systems and Infrastructure Committee).

Full CRUD over a merchandise catalog, with schema-based request validation,
centralized error handling, pagination, and an automated test suite.

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Runtime | Node.js 22+ | Required by the spec |
| Framework | Express 5 | Required by the spec |
| Language | TypeScript | Compile-time safety across every layer |
| Database | SQLite via `better-sqlite3` | Real SQL engine, zero external setup |
| Validation | Zod | Schemas double as the source of TypeScript types |
| Testing | Vitest + Supertest | Native TypeScript support, no extra config |

---

## Getting Started

### Prerequisites

- Node.js 22 or later
- npm 10 or later

### 1. Install

```bash
git clone https://github.com/galiciary/Macky-Merch-API.git
cd Macky-Merch-API
npm install
```

> **Note:** `better-sqlite3` compiles native bindings during install. If npm
> reports that install scripts were blocked, approve and rebuild:
>
> ```bash
> npm install-scripts approve better-sqlite3
> npm rebuild better-sqlite3
> ```

### 2. Configure the environment

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the HTTP server binds to |
| `DB_PATH` | `./data/macky_merch.db` | Location of the SQLite database file |

### 3. Database setup

No manual setup is required. On startup the application creates the `data/`
directory if missing and executes `schema.sql`, which is idempotent
(`CREATE TABLE IF NOT EXISTS`). The database file is created on first run.

To load sample merchandise:

```bash
npm run seed
```

### 4. Run

```bash
npm run dev      # development, with hot reload
```

```bash
npm run build    # compile TypeScript to dist/
npm start        # run the compiled output
```

### 5. Test

```bash
npm test         # run the suite once
npm run test:watch
```

### 6. Run with Docker (optional)

```bash
docker build -t macky-merch-api .
docker run --rm -p 3000:3000 macky-merch-api
```

---

## API Reference

Base URL: `http://localhost:3000`

### Endpoints

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| `GET` | `/health` | Liveness check | `200` | — |
| `POST` | `/api/products` | Create a product | `201` | `400`, `500` |
| `GET` | `/api/products` | List all products | `200` | `400`, `500` |
| `GET` | `/api/products/:id` | Get one product | `200` | `400`, `404`, `500` |
| `PUT` | `/api/products/:id` | Update a product | `200` | `400`, `404`, `500` |
| `DELETE` | `/api/products/:id` | Delete a product | `200` | `400`, `404`, `500` |

### Product model

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Assigned by the database |
| `name` | string | required, non-empty | |
| `price` | number | required, positive | |
| `stock` | integer | required, non-negative | |
| `category` | string | required, non-empty | e.g. `"Clothing"` |
| `size` | string or null | optional | **Custom** — apparel sizing |
| `isAvailable` | boolean | defaults to `true` | **Custom** — hide items without deleting them |
| `imageUrl` | string or null | optional, valid URL | **Custom** — product photo for storefronts |
| `createdAt` | string | set by the database | **Custom** — audit trail, enables sorting by recency |

Four custom attributes were added beyond the five required. `isAvailable`
exists because merchandise is often temporarily pulled from sale without being
removed from inventory, which a hard delete cannot express.

### Examples

Create:

```bash
curl -X POST localhost:3000/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"LSCS Hoodie","price":899.5,"stock":25,"category":"Clothing","size":"M"}'
```

```json
{
  "id": 1,
  "name": "LSCS Hoodie",
  "price": 899.5,
  "stock": 25,
  "category": "Clothing",
  "size": "M",
  "isAvailable": true,
  "imageUrl": null,
  "createdAt": "2026-09-14 04:10:27"
}
```

Partial update — `PUT` accepts any subset of fields:

```bash
curl -X PUT localhost:3000/api/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"stock":5}'
```

### Pagination

```bash
curl -i 'localhost:3000/api/products?page=1&limit=5'
```

The response body is **always a top-level array**, as the specification
requires. Pagination metadata travels in headers instead of wrapping the body,
so the response shape never changes between paginated and unpaginated requests:

| Header | Meaning |
|---|---|
| `X-Total-Count` | Total products in the database |
| `X-Page` | Current page |
| `X-Limit` | Items per page |
| `X-Total-Pages` | Total pages available |

Pagination activates only when `page` or `limit` is supplied. Without them the
endpoint returns every product, so a default page size can never silently
truncate results.

### Error format

Every error, from any layer, returns the same shape:

```json
{
  "error": {
    "message": "Validation failed",
    "details": [
      { "field": "price", "message": "price must be a positive number" }
    ]
  }
}
```

`details` appears only on validation failures, and lists **every** problem at
once rather than stopping at the first.

---

## Project Structure
src/
├── config/db.ts SQLite connection, pragmas, schema bootstrap
├── types/product.types.ts Row type, API type, and the mapper between them
├── validation/product.schema.ts Zod schemas and their inferred types
├── models/product.model.ts Prepared SQL statements and data access
├── controllers/product.controller.ts HTTP handling only
├── routes/product.routes.ts Route declarations and their guards
├── middleware/
│ ├── validate.middleware.ts Reusable Zod validator
│ └── error.middleware.ts 404 handler and centralized error handler
├── utils/ApiError.ts Error class carrying an HTTP status code
├── scripts/seed.ts Sample data loader
├── app.ts Express app composition
└── server.ts Port binding


---

## Architectural Decisions

### Why this folder structure

The project is organized in layers, each with one responsibility, and
dependencies only ever point downward: **routes → controllers → models → database**.

Routes declare what is exposed and what guards it. Controllers translate
between HTTP and the domain, and contain no SQL. Models own every query and
know nothing about HTTP. No `req`, no `res`, no status codes. That boundary is
what makes the model layer independently testable and what would let the
storage engine be swapped without touching a single controller.

Validation and types live in their own directories because both are shared
across layers rather than belonging to any one of them.

### Why SQLite

SQLite is a real SQL database with real constraints, transactions, and a query
planner. The `CHECK` constraints on `price` and `stock` are enforced by the
engine itself, independently of application code. Unlike PostgreSQL or MongoDB
it requires no running server, no credentials, and no connection string, so
`npm install && npm test` works on a fresh clone with nothing else installed.

For an inventory API of this scale, a client/server database would add
operational overhead without adding capability. `better-sqlite3` was chosen for
its stable, synchronous API, and raw parameterized SQL was preferred over an ORM
so the data layer stays explicit and reviewable.

### Why Zod defines the types

Request schemas are written once in Zod, and the TypeScript types are derived
from them with `z.infer`. Validation rules and static types therefore cannot
drift apart — changing a schema changes the type, and any code that no longer
matches fails to compile.

The schemas use `z.strictObject`, which rejects unknown fields rather than
silently discarding them. A client that misspells `stock` as `stocks` receives
a `400` explaining the problem instead of a `201` with a field quietly ignored.

### Why `app.ts` and `server.ts` are separate

`app.ts` builds and exports the Express application but never calls `listen`.
`server.ts` is the only module that binds a port. This lets Supertest import
the app and issue requests against it in process — no real port, no race
conditions on startup, and no lingering server after the suite finishes.

---

## Challenges Faced

**Express 5 made `req.query` a read-only getter.**

The validation middleware was written to parse a request segment with Zod and
assign the result back, so downstream handlers would receive coerced values
rather than raw strings:

```ts
req.query = result.data;  // works in Express 4
```

Under Express 4 this is fine. Under Express 5 the `GET /api/products` route
failed at runtime with a `TypeError` about assigning to a property that has
only a getter. What made the cause non-obvious was that the same middleware
worked perfectly when validating `req.body`. It looked like a Zod problem
rather than an Express one.

The cause is a deliberate Express 5 change: `req.query` is now defined as a
lazily-evaluated getter with no setter, so the query string is parsed only when
first accessed. Assigning to it is no longer possible.

The fix was to stop mutating the request. The middleware now writes the
validated result to `res.locals`, which exists precisely for per-request data
passed between middleware:

```ts
res.locals[source] = result.data;
```

Controllers read from `res.locals` instead of the raw request. This turned out
to be better than the original approach rather than merely a workaround: the
request object stays immutable, and the distinction between *raw input* and
*validated input* becomes explicit at every call site. A controller reading
`res.locals.query` is unambiguously reading data that passed validation.

---

## Testing

19 tests across six suites, run with `npm test`.

Coverage includes all five CRUD endpoints, the full validation surface
(missing fields, negative price, unknown fields, empty update bodies,
non-numeric IDs), `404` handling for every ID-addressed route, pagination
including header metadata, unknown-route handling, and malformed JSON.

Two details worth noting. Tests run against an **in-memory** SQLite database,
configured in `vitest.config.mts` — the suite truncates the products table
before each test, and pointing it at the development database would destroy
real data. And because each test starts from an empty table, the suite has no
ordering dependencies.

---

## Submission Checklist

- [x] All 5 CRUD endpoints functional
- [x] 4 custom product attributes (`size`, `isAvailable`, `imageUrl`, `createdAt`)
- [x] 19 automated tests passing
- [x] README with setup, architecture, and challenges
- [x] Working `start`, `dev`, and `test` scripts
- [x] `node_modules/` and `.env` excluded via `.gitignore`
- [x] `schema.sql` included
- [x] **Bonus:** TypeScript
- [x] **Bonus:** Pagination
- [x] **Bonus:** Dockerfile (verified building and running)
- [x] **Bonus:** Feature branches merged via pull requests (PRs #1–#3)