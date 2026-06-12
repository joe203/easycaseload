# EasyCaseload — Testing Readiness Assessment

_Date: 2026-06-12 (day of first production deploy). Based on a full code survey, the
session logs in CURRENT_STATUS.md, and the deploy-day verification record._

**Headline:** The app has had solid *developer verification* (manual, on localhost,
against the live shared Supabase) but **zero testing on the production domain beyond
"the homepage serves,"** **zero automated test suite**, and **zero testing on a real
phone**. Several feature areas in the product vision do not exist in code yet and are
therefore not testable — the test plan below excludes them explicitly rather than
pretending to cover them.

---

## Part 1 — Status by Feature Area

Legend: **Complete** = verified and low remaining risk · **Partial** = some verification,
gaps remain · **Untested** = no verification · **Not built** = no code to test.

### Authentication (magic link, password, session, middleware)
- **Status: Partial** · **Risk if untested: CRITICAL — it's the front door**
- **Tested (manual, localhost, Session A):** magic-link e2e (email arrived via Mailgun,
  link redirected, session created); password signup + signin; middleware redirects
  (unauthenticated → `/signin`, authenticated away from auth pages); app-tag trigger
  gating tested in both directions; verified-link-only auto-linking tested both ways.
- **Not tested:** the entire flow **on the production domain** — `ADDITIONAL_REDIRECT_URLS`
  for production was added on deploy day and has never been exercised; expired/reused
  magic link behavior; sign-out; session expiry behavior behind the Caddy proxy.
- **Note:** password-signup redirect path was changed on deploy day (now routes through
  `/auth/callback`) and has never been run even locally.

### User Registration / Teacher Creation
- **Status: Partial** · **Risk: CRITICAL**
- **Tested:** signup trigger creates a teacher row tagged `easycaseload` (localhost).
- **Not tested:** on production; teacher creation for a *second* concurrent account.

### Teacher Onboarding (Savannah)
- **Status: Not built (static stub)** · **Risk: LOW**
- The onboarding page is a real page with placeholder copy ("Savannah will meet you
  right here") and links to manual school/student entry. Only test: it renders and the
  links work. Savannah herself is Phase 6+ — **not testable, exclude from plan**.

### School Management (CRUD)
- **Status: Partial** · **Risk: MEDIUM**
- **Tested (manual, localhost):** create/edit/delete with Realtime updates and
  optimistic mutations; toasts on success/failure.
- **Not tested:** on production; **deleting a school that still has students** (FK
  behavior unverified — could orphan students, cascade-delete them, or error).

### Student Management
- **Status: Partial** · **Risk: MEDIUM**
- **Tested (manual, localhost):** student CRUD inside school detail; student detail page.
- **Not tested:** on production. Note `/app/students` list page is a **placeholder by
  design** (open item #6) — don't report it as a bug, but verify it doesn't dead-end
  a tester confusingly.

### Student Goals (IEP goals)
- **Status: Not built (table exists, zero UI)** · **Risk: LOW (unreachable by users)**
- No actions, no components, no types. **Not testable, exclude.** Flag: the data model
  is ready, so this is a fix-cycle candidate, not a test gap.

### Document Uploads
- **Status: Partial** · **Risk: HIGH — student documents are PII**
- **Tested (manual, localhost):** upload, list, view via 1-hour signed URL, delete.
- **Not tested:** on production (storage RLS via prod cookies/session); **no file-size
  limit exists in code** — a 200 MB upload's behavior is unknown; rejected file types;
  upload **from a phone camera roll** (primary real-world path!); whether deleting a
  document actually removes the storage object (code says "best-effort").
- **Never adversarially tested:** that teacher B cannot fetch teacher A's file path via
  a signed-URL request. The bucket RLS *should* enforce the `{teacher_id}/` prefix —
  assumed, not proven.

### Teacher Logs / Session Records (Minutes)
- **Status: Partial** · **Risk: MEDIUM — quiet data loss possible**
- **Tested (manual, localhost):** log/list/delete minutes with optimistic rollback.
- **Not tested:** on production; **two tabs/devices writing concurrently** — storage is
  a JSONB array with read-merge-write semantics, so concurrent writes are last-write-wins
  and can silently drop a session; no edit capability (by design, Phase 1).
- `student_logs` (the real session table) has **no UI yet — exclude**.

### AI Assistant (chat widget)
- **Status: Partial** · **Risk: MEDIUM (cost + expectation-setting)**
- **Tested (manual, localhost):** streaming responses from Anthropic Haiku.
- **Not tested:** on production; behavior when a teacher asks it to *do* something
  ("log my session with Maria") — it has no tools and no data access, so the answer
  quality there shapes first impressions; **`/api/chat` is public and has no rate
  limiting** — an abuse vector that burns API credits. Messages are not persisted
  (no `raw_intake` write) — known Phase 6+ item.

### Phone / SMS Registration Workflow
- **Status: Not built in the current architecture** · **Risk: N/A**
- The Telnyx numbers and n8n workflows exist but write to the retired MongoDB stack and
  are tagged to the church tenant. **Nothing connects SMS to this app's database.
  Not testable, exclude** — this is a build item (its own mission), not a test item.

### Email Generation (parent updates, drafted comms)
- **Status: Not built (Phase 6+)** · **Risk: N/A — exclude.**
- What *does* exist: **auth emails via Mailgun** — tested to a Gmail inbox only.
  Deliverability to school-district mail systems (aggressive spam filtering) is a real
  unknown, but only testable when a real district address is available.

### Reports
- **Status: Not built (placeholder page)** · **Risk: N/A — exclude.**

### Invoices / Billing
- **Status: Not built (placeholder page)** · **Risk: N/A — exclude.**

### Permissions / RLS / Tenant Isolation
- **Status: Partial** · **Risk: CRITICAL — this is FERPA-adjacent student data on a
  shared database**
- **Tested:** RLS policies applied in migrations; all server actions independently
  filter by `teacher_id` (verified in code survey — defense in depth); single-teacher
  flows work, which proves RLS doesn't *block* legitimate access.
- **Never tested:** the thing RLS exists for — **two registered teachers, verifying
  neither can see the other's schools/students/documents in the UI**, and ideally via
  direct API/storage probing. The `merge_teachers()` function: untested, but
  service-role-only and unreachable from the app — defer.

### Mobile Experience
- **Status: Untested — entirely** · **Risk: HIGH**
- Built mobile-first per the design standards, but **no session has ever verified the
  app on a physical phone**. Product Principle 9 says mobile is the primary surface.
  Every journey in the test plan below defaults to a phone for exactly this reason.

### Database Integrity & Backups
- **Status: Partial** · **Risk: HIGH**
- **Tested:** migrations 001–017 applied + verified live; `apply_all.sql` regenerated;
  first `pg_dump` cron run produced a real file (46 KB gz).
- **Never tested:** **that the backup actually restores.** An unrestorable backup is
  not a backup. Also unverified: FK behavior on school deletion (see above).

### Integrations (n8n, Mailgun, Anthropic)
- **Status: Partial** · **Risk: MEDIUM**
- **Tested:** Mailgun→GoTrue (localhost flows); Anthropic streaming (localhost).
- **Not tested:** the contact form's n8n webhook (`easycaseload/contact`) end-to-end in
  production. Note: `/api/early-access`, `/api/survey`, `/api/survey-list` routes are
  still deployed and publicly callable even though their UI was removed — harmless but
  unmonitored surface area.

### Error Handling
- **Status: Partial (weak)** · **Risk: MEDIUM**
- **Exists:** auth error page; toast feedback on schools/students/documents mutations;
  structured `{data, error}` returns from all server actions.
- **Missing (found in code survey):** no root `error.tsx` boundary (an unhandled
  exception shows the raw Next.js error screen); no `not-found.tsx` (404s get the
  default); minutes-page delete has no confirmation.

---

## Part 2 — Automated vs Manual (what actually happened)

| Verification | How performed |
|---|---|
| TypeScript (`tsc --noEmit`) | Automated, every session — the only repeatable gate that exists |
| Production build | Automated (Docker build; failure = broken build) |
| HTTP smoke checks (200/301/308, localhost + prod) | Automated one-shots (curl), deploy day |
| Auth flows, CRUD, Realtime, chat, documents, minutes | **Manual, by the developer, on localhost** |
| DNS / SSL / proxy | Automated probes + manual browser checks, deploy day |
| Backup cron | Semi: script run once manually, output eyeballed, **no restore test** |
| Unit / integration / E2E test suite | **Does not exist. Zero test files in the repo.** |

The honest summary: development-time verification was thorough but ephemeral — none of
it is repeatable without a human redoing it. Nothing has been verified on the production
domain except that pages serve.

---

## Part 3 — Assumptions Made During Development That Need Verification

1. **Production redirect URLs work** — `ADDITIONAL_REDIRECT_URLS` was set on deploy day;
   no magic link has ever been clicked against `https://easycaseload.com`. (→ Journey 1)
2. **Storage RLS actually enforces the `{teacher_id}/` path prefix** — assumed from the
   migration, never probed from a second account. (→ Journey 2)
3. **The backup restores** — assumed because `pg_dump` exited 0. (→ Critical test #4)
4. **Unlimited file size is acceptable** — no limit was coded; assumption is teachers
   upload small PDFs. Unverified and probably wrong long-term. (→ Journey 3)
5. **JSONB last-write-wins for minutes is acceptable** for single-device Phase 1 usage.
   True only until a teacher uses phone + laptop simultaneously. (→ Journey 3, step 5)
6. **Deleting a school behaves sanely when students exist** — FK behavior never
   exercised. (→ Journey 3)
7. **Realtime websockets work from production clients** — verified from localhost
   browsers only; browsers connect to `supabase.church516.xyz` directly so it *should*
   be identical, but "should" is an assumption. (→ Journey 1)
8. **A public, un-rate-limited chat endpoint is tolerable** short-term — cost-abuse
   exposure accepted implicitly, never decided explicitly. (→ fix-cycle item)
9. **Mailgun deliverability beyond Gmail** — only Gmail inboxes have ever received the
   auth emails. School districts filter aggressively. (→ test when a district address exists)
10. **Mobile actually works** — designed for, never once verified on. (→ all journeys run on phone)

---

## Part 4 — End-to-End Test Plan

### Evaluation of the proposed journeys

| Proposed journey | Verdict |
|---|---|
| 1. Teacher registers by phone | **Not testable — feature does not exist** (legacy workflows write to retired MongoDB). Build item, its own mission. |
| 2. Teacher registers through Savannah | **Not testable — Savannah is a static stub.** Only test: page renders, links work (folded into Journey 1). |
| 3. Teacher registers manually through web forms | ✅ Valid — becomes Journeys 1 & 2 (one per auth method). |
| 4. Teacher uploads documents (desktop + mobile) | ✅ Valid — split across Journeys 1 (mobile) & 2 (desktop). |
| 5. Teacher creates logs and student service records | ⚠️ Partial — only the minutes prototype exists; `student_logs` has no UI. Minutes folded into Journey 1. |
| 6. Teacher generates emails, reports, invoices | **Not testable — all three are placeholders.** |

So of the six proposed journeys, **three test features that don't exist yet**. That is
itself the most important finding of this assessment: the testable surface is the
Phase 1 foundation (auth, caseload CRUD, documents, minutes, FAQ chat), and the test
plan should validate that surface ruthlessly rather than thinly covering fiction.

### The minimal journey set (4 journeys, ~45 minutes total, two test emails needed)

**Journey 1 — "New teacher, on her phone" (~15 min, PHONE, production)**
The golden path; exercises ~70% of the live surface in one pass.
1. Visit `https://easycaseload.com` → tap **Get Started** → magic-link signup with
   fresh email #1 → email arrives → link lands in onboarding *(verifies: prod redirect
   URLs, Mailgun, teacher creation, the deploy-day callback change)*
2. Onboarding renders sanely; tap through to schools *(Savannah stub check)*
3. Create 2 schools → open one → add 3 students *(CRUD + Realtime on prod + mobile UX)*
4. Open a student → upload a photo **from the camera roll** → view it back *(storage,
   signed URLs, the primary real-world upload path)*
5. Log minutes twice, delete one *(minutes prototype on prod)*
6. Open chat → ask a FAQ question → then ask it to "log my session with Maria"
   *(streaming on prod + documenting the capability gap honestly)*
7. Throughout: note anything cramped, slow, or awkward — this doubles as the only
   mobile UX pass the app has ever had.

**Journey 2 — "The second teacher / the isolation proof" (~10 min, DESKTOP, production)**
The most important security test in the plan.
1. **Password** signup with fresh email #2 (covers the secondary auth path and the
   redirect change) → confirm → land in app
2. Dashboard shows **zero** schools, **zero** students — none of teacher 1's data
   anywhere (schools list, student pages, document lists)
3. Create one school of your own → verify teacher 1's view (phone, still signed in)
   is unchanged
4. Adversarial probe: while signed in as teacher 2, paste the URL of teacher 1's
   school detail page (`/app/schools/<id>` from Journey 1) → must not render data
5. Sign out → sign back in via magic link as teacher 2 → data persists

**Journey 3 — "The messy user" (~10 min, either device, production)**
Edge cases most likely to bite real teachers.
1. Try uploading a large file (≥50 MB video) → observe; try a `.exe` → observe
2. Delete a school **that still has students** → document exactly what happens
3. Open minutes in two tabs, log in both, refresh → check whether one entry vanished
4. Visit a garbage URL (`/app/nonexistent`) and a deleted student's URL → what renders?
5. Click an **already-used** magic link from the earlier email → what happens?

**Journey 4 — "The restore drill" (~10 min, SSH, no UI)**
Backups only count if they restore. On the droplet:
```bash
gunzip -c /root/backups/postgres/postgres_$(date +%F).sql.gz | head -50   # sanity: real SQL?
# Restore into a scratch database (NEVER the live one):
docker exec supabase-db psql -U supabase_admin -d postgres -c "CREATE DATABASE restore_drill;"
gunzip -c /root/backups/postgres/postgres_$(date +%F).sql.gz | docker exec -i supabase-db psql -U supabase_admin -d restore_drill
docker exec supabase-db psql -U supabase_admin -d restore_drill -c "SELECT count(*) FROM teachers; SELECT count(*) FROM students;"
docker exec supabase-db psql -U supabase_admin -d postgres -c "DROP DATABASE restore_drill;"
```
Counts should match production. (Run after Journeys 1–3 so there's real data in the dump.)

### Priorities

**Critical before launch (before any real teacher touches it):**
1. Journey 1 — golden path on production, on a phone
2. Journey 2 — two-teacher isolation proof (steps 1–4 at minimum)
3. Journey 4 — backup restore drill
4. Journey 3 step 2 — school-delete-with-students behavior (data-loss class)

**Recommended before launch:**
5. The rest of Journey 3 (file limits, 404s, used links, minutes races)
6. Journey 2 step 5 — returning-user sign-in
7. Decide explicitly on `/api/chat` rate limiting (accept risk or add a limiter)
8. Contact form → n8n webhook check on production

**Nice-to-have after launch:**
9. Playwright golden-path suite (see automation below)
10. CI gate on GitHub (tsc + build on every push)
11. Uptime monitor
12. Lighthouse mobile performance pass (3-second target on weak signal)
13. Mailgun deliverability to a school-district address (when one is available)

---

## Part 5 — Automation Opportunities (ranked by value ÷ effort)

1. **CI gate (high value, ~30 min):** GitHub Action on every push: `npm ci`,
   `npx tsc --noEmit`, `next build`. Catches broken builds before they reach the
   droplet. No secrets needed (use placeholder env for build).
2. **Uptime + smoke monitor (high value, ~15 min, Joe's n8n lane):** n8n schedule every
   5 min: `GET https://easycaseload.com` expect 200, alert via SMS/email otherwise.
   The droplet has no monitoring today.
3. **Playwright golden-path suite (high value, ~half day, after fix cycle):** automate
   Journey 2 (password auth avoids the email-click problem) against production with a
   dedicated test account: sign in → create school → add student → verify → clean up.
   Run nightly or post-deploy. This converts the most valuable manual journey into a
   permanent regression net.
4. **Restore drill cron (medium value, ~30 min):** monthly cron wrapping Journey 4 with
   a row-count comparison, alerting on mismatch.
5. **Not worth automating yet:** magic-link flows (email-click automation is brittle),
   mobile UX (human judgment), chat quality (subjective at this stage).

---

## Suggested findings log

Record Journey results in `docs/testing/FINDINGS.md` as:
`[J1-4] [broken|confusing|slow|missing] — description — (severity)`
That file becomes the fix-cycle backlog.
