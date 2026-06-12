# EasyCaseload — Production Deployment Runbook

_Created: 2026-06-12. Commands are run by Joe over SSH (`root@67.207.83.48`) unless marked LOCAL._

This is the canonical deploy procedure. Stage order matters: DNS first (propagation time),
Supabase config second, container third, Caddy last (it can only issue certs once DNS
resolves to the droplet).

---

## Stage 1 — DNS (registrar dashboard, not SSH)

The domain currently points at **Vercel** (an old deployment):
- `easycaseload.com` → A `216.198.79.1` (Vercel)
- `www.easycaseload.com` → CNAME `*.vercel-dns-017.com`

Change to:

| Host | Type | Value |
|---|---|---|
| `easycaseload.com` (`@`) | A | `67.207.83.48` |
| `www` | A | `67.207.83.48` (replace the Vercel CNAME) |

Optional cleanup: remove the domain from the old Vercel project so it stops attempting
to serve it. Not strictly required once DNS repoints.

Verify propagation before Stage 5 (Caddy):

```bash
# On the droplet (or anywhere):
dig +short easycaseload.com
dig +short www.easycaseload.com
# Both must return 67.207.83.48
```

---

## Stage 2 — Discovery (SSH, read-only)

Paste the output of these back into the Claude Code session so the Caddy block in
Stage 5 can match the proven pattern used by the other apps:

```bash
docker ps --format '{{.Names}}' | grep -i caddy
# Then, depending on whether Caddy is a container or a host service:
docker exec $(docker ps --format '{{.Names}}' | grep -i caddy | head -1) cat /etc/caddy/Caddyfile 2>/dev/null \
  || cat /etc/caddy/Caddyfile
```

---

## Stage 3 — Supabase: production redirect URLs (SSH)

```bash
cd /root/supabase/docker
grep '^ADDITIONAL_REDIRECT_URLS' .env
```

Append the production URLs (this keeps whatever is already there):

```bash
sed -i 's#^ADDITIONAL_REDIRECT_URLS=.*#&,https://easycaseload.com/**,https://www.easycaseload.com/**#' .env
grep '^ADDITIONAL_REDIRECT_URLS' .env   # verify before restarting
docker compose up -d auth               # restart GoTrue with the new value
```

---

## Stage 4 — App container (LOCAL scp + SSH)

**SSH** — clone the repo:

```bash
mkdir -p /root/apps && cd /root/apps
git clone https://github.com/joe203/easycaseload.git easycaseload
```

**LOCAL** (from `C:\Users\joeca\web_apps\Easycaseload-com`) — ship the working env file.
The local `.env.local` already points at the live shared Supabase instance, so it is
production-correct as-is:

```powershell
scp .env.local root@67.207.83.48:/root/apps/easycaseload/.env.local
```

**SSH** — build and run. Note `--env-file .env.local` is required: compose substitutes
the `NEXT_PUBLIC_*` build args from the command-line env file, NOT from `env_file:`.

```bash
cd /root/apps/easycaseload
docker compose --env-file .env.local up -d --build
```

Smoke test from the droplet:

```bash
sleep 5
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3010   # expect 200
docker logs easycaseload --tail 20
```

### Rebuild on later deploys (safe swap)

```bash
cd /root/apps/easycaseload
git pull
docker compose --env-file .env.local up -d --build
```

---

## Stage 5 — Caddy (SSH, after DNS resolves to droplet)

Add this block to the Caddyfile (location confirmed in Stage 2). If existing app blocks
proxy to `containername:port`, the port is the **container-internal** port `3000`, not
host port 3010:

```
easycaseload.com, www.easycaseload.com {
    reverse_proxy easycaseload:3000
}
```

Reload (container variant / host variant):

```bash
docker exec <caddy-container> caddy reload --config /etc/caddy/Caddyfile
# or:
systemctl reload caddy
```

Verify from anywhere:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://easycaseload.com     # expect 200
curl -s -o /dev/null -w '%{http_code}\n' https://www.easycaseload.com # expect 200
```

---

## Stage 6 — Nightly pg_dump cron (SSH)

Required before any real teacher data. Dumps the whole shared instance (all tenants),
gzipped, 14-day retention:

```bash
mkdir -p /root/backups/postgres
cat > /root/backups/pg_backup.sh <<'EOF'
#!/bin/sh
set -e
BACKUP_DIR=/root/backups/postgres
docker exec supabase-db pg_dump -U supabase_admin -d postgres | gzip > "$BACKUP_DIR/postgres_$(date +%F).sql.gz"
find "$BACKUP_DIR" -name 'postgres_*.sql.gz' -mtime +14 -delete
EOF
chmod +x /root/backups/pg_backup.sh

# Run once now to prove it works:
/root/backups/pg_backup.sh && ls -lh /root/backups/postgres/

# Schedule nightly at 03:00:
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backups/pg_backup.sh >> /root/backups/postgres/backup.log 2>&1") | crontab -
crontab -l
```

---

## Stage 7 — Live verification checklist

On a phone if possible (mobile is primary):

- [ ] `https://easycaseload.com` loads with valid SSL; `www` works too
- [ ] Magic-link signup with a fresh test email → email arrives from Mailgun → link lands on `/auth/callback` → `/app/onboarding`
- [ ] Password signup path works and confirmation link routes through `/auth/callback`
- [ ] Create a school, create a student inside it → appears without refresh (Realtime)
- [ ] Upload a document → signed URL opens
- [ ] Chat widget streams a response
- [ ] Second test teacher sees none of the first teacher's data (RLS)

After all pass: update `CURRENT_STATUS.md` (deployment done, backup cron done) and the
project `claude.md` open items.
