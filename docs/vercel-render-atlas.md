# Deploy: Vercel (client) + Render (API) + MongoDB Atlas (free tier)

This is the zero-cost split deployment: the React client is static on Vercel, the Express API runs on Render, and MongoDB lives on Atlas M0.

The repository already contains the deployment config:

| File | Purpose |
| --- | --- |
| `render.yaml` | Render Blueprint for the API (free web service, health check, env vars) |
| `vercel.json` | Vercel build settings, `/api` proxy, SPA fallback, and rewrite-cache opt-out |
| `scripts/set-api-url.mjs` | Updates the Vercel proxy destination to your real Render URL |

Use these names throughout the guide unless you change them:

| Thing | Value |
| --- | --- |
| GitHub repo | `Aditya-coder1235/spendwise` |
| Render service | `spendwise-api` → `https://spendwise-api.onrender.com` |
| Vercel project | `spendwise` → `https://spendwise.vercel.app` (or the URL Vercel gives you) |
| Atlas database | `spendwise` |

## 0. Push the deployment config

The deployment files must be on GitHub before Render or Vercel can see them.

```bash
git add package.json render.yaml scripts vercel.json docs README.md
git commit -m "Add Vercel + Render + Atlas deployment setup"
git push origin main
```

Confirm the files are visible in the GitHub repo before continuing.

## Why the client proxy matters

SpendWise authenticates with cookies (`sw_access`, `sw_refresh`, `sw_csrf`) that are set with `sameSite: 'lax'`.

If `https://your-app.vercel.app` calls `https://your-api.onrender.com` directly, every request is **cross-site** and the browser will not send those cookies. Safari blocks third-party cookies outright.

The fix used here is a Vercel rewrite: the browser calls `/api/...` on the Vercel domain, and Vercel proxies it to Render. The browser sees a single origin, so the cookies are first-party and no server code has to change.

For that reason:

- Do **not** set `VITE_API_URL` on Vercel. Leaving it empty makes Axios use relative `/api/...` paths.
- Do not point the rewrites at a URL with a trailing slash.
- Keep the `x-vercel-enable-rewrite-caching: 0` header in `vercel.json`. Projects created after April 6, 2026 cache external rewrites by default, and caching authenticated API responses would leak one user's data to another.

## 1. MongoDB Atlas (free M0)

1. Create a free account at <https://cloud.mongodb.com>.
2. **Create a cluster** → **M0 Free** → provider **AWS** → region **Singapore (ap-southeast-1)**. Singapore matches the Render region in `render.yaml` and keeps latency low.
3. **Database Access** → **Add New Database User**:
   - Authentication: **Password**
   - Username: `spendwise`
   - Password: generate a long random password and save it in a password manager
   - Database User Privileges: **Specific Privilege** → **readWrite** on database `spendwise`
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Render's free tier has no static outbound IPs, so an allow-list is not possible without upgrading.
   - Compensate with a strong, unique password and never enable public demo seeding.
5. **Connect** → **Drivers** → copy the SRV string and add the database name:

```text
mongodb+srv://spendwise:URL_ENCODED_PASSWORD@cluster0.xxxxx.mongodb.net/spendwise?retryWrites=true&w=majority
```

URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `:` → `%3A`).

M0 includes 512 MB of storage, which is far more than this app needs: every amount is stored as an integer paise value.

## 2. Render (API, free web service)

Push the repo to GitHub first, then either use the Blueprint or create the service manually.

### Option A — Blueprint (recommended)

1. Render Dashboard → **New** → **Blueprint**.
2. Select the `Aditya-coder1235/spendwise` repository.
3. Render reads `render.yaml` and creates `spendwise-api`.
4. When prompted for the `sync: false` values, enter:

| Key | Value |
| --- | --- |
| `MONGODB_URI` | Your Atlas SRV string from step 1 |
| `CLIENT_ORIGIN` | `https://spendwise.vercel.app` (or your real Vercel URL) |
| `JWT_ACCESS_SECRET` | First 48-byte random hex value |
| `JWT_REFRESH_SECRET` | Second, different 48-byte random hex value |

Generate the secrets locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

5. Click **Apply**. Wait for the first deploy to finish.

### Option B — Manual web service

| Setting | Value |
| --- | --- |
| Language / Runtime | Node |
| Root Directory | *(leave empty — the repo root)* |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free |
| Region | Singapore |

Add the same environment variables listed above, plus the defaults from `render.yaml`:

```dotenv
NODE_ENV=production
NODE_VERSION=22
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=true
TRUST_PROXY=1
RECURRING_CRON=*/15 * * * *
```

Notes:

- **Do not set `PORT`.** Render injects its own and the app already reads `process.env.PORT`.
- The API refuses to boot with JWT secrets shorter than 32 characters.
- `CLIENT_ORIGIN` is still required even though traffic is proxied: Vercel forwards the browser's `Origin` header, which the CORS middleware validates.
- If you also open the `onrender.com` URL directly, add it to `CLIENT_ORIGIN` as a comma-separated second value.
- If `spendwise-api` is already taken, Render will give you a different hostname. Use that hostname in step 3.

After the first deploy, confirm the health endpoint:

```bash
curl -fsS https://spendwise-api.onrender.com/api/health
# {"success":true,"data":{"status":"ok"}}
```

The first request after a sleep can take 30–60 seconds. That is normal on the free tier.

## 3. Vercel (client, free Hobby)

1. **Add New** → **Project** and import the same GitHub repo.
2. Root Directory: **leave empty** (the repo root). This lets npm workspaces resolve `client` and `server`.
3. Framework Preset: **Other** (or **Vite**). `vercel.json` supplies the build command and output directory either way.
4. Environment variables: **none**. `VITE_API_URL` must stay unset.
5. Point the proxy at your real Render URL. From the repo root:

```bash
npm run set:api -- https://spendwise-api.onrender.com
```

If your Render URL is different, pass that instead. The script rewrites only the `/api/:path*` destination in `vercel.json` and removes any trailing slash.

6. Commit and push the updated `vercel.json`, then deploy (or click **Redeploy**):

```bash
git add vercel.json
git commit -m "Point Vercel proxy at Render API"
git push origin main
```

`vercel.json` does four things:

- builds only the client (`npm run build -w client`) into `client/dist`
- proxies `/api/*` to Render so cookies stay first-party
- disables Vercel's external-rewrite cache for `/api/*`
- falls back to `index.html` for client-side routes such as `/transactions` or `/budgets`

## 4. Wire the two domains together

The order matters: Render needs the Vercel URL, and Vercel needs the Render URL.

1. Deploy Render first and copy its URL.
2. Run `npm run set:api -- https://<render-url>` and push, so Vercel proxies to the right API.
3. Deploy Vercel and copy its production URL.
4. In Render → `spendwise-api` → **Environment**, set `CLIENT_ORIGIN` to the Vercel production URL (no trailing slash).
5. Save. Render redeploys automatically. Wait for the health check to pass.

If you change either URL later, update both sides.

## 5. Verification

1. Open `https://your-app.vercel.app/api/health` — it should return the same JSON through the proxy.
2. Register a disposable account.
3. In DevTools → Application → Cookies you should see `sw_access`, `sw_refresh`, `sw_csrf` on the **Vercel** domain, with the first two marked `HttpOnly` and all three `Secure`.
4. Add a transaction, set a budget, download a CSV report.
5. Reload the page and confirm you stay signed in (that exercises the rotating refresh cookie).
6. Open `https://your-app.vercel.app/transactions` directly and confirm the SPA fallback works.
7. Confirm a second request to `/api/dashboard/summary` is not served from Vercel's cache (the response should differ after you add a transaction).

## 6. Optional: demo data

Registration creates the default categories automatically, so seeding is not required.

To load the six-month demo data set on Atlas, run this from your machine **only if you accept that the public demo account will exist**:

```bash
cd server
MONGODB_URI="mongodb+srv://spendwise:...@cluster0.xxxxx.mongodb.net/spendwise?retryWrites=true&w=majority" npm run seed
```

Demo credentials:

```text
Email:    demo@spendwise.local
Password: DemoPass123!
```

Change or delete that account immediately if the site is public.

## 7. Free-tier caveats

- **Cold starts.** Render free services sleep after ~15 minutes of inactivity; the first request then takes 30–60 s. The recurring scheduler also only runs while the service is awake. A free uptime pinger (e.g. cron-job.org hitting `/api/health` every 10–14 minutes) keeps it warm; one service running 24/7 stays inside the 750 free instance-hours per month.
- **Vercel proxy timeout.** A Render cold start can outlast Vercel's proxy timeout. If `/api/health` through Vercel times out, open the Render URL directly once to wake it, then retry.
- **Preview deployments.** Vercel preview URLs (`spendwise-git-<branch>-<user>.vercel.app`) are not in `CLIENT_ORIGIN`, so their API calls are rejected. Test on the production domain, or add each preview origin to `CLIENT_ORIGIN`.
- **Rate limits.** The limiter is in-memory per instance (`600` requests / 15 min). Behind the Vercel proxy every request appears to come from Vercel's egress, so the limit is shared rather than per user. Acceptable for a portfolio app; use a shared store for anything real.
- **Do not run `npm run seed` against Atlas** unless you want the public `demo@spendwise.local` / `DemoPass123!` account exposed. If you do, change that password immediately.
- **Schema/index creation.** Indexes are created by Mongoose on first use; no migration step is needed.
- **Atlas M0 limits.** 512 MB storage and shared CPU. Fine for this app; upgrade if you add large exports or many users.
