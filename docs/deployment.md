# Production Deployment

SpendWise is a single Node.js service in production: Express serves both the API and the built React client from the same origin. MongoDB is the only external stateful dependency.

> Deploying the client to Vercel and the API to Render instead? See [Vercel + Render + Atlas](vercel-render-atlas.md). That setup proxies `/api` through Vercel so cookie auth keeps working across origins.

## 1. Build

From the repository root on the deployment host or CI runner:

```bash
npm ci
npm run lint
npm test
npm run build
```

The production API serves files from `client/dist` when `server/src/app.js` starts. Build before starting the server.

> Tests require MongoDB. If the build host has no MongoDB, run tests in CI against a disposable test database, or run `npm run build` separately.

## 2. Production environment

Create `server/.env` with strong, distinct secrets:

```dotenv
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.example.mongodb.net/spendwise?retryWrites=true&w=majority
CLIENT_ORIGIN=https://spendwise.example.com
JWT_ACCESS_SECRET=<48+ random characters>
JWT_REFRESH_SECRET=<different 48+ random characters>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=true
TRUST_PROXY=1
RECURRING_CRON=*/15 * * * *
```

Production rules enforced by the API:

- `COOKIE_SECURE=true` is required and cookies are marked secure when `NODE_ENV=production`.
- JWT secrets must be at least 32 characters.
- `CLIENT_ORIGIN` should contain the public HTTPS origin.
- `TRUST_PROXY` must match the reverse-proxy setup so rate limiting and client IPs are accurate. Use `1` for one nginx/ALB hop, `false` for direct connections.

Do **not** run `npm run seed` against a real production database unless you intentionally want the public demo account. If you do, change its password immediately.

## 3. Run the service

```bash
NODE_ENV=production npm start
```

Or use a process manager.

### systemd example

`/etc/systemd/system/spendwise.service`:

```ini
[Unit]
Description=SpendWise
After=network.target

[Service]
Type=simple
User=spendwise
WorkingDirectory=/srv/spendwise
EnvironmentFile=/srv/spendwise/server/.env
ExecStart=/usr/bin/node /srv/spendwise/server/src/server.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now spendwise
sudo systemctl status spendwise
journalctl -u spendwise -f
```

The service handles `SIGTERM`/`SIGINT` with a graceful shutdown of HTTP connections, the scheduler, and MongoDB.

### PM2 alternative

```bash
npm install -g pm2
pm2 start server/src/server.js --name spendwise --env production
pm2 save
pm2 startup
```

## 4. Reverse proxy and HTTPS

Terminate TLS at nginx (or a managed load balancer) and proxy all traffic, including `/api` and static assets, to the Node service. Keeping the client and API on one origin avoids cross-site cookie complications.

```nginx
server {
    listen 80;
    server_name spendwise.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name spendwise.example.com;

    ssl_certificate     /etc/letsencrypt/live/spendwise.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/spendwise.example.com/privkey.pem;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

With one nginx hop, keep `TRUST_PROXY=1`. Restrict port `5000` to localhost/private networking so clients cannot bypass TLS.

## 5. MongoDB

- Use MongoDB Atlas or a managed MongoDB 7/8 deployment with authentication and TLS.
- Restrict network access to the application servers.
- Enable automated backups and point-in-time recovery if available.
- Create the database and let the application create indexes on startup.
- Use a dedicated database user with read/write access only to the SpendWise database.
- For self-hosted MongoDB, keep it on a private network and never expose port 27017 publicly.

SpendWise stores all amounts as integer paise, so totals are not affected by floating-point round-off.

## 6. Recurring scheduler

Each API process starts a cron job (`RECURRING_CRON`, default every 15 minutes) and runs a catch-up pass shortly after boot. Users can also trigger processing from the Recurring page.

The transaction upsert and schedule compare-and-set make processing idempotent, including concurrent workers. Running multiple API instances is safe, although you may choose to run the scheduler on only one instance to avoid redundant work.

## 7. Health checks and monitoring

- Liveness/readiness endpoint: `GET /api/health`
- Expect HTTP `200` with `{"success":true,"data":{"status":"ok"}}`.
- Monitor HTTP 5xx rates and MongoDB availability.
- Application logs include method, path, status, and response time; request bodies, cookies, query strings, and tokens are deliberately omitted.
- Rate limits are in-memory per process. If you run multiple instances behind a load balancer, each instance has its own counters. Use a shared store for the rate limiter if strict global limits are required.

## 8. Static assets and caching

Express serves `client/dist` with a one-year cache for fingerprinted assets. `index.html` is served explicitly for client-side routes without a long cache. Vite emits content-hashed filenames.

After deploying a new build, restart the Node process so it serves the updated files and starts the current server code.

## 9. Verification after deployment

```bash
curl -fsS https://spendwise.example.com/api/health
```

Then, in a browser:

1. Register a disposable account.
2. Confirm secure cookies in developer tools (`sw_access`, `sw_refresh`, `sw_csrf`; the first two HttpOnly).
3. Add and edit a transaction.
4. Set a budget and confirm its progress state.
5. Create a recurring schedule with today's occurrence, process it once, and confirm a second process adds no duplicate.
6. Download a CSV from Reports.
7. Sign out and confirm protected routes redirect to login.

## 10. Scaling notes

- The API is stateless apart from MongoDB and in-process rate counters.
- Refresh sessions are persisted, so multiple instances can verify the same sessions.
- Recurring processing is guarded by a unique partial index and compare-and-set updates.
- For very large transaction volumes, keep date filters and pagination in use; export is intentionally capped at 10,000 rows.
- Put the Node service behind a load balancer only when all instances share the same MongoDB and JWT/session configuration.
