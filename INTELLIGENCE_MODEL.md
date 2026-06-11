# EasyCaseload — Intelligence Model

_Primary source: `EASYCASELOAD_CORE_PRINCIPLES.MD`_
_Supporting references: `ARCHITECTURE.md`, `DATABASE.md`, `CLAUDE.md`_
_Last updated: 2026-06-10_

---

## Purpose

This document describes how EasyCaseload's intelligence layer works — the pipeline from raw teacher input to structured data, organized actions, and proactive outputs. It is an architectural reference for building Phase 5 onward, and a design constraint for every earlier phase.

Every phase of development should leave the intelligence layer easier to build, not harder.

---

## Foundational Principle

> The teacher provides intent. The system determines useful actions.
> — EASYCASELOAD_CORE_PRINCIPLES.MD, Principle 6

The intelligence model exists to bridge the gap between how teachers naturally communicate and how software stores and acts on information. The teacher should not adapt to the system. The system adapts to the teacher.

---

## 1. The Input Pipeline

Every interaction with EasyCaseload starts with teacher input. Input may arrive through any of these channels:

| Channel | Example | Notes |
|---|---|---|
| Voice-to-text (mobile) | Teacher speaks after a session | Primary workflow; must be designed for first |
| Typed text (mobile) | Short natural language message | Same processing as voice |
| Typed text (desktop) | Longer narrative note | Less common; same pipeline |
| Structured form | Teacher fills out a form field | Fallback only; avoid requiring this |

**Voice-to-text is not a feature. It is the primary input method.** The browser's native voice-to-text and mobile device dictation produce plain text — no special integration is needed. The system receives text regardless of how it was generated.

### Input Stages

```
Teacher speaks or types
        │
        ▼
  Raw input preserved immediately       ← Principle 5: Store First
        │
        ▼
  Intent classification                 ← What is the teacher trying to accomplish?
        │
        ▼
  Entity extraction                     ← Who, what, when, how long, what goals?
        │
        ▼
  Action derivation                     ← What should the system create or queue?
        │
        ├── Internal actions (auto-created)
        └── External actions (queued for teacher approval)
```

### The Store-First Rule (Principle 5)

Raw teacher input must be persisted **before** any AI processing begins. Processing is asynchronous and can fail. The teacher's words must never be lost.

Implementation: every input creates a `raw_inputs` record immediately. The AI pipeline processes it afterward and writes structured outputs back to the database. If processing fails, the raw input still exists and can be reprocessed.

---

## 2. Intent Classification

After storing raw input, the system classifies what the teacher is trying to do.

### Intent Categories

| Intent | Example Input | Primary Action |
|---|---|---|
| **Session log** | "I met with Brad today for 30 minutes" | Create `session_notes` record |
| **Goal progress update** | "Maria hit two of her three articulation goals" | Update goal progress |
| **Reminder / task** | "Remind me to email Brad's supervisor Thursday" | Create task + reminder |
| **Draft communication** | "Write a progress update for Maria" | Generate draft, queue for approval |
| **Schedule query** | "What do I have today?" | Return schedule data |
| **Status query** | "What's overdue?" | Return alert / gap summary |
| **Free-form note** | General observation about a student or situation | Store as `session_notes`, tag student if identifiable |

A single input may contain **multiple intents**:

> "I met with Brad today for 30 minutes. He's doing well. Remind me to email his supervisor next Thursday."

Intents: session log + task/reminder. Both should be processed from the same input.

### Fallback

If intent cannot be confidently classified, the input is stored as a free-form note and flagged for the teacher to review. Information is never discarded (Principle 5).

---

## 3. Entity Extraction

Within a classified intent, the system extracts structured entities.

### Common Entity Types

| Entity | Examples | Resolution |
|---|---|---|
| **Student name** | "Brad", "Maria", "Mr. Johnson" | Fuzzy match against teacher's `students` table |
| **Date/time** | "today", "next Thursday", "this morning" | Resolve against current date |
| **Duration** | "30 minutes", "half an hour" | Normalize to minutes |
| **Goals** | "articulation goals", "his reading goals" | Match against student's goal records |
| **Action target** | "supervisor", "parent", "admin" | Inform communication routing |
| **Campus** | "Lincoln Elementary", "the middle school" | Match against teacher's `campuses` table |

### Ambiguity Handling

When an entity is ambiguous (e.g., "Brad" matches two students), the system should:
1. Create the record with the ambiguity flagged
2. Prompt the teacher for clarification: "Did you mean Brad Martinez or Brad Thompson?"
3. Update the record once confirmed

Do not discard or delay storing the input while waiting for clarification.

---

## 4. Action Derivation

From classified intents and extracted entities, the system derives a set of **actions** to execute or queue.

### Action Types

| Action | Internal / External | Auto-execute? | Notes |
|---|---|---|---|
| Create session note | Internal | ✅ Yes | Core logging action |
| Update goal progress | Internal | ✅ Yes | From progress mentions |
| Create task | Internal | ✅ Yes | Deferred follow-up item |
| Create reminder | Internal | ✅ Yes | Time-based notification |
| Create calendar event | Internal | ✅ Yes | Schedule entry |
| Draft email | External | ❌ No — queue for review | Teacher must approve before send |
| Draft supervisor update | External | ❌ No — queue for review | Teacher must approve |
| Draft parent communication | External | ❌ No — queue for review | Teacher must approve |
| Generate report draft | External | ❌ No — queue for review | Teacher reviews and edits |
| Generate invoice support doc | External | ❌ No — queue for review | Teacher approves |

### The Approval Gate (Principle 7)

**Anything that leaves the system requires teacher approval.**

Internal actions (notes, tasks, reminders, calendar entries) are created automatically. The teacher can review and correct them, but they don't wait for approval before being created.

External actions (emails, reports, communications) are **drafted and queued**. They appear in the teacher's approval queue — not in an outbox, not sent. The teacher reviews, edits if needed, and explicitly approves each one.

This is non-negotiable. Teachers are professionally and legally responsible for communications about their students. The system assists; the teacher signs off.

### Capture Once, Reuse Many (Principle 4)

A single input should produce every useful output it can support. The system should ask: "Given this input, what else would be useful to the teacher?"

Example derivation from one voice note:

> "I finished my session with Maria. We worked on her fluency goals for about 45 minutes. She's improved a lot this month."

| Derived action | Type | Auto? |
|---|---|---|
| Session note: Maria, today, 45 min, fluency | Internal | ✅ |
| Goal progress update: fluency goals, positive | Internal | ✅ |
| Suggest: "Maria has 3 sessions this month — would you like a monthly summary?" | Proactive suggestion | Prompt |
| Draft: Progress update for Maria's file | External | Queue |

Four useful outputs. One fifteen-second voice note.

---

## 5. The Proactive System (Principle 8)

EasyCaseload does not wait to be asked. The system should surface relevant information and suggestions based on what it knows.

### Trigger Types

| Trigger | Example | Output |
|---|---|---|
| **Time-based** | Today is Thursday, teacher set a reminder | Notification: "Don't forget to email Brad's supervisor" |
| **Gap detection** | Student not seen in > N days | Alert: "You haven't logged a session with Maria in 14 days" |
| **Documentation gap** | Session exists, no progress note | Suggestion: "You have 3 sessions with Brad without a progress note" |
| **Upcoming deadline** | IEP review due in 7 days | Alert: "Brad's IEP review is due next week — no draft exists yet" |
| **Pattern recognition** | Repeated missed sessions at a campus | Observation: "You've missed 3 scheduled visits to Lincoln this month" |
| **Post-session suggestion** | Session logged, no follow-up created | Prompt: "Session logged for Maria. Would you like to draft a progress note?" |

### Proactive Output Types

- **Alerts:** Surface in the dashboard and notification system; require acknowledgment
- **Suggestions:** Appear as prompts; teacher can act, dismiss, or ignore
- **Auto-drafted content:** Created in the background and placed in the approval queue
- **Reminders:** Time-triggered notifications linking back to context

### Design Constraint

Proactive outputs must not be noisy. A teacher who receives too many alerts will tune them out. Prioritize high-value, time-sensitive signals over comprehensive coverage.

---

## 6. The Daily Briefing

The Daily Briefing is a scheduled, proactive summary assembled each morning and delivered before the teacher's day begins. It is the primary expression of the system's proactive intelligence — a single output that tells the teacher exactly what they need to know and do.

### What It Contains

The briefing is assembled from multiple Supabase queries and shaped by the Anthropic API into a concise, prioritized summary:

| Section | Source | Notes |
|---|---|---|
| Today's schedule | `schedule_events` joined to `campuses` and `students` | Ordered by time; student names included |
| Approaching deadlines | `goals.target_date`, IEP dates in student `metadata` | Within next 7 days |
| Documentation gaps | `schedule_events` with no matching `session_notes` | Sessions that happened but weren't logged |
| Draft queue count | `draft_queue` where `status = 'pending'` | Number and types awaiting review |
| Due reminders | `tasks` where `due_date = today` | Tasks the teacher or system created |
| Suggested priority | Anthropic API | One or two high-value recommendations based on full context |

The briefing is short by design — it should be readable in under two minutes on a phone screen.

### Technical Pipeline

```
n8n cron job fires (e.g., 6:30 AM teacher's local time)
        │
        ▼
  Query Supabase for all teacher-specific context
  (schedule, gaps, drafts, tasks, deadlines)
        │
        ▼
  Anthropic API: summarize + prioritize
  (system prompt includes teacher preferences from memory)
        │
        ▼
  Assemble final briefing text
        │
        ├── SMS via Telnyx          ← teacher's preferred channel
        ├── Email via Mailgun       ← fallback or secondary
        └── Supabase: insert into   ← dashboard always shows latest
            `daily_briefings` table
                │
                ▼
        Supabase Realtime → TanStack Query → dashboard updates
```

### Delivery Channels

**SMS (preferred):** Pushed via Telnyx through an n8n workflow. Reaches the teacher before they open any other app. Must be concise — SMS has character limits and teachers read it glancing at their phone.

**Email:** Full-format version with links back to specific items. More appropriate for desktop review. Same content, richer formatting.

**In-app dashboard:** Always present when the teacher opens EasyCaseload. The teacher who configures neither SMS nor email still gets the briefing.

### Database Support

```sql
create table if not exists daily_briefings (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  briefing_date date not null,
  content_sms  text,          -- short version for SMS delivery
  content_full text,          -- full version for email/in-app
  delivered_at timestamptz,
  channels     text[],        -- ['sms', 'email', 'dashboard']
  created_at   timestamptz not null default now(),
  metadata     jsonb not null default '{}'
);

create unique index if not exists daily_briefings_teacher_date
  on daily_briefings(teacher_id, briefing_date);
```

---

## 7. Long-Term Memory and Institutional Knowledge

As EasyCaseload accumulates context over time, that context should be stored explicitly and made available to every AI interaction. The system becomes more accurate and more useful with each passing week — not because the model improves, but because the system knows more about this specific teacher, their students, and their work.

### What Gets Stored

Memory is typed and teacher-scoped. Every record is owned by a teacher and protected by RLS.

| Memory type | Examples |
|---|---|
| `teacher_preference` | Report writing style, preferred briefing format, usual working hours |
| `contact_preference` | "Maria's supervisor prefers brief bullet updates"; "Brad's parent communicates in Spanish" |
| `student_observation` | "Destiny disengages in afternoon sessions"; "Marcus responds well to visual schedules" |
| `campus_context` | "Lincoln contact is Ms. Rivera, ext 204"; "Washington parking is lot B on the east side" |
| `workflow_pattern` | "Teacher reviews draft queue on Sunday evenings"; "Monthly reports due first Friday" |
| `recurring_pattern` | "Brad is always seen Tuesdays at Lincoln, 9 AM" |

### Database Support

```sql
create table if not exists teacher_memory (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  student_id   uuid references students(id),     -- null if not student-specific
  campus_id    uuid references campuses(id),      -- null if not campus-specific
  memory_type  text not null,   -- 'teacher_preference' | 'contact_preference' |
                                 -- 'student_observation' | 'campus_context' |
                                 -- 'workflow_pattern' | 'recurring_pattern'
  subject      text not null,   -- brief label: "Report writing style"
  content      text not null,   -- the actual stored observation or preference
  confidence   numeric(3,2) default 1.0,  -- 0.0–1.0; lower = less certain
  source       text,            -- 'teacher_explicit' | 'ai_inferred' | 'pattern_detected'
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  metadata     jsonb not null default '{}'
);
```

### How Memory Feeds AI Prompts

Relevant memory records are retrieved and injected into the system prompt before every AI call. Retrieval is filtered by:
- `teacher_id` (always)
- `student_id` (when the task is student-specific)
- `campus_id` (when the task is campus-specific)
- `memory_type` (based on what the task needs — drafting a communication loads `contact_preference`; generating a report loads `student_observation`)

Injection format:

```
## Known context about [student name]:
- Observation: Destiny disengages in afternoon sessions (confidence: high)
- Observation: Responds well to movement breaks (confidence: medium)
- Contact preference (parent): Communicates informally; prefers text-like language

## Teacher writing preferences:
- Reports: use bullet points for goal summaries, paragraph for narrative sections
- Supervisor updates: brief (3–5 sentences), focus on progress and next steps
```

### The Rules for Memory

**Memory is explicit, not implicit.** Every stored item is a discrete database record, not an inference locked inside a model. The teacher can see every item, correct it, or delete it.

**Teacher-set memory is authoritative.** Anything the teacher explicitly states (`source = 'teacher_explicit'`) has maximum confidence and overrides AI-inferred equivalents.

**AI-inferred memory is surfaced for confirmation.** When the system detects a likely pattern (`source = 'ai_inferred'`), it surfaces it as a suggestion: "I noticed Brad is usually seen on Tuesday mornings — want me to remember that?" The teacher confirms or dismisses. Unconfirmed inferences are stored with low confidence and do not dominate prompts.

**Memory is never shared.** RLS ensures no teacher's memory is accessible to another teacher or any other app on the shared instance.

**Memory degrades gracefully.** Old or low-confidence memory is weighted less heavily in prompt injection. Items not used in 180+ days can be flagged for teacher review.

---

## 9. Technical Architecture

### AI Provider

**Anthropic Claude API** — accessed server-side via Next.js API routes or Server Actions. The API key (`ANTHROPIC_API_KEY`) must never reach the browser.

For simple, single-step processing (classify input, extract entities, generate a draft), call the Anthropic API directly from a Next.js API route or Server Action.

For multi-step pipelines (e.g., fetch session notes → summarize → format → queue email → notify teacher), use **n8n** as the workflow orchestrator. This is the primary approved use of n8n in EasyCaseload.

### Processing Pipeline (Technical)

```
Teacher submits input (POST to API route)
        │
        ▼
  Supabase: insert raw_inputs record       ← sync, immediate
        │
        ▼
  Trigger async processing pipeline
  (API route → n8n webhook, or background job)
        │
        ▼
  Anthropic API: classify + extract
        │
        ▼
  Supabase: write structured outputs
  (session_notes, tasks, reminders, draft queue)
        │
        ▼
  Supabase Realtime: broadcast changes      ← TanStack Query invalidates, UI updates
        │
        ▼
  Teacher sees results without refreshing
```

### Why n8n for Multi-Step Pipelines

Calling the Anthropic API, writing multiple Supabase records, and sending notifications are separate operations. If the Next.js process crashes mid-pipeline, some writes may have happened and others may not. n8n provides:
- Workflow persistence (retry failed steps)
- Step-by-step logging for debugging
- Separation of AI logic from the Next.js app
- Ability to add steps to a pipeline without deploying new app code

Use Next.js directly for simple, single-step AI calls. Use n8n for anything with more than two sequential operations.

### Real-Time Feedback

The intelligence pipeline is asynchronous — the teacher submits input and the system processes it in the background. The UI must reflect results without requiring a refresh (CLAUDE.md §12).

Implementation:
- After the pipeline writes to Supabase, Supabase Realtime broadcasts changes
- TanStack Query subscriptions on the relevant tables (`session_notes`, `tasks`, `drafts`) receive invalidation signals
- The UI re-fetches and shows updated data automatically

The teacher submits a voice note and, within a few seconds, sees the session logged and the task created — without doing anything else.

---

## 10. Database Support for Intelligence

The intelligence model requires database tables beyond the core student/campus/schedule schema. These will be added in later phases but should be designed for now.

### `raw_inputs`
Stores every piece of teacher input before processing. This is the safety net.

```sql
create table if not exists raw_inputs (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references teachers(id) on delete cascade,
  content       text not null,           -- the raw text (from voice or keyboard)
  input_channel text,                    -- 'voice', 'text', 'form'
  processed     boolean not null default false,
  processed_at  timestamptz,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
```

### `tasks`
Deferred follow-up items derived from teacher input or created manually.

```sql
create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references teachers(id) on delete cascade,
  student_id      uuid references students(id),
  source_input_id uuid references raw_inputs(id),  -- traceability
  title           text not null,
  notes           text,
  due_date        date,
  completed       boolean not null default false,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  metadata        jsonb not null default '{}'
);
```

### `draft_queue`
External communications drafted by the system, awaiting teacher approval.

```sql
create table if not exists draft_queue (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references teachers(id) on delete cascade,
  student_id      uuid references students(id),
  source_input_id uuid references raw_inputs(id),
  draft_type      text not null,   -- 'email', 'report', 'supervisor_update', 'parent_comm'
  recipient       text,
  subject         text,
  body            text not null,
  status          text not null default 'pending',  -- pending | approved | rejected | sent
  reviewed_at     timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  metadata        jsonb not null default '{}'
);
```

### `goals`
Student goals (e.g., IEP goals) against which session progress is tracked.

```sql
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references teachers(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  title       text not null,
  description text,
  target_date date,
  status      text not null default 'active',  -- active | met | discontinued
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  metadata    jsonb not null default '{}'
);
```

> **Note:** These tables are defined here for architectural awareness. Migrations for `raw_inputs`, `tasks`, `draft_queue`, and `goals` will be introduced in the appropriate roadmap phase, not in Phase 1. Phase 1's migration only creates `teachers`.

---

## 11. Prompt Engineering Guidelines

When building AI features, follow these guidelines for Anthropic API calls:

### System Prompt Structure

Every AI call should include a system prompt that provides:
1. The teacher's identity and caseload context (relevant students, campuses, goals)
2. The task being performed
3. Output format requirements (structured JSON for extraction, prose for drafts)
4. Tone and voice guidance (professional, clear, educator-appropriate)

### Extraction Tasks

Request structured JSON output. Use explicit field names matching the database schema. Include examples in the prompt when the input format is unpredictable.

```
Given this teacher input, extract the following as JSON:
{
  "student_name": string or null,
  "session_date": ISO date string or null,
  "duration_minutes": number or null,
  "goals_mentioned": string[] or [],
  "sentiment": "positive" | "neutral" | "concern" | null,
  "follow_up_requested": boolean,
  "follow_up_details": string or null
}
```

### Draft Generation Tasks

Provide the teacher's session notes, the student's context, and the communication type. Request a professional draft that the teacher can review and edit — not a final document.

Always instruct the model to:
- Write in first person from the teacher's perspective
- Use the student's name consistently
- Avoid clinical jargon that isn't appropriate for the audience
- Flag any uncertainty with `[review this]` inline markers

### Avoiding Hallucination

The model should only reference information that exists in the provided context. Include explicit instructions: "Only use information provided in the context below. Do not invent details, dates, or outcomes not present in the source material."

---

## 12. Phase Roadmap for Intelligence Features

| Phase | Intelligence Capability |
|---|---|
| 1 — Auth | Foundation only. No AI calls. TanStack Query + Realtime infrastructure wired. |
| 2 — Students/Campuses | Data model supports student context. No AI calls yet. |
| 3 — Schedule | Schedule data feeds future proactive triggers. No AI calls yet. |
| 4 — Session Notes | Quick text input for session logging. No AI calls yet — but `raw_inputs` table and input UX designed with the pipeline in mind. |
| 5 — AI Reports | First AI calls: generate report drafts from session notes. Draft queue introduced. Approval flow implemented. |
| 6 — Input Pipeline | Natural language input processing, entity extraction, multi-output derivation, voice-to-text workflow. `raw_inputs` processing pipeline with n8n. |
| 7 — Daily Briefing | Morning briefing assembled by n8n cron, delivered via SMS/email/dashboard. `daily_briefings` table. Telnyx SMS integration. Teacher preferences for delivery channel. |
| 8 — Long-Term Memory | `teacher_memory` table introduced. AI-inferred pattern detection. Memory injection into all AI prompts. Teacher-facing memory review and edit screen. |
| 9 — Proactive System | Gap detection, reminders, alerts, post-session suggestions. Memory-informed priority scoring. |
| 10 — Conversational Interface | Full conversational input, multi-intent handling, context-aware responses informed by accumulated memory. |

**The most important constraint:** No phase should make Phase 10 harder. Prefer data models and UI patterns that accommodate natural language input and long-term memory even before those capabilities are built.

---

## 13. Design Constraints for All Phases

These constraints apply now, not just when AI features are built:

1. **Never design a feature that requires structured form input** for something a teacher might communicate naturally. If a teacher might say "I met with Brad for 30 minutes," there should be a path to log that without opening a form and selecting a date, a student, and a duration from separate fields.

2. **Session note entry must be optimized for mobile, one-handed, fast input.** A large text area with a submit button is the minimum. Voice input should be trivially accessible.

3. **Every piece of captured information should have a `metadata jsonb` column** as an extensibility escape hatch. The intelligence pipeline will attach derived data, confidence scores, and processing state to existing records.

4. **Design lists and detail views to display AI-derived content naturally.** When session notes eventually include AI-extracted summaries and goal tags, the UI should accommodate them without a redesign.

5. **The approval queue (`draft_queue`) must be a first-class surface in the app.** It is where the teacher sees everything the system has prepared for them. It should be visible from the main navigation and easy to act on from a phone.

---

_This document should be reviewed and updated as AI features are scoped and implemented. When a pipeline is built, replace the design descriptions in this document with links to the actual implementation._
