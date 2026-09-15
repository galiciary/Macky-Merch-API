# Macky Merch API

A RESTful inventory API for **Macky Merch**, the official merchandise of the La Salle Computer Society. Built for the 41st LSCS Backend Development Challenge under the Systems and Infrastructure Committee.

The API supports full CRUD operations for a merchandise catalog, along with schema-based request validation, centralized error handling, pagination, and an automated test suite.

---

## Tech Stack

**Node.js 22+** for the runtime, as required by the specification.

**Express 5** as the web framework, also required by the specification.

**TypeScript** for compile-time type checking across the application. This helps catch mistakes before the code is run.

**SQLite via `better-sqlite3`** for the database. It provides a real SQL database without requiring any external database server or setup.

**Zod** for request validation. The same schemas are also used to generate the corresponding TypeScript types.

**Vitest + Supertest** for testing. They work well with TypeScript and do not require much additional configuration.

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

> **Note:** `better-sqlite3` needs to compile native bindings during installation. If npm reports that install scripts were blocked, approve the package and rebuild it:
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
| `PORT` | `3000` | Port the HTTP server runs on |
| `DB_PATH` | `./data/macky_merch.db` | Location of the SQLite database file |

### 3. Database setup

No manual database setup is required. When the application starts, it creates the `data/` directory if it does not exist and runs `schema.sql`. The schema is idempotent because it uses `CREATE TABLE IF NOT EXISTS`, so running the application again will not recreate an existing table.

The database file is created automatically on the first run.

To load the sample merchandise:

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
| `GET` | `/health` | Check if the API is running | `200` | — |
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
| `size` | string or null | optional | **Custom**: apparel sizing |
| `isAvailable` | boolean | defaults to `true` | **Custom**: hide items without deleting them |
| `imageUrl` | string or null | optional, valid URL | **Custom**: product photo for storefronts |
| `createdAt` | string | set by the database | **Custom**: keeps track of when a product was added |

Four custom attributes were added beyond the five required fields. `isAvailable` is useful because merchandise may be temporarily unavailable without actually being removed from the inventory. A hard delete would not be able to represent that situation.

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

Partial update: `PUT` accepts any subset of fields:

```bash
curl -X PUT localhost:3000/api/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"stock":5}'
```

### Pagination

```bash
curl -i 'localhost:3000/api/products?page=1&limit=5'
```

The response body is **always a top-level array**, as required by the specification. Pagination information is returned through headers instead of wrapping the response body. This keeps the response format the same whether pagination is being used or not:

| Header | Meaning |
|---|---|
| `X-Total-Count` | Total number of products in the database |
| `X-Page` | Current page |
| `X-Limit` | Number of items per page |
| `X-Total-Pages` | Total number of available pages |

Pagination only activates when `page` or `limit` is provided. Without either parameter, the endpoint returns every product. This prevents a default page size from silently leaving out results.

### Error format

All errors use the same response structure regardless of which layer they come from:

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

`details` is only included for validation errors. When validation fails, it lists **all** detected problems instead of stopping after the first one.

---

## Project Structure
src/
├── config/db.ts SQLite connection, pragmas, and schema bootstrap
├── types/product.types.ts Row type, API type, and the mapper between them
├── validation/product.schema.ts Zod schemas and their inferred types
├── models/product.model.ts Prepared SQL statements and database access
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

The project is split into layers, with each layer handling one main responsibility. Dependencies only move downward: **routes → controllers → models → database**.

Routes define what the API exposes and which guards are applied. Controllers handle HTTP-related work and do not contain SQL. Models handle all database queries and do not know anything about HTTP. They do not use `req`, `res`, or status codes.

Keeping that boundary makes the model layer easier to test on its own. It also means the database layer could be replaced later without having to change the controllers.

Validation and types have their own directories because they are shared across multiple layers instead of belonging to just one part of the application.

### Why SQLite

SQLite is a real SQL database with support for constraints, transactions, and query planning. The `CHECK` constraints on `price` and `stock` are enforced by the database itself, so invalid values cannot rely solely on application-level checks.

Compared with PostgreSQL or MongoDB, SQLite does not require a separate running server, credentials, or connection string. This means a fresh clone can run with `npm install && npm test` without setting up another service.

For an inventory API of this size, using a client/server database would add setup and maintenance overhead without providing much additional value. `better-sqlite3` was chosen for its straightforward synchronous API. Raw parameterized SQL was also preferred over an ORM so that the database queries remain easy to see and review.

### Why Zod defines the types

Request schemas are defined once in Zod, and the corresponding TypeScript types are generated using `z.infer`. This keeps the validation rules and TypeScript types connected. When a schema changes, the resulting type changes with it, and code that no longer matches will fail to compile.

The schemas use `z.strictObject`, which rejects unknown fields instead of silently ignoring them. For example, if a client sends `stocks` instead of `stock`, the API returns a `400` explaining the issue instead of returning a `201` while quietly ignoring the incorrect field.

### Why `app.ts` and `server.ts` are separate

`app.ts` creates and exports the Express application but does not call `listen`. `server.ts` is the only module responsible for starting the server and binding the port.

This lets Supertest import the app and send requests to it directly during testing. There is no need for a real port, there are no startup race conditions, and the test suite does not have to clean up a running server afterward.

---

## Challenges Faced

**Express 5 made `req.query` a read-only getter.**

The validation middleware originally parsed a request segment with Zod and assigned the validated result back to it. The goal was to make sure downstream handlers received the validated and converted values instead of the original strings:

```ts
req.query = result.data;  // works in Express 4
```

This worked in Express 4, but the `GET /api/products` route started failing under Express 5 with a `TypeError` when trying to assign to a property that only has a getter.

The confusing part was that the same middleware worked correctly when validating `req.body`. At first, the problem looked like it might be related to Zod rather than Express.

The actual cause was a change in Express 5. `req.query` is now exposed as a lazily evaluated getter with no setter, so assigning a new value to it is no longer supported.

The fix was to stop modifying the request object. Instead, the middleware now stores the validated result in `res.locals`, which is intended for passing per-request data between middleware:

```ts
res.locals[source] = result.data;
```

Controllers then read the validated values from `res.locals` instead of the original request.

This ended up being better than the original approach rather than just being a workaround. The request object remains unchanged, and the difference between **raw input** and **validated input** is clear at each call site. When a controller reads `res.locals.query`, it is explicitly working with data that has already passed validation.

---

## Testing

19 tests across six suites, run with `npm test`.

The tests cover all five CRUD endpoints, the full validation surface including missing fields, negative prices, unknown fields, empty update bodies, and non-numeric IDs. They also cover `404` responses for ID-based routes, pagination and its header metadata, unknown routes, and malformed JSON.

Two details are worth noting. Tests use an **in-memory** SQLite database configured in `vitest.config.mts`. The products table is cleared before each test, which keeps tests isolated. Using the development database instead could accidentally destroy real data.

Because every test starts with an empty table, the tests also do not depend on a particular execution order.

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
- [ ] **Bonus:** Git workflow -> partially met. Feature branches and pull requests were used for the final three changes (PRs #1–#3); the initial scaffold and feature commits were pushed directly to `main`.