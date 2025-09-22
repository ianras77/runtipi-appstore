# Huginn

Huginn is a self-hosted automation platform (think IFTTT/Zapier, but on your server). You create **agents** that watch websites, APIs, RSS feeds, email, and more — then transform, filter, and trigger actions like webhooks, emails, posts, and chained workflows.

---

## What’s included in this app

- **Huginn web app** (Rails app with background jobs)
- **MariaDB** database (persistent)
- **Redis** for queues/caching
- Runtipi reverse proxy in front of the Huginn web UI

---

## Ports & URLs

- Internal web port: **3000** (Runtipi proxies this; you access it from your Tipi URL)
- Admin UI & app: `https://<your-tipi-domain>/` (after install)

---

## Data & persistence

| Component  | Host path                        | Container path           | Notes                    |
|------------|----------------------------------|--------------------------|--------------------------|
| MariaDB    | `${APP_DATA_DIR}/huginn/db`      | `/var/lib/mysql`         | All Huginn data lives here |
| (Optional) export | *(download from UI)*      | —                        | Use “Export” in Huginn settings |

> Backups: stop the app (or quiesce), snapshot `${APP_DATA_DIR}/huginn/db`, or run a `mysqldump` inside the DB container.

---

## First-run setup

1. **Deploy** from Runtipi.  
2. Open the app and complete the onboarding:
   - Create the first **admin user** (or use an **invitation code** if configured).
   - Set a **from** address and SMTP (optional) so agents can send email.
3. Explore the **Scenarios** page to import example agents.

---

## Environment & configuration

These environment variables are already wired by the app:

- **Database**  
  - `DATABASE_ADAPTER=mysql2`  
  - `DATABASE_HOST=db`  
  - `DATABASE_NAME=huginn`  
  - `DATABASE_USERNAME=huginn`  
  - `DATABASE_PASSWORD=<set in compose>`  

- **Redis**  
  - `REDIS_URL=redis://redis:6379`

- **Signup control (optional)**  
  - `INVITATION_CODE=<string>` — require an invite for sign-ups  
  - Leave empty to allow admin-initiated invites only

- **TLS / proxy**  
  - `FORCE_SSL=false` (Tipi terminates TLS; leave `false` unless you know you need it)

> Want SMTP? Add these envs in Runtipi **App Settings → Environment** and redeploy:  
> `EMAIL_FROM_ADDRESS`, `SMTP_DOMAIN`, `SMTP_SERVER`, `SMTP_PORT` (e.g., `587`),  
> `SMTP_AUTHENTICATION` (`plain`/`login`), `SMTP_ENABLE_STARTTLS_AUTO` (`true`/`false`),  
> `SMTP_USER_NAME`, `SMTP_PASSWORD`.

---

## Multi-user

- Huginn supports multiple users, each with their own agents and scenarios.
- Control who can sign up via `INVITATION_CODE` or keep registration closed and invite from the admin UI.

---

## Typical agent patterns

- **Fetch & parse**: RSS/Atom feeds, websites (XPath/JSONPath), REST APIs (with auth)  
- **Transform**: De-dup, merge, reformat, add fields, schedule  
- **React**: Webhook/JSON POST, email, push, post to external APIs  
- **Chain**: One agent’s event triggers the next (visualized via Scenario graph)

---

## Maintenance & upgrades

- **Update** by pulling a newer container image in Runtipi (or re-deploy).  
- **Database migrations** run automatically with the official images.  
- **Logs**: view container logs in Tipi or app logs via the admin UI.  
- **Performance**: if workloads grow, increase `DATABASE_POOL` or Redis resources (advanced).

---

## Troubleshooting

- **Login/Signup issues**: ensure `INVITATION_CODE` is correct (or remove to disable invite-only).  
- **Emails not sending**: verify all SMTP envs; check the Agent logs in the UI.  
- **No events flowing**: confirm Redis is running and the Huginn container shows “Workers started” in logs.  
- **DB permission errors**: the app expects the `huginn` user/password to match the DB service envs.

---

## Security notes

- Use strong admin credentials.  
- Restrict outbound agents or sanitize inputs if you connect to untrusted sources.  
- Keep Huginn and dependencies updated; rotate SMTP/API keys regularly.

---

## Useful links (in-app)

- **Scenarios** → import community examples  
- **Credentials** → store API keys/secrets and reference them in agents  
- **Events** → inspect data flowing between agents  
- **Scheduler** → cron-like timing for pulls & triggers
