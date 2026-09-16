# Inventory System — Backend

A standalone inventory, store, equipment, payroll, and credit management system.
Genuinely separate from `restaurant-billing-backend`: its own database, its own
user accounts/login, its own deployment. It connects to the billing app only
through a small **read-only** integration API — nothing here writes back to
billing, and billing keeps working normally even if this app is offline.

## What it covers

- **Inventory**: ingredient catalog, per-location stock levels, low-stock
  thresholds, a full purchase/adjustment/wastage/issue movement ledger
- **Equipment**: a register for crockery, cutlery, and kitchen equipment —
  quantity and condition per stock location
- **Suppliers & credit**: a supplier directory, credit purchases (pay later),
  and a running balance-owed ledger with payments recorded against it
- **Payroll**: employees on a fixed monthly salary, salary advances that
  auto-deduct from the next payroll run (or get repaid manually), monthly
  payroll runs and payslips
- **Analytics & reports**: stock valuation, movement trends, top consumed
  ingredients, supplier spend, payroll cost trend, equipment condition
  breakdown, plus four CSV-exportable reports
- **User accounts**: admin-managed logins (`admin` / `staff` roles), separate
  from restaurant staff logins in the billing app entirely

## Stack

Express + Sequelize + Postgres + JWT/bcryptjs — same stack as
`restaurant-billing-backend`, for consistency, but a fully separate codebase
and database.

## Local setup

```bash
npm install

# Starts a local embedded Postgres (own data dir, port 5436) — leave this
# running in its own terminal. This is dev-only; point DATABASE_URL at a
# real Postgres instance for staging/production.
npm run db:dev

# In another terminal:
cp .env.example .env   # fill in real secrets before anything but local dev
npm run db:migrate
npm run create-admin    # creates the first login, from ADMIN_EMAIL/ADMIN_PASSWORD in .env
npm run dev              # nodemon, http://localhost:5100
```

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5100) |
| `DATABASE_URL` | This app's own Postgres connection string |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | This app's own token signing — not shared with billing |
| `FRONTEND_URL` | CORS origin, the inventory frontend's URL |
| `BILLING_API_URL` | Base URL of `restaurant-billing-backend`'s API |
| `BILLING_INTEGRATION_API_KEY` | Shared secret for the read-only billing integration — must match `INVENTORY_INTEGRATION_API_KEY` in `restaurant-billing-backend/.env` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Used once by `npm run create-admin` |

## Roles

- **admin** — full access: manage the ingredient catalog, suppliers, employees,
  payroll, credit/payments, analytics, reports, and other user accounts
- **staff** — can view and record day-to-day stock movements (purchases,
  wastage, issues) and manage equipment, but has no access to financial data
  (payroll, supplier balances, analytics) or account management

An account can't demote, deactivate, or delete itself — there's always at
least one way in.

## Connecting to billing

`restaurant-billing-backend` exposes `GET /api/integrations/menu-items` and
`GET /api/integrations/sales-summary`, gated by an `X-API-Key` header (see
that app's `middlewares/apiKeyAuth.js`). This app's
`services/billingIntegrationService.js` calls those to show real menu/sales
data on the "Billing sales data" page — informational only, never in the
critical path of either app.
