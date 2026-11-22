# payrecon-dashboard

React dashboard for the **Payment Processing & Reconciliation Platform**
→ [payment-service](https://github.com/Sudhanshu771/payment-service) · [reconciliation-service](https://github.com/Sudhanshu771/reconciliation-service) · payrecon-dashboard

## Features
- **Login / logout** with JWT (issued by payment-service, checked by both services)
- **Role-based pages**: OPERATOR creates payments · AUDITOR uploads statements and reconciles · ADMIN does everything
- **Payments**: create (with an idempotency key per payment), list with paging and status filter
- **Bank statements**: upload a CSV, see uploaded statements, reconcile one with a click
- **Reconciliation**: list of runs, and a report per run (matched / amount mismatch / missing in bank / missing in ours)

## Tech
React 19 · TypeScript · Vite · React Router

## Run the whole platform locally

| # | What | How | Port |
|---|---|---|---|
| 1 | PostgreSQL | Windows service (DBs `payments` and `reconciliation`) | 5432 |
| 2 | Redis | Ubuntu (WSL): `sudo service redis-server start` | 6379 |
| 3 | Kafka | Ubuntu (WSL): `cd ~/kafka && bin/kafka-server-start.sh config/server.properties` | 9092 |
| 4 | payment-service | IntelliJ ▶ (or `./mvnw spring-boot:run`) | 8080 |
| 5 | reconciliation-service | IntelliJ ▶ | 8081 |
| 6 | this dashboard | `npm install` once, then `npm run dev` | 5173 |

Open http://localhost:5173 and sign in with a demo user: `operator`, `auditor` or `admin`.
The demo password is `app.security.demo-password` in payment-service's `application.properties`.

### Configuration
| Setting | Where | Default |
|---|---|---|
| Backend URLs | `VITE_PAYMENT_API`, `VITE_RECON_API` (env vars or a `.env.local` file) | `http://localhost:8080/api/v1`, `http://localhost:8081/api/v1` |
| Allowed browser origin (CORS) | `app.cors.allowed-origins` in both services | `http://localhost:5173` |
| JWT secret (**must be the same in both services**) | env var `JWT_SECRET` | a local-dev-only value |
| Demo users' password | env var `DEMO_PASSWORD` | a local-dev-only value |
| DB password | env var `DB_PASSWORD` | `postgres` |

> ⚠️ The defaults are for local development only. Before deploying, set `JWT_SECRET`, `DEMO_PASSWORD` and `DB_PASSWORD` to real secrets.

## Project structure
```
src/
  main.tsx            start-up: router + login state around <App />
  App.tsx             routes (which page for which URL)
  api.ts              every backend call + the JSON types
  format.ts           money/date display helpers
  auth/               login state (context), provider, route guard
  components/         Layout (menu + top bar), StatusBadge
  pages/              Login, Payments, Statements, Reconciliation, RunDetails
```
