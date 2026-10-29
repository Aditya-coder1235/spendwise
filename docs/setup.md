# Local Setup and Troubleshooting

## Requirements

- Node.js **20.19+** (the project is tested on Node 24)
- npm 10+
- MongoDB 7/8 running locally, or an Atlas cluster

Check versions:

```bash
node --version
npm --version
mongod --version
```

## Install dependencies

From the repository root:

```bash
npm install
```

The root uses npm workspaces. There is no separate install step for `client` or `server`.

## Environment files

### API: `server/.env`

```bash
cp server/.env.example server/.env
```

Generate two independent secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Fill in `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. A local configuration looks like:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/spendwise
CLIENT_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=<48-byte hex secret>
JWT_REFRESH_SECRET=<different 48-byte hex secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=false
TRUST_PROXY=
RECURRING_CRON=*/15 * * * *
```

Notes:

- The API refuses to start without secrets of at least 32 characters.
- `COOKIE_SECURE` must be `false` for plain HTTP localhost and `true` behind HTTPS. Production forces secure cookies.
- `CLIENT_ORIGIN` accepts a comma-separated list of allowed browser origins.
- `TRUST_PROXY=1` is appropriate for one reverse proxy. Set `TRUST_PROXY=false` when connecting directly without a proxy, or the correct hop count in production.
- `RECURRING_CRON` uses standard five-field cron syntax.

### Client: `client/.env`

Development uses the Vite proxy, so no client environment file is needed.

Only create one if the API is on a separate origin:

```bash
cp client/.env.example client/.env
```

```dotenv
VITE_API_URL=https://api.example.com
```

The API's `CLIENT_ORIGIN` must include the client origin. Credentials rely on CORS `credentials: true`, so wildcard origins are not supported.

## Start MongoDB

Local `mongod`:

```bash
mkdir -p /path/to/mongo-data
mongod --dbpath /path/to/mongo-data
```

Or use a service manager:

```bash
sudo systemctl start mongod
```

Atlas example:

```dotenv
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.example.mongodb.net/spendwise?retryWrites=true&w=majority
```

URL-encode special characters in the password. Add your IP to the Atlas access list.

## Seed demo data

```bash
npm run seed
```

This creates or resets `demo@spendwise.local` / `DemoPass123!` and six months of transactions, six current-month budgets, and four recurring schedules. The seed deletes only that demo user's financial records, category list, and sessions; other users are untouched.

The seed is safe to run again. It does not run migrations or touch other accounts.

## Run in development

```bash
npm run dev
```

This starts:

- API at <http://localhost:5000>
- Vite at <http://localhost:5173>
- Recurring scheduler inside the API process

Useful checks:

```bash
curl http://localhost:5000/api/health
```

Then open <http://localhost:5173>. Register an account or use the demo credentials.

## Run tests

Tests require a running MongoDB. The API suite defaults to the separate database `spendwise_test` and drops it before each test file.

```bash
npm test
```

To use another test MongoDB:

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/spendwise_ci npm run test:server
```

Or, by workspace:

```bash
npm run test:server
npm run test:client
```

Test commands are serialised (`--test-concurrency=1`) to avoid files dropping each other's data.

## Lint and production build

```bash
npm run lint
npm run build
```

The build output is `client/dist`.

## Troubleshooting

### `JWT_ACCESS_SECRET must be set...`

Create `server/.env` from `server/.env.example` and set both JWT secrets to random values of at least 32 characters.

### `Failed to start SpendWise: connect ECONNREFUSED`

MongoDB is not running or `MONGODB_URI` is wrong. Verify:

```bash
mongosh "mongodb://127.0.0.1:27017/spendwise" --eval "db.runCommand({ ping: 1 })"
```

### Login succeeds but API calls return `401`

- Confirm requests include cookies (`withCredentials: true` in Axios, or same-origin via the Vite proxy).
- If using separate origins, set `VITE_API_URL` and add the client origin to `CLIENT_ORIGIN`.
- Do not set `COOKIE_SECURE=true` while testing over plain HTTP.

### Mutations fail with `403 CSRF_FAILED`

The client must read `sw_csrf` and send it as `X-CSRF-Token`. The included Axios layer does this automatically. If testing with curl, capture cookies with `-c` and read `sw_csrf` from the cookie jar.

### Browser requests blocked by CORS

`CLIENT_ORIGIN` must contain the exact origin, including scheme and port (for example `http://localhost:5173`, not `localhost:5173`). Multiple origins are comma-separated.

### Recurring schedules appear but no transactions are created

- Check `nextOccurrence` is today or in the past.
- Check the schedule is `active`.
- Click Process due or wait for the cron job; the server runs it every 15 minutes and shortly after startup.
- Generated transactions show `recurrenceId`/`recurrenceOccurrence`. They are not counted twice even if processing is repeated.

### Tests cannot connect to MongoDB

Start MongoDB and ensure `TEST_MONGODB_URI` points to a disposable database. The tests drop the database; never point them at production data.

### Port already in use

Change `PORT` in `server/.env` and the proxy target in `client/vite.config.js`, or stop the process using the port:

```bash
ss -ltnp | grep -E '5000|5173'
```
