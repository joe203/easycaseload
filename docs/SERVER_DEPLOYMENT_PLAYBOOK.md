# FiveSixteen — Server Deployment Playbook

_GitHub → live domain on the DigitalOcean droplet. Written 2026-06-12 from the real
EasyCaseload deploy, including every pitfall hit along the way._

This is the **generic** playbook for deploying any FiveSixteen Next.js app to the droplet.
For EasyCaseload-specific values, see `DEPLOYMENT_RUNBOOK.md`. The goal: any future app
(or an automation workflow) can follow this start-to-finish without rediscovering the traps.

**Substitute these per app:**

| Placeholder | Meaning | EasyCaseload example |
|---|---|---|
| `<app>` | Container + image + folder name | `easycaseload` |
| `<port>` | Host port (unique per app!) | `3010` |
| `<domain>` | Production domain | `easycaseload.com` |
| `<repo>` | GitHub repo URL | `https://github.com/joe203/easycaseload.git` |

---

## 0. Know your server before you start

**⚠ Pitfall #1: docs lie, servers don't.** Our own docs insisted every container joins a
network called `n8n_default` — that network doesn't exist on this droplet (n8n runs on a
different host). Caddy was documented as a Docker container — it's actually a **host
systemd service**. Twenty minutes lost. Run this inventory first, every time:

```bash
# What networks exist, and who is on them?
docker network ls
docker inspect -f '{{.Name}} → {{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' $(docker ps -q)

# Is Caddy a container or a host service?
docker ps --format '{{.Names}}' | grep -i caddy || systemctl status caddy --no-pager | head -3

# What host ports are already taken? (pick a free one for the new app)
docker ps --format '{{.Names}}\t{{.Ports}}'

# Where is the Caddyfile, and what pattern do existing apps use?
cat /etc/caddy/Caddyfile
```

**Current facts for this droplet (verified 2026-06-12):**
- IP: `67.207.83.48`
- Networks: `supabase_default` (Supabase stack), `web` (apps — use this one)
- Caddy: host systemd service, config at `/etc/caddy/Caddyfile`, proxies `localhost:<port>`
- Apps live in `/root/apps/<app>` (git clones)
- Supabase: `/root/supabase/docker`, admin user `supabase_admin`
- Ports in use: 3000 (church516), 3010 (easycaseload), 8000 (supabase/kong)

---

## 1. GitHub setup (local)

```bash
git init
git remote add origin <repo>
```

Before the first commit, confirm `.gitignore` covers secrets — **non-negotiable**:

```
.env*.local
.env
```

Ship a `.env.example` with placeholder values for every variable the app actually reads
(and nothing more — prune dead variables, they confuse future deploys).

```bash
git add -A && git commit -m "init" && git push -u origin main
```

---

## 2. Dockerfile (multi-stage) — the build-arg trap

**⚠ Pitfall #2: `NEXT_PUBLIC_*` variables are baked in at BUILD time.** Next.js inlines
them into the JS bundle during `npm run build`. Passing them only at *runtime* ships an
app with empty Supabase URLs that fails mysteriously in the browser. They must enter as
`ARG`/`ENV` in the **builder stage**.

Required pieces:
- `output: 'standalone'` in `next.config.ts`
- Three stages: deps → builder (with the ARGs) → slim runner
- Runner copies only `.next/standalone`, `.next/static`, `public`

See the EasyCaseload `Dockerfile` in this repo — copy it as the template.

---

## 3. docker-compose.yml — the env-file trap

**⚠ Pitfall #3: `env_file:` does NOT feed `${...}` substitution in build args.**
The `env_file:` key injects variables into the *running container*. The `${VAR}`
references under `build.args:` are substituted by compose *at parse time* from the shell
environment or a command-line `--env-file`. If you run plain `docker compose up --build`,
the build args are empty and Pitfall #2 fires. Always deploy with:

```bash
docker compose --env-file .env.local up -d --build
```

Template (network is `web` on this droplet — see Pitfall #1):

```yaml
services:
  <app>:
    container_name: <app>
    build:
      context: .
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
    image: <app>
    restart: unless-stopped
    ports:
      - "<port>:3000"
    env_file:
      - .env.local
    networks:
      - web

networks:
  web:
    external: true
```

`restart: unless-stopped` matters: it's what brings the app back after a droplet reboot.

---

## 4. DNS — the stale-cache minefield

Point A records (registrar/DO panel): `@` → `67.207.83.48`, `www` → `67.207.83.48`.

**⚠ Pitfall #4: migrating a domain off Vercel (or any old host) haunts you for hours.**
What we hit, in order:

1. **The `www` CNAME must be deleted and replaced with an A record** — editing the apex
   alone leaves `www` pointing at the old host.
2. **Browsers and local resolvers serve the OLD site with a perfectly valid SSL padlock**
   (the old host still has its cert + cached pages). It *looks* like the deploy failed.
   It didn't. Check the page `<title>` or response `Server:` header to tell which app
   is actually answering.
3. **Different machines/browsers disagree** during propagation — one shows old, one shows
   new. That's normal. Verify against truth, not against your browser:
   ```bash
   # Ask clean public resolvers (authoritative-ish truth):
   nslookup <domain> 1.1.1.1
   # Bypass DNS entirely and test the droplet directly:
   curl -s -o /dev/null -w '%{http_code}\n' --resolve <domain>:443:67.207.83.48 https://<domain>
   ```
4. **Delete the domain from the old host's dashboard** (Vercel: project → Settings →
   Domains). Until you do, every stale cache on the internet gets served the old site
   instead of an error — and certificate validation breaks (Pitfall #6).

Lower the TTL to 300 before a planned migration if you think of it in time.

---

## 5. Supabase (shared instance) — per-app auth config

```bash
cd /root/supabase/docker
grep '^ADDITIONAL_REDIRECT_URLS' .env
# Append the new app's URLs (run ONCE — running twice creates duplicates):
sed -i 's#^ADDITIONAL_REDIRECT_URLS=.*#&,https://<domain>/**,https://www.<domain>/**#' .env
grep '^ADDITIONAL_REDIRECT_URLS' .env   # verify
docker compose up -d auth                # restart GoTrue only
```

Without this, magic links / confirmation emails refuse to redirect to the production
domain. Auth restart is seconds of downtime, nothing else affected.

(Also remember the tenancy rules: own schema per app, RLS from migration one, app tag
on every signup, gated `auth.users` triggers — see global CLAUDE.md.)

---

## 6. Deploy the app

```bash
mkdir -p /root/apps && cd /root/apps
git clone <repo> <app>
cd <app>
```

**⚠ Pitfall #5: `scp` needs your SSH key passphrase — heredoc paste doesn't.**
If `scp` is unavailable (forgotten passphrase, no agent), create `.env.local` directly
in the SSH session:

```bash
cat > /root/apps/<app>/.env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
...
EOF
cat /root/apps/<app>/.env.local   # verify the paste landed clean
```

Build and start (note `--env-file` — Pitfall #3):

```bash
docker compose --env-file .env.local up -d --build
```

First build takes minutes (npm ci + Next build); rebuilds are mostly cached. Smoke test
**before** touching Caddy — isolate app problems from proxy problems:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:<port>   # expect 200
docker logs <app> --tail 10                                        # expect "✓ Ready in ..."
```

---

## 7. Caddy — host service, localhost ports

Only proceed once `dig +short <domain>` (from the droplet) returns `67.207.83.48` —
Caddy can't get certificates before DNS points at it.

```bash
cat >> /etc/caddy/Caddyfile <<'EOF'

<domain> {
    reverse_proxy localhost:<port>
}

www.<domain> {
    redir https://<domain>{uri} permanent
}
EOF
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Notes:
- Caddy is a **host** service here: target `localhost:<host-port>`, not `container:port`.
- `www` redirects to apex (the established pattern on this droplet).
- Always `caddy validate` before reload — a bad Caddyfile takes down every site.

---

## 8. SSL certificates — secondary validation and patience

**⚠ Pitfall #6: "secondary validation" failures after a DNS migration.** Let's Encrypt
and ZeroSSL validate from **multiple worldwide vantage points**. If even one of them
still holds the old host's DNS answer in cache, the challenge fails — even when every
resolver *you* can check returns the right IP. Symptoms in
`journalctl -u caddy`: `challenge failed ... During secondary validation: <old-host-ip>`.

The protocol:
1. Make sure the old host is fully detached (Pitfall #4, step 4).
2. Wait 30–60+ minutes for CA-side caches to drain. Don't fight it in real time.
3. Nudge a fresh attempt: `systemctl reload caddy` (reload re-triggers issuance for
   any missing certs; Caddy also retries on its own with backoff).
4. Verify from the droplet itself, bypassing all DNS:
   ```bash
   curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' \
     --resolve www.<domain>:443:127.0.0.1 https://www.<domain>
   ```
5. Caddy auto-falls back between Let's Encrypt and ZeroSSL — both can fail on stale
   DNS; neither failing is fatal. Issued certs live under
   `/var/lib/caddy/.local/share/caddy/certificates/` (a quick `find` there shows what
   actually exists vs. what's still retrying).

Meanwhile the apex (or whichever name validated first) works fine — partial issuance
doesn't block launch.

---

## 9. Nightly database backup (once per droplet, not per app)

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
/root/backups/pg_backup.sh && ls -lh /root/backups/postgres/   # prove it works NOW
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backups/pg_backup.sh >> /root/backups/postgres/backup.log 2>&1") | crontab -
```

This dumps the **whole shared instance** (every app's schema), 03:00 nightly, gzipped,
14-day retention. Already installed 2026-06-12 — future apps don't repeat this step,
just verify it's still in `crontab -l`.

---

## 10. Verification checklist (every deploy)

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<domain>          # 200
curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' https://www.<domain>   # 301 -> apex
curl -s -o /dev/null -w '%{http_code}\n' http://<domain>           # 308 (auto HTTPS)
```

Then by hand, **on a phone** (mobile is primary):
- [ ] Signup end-to-end (email arrives, link redirects to the right place)
- [ ] One full CRUD round-trip (create → appears live → edit → delete)
- [ ] Any AI/chat feature streams
- [ ] A second test account cannot see the first account's data (RLS)

---

## 11. Redeploying after code changes

```bash
cd /root/apps/<app>
git pull
docker compose --env-file .env.local up -d --build
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:<port>
```

Compose handles the swap (build → recreate). Seconds of downtime; fine at current scale.

---

## 12. Pitfall index (the fast version)

| # | Trap | Defense |
|---|---|---|
| 1 | Docs describe infrastructure that isn't there (wrong network name, Caddy mode) | Run the §0 inventory commands first, every time; fix the docs when reality wins |
| 2 | `NEXT_PUBLIC_*` empty in production | They're build-time: `ARG`/`ENV` in the Dockerfile **builder** stage |
| 3 | Compose build args silently empty | `docker compose --env-file .env.local up -d --build` — `env_file:` alone doesn't do it |
| 4 | Old host serves stale site with valid SSL; browsers disagree | Check `<title>`/`Server:` header; test with `curl --resolve`; delete domain at old host; wait out TTL |
| 5 | `scp` blocked by forgotten key passphrase | Heredoc-paste the env file in the SSH session; fix keys later |
| 6 | Cert "secondary validation" fails post-migration | Detach old host → wait 30–60 min → `systemctl reload caddy` → verify with `--resolve ...:443:127.0.0.1` |
| 7 | One bad Caddyfile edit downs every site on the droplet | `caddy validate` before every reload |
| 8 | Port collision with another app | Check `docker ps` port column in §0; claim a unique host port and record it |

---

## 13. Toward automation (future)

The manual path above is deliberately linear so it can become a pipeline. The likely
shape when we're ready:

1. **GitHub Actions on push to `main`**: SSH to the droplet → `git pull` →
   `docker compose --env-file .env.local up -d --build` → curl smoke test → notify.
   Needs a dedicated deploy SSH key stored as a GitHub secret.
2. §§4–9 (DNS, Supabase config, Caddy, backups) stay manual — they're one-time per app.
3. Prerequisite worth doing first: a deploy user with narrower permissions than root.

Don't build this until the manual flow has run clean a few more times — automate the
proven path, not the first draft.
