# EasyCaseload — Product Vision

_Primary source: `EASYCASELOAD_CORE_PRINCIPLES.MD`_
_Last updated: 2026-06-10_

---

## The One-Sentence Vision

EasyCaseload is an AI administrative assistant that handles the paperwork so itinerant teachers can focus on their students.

---

## The Reframe That Matters

Most caseload tools are databases with a reporting feature bolted on. Teachers are expected to navigate menus, fill out forms, remember to log things, and manually generate documents.

**EasyCaseload is different.** The database is infrastructure. The assistant is the product.

This distinction shapes every decision:

| Database-first tool | AI assistant (EasyCaseload) |
|---|---|
| Teacher navigates to a form | Teacher speaks or types naturally |
| Teacher enters structured data | System extracts structure from natural language |
| Teacher generates a report | System drafts a report from accumulated context |
| Teacher remembers to follow up | System surfaces reminders proactively |
| One input, one output | One input, many useful outputs |

When evaluating any feature, the question is not "does this store information correctly?" The question is: **does this reduce the teacher's administrative workload?**

---

## Who EasyCaseload Is For

**Itinerant teachers** — also called traveling teachers, specialists, or related service providers — serve students across multiple school campuses. A single teacher may visit four or five schools in a day, work with dozens of students, and be responsible for documentation that directly affects student services, compliance, and billing.

Their daily reality:
- Moving between campuses in a car or on public transit
- Pulling up a phone to check who they're seeing next
- Finishing a session and needing to log it before the next one starts
- Accumulating documentation debt that grows faster than they can clear it
- Generating the same types of reports repeatedly with slightly different student data

The teacher's primary job is serving students. Everything else is overhead. EasyCaseload's job is to absorb as much of that overhead as possible.

---

## The Ideal Interaction

A teacher leaves a session with a student named Brad. She's walking to her car. She opens EasyCaseload and speaks:

> "I met with Brad today for 30 minutes. We worked on his articulation goals. He's making good progress. Remind me to send his supervisor an update next Thursday."

EasyCaseload:
- Logs the session (student, date, duration, content)
- Tags the session against Brad's articulation goals
- Creates a task: "Send supervisor update for Brad" due next Thursday
- Drafts a supervisor email based on the session note
- Queues the email for teacher review — does not send it

The teacher did not touch a form. She did not navigate a menu. She did not remember to log anything. She spoke for fifteen seconds and kept walking.

That is the target experience. Every design decision should move toward it.

---

## A Day in the Life

Sarah is a speech-language pathologist serving four elementary schools. She has 22 students on her caseload. This is her day with EasyCaseload.

---

**7:15 AM — Morning briefing**

Before leaving the house, Sarah glances at a text message from EasyCaseload:

> _Good morning, Sarah. Here's your day:_
> _• 6 students at Lincoln Elementary (8:30–11:45)_
> _• 4 students at Washington Middle (1:00–3:30)_
> _• 2 draft communications waiting for your review_
> _• Reminder: Marcus's IEP meeting is Thursday — no prep notes yet_
> _• Overdue: session notes for 3 students from Tuesday_

She opens the app on her phone. In thirty seconds she knows her priorities for the day. She approves one of the two draft emails — a routine progress update she's already reviewed. She flags the other for later. She makes a mental note about Marcus.

---

**9:10 AM — Between sessions at Lincoln**

Sarah finishes with a student named Destiny. She walks into the hallway, opens EasyCaseload, and speaks:

> "Finished with Destiny. Thirty minutes. We worked on her blending goals. She really struggled today — more than usual. I want to check in with her classroom teacher."

EasyCaseload logs the session, flags the goal area, and creates a task: "Follow up with Destiny's classroom teacher." It also notes the concern in the session record and adds a low-priority suggestion: "Destiny has had two difficult sessions this month — would you like to draft a parent update?"

Sarah taps "not now" and moves to her next student.

---

**11:50 AM — Car, between campuses**

Driving to lunch, Sarah uses hands-free voice input:

> "Remind me Friday morning to submit Marcus's monthly service log. And I need to invoice Lincoln for October — I think I completed everything but I'm not sure."

EasyCaseload creates the Friday reminder. For the invoice question, it responds in the app: "You logged 8 sessions at Lincoln in October totaling 4.5 hours. Here's a summary — want me to draft an invoice support document?" Sarah approves. The draft appears in her review queue.

---

**1:00 PM — Washington Middle**

Four students. After each one, Sarah spends twenty seconds speaking into her phone. By 3:30, all four sessions are logged. Two progress notes are drafted and waiting in her queue. One task has been created for a parent call.

She did not open a form once.

---

**5:15 PM — End-of-day review**

At home, Sarah opens EasyCaseload for five minutes. The dashboard shows:

- 10 sessions logged today ✓
- 3 overdue session notes from Tuesday — she taps each one and adds a quick voice note to complete them
- 4 items in the draft queue — she reviews two, approves both, rejects one for rewording
- Marcus IEP prep still flagged — she dictates a few prep notes so she has something to work from Thursday morning

She closes the app. Her documentation for the day is complete. The overdue notes from Tuesday are cleared. Nothing is lost.

---

This is the target experience — not a tool Sarah has to manage, but an assistant that keeps up with her.

---

## The Daily Briefing

The Daily Briefing is a proactive, scheduled summary that EasyCaseload delivers each morning before the teacher's day begins.

**The briefing answers one question: what does the teacher need to know and do today?**

### What It Contains

- **Today's schedule** — student visits in order, with campus and time
- **Approaching deadlines** — IEP reviews, report due dates, district submissions within the next 7 days
- **Documentation gaps** — sessions that were logged but still need progress notes
- **Draft queue** — count of communications or documents awaiting teacher approval
- **Reminders** — tasks the teacher set that are due today or tomorrow
- **Suggested actions** — one or two high-value actions the system recommends based on current context

The briefing is designed to be consumed in under two minutes. It is not comprehensive — it is prioritized.

### Delivery

The briefing should be available through multiple channels, in order of preference:

1. **SMS** — pushed via Telnyx through an n8n workflow; the teacher reads it before opening the app
2. **Email** — daily digest with the same content in a clean format
3. **In-app dashboard** — always visible when the teacher opens EasyCaseload; the default for teachers who don't configure SMS or email

The teacher chooses their preferred channel. SMS is recommended because it reaches the teacher before they open any other app.

### Design Principle

The briefing is generated by the system, not assembled by the teacher. The teacher should never have to check multiple places to understand their day. One message, one place, everything that matters.

---

## Long-Term Memory and Institutional Knowledge

EasyCaseload becomes more useful over time — not just because it accumulates data, but because it learns context that makes every interaction more accurate and every output more relevant.

### What the System Should Remember

**About the teacher:**
- Preferred writing style and tone in communications (formal vs. conversational)
- Preferred report format and section order
- Workflow habits (when they typically log notes, when they review drafts)
- Frequently visited campuses and recurring scheduling patterns

**About students:**
- Behavioral observations noted across sessions ("Brad tends to disengage when tired — best early in the day")
- What motivates or challenges each student
- Communication history and outcomes
- Progress patterns over time

**About contacts:**
- Supervisor preferences (how frequently they want updates, what format they prefer)
- Parent communication preferences (language, formality, best contact time)
- Campus-specific contacts and protocols

**About work patterns:**
- Which types of tasks the teacher tends to defer and may need reminders for
- Recurring documentation that appears at predictable intervals
- Seasonal patterns (IEP season, end-of-year reporting)

### How Memory Is Used

Stored memory is injected as context into AI prompts, making outputs more accurate from the first sentence. When drafting a supervisor email, the system knows this supervisor prefers brief bullet summaries. When generating a report for Brad, the system knows his documented behavioral patterns and can reference them appropriately.

Memory context is also used by the proactive system — if the teacher typically reviews drafts on Sunday evenings, the system can time suggestions accordingly.

### The Rules for Memory

**Memory assists; it does not override.** The teacher's explicit instructions in any session always take precedence over stored preferences.

**Memory is always reviewable.** Every stored observation is visible to the teacher through a dedicated memory review screen. Nothing is stored that the teacher cannot see.

**Memory is always editable.** The teacher can correct, delete, or update any stored item. If a contact preference changes, the teacher updates it and the system reflects it immediately.

**Memory is private.** Memory is scoped per teacher under RLS. No memory is ever shared across teacher accounts.

**Memory degrades gracefully.** Stored preferences should carry a confidence level and age. Old or low-confidence memory should inform but not dominate AI outputs.

---

## The Chief-of-Staff Vision

A chief of staff — in the traditional organizational sense — keeps the principal informed, coordinates across domains, prepares materials before they're requested, surfaces what needs attention, and handles delegated work within defined boundaries. They never act unilaterally on anything consequential. They make the principal more effective without adding to their cognitive load.

This is exactly what EasyCaseload is building toward.

For an itinerant teacher, that means EasyCaseload:

**Coordinates across every domain of their work.** Student services, documentation, communications, scheduling, compliance, and billing are currently managed across spreadsheets, paper logs, email, and memory. EasyCaseload brings these into a single system and creates connections between them — a session note becomes a progress report becomes a supervisor communication becomes a billing record.

**Prepares without being asked.** A good chief of staff doesn't wait for the principal to ask for the briefing — they have it ready. EasyCaseload prepares the daily briefing, drafts the reports, creates the reminders, and surfaces the deadlines before the teacher thinks to look.

**Stays in its lane.** The teacher remains the decision-maker. EasyCaseload recommends, drafts, organizes, and reminds — but external communications go out only when the teacher approves them. The system handles the administrative work; the teacher handles the judgment calls.

**Gets better over time.** A chief of staff who has worked with you for a year knows your preferences, your patterns, and your priorities better than one who started last week. EasyCaseload builds institutional memory over time — about the teacher, the students, the contacts, and the workflow — so every interaction becomes more accurate and more useful.

The goal is not to replace the teacher's expertise or judgment. The goal is to free it — to eliminate the administrative friction between a skilled professional and the students they serve.

---

## Core Principles Summary

The twelve principles in `EASYCASELOAD_CORE_PRINCIPLES.MD` define the product in full. The four that most directly shape implementation decisions:

**The assistant is the product (Principle 1).** The database, the UI, and the workflows exist to support the assistant. Features that make the database cleaner but the assistant less capable are moving in the wrong direction.

**Voice-to-text is a first-class workflow (Principle 3).** Input design must assume the teacher is on their phone, probably not at a desk. Natural language via voice is not a nice-to-have; it is a primary input method.

**Capture once, reuse many times (Principle 4).** A single teacher input — one voice note — can and should produce session logs, reminders, task items, draft communications, and report content. The system should identify every opportunity to derive value from the same raw input.

**Store first, organize second (Principle 5).** When a teacher provides input, preserve it immediately. Classification, extraction, and organization happen afterward — possibly asynchronously. Information must never be lost because the system could not immediately categorize it.

---

## What the Fully Realized Product Does

In its complete form, EasyCaseload:

**Captures and processes natural language input** — typed or spoken — and extracts structured information without requiring the teacher to use forms or follow a specific format.

**Maintains a living picture of each student** — services provided, progress toward goals, documentation status, upcoming deadlines, and history.

**Generates and queues external communications** — progress notes, supervisor updates, parent communications, administrative reports — as drafts that the teacher reviews and approves before sending.

**Manages the teacher's task and reminder system** — surfacing upcoming deadlines, flagging missing documentation, and suggesting follow-up actions based on what the teacher has already told the system.

**Supports billing and invoicing** — maintaining service logs in a format that supports invoice generation or district billing documentation.

**Stays proactive** — the system does not wait to be asked. It surfaces alerts, suggests actions, and prepares drafts based on what it knows about the teacher's caseload and schedule.

---

## The Long-Term Vision

The ultimate form of EasyCaseload is the fully realized chief of staff described above — a conversational AI that knows the teacher's complete caseload, understands every student's context and history, and can handle almost any administrative task through natural dialogue.

**What a teacher should be able to say — and what EasyCaseload should do:**

| Teacher says | EasyCaseload does |
|---|---|
| "What do I have today?" | Schedule overview with student context, flagged priorities, and pending items |
| "I finished with Maria. She hit two of her three goals." | Session logged, goal progress updated, report draft queued, monthly summary suggested |
| "Do I have anything overdue?" | Prioritized list with suggested actions for each item |
| "Write a progress report for Brad covering the last three months." | Full draft generated from accumulated session notes, in Brad's established format |
| "Remind me to check in on Destiny's classroom situation next week." | Task created with full student context attached |
| "What did I note about Marcus last month?" | Instant retrieval from session history |
| "I need to invoice Lincoln for October." | Service log summary assembled, invoice support draft queued for review |
| "Draft an email to Maria's supervisor about her progress." | Draft generated using session history, supervisor preferences from memory, queued for approval |

The teacher's role is to review, correct, and approve. The system handles the rest.

This vision is built incrementally. Each phase of the roadmap adds capability. But the destination is clear from the beginning — and every early decision should be made with that destination in mind.

---

## How to Evaluate Features

Every feature proposal should be measured against this filter:

1. **Does it reduce administrative workload for the teacher?** If a feature adds steps, requires more structured input, or creates new overhead without a clear administrative payoff, it works against the product vision.

2. **Does it move toward the conversational model?** Prefer designs where the teacher communicates intent and the system determines action. Avoid designs where the teacher must navigate structure to complete a task.

3. **Does it support capture-once / reuse-many?** If a feature captures information, ask what else that information could produce. If it can produce more value without additional teacher input, design for it.

4. **Is the mobile experience viable?** Every feature must be evaluated from the perspective of a teacher using a phone in a school hallway. If it's only usable at a desktop, it is not a primary workflow.

5. **Does it build toward the long-term vision?** Short-term implementation choices should not foreclose the AI-first future. Prefer architectures that accommodate natural language input, asynchronous AI processing, and proactive suggestions — even when those capabilities are not yet built.

---

## Relationship to the Roadmap

The current roadmap (ROADMAP.md) is phased pragmatically — infrastructure first, then data management, then AI. This is correct sequencing. But the AI-first philosophy should inform every phase:

- **Phase 1–2 (foundation, students/campuses):** Build the data model to support the intelligence layer. Every table designed now is context the AI will use later. Prefer richer data over minimal data.
- **Phase 3 (schedule):** Think about how schedule data feeds proactive alerts ("You haven't seen Brad in three weeks").
- **Phase 4 (session notes):** This is where the core of the assistant's context lives. The note entry experience should be designed for quick mobile input — not a long form.
- **Phase 5 (AI reports):** The first visible expression of the AI-assistant vision. This is not just a report generator; it is the proof of concept for everything that follows.
- **Phase 6+ (conversational interface):** Natural language input, voice-to-text pipeline, multi-output processing, proactive system.

No phase should make Phase 6 harder to build.

---

## What EasyCaseload Is Not

- Not a general-purpose school administration platform
- Not a student information system (SIS) replacement
- Not a scheduling app with some notes
- Not a document storage tool
- Not a CRM with AI features added

It is an AI administrative assistant that happens to store data, manage schedules, and produce documents — because those are the things the assistant needs to do its job.

---

_This document should be reviewed and updated whenever the product direction evolves. If a principle in `EASYCASELOAD_CORE_PRINCIPLES.MD` is amended, update this document to reflect the change._
