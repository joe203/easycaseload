# n8n Build Sheet — `easycaseload_inbound_sms_v2`

_Phase A deliverable for Joe. Build as a NEW workflow — do not modify
`fivesixteen_church_inbound_sms` or the legacy `telnyx_inbound_sms` (MongoDB-era).
The legacy EasyCaseload Twilio/intake workflows get deactivated after this is live._

## Purpose

Inbound SMS → Supabase `raw_intake` (store-first, Principle 5) → find-or-create
teacher by phone → for unknown senders, reply with a single-use registration link.
This one workflow is the front door for SMS registration now and voice/AI logging later.

## Configuration (keep swappable — number change must be config-only)

- One **Set node named `config`** at the top: `from_number` = `+13252034927` (temporary;
  swap to the dedicated number later by editing this single node).
- **Telnyx API key as an n8n credential** (Header Auth) — never hardcoded in a node.
  While you're there: the old `telnyx_inbound_sms` workflow has a key hardcoded in an
  HTTP node — **rotate that key in the Telnyx portal** once the new credential is set up.
- **Supabase service key as an n8n credential** (Header Auth):
  `apikey: <sb_secret_…>` + `Authorization: Bearer <sb_secret_…>`.
  Base URL: `https://supabase.church516.xyz/rest/v1`.

## Nodes

1. **Webhook** — POST, path `easycaseload_inbound_sms_v2`, respond via response node.
2. **Respond 200 immediately** for any event that is not `message.received`
   (Telnyx also posts `message.sent` / `message.finalized`; non-2xx makes Telnyx retry).
3. **Normalize** (Code node) — from the Telnyx payload extract:
   `from` = `payload.from.phone_number`, `to` = `payload.to[0].phone_number`,
   `text` = `payload.text`, `provider_message_id` = `payload.id`,
   `media` = `payload.media ?? []`.
4. **Compliance branch** — if `text` matches `^(STOP|UNSUBSCRIBE|CANCEL|HELP)$/i`:
   still write raw_intake (audit), do NOT auto-reply a registration link, end.
   (Telnyx handles STOP suppression at the carrier level; we just must not fight it.)
5. **Insert `raw_intake`** (HTTP POST `{base}/raw_intake`, header `Prefer: return=representation`):
   ```json
   {
     "identity_key": "phone:{{from}}",
     "source": "sms",
     "direction": "inbound",
     "from_address": "{{from}}",
     "to_address": "{{to}}",
     "content": "{{text}}",
     "media": {{media}},
     "provider": "telnyx",
     "provider_message_id": "{{provider_message_id}}",
     "status": "stored_unlinked"
   }
   ```
6. **Find teacher** — GET `{base}/teachers?phone=eq.{{from}}&select=id,status,full_name`.
7. **Branch A — teacher exists:** PATCH the raw_intake row
   (`{base}/raw_intake?id=eq.{{intake_id}}`) with `{"teacher_id": "...", "status": "resolved"}`.
   No auto-reply for now (AI handling of known-teacher messages is Phase 6+).
8. **Branch B — unknown number:**
   a. POST `{base}/teachers` → `{"phone": "{{from}}", "status": "unregistered", "source": "sms"}`
      (`Prefer: return=representation` to get the new id)
   b. PATCH raw_intake with the new `teacher_id`
   c. **Code node:** generate `token` = 32 random hex chars; `token_hash` = sha256(token)
   d. POST `{base}/registration_tokens` →
      `{"teacher_id": "...", "token_hash": "{{token_hash}}", "expires_at": "{{now+7d ISO}}"}`
   e. **Reply via Telnyx** (POST `https://api.telnyx.com/v2/messages`):
      from = `config.from_number`, to = sender,
      text: `Welcome to EasyCaseload! Finish setting up your account here: https://easycaseload.com/register?t={{token}} (link valid 7 days)`
9. **Respond 200.**

## Sequencing note

Steps 1–7 are useful immediately (store-first audit of every text). Step 8's reply
link points at `/register?t=` which ships in **Phase B** — either build Branch B now
and leave the reply node disabled, or reply with a generic "We got your message —
registration opens soon" until the page exists.

## Number caveat (the one real issue with the temporary number)

Outbound OTP/replies from +1-325-203-4927 are unaffected by sharing. **Inbound routing
is the conflict:** a Telnyx number delivers webhooks to ONE messaging-profile URL. If
this number's profile currently points at the church inbound workflow, repointing it
to `easycaseload_inbound_sms_v2` means church texts to this number land in the
EasyCaseload workflow. Check in the Telnyx portal which profile the number is on and
what traffic it actually receives. If it receives real church traffic, EasyCaseload
inbound (Phase B SMS registration) should wait for the dedicated number — outbound OTP
can still use it meanwhile.

## Test plan (after build)

1. Text the number from your phone → row appears in `raw_intake` with your message
2. Unknown number → `teachers` row created (`unregistered`, `source='sms'`) + token row + reply SMS received
3. Text again from the same number → raw_intake row linked to the same teacher (no duplicate teacher)
4. Text STOP → audit row written, no registration reply
