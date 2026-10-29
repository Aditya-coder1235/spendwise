# SpendWise

SpendWise is a full-stack personal finance tracker for recording income and expenses, understanding spending trends, and keeping monthly budgets on track. It is built as a MERN application with a React 19 single-page client and an Express 5 / MongoDB API.

Money is stored as integer **paise** (the smallest INR unit), dates are handled as calendar dates, and every record is scoped to the signed-in user on the server.

## Highlights

- Secure cookie authentication with short-lived access JWTs, rotating refresh sessions, CSRF protection, rate limits, ownership checks, and centralized errors.
- Dashboard with Today, This week, This month, Last month, This year, and custom date ranges; income, expense, balance, savings rate, period comparison, recent activity, and budget health.
- Complete transaction CRUD with search, type/category/payment filters, sorting, pagination, and filtered CSV export.
- Analytics with category breakdowns, top categories, monthly income/expense trends, and daily spending.
- Monthly overall and per-category budgets with configurable warning thresholds, progress states, and over-budget detection.
- Recurring weekly/monthly/yearly schedules processed by `node-cron`, with idempotent generation and a unique database index preventing duplicate real transactions.
- Reports with totals, previous-period comparison, savings rate, category splits, monthly summaries, and CSV download.
- Per-user custom categories, currency/date-format/theme preferences, and warning thresholds.
- Responsive light/dark UI with accessible focus states and loading, empty, error, and success states.
- Backend integration tests and frontend unit/component tests.

## Stack

| Layer | Technology |
| --- | --- |
| Client | React 19, Vite 8, Tailwind CSS 4, React Router 7, Recharts, Axios, Lucide, React Hot Toast, date-fns, Zod |
| API | Node.js 20.19+, Express 5, Mongoose 9, JWT, bcrypt, Helmet, CORS, express-rate-limit, node-cron |
| Database | MongoDB (local or Atlas) |
| Tests | Node test runner + Supertest; Vitest + Testing Library + jsdom |

## Quick start

### Prerequisites

- Node.js **20.19 or newer** (Node 24 is recommended)
- npm 10+
- MongoDB 7/8 running locally, or a MongoDB Atlas connection string

### 1. Install

```bash
npm install
```

This repository uses npm workspaces, so one install covers the root, `client`, and `server`.

### 2. Configure the API

```bash
cp server/.env.example server/.env
```

Generate two different secrets and paste them into `server/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/spendwise
CLIENT_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=<first generated value>
JWT_REFRESH_SECRET=<second generated value>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=false
TRUST_PROXY=
```

The client works through Vite's `/api` proxy in development, so `client/.env` is optional. Copy `client/.env.example` only when the API lives on another origin.

### 3. Start MongoDB

Use your local service, for example:

```bash
mongod --dbpath /path/to/your/data
```

### 4. Seed demo data (optional)

```bash
npm run seed
```

The seed script is idempotent for the demo account: it replaces that account's transactions, budgets, recurring schedules, and categories with a fresh six-month data set.

Demo credentials:

```text
Email:    demo@spendwise.local
Password: DemoPass123!
```

### 5. Run the app

```bash
npm run dev
```

- Client: <http://localhost:5173>
- API health check: <http://localhost:5000/api/health>

Register a new account or sign in with the demo credentials.

## Scripts

Run commands from the repository root.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and Vite client together |
| `npm run build` | Build the client into `client/dist` |
| `npm start` | Start the production API server |
| `npm run seed` | Reset and seed the demo account |
| `npm run lint` | Lint both workspaces |
| `npm test` | Run API integration tests and frontend tests |
| `npm run test:server` | Run API tests only |
| `npm run test:client` | Run frontend tests only |

The API tests use `mongodb://127.0.0.1:27017/spendwise_test` by default and drop that database. Set `TEST_MONGODB_URI` to use a different test MongoDB instance.

## Demo data

`server/src/seed.js` creates:

- Demo user `demo@spendwise.local` with password `DemoPass123!`
- 18 default categories plus six months of salary, freelance income, rent, groceries, utilities, commuting, dining, subscriptions, shopping, health, and entertainment transactions
- Six budgets for the current month: one overall and five category budgets
- Four recurring schedules (salary, rent, streaming, and a paused gym membership)

Seeded schedules start in the next month, so they cannot generate duplicate transactions when the scheduler runs.

## How the app is organized

```text
spendwise/
├── client/
│   ├── src/
│   │   ├── components/     UI primitives, charts, dashboard controls
│   │   ├── context/        Auth and theme providers
│   │   ├── features/       Transaction form/quick-add feature
│   │   ├── hooks/          API and data-fetching hooks
│   │   ├── layouts/        Authenticated shell and navigation
│   │   ├── pages/          Route-level screens
│   │   ├── routes/         Auth guards
│   │   ├── services/       Axios client and API methods
│   │   ├── utils/          Currency, dates, constants, validation
│   │   └── test/           Vitest setup
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/         Environment and database connection
│   │   ├── controllers/    HTTP request/response handling
│   │   ├── middleware/     Auth, CSRF, validation, errors
│   │   ├── models/         Mongoose schemas and indexes
│   │   ├── routes/         Express routers
│   │   ├── scheduler/      Recurring transaction cron job
│   │   ├── services/       Business logic and aggregations
│   │   ├── utils/          Money, dates, tokens, cookies, CSV helpers
│   │   ├── validators/     Zod request schemas
│   │   └── seed.js         Demo data
│   └── tests/              Node/Supertest integration tests
└── docs/                   Setup, API, and deployment guides
```

## Core conventions

### Money

- All money is stored and returned in API as integer **paise** (`amountPaise`, `monthlyLimitPaise`, `spentPaise`, totals).
- Inputs accept decimal amount strings such as `"1250.50"` and are converted exactly to `125050` paise.
- The client formats money with `Intl.NumberFormat`, including Indian grouping such as `₹1,25,000.50`.

### Dates

- API date inputs are calendar date keys in `YYYY-MM-DD` format.
- Transaction dates are persisted as UTC midnight and ranges are half-open (`>= start`, `< day after end`).
- Month keys use `YYYY-MM`.
- Recurring occurrences are stored separately from real transactions; generated transactions also retain `recurrenceId` and `recurrenceOccurrence`.

### API response shape

Successful responses:

```json
{ "success": true, "data": {} }
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please check the highlighted fields and try again.",
    "details": [{ "field": "amount", "message": "..." }]
  }
}
```

### Authentication and CSRF

- `sw_access` is an HttpOnly access JWT cookie with a 15-minute lifetime.
- `sw_refresh` is an HttpOnly refresh cookie scoped to `/api/auth` and backed by a hashed `Session` record.
- Refresh tokens rotate on every refresh; replaying an old token fails.
- `sw_csrf` is readable by the client. The Axios layer sends it as `X-CSRF-Token` on unsafe requests.
- Unsafe API requests require a matching CSRF cookie and header, except login, registration, and refresh.
- Passwords must contain at least 8 characters with upper-case, lower-case, and numeric characters.

See [API documentation](docs/api.md) for endpoints and payloads, [setup](docs/setup.md) for local troubleshooting, [deployment](docs/deployment.md) for single-server production guidance, and [Vercel + Render + Atlas](docs/vercel-render-atlas.md) for the free split deployment.

## Testing and quality checks

```bash
npm run lint
npm test
npm run build
```

The integration suite covers registration/login/refresh rotation/CSRF/logout/password changes, validation, transaction CRUD, ownership isolation, filtering/pagination, money conversion, dashboard totals and date ranges, budgets and warning states, recurring idempotency and isolation, custom categories, reports, and CSV output/escaping. Frontend tests cover formatting, date ranges, validation, empty/error states, modal confirmation/accessibility, and period selection.

## Security notes

- Server-side ownership filters are applied to every transaction, category, budget, and recurring query.
- Helmet, CORS allow-listing, JSON body limits, and IP rate limits are enabled.
- Failed authentication responses do not reveal whether an email exists.
- CSRF uses a timing-safe double-submit comparison.
- Refresh tokens are stored only as SHA-256 hashes.
- API error logs omit request bodies, cookies, query strings, and tokens.
- In production the client is served from the API origin by Express, with all `/api` routes kept separate.

## License

This project is provided for learning and portfolio use.
