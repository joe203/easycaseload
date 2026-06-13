# Report Generation Architecture

_Date: 2026-06-13 (V2 Phase C). Authority: implements the PRODUCT_VISION "capture
once, reuse many" principle for the report surface. Read before changing anything
under `lib/reports/`._

## The one rule

**A report is a synthesis over multiple sources — never a transcription of a
single session.** Any change that makes the generator depend on one input (e.g.
"generate a report from this session log") is wrong, even if it's the fastest
path. The data for some sources isn't fully modeled yet; that is expected, and
the architecture absorbs it without a rewrite.

## The four sources

A report about one student over a reporting period draws on:

| # | Source | Table | Status |
|---|--------|-------|--------|
| 1 | Session logs — what happened in the room | `student_logs` | Live |
| 2 | IEP goals — what progress is measured against | `student_goals` | Live |
| 3 | Documentation — IEPs/evaluations framing services | `documents` (metadata) | Live (metadata only; text extraction is a later phase) |
| 4 | Impairment profile — disability/service context that shapes the report | _not yet modeled_ | **Extension point** — `ImpairmentProfile` type, read returns `null` today |

## The pipeline (`lib/reports/`)

```
generateStudentReport(studentId, period)        ← lib/actions/reports.ts (authz + persistence)
        │
        ▼
assembleReportContext({ studentId, period })    ← report-context.ts
        │   gathers ALL four sources into one ReportContext (RLS user client)
        ▼
generateReportContent(context)                  ← generate-report.ts
        │   Anthropic Sonnet, generateObject over the WHOLE context.
        │   Counts (service_minutes, sessions_held) computed from rows, NOT the model.
        ▼
reports row (status 'ready', content jsonb)
```

- `ReportContext` (in `lib/types/report.ts`) is the contract. **Adding a source =
  extend `ReportContext` + `assembleReportContext`. The generator does not change.**
- Source #4 (`ImpairmentProfile`) is read forward-compatibly from
  `students.metadata.impairment` if present, else `null`. When a structured
  impairment model lands, replace `readImpairmentProfile()` — the prompt builder
  and schema already consume a populated profile.
- The generator degrades gracefully: empty goals, no documents, or a null profile
  all produce a valid (thinner) report, and `content.sources_used` records what
  actually contributed.

## Demo vs. active

- **Demo accounts cannot generate** (`canGenerateReports = false`) — AI-cost
  control. Their report experience is the two pre-seeded watermarked samples from
  `seed_demo_workspace()` (migration 018). Export is locked for demo too.
- **Active accounts** generate live and export. Numbers in every report are real
  (computed from rows), never model-hallucinated.

## What is intentionally NOT built yet

- Document **text** extraction (only metadata feeds the report today).
- A structured impairment/disability data model (source #4).
- Formatted PDF export (current "Export" is a dependency-free text download).
- Report scheduling / calendar-driven generation (Phase 4+).

Do not "complete" these without a work order — they are sequenced deliberately.
