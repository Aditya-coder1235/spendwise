# Deploy: Vercel (client) + Render (API) + MongoDB Atlas (free tier)

This is the zero-cost split deployment: the React client is static on Vercel, the Express API runs on Render, and MongoDB lives on Atlas M0.

## Why the client proxy matters

SpendWise authenticates with cookies (`sw_access`, `sw_refresh`, `sw_csrf`) that are set with `sameSite: 'lax'`.

If `https://your-app.vercel.app` calls `https://your-api.onrender.com` directly, every request is **cross-site** and the browser will not send those cookies. Safari blocks third-party cookies outright.

The fix used here is a Vercel rewrite: the browser calls `/api/...` on the Vercel domain, and Vercel proxies it to Render. The browser sees a single origin, so the cookies are first-party and no server code has to change.

For that reason:

- Do **not** set `VITE_API_URL` on Vercel. Leaving it empty makes Axios use relative `/api/...` paths.
- Do not point the rewrites at a URL with a trailing slash.

## 1. MongoDB Atlas (free M0)

1. Create a free M0 cluster at <https://cloud.mongodb.com> in a region close to your Render region.
2. **Database Access** → add a user, e.g. `spendwise`, with **Read and write to any database**.
3. **Network Access** → add `0.0.0.0/0`. Render's free tier has no static outbound IPs, so an allow-list is not possible without upgrading.
   - Compensate with a strong, unique password and never enable public demo seeding.
4. **Connect → Drivers** and copy the SRV string, adding the database name:

```text
mongodb+srv://spendwise:URL_ENCODED_PASSWORD@cluster0.xxxxx.mongodb.net/spendwise?retryWrites=true&w=majority
```

URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `:` → `%3A`).

M0 includes 512 MB of storage, which is far more than this app needs: every amount is stored as an integer paise value.

## 2. Render (API, free web service)

Push the repo to GitHub first, then **New → Web Service** and select it.

| Setting | Value |
| --- | --- |
| Language / Runtime | Node |
| Root Directory | *(leave empty — the repo root)* |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free |

Environment variables:

```dotenv
NODE_ENV=production
MONGODB_URI=mongodb+srv://spendwise:...@cluster0.xxxxx.mongodb.net/spendwise?retryWrites=true&w=majority
CLIENT_ORIGIN=https://your-app.vercel.app
JWT_ACCESS_SECRET=<48-byte random hex>
JWT_REFRESH_SECRET=<a different 48-byte random hex>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=true
TRUST_PROXY=1
RECURRING_CRON=*/15 * * * *
```

Generate the two secrets locally and paste the output:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Notes:

- **Do not set `PORT`.** Render injects its own and the app already reads `process.env.PORT`.
- The API refuses to boot with JWT secrets shorter than 32 characters.
- `CLIENT_ORIGIN` is still required even though traffic is proxied: Vercel forwards the browser's `Origin` header, which the CORS middleware validates.
- If you also open the `onrender.com` URL directly, add it to `CLIENT_ORIGIN` as a comma-separated second value.

After the first deploy, confirm the health endpoint:

```bash
curl -fsS https://your-api.onrender.com/api/health
# {"success":true,"data":{"status":"ok"}}
```

## 3. Vercel (client, free Hobby)

1. **Add New → Project** and import the same GitHub repo.
2. Root Directory: **leave empty** (the repo root). This lets npm workspaces resolve `client` and `server`.
3. Framework Preset: **Vite**. `vercel.json` already supplies the build command and output directory.
4. Environment variables: **none**. `VITE_API_URL` must stay unset.
5. Edit `vercel.json` in the repo and replace the placeholder destination with your Render URL:

```json
{ "source": "/api/:path*", "destination": "https://your-api.onrender.com/api/:path*" }
```

Then deploy.

`vercel.json` does three things:

- builds only the client (`npm run build -w client`) into `client/dist`
- proxies `/api/*` to Render so cookies stay first-party
- falls back to `index.html` for client-side routes such as `/transactions` or `/budgets`

## 4. Verification

1. Open `https://your-app.vercel.app/api/health` — it should return the same JSON through the proxy.
2. Register a disposable account.
3. In DevTools → Application → Cookies you should see `sw_access`, `sw_refresh`, `sw_csrf` on the **Vercel** domain, with the first two marked `HttpOnly` and all three `Secure`.
4. Add a transaction, set a budget, download a CSV report.
5. Reload the page and confirm you stay signed in (that exercises the rotating refresh cookie).

## 5. Free-tier caveats

- **Cold starts.** Render free services sleep after ~15 minutes of inactivity; the first request then takes 30–60 s. The recurring scheduler also only runs while the service is awake. A free uptime pinger (e.g. cron-job.org hitting `/api/health` every 10–14 minutes) keeps it warm; one service running 24/7 stays inside the 750 free instance-hours per month.
- **Preview deployments.** Vercel preview URLs (`spendwise-git-<branch>-<user>.vercel.app`) are not in `CLIENT_ORIGIN`, so their API calls are rejected. Test on the production domain, or add each preview origin to `CLIENT_ORIGIN`.
- **Rate limits.** The limiter is in-memory per instance (`600` requests / 15 min). Behind the Vercel proxy every request appears to come from Vercel's egress, so the limit is shared rather than per user. Acceptable for a portfolio app; use a shared store for anything real.
- **Do not run `npm run seed` against Atlas** unless you want the public `demo@spendwise.local` / `DemoPass123!` account exposed. If you do, change that password immediately.
- **Schema/index creation.** Indexes are created by Mongoose on first use; no migration step is needed.
