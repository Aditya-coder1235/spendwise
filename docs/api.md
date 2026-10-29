# SpendWise API

Base URL in development: `http://localhost:5000/api`.

All responses use JSON except CSV export. Successful responses have the shape:

```json
{ "success": true, "data": {} }
```

Errors have the shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please check the highlighted fields and try again.",
    "details": [{ "field": "amount", "message": "Amount must be positive" }]
  }
}
```

## Authentication and request rules

Authentication uses HttpOnly cookies:

| Cookie | Lifetime | Path | Notes |
| --- | --- | --- | --- |
| `sw_access` | 15 minutes by default | `/` | Signed access JWT, HttpOnly |
| `sw_refresh` | 7 days by default | `/api/auth` | Hashed session record, rotates on refresh, HttpOnly |
| `sw_csrf` | 7 days by default | `/` | Readable by the client and sent as `X-CSRF-Token` |

- Send cookies with `credentials: 'include'` (Axios: `withCredentials: true`).
- For every `POST`, `PUT`, `PATCH`, or `DELETE` request, send the `sw_csrf` value in the `X-CSRF-Token` header.
- Login, registration, and refresh are exempt from the CSRF double-submit check.
- In development, Vite proxies `/api` to `http://localhost:5000`, so the browser remains same-origin.
- Auth endpoints are limited to 30 attempts per 15 minutes per IP. The general API limit is 600 requests per 15 minutes per IP.

The API uses half-open date ranges (`>= startDate` and `< day after endDate`) with UTC calendar-day boundaries. Dates are `YYYY-MM-DD`; months are `YYYY-MM`.

Money inputs are decimal strings or numbers, for example `"1250.50"`, and are converted exactly to paise. Responses return integer paise fields.

## Health

### `GET /health`

No authentication.

```json
{ "success": true, "data": { "status": "ok" } }
```

## Auth

### `POST /auth/register`

Public. Creates a user, default categories, a session, and sets auth cookies.

```json
{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "password": "TestPass123",
  "confirmPassword": "TestPass123"
}
```

Validation: name 2–80 characters; valid email; password 8–72 characters with lower-case, upper-case, and numeric characters; passwords must match.

Response `201`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "665f...",
      "name": "Asha Rao",
      "email": "asha@example.com",
      "preferredCurrency": "INR",
      "theme": "light",
      "dateFormat": "DD/MM/YYYY",
      "warningThreshold": 80,
      "createdAt": "2026-10-28T10:00:00.000Z"
    }
  }
}
```

### `POST /auth/login`

Public.

```json
{ "email": "asha@example.com", "password": "TestPass123" }
```

Returns the same user shape as registration. Invalid credentials return `401 INVALID_CREDENTIALS`.

### `POST /auth/refresh`

Public and CSRF-exempt. Requires the refresh cookie. Rotates the refresh token and issues a new access token and CSRF cookie.

```json
{ "success": true, "data": { "user": {} } }
```

If the session is missing, expired, or has been replayed, returns `401 REFRESH_MISSING` / `REFRESH_INVALID` and clears auth cookies.

### `POST /auth/logout`

Requires authentication and CSRF. Deletes the current refresh session and clears all auth cookies.

### `GET /auth/me`

Requires authentication. Returns the current user.

### `PUT /auth/profile`

Requires authentication and CSRF. All fields are optional.

```json
{
  "name": "Asha Rao",
  "preferredCurrency": "INR",
  "dateFormat": "DD/MM/YYYY",
  "theme": "dark",
  "warningThreshold": 85
}
```

Supported values:

- `preferredCurrency`: `INR`, `USD`, `EUR`, `GBP`, `AED`
- `dateFormat`: `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`
- `theme`: `light`, `dark`
- `warningThreshold`: 50–100 (percentage of a budget at which a warning is shown)

### `PUT /auth/password`

Requires authentication and CSRF. Revokes all refresh sessions and clears cookies.

```json
{ "currentPassword": "TestPass123", "newPassword": "NewTestPass456" }
```

## Transactions

All transaction routes require authentication. Every query is scoped to the current user; another user's record returns `404`.

### `GET /transactions`

Query parameters:

| Parameter | Type | Description |
| --- | --- | --- |
| `search` | string, max 100 | Case-insensitive description/merchant search |
| `type` | `income` / `expense` | Filter by type |
| `categoryId` | ObjectId | Filter by category |
| `paymentMethod` | enum | `cash`, `card`, `upi`, `bank_transfer`, `net_banking`, `wallet`, `other` |
| `startDate`, `endDate` | date | Both required together; inclusive calendar-day range |
| `sort` | enum | `date_desc` (default), `date_asc`, `amount_desc`, `amount_asc` |
| `page` | integer | Default `1` |
| `limit` | integer | Default `20`, max `100` |

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "665f...",
        "userId": "665e...",
        "type": "expense",
        "amountPaise": 125050,
        "amount": 1250.5,
        "category": {
          "id": "665d...",
          "name": "Food & groceries",
          "type": "expense",
          "color": "#f97316",
          "icon": "utensils"
        },
        "description": "Weekly groceries",
        "merchant": "More Supermarket",
        "paymentMethod": "card",
        "date": "2026-10-15T00:00:00.000Z",
        "tags": ["essentials"],
        "notes": "",
        "recurrenceId": null,
        "recurrenceOccurrence": null,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

### `POST /transactions`

Requires CSRF.

```json
{
  "type": "expense",
  "amount": "1250.50",
  "categoryId": "665d...",
  "description": "Weekly groceries",
  "merchant": "More Supermarket",
  "paymentMethod": "card",
  "date": "2026-10-15",
  "tags": ["essentials"],
  "notes": "Two weeks of groceries"
}
```

`categoryId` must belong to the current user and match `type`. Returns `201` with `{ transaction }`.

### `GET /transactions/:id`

Returns `{ transaction }` or `404 TRANSACTION_NOT_FOUND`.

### `PUT /transactions/:id`

Requires CSRF and the same full payload as create. Returns `{ transaction }`.

### `DELETE /transactions/:id`

Requires CSRF. Returns `{ id }`.

## Categories

Default categories are copied to each user at registration. They can be used but cannot be renamed or deleted. Custom categories are per-user.

### `GET /categories`

Optional query `type=income|expense`. Returns `{ categories: [...] }`, sorted by type and name.

### `POST /categories`

Requires CSRF.

```json
{
  "name": "Pet care",
  "type": "expense",
  "color": "#2f855a",
  "icon": "paw-print"
}
```

Names are unique per user and type, case-insensitively. `color` must be a six-digit hex colour. Returns `201` with `{ category }`.

### `PUT /categories/:id`

Requires CSRF.

```json
{ "name": "Pets & vet", "color": "#805ad5", "icon": "heart" }
```

Renaming a default category returns `409 DEFAULT_CATEGORY`.

### `DELETE /categories/:id`

Requires CSRF. Default categories return `409 DEFAULT_CATEGORY`. Categories referenced by any transaction, budget, or recurring schedule return `409 CATEGORY_IN_USE`.

## Budgets

Budgets are monthly limits. `categoryId: null` is the overall monthly expense budget; a category budget must reference an expense category. Only one budget may exist per user, month, and category.

### `GET /budgets?period=YYYY-MM`

Defaults to the current month. The response includes:

```json
{
  "success": true,
  "data": {
    "period": "2026-10",
    "totalSpentPaise": 250000,
    "overall": {
      "id": "665f...",
      "period": "2026-10",
      "monthlyLimitPaise": 400000,
      "spentPaise": 250000,
      "remainingPaise": 150000,
      "percentage": 62.5,
      "status": "ok"
    },
    "categories": [
      {
        "id": "665f...",
        "period": "2026-10",
        "monthlyLimitPaise": 150000,
        "spentPaise": 200000,
        "remainingPaise": -50000,
        "percentage": 133.3,
        "status": "exceeded",
        "category": { "id": "665d...", "name": "Food & groceries", "type": "expense", "color": "#f97316", "icon": "utensils" }
      }
    ],
    "exceededCount": 1,
    "warningCount": 0
  }
}
```

Statuses are `ok` (below the user's warning threshold), `warning` (at/above the threshold but below 100%), and `exceeded` (100% or more). If no overall budget exists, `overall` is `null`.

### `POST /budgets`

Requires CSRF.

```json
{
  "categoryId": null,
  "period": "2026-10",
  "monthlyLimit": "4000"
}
```

Returns `201` with `{ budget }`. Duplicate user/month/category returns `409 BUDGET_EXISTS`.

### `PUT /budgets/:id`

Requires CSRF.

```json
{ "monthlyLimit": "4500" }
```

### `DELETE /budgets/:id`

Requires CSRF. Returns `{ id }`.

## Dashboard

### `GET /dashboard/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Both dates are optional; if omitted, the API defaults to the current month through today. Both must be supplied together.

The response includes:

- `range` and `previousRange`
- `incomePaise`, `expensePaise`, `netSavingsPaise`, `transactionCount`, `savingsRate`
- `totalBalancePaise`, `allTimeIncomePaise`, `allTimeExpensePaise`
- `comparison` with previous amounts and percentage changes
- `budget` for the month containing `endDate`, using the same shape as `GET /budgets`
- `categoryBreakdown` for expenses with percentages
- `recentTransactions` (up to five) inside the selected range

Calendar-month ranges compare with the equivalent previous month; other ranges compare with the immediately preceding range of the same length.

## Analytics

All analytics routes require authentication and accept optional `startDate`/`endDate` (defaults to the current month through today). Date range validation returns `422 INVALID_DATE_RANGE`.

### `GET /analytics/categories?type=expense`

Returns `{ type, totalPaise, items: [{ categoryId, name, color, icon, type, amountPaise, count, percentage }], range }`.

### `GET /analytics/top-categories?type=expense`

Same shape as categories, limited to the top five.

### `GET /analytics/trends`

Returns zero-filled monthly totals across the range:

```json
{
  "success": true,
  "data": {
    "trends": [
      { "period": "2026-09", "incomePaise": 500000, "expensePaise": 100000, "netPaise": 400000 },
      { "period": "2026-10", "incomePaise": 1000000, "expensePaise": 250000, "netPaise": 750000 }
    ],
    "range": { "startDate": "2026-09-01", "endDate": "2026-10-31" }
  }
}
```

### `GET /analytics/income-expenses`

Alias of `GET /analytics/trends`.

### `GET /analytics/daily?month=YYYY-MM&type=expense`

Returns every calendar day in the month, zero-filled:

```json
{
  "success": true,
  "data": {
    "month": "2026-10",
    "type": "expense",
    "days": [{ "date": "2026-10-01", "amountPaise": 0, "count": 0 }]
  }
}
```

## Recurring schedules

Recurring schedules are templates. They are never returned as normal transactions until the scheduler processes a due occurrence. Generated transactions include `recurrenceId` and `recurrenceOccurrence`, and a unique partial index prevents duplicates.

### `GET /recurring-transactions`

Returns `{ items: [...] }`, active schedules first, then by next occurrence.

### `POST /recurring-transactions`

Requires CSRF.

```json
{
  "type": "expense",
  "amount": "99.00",
  "categoryId": "665d...",
  "description": "Music subscription",
  "merchant": "Soundwave",
  "paymentMethod": "card",
  "tags": ["subscription"],
  "notes": "",
  "frequency": "monthly",
  "nextOccurrence": "2026-11-01",
  "endDate": null,
  "active": true
}
```

`frequency` is `weekly`, `monthly`, or `yearly`. `endDate` may be `null` and must be on or after `nextOccurrence`. The category must belong to the user and match the type. Returns `201` with `{ recurring }`.

### `PUT /recurring-transactions/:id`

Requires CSRF and the full create payload. Use this to edit details or pause/resume with `active`.

### `DELETE /recurring-transactions/:id`

Requires CSRF. Generated real transactions are retained.

### `POST /recurring-transactions/process`

Requires authentication and CSRF. Processes due schedules belonging to the current user, creates one real transaction per missed occurrence, and advances each schedule. Safe to call repeatedly.

```json
{ "success": true, "data": { "processed": 1, "createdCount": 1 } }
```

The server also runs a global scheduler every 15 minutes by default (`RECURRING_CRON`) and shortly after startup.

## Reports and CSV

### `GET /reports/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Both dates are optional; defaults to the current month through today. Returns:

- `range`, `previousRange`
- `totals` (`incomePaise`, `expensePaise`, counts, transaction count)
- `netSavingsPaise`, `savingsRate`
- `comparison` including previous amounts and percentage changes
- `categoryBreakdown` (expenses) and `incomeBreakdown` (income)
- `monthlySummaries` across every month in the range, including income/expense/net/count fields

### `GET /reports/export`

Downloads a UTF-8 CSV attachment with a BOM. Accepts the same filters as `GET /transactions` and is limited to 10,000 rows. The export respects `search`, `type`, `categoryId`, `paymentMethod`, date range, and sort. The client requests the whole filtered range.

Columns: Date, Type, Category, Description, Merchant, Amount, Currency, Payment method, Tags, Notes.

Cells are quoted, embedded quotes are doubled, and spreadsheet formula-leading values are neutralised with a leading apostrophe.

## Common error codes

| HTTP | Code | Meaning |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED`, `TOKEN_INVALID`, `SESSION_INVALID` | No valid access session |
| 401 | `REFRESH_MISSING`, `REFRESH_INVALID` | Refresh unavailable or replayed |
| 401 | `INVALID_CREDENTIALS` | Login failed |
| 403 | `CSRF_FAILED` | Missing/mismatched CSRF token |
| 403 | `CORS_BLOCKED` | Origin not allow-listed |
| 404 | `*_NOT_FOUND` | Record absent or owned by another user |
| 409 | `EMAIL_IN_USE`, `DUPLICATE`, `BUDGET_EXISTS`, `CATEGORY_IN_USE`, `DEFAULT_CATEGORY` | Conflict |
| 422 | `VALIDATION_FAILED` | Zod/Mongoose validation or category/date rules |
| 422 | `INVALID_DATE_RANGE` | Only one bound, or start after end |
| 422 | `CATEGORY_TYPE_MISMATCH`, `INVALID_CATEGORY` | Invalid category ownership/type |
| 429 | `RATE_LIMITED` | Limit reached |
| 500 | `INTERNAL_ERROR` | Unexpected server failure |
