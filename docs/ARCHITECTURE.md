# MIMIwithYOU — Architecture & Technical Design

Project: MIMIwithYOU (Global Hackathon 2026) — Adaptive AI Study Companion.
Motto: "One step at a time, together."

Core stack: **React 19 (Vite + TypeScript + Tailwind CSS)**, a **client-side Local
Storage engine**, and a **serverless BFF** proxying **Gemini 1.5 Flash**.

This document is the single in-repo source of truth for the architecture. It
supersedes the old 3-tier static/local/api design and the 6-screen flow that
used to live here — see git history if you need the previous version.

---

## 1. Product definition & user loop

**Value proposition:** "MIMI helps students manage the workload they have,
with the capacity they actually have." MIMIwithYOU is neither a generic to-do
app nor a mental-health diagnostic tool — it closes the gap between a
student's real workload and their real battery/time capacity through deep,
person-specific personalization.

**The emotional & operational loop:**

```
Overloaded student ("MIMI, help me...")
  → Brain Dump (auto-parse screenshot/PDF/chat)
  → Energy Check-in (Battery 20% & 45 min free)
  → Personalization Filter (Chronotype + study history)
  → One Next Step (a single micro-task recommendation)
  → Reflect & Learn (feedback + Study Mirror)
  → Ready for the next step
```

---

## 2. Personalization architecture & adaptive profiling

Personalization combines an **explicit** cold-start profile with an
**implicit** behavioral feedback loop:

- **Explicit** (`src/types/api.ts` → `StudentProfile`, ~10s cold-start):
  Chronotype (Night Owl / Early Bird / Balanced), Preferred Tone (Warm /
  Direct / Cheerful), friction threshold.
- **Implicit** (Study Mirror engine, `src/utils/storage.ts` →
  `StudyMirrorData`): per-course time multipliers, energy/task friction
  history, completion velocity trends.

Both feed the **Adaptive Heuristic Pipeline** (server-side, inside the
`adapt-plan` Gemini prompt — see §6.2):

1. Filter tasks by golden-hour window & battery level.
2. Multiply each course's base duration by its learned multiplier (e.g. ×1.33).
3. Pick the message tone that matches the student's personality.

### 2.1 Chronotype & energy matrix

- **Night Owl** — studying after 21:00 on LOW battery still allows light
  writing tasks.
- **Early Bird** — after 20:00 on LOW battery, MIMI blocks heavy assignments
  outright and only suggests prep/checklist ticking (≤10 min).
- **Cognitive friction matching** — LOW battery (20%) → only mechanical tasks
  (skim-reading, format checks, short structured answers). GOOD/FULL battery
  (80–100%) → creative or big-picture outlining work is prioritized.

### 2.2 Tone & voice customization

- **Warm Companion** (default) — gentle, validating, subtly encouraging.
- **Minimalist / Direct** — short, no fluff, straight to the action.
- **Cheerleader** — energetic, upbeat, celebratory.

---

## 3. System architecture & infrastructure

Serverless **Backend-for-Frontend (BFF)** + **client-side Local Storage**, to
keep hosting cost at $0, keep personal data on the student's own device, and
maximize demo smoothness.

```
CLIENT BROWSER (React 19 SPA)
  UI Layer: React 19 + TypeScript + Tailwind CSS
            Dynamic Ambient Theme (color shifts with battery — src/lib/theme.ts)
  Local Storage Engine (~5MB, src/utils/storage.ts)
    mimi_student_state     — battery, available minutes, active recommendation
    mimi_extracted_tasks   — parsed courses & sub-tasks
    mimi_student_profile   — personalization, chronotype
    mimi_study_mirror      — behavior patterns, course multipliers
        │
        │ HTTPS / JSON / multipart
        ▼
SERVERLESS API PROXY (Vercel Edge Functions, api/v1/**)
  - Keeps GEMINI_API_KEY server-side only (no VITE_ prefix)
  - Receives multipart/Buffer in RAM (never persisted to disk/S3)
  - Enforces structured JSON output & the request contract
        │
        │ inline base64 + JSON + persona context
        ▼
GEMINI 1.5 FLASH API
  - Multimodal document/image parsing
  - Personalized heuristic prioritization & micro-step slicing
  - Behavioral learning & pattern synthesis
```

---

## 4. Client data storage (Local Storage engine)

### 4.1 Type definitions

All shared types live in [`src/types/api.ts`](../src/types/api.ts):
`BatteryLevel`, `TaskUrgency`, `ReflectionFeedback`, `ObstacleReason`,
`Chronotype`, `CompanionTone`, `StudentProfile`, `SubTask`, `AcademicTask`,
the generic `ApiEnvelope<T>`, and the request/response pair for each of the
three endpoints below.

### 4.2 Storage implementation

[`src/utils/storage.ts`](../src/utils/storage.ts) exposes `localStore`, a thin
typed wrapper around four `localStorage` keys (`mimi_student_state`,
`mimi_extracted_tasks`, `mimi_student_profile`, `mimi_study_mirror`) with safe
JSON get/set, task/sub-task completion helpers, and Study Mirror insight
accumulation (`addReflectionInsight`, capped at the last 10 patterns).

---

## 5. API specification & data contracts

Base URL: `/api/v1`. Every response is wrapped in the same envelope:

```json
{ "success": boolean, "data": T, "error": null | { "code": string, "message": string } }
```

### 5.1 Endpoint 1 — Brain Dump extraction

`POST /api/v1/dump/extract` · `multipart/form-data`
Implementation: [`api/v1/dump/extract.ts`](../api/v1/dump/extract.ts) (Edge runtime).

- Request: `files` (screenshots/PDF) + `rawText` (pasted chat/LMS message).
- Response: `{ tasks: AcademicTask[] }`, each task pre-sliced into 2–4
  sub-tasks.

### 5.2 Endpoint 2 — Energy & persona-aware adaptive planning

`POST /api/v1/companion/adapt-plan` · `application/json`
Implementation: [`api/v1/companion/adapt-plan.ts`](../api/v1/companion/adapt-plan.ts).

Request: `availableMinutes`, `batteryLevel`, `currentTime`, `studentProfile`
(chronotype + tone), `courseMultipliers`, `tasks`.
Response: `AdaptPlanResponse` — a `workloadSummary` (total vs. available
minutes, overload flag) and exactly one `recommendation` (single next action,
never a list).

### 5.3 Endpoint 3 — Reflection & pattern calibration

`POST /api/v1/companion/reflect` · `application/json`
Implementation: [`api/v1/companion/reflect.ts`](../api/v1/companion/reflect.ts).

Request: `taskId`, `subTaskId`, `courseCode`, `plannedMinutes`,
`actualMinutesSpent`, `feedback`, `obstacleReason`.
Response: `ReflectResponse` — a `sessionId` and a `studyMirror` insight
(`learnedPattern` + `behaviorMetric.varianceRatio`) that the client folds back
into `mimi_study_mirror` via `localStore.addReflectionInsight`.

---

## 6. AI prompt pipeline specifications

All three endpoints share [`api/_lib/gemini.ts`](../api/_lib/gemini.ts), which
reads `GEMINI_API_KEY` server-side and calls `gemini-1.5-flash` with
`responseMimeType: "application/json"` plus an explicit JSON `responseSchema`
per endpoint, so the model's output always matches the contracts in §5.

### 6.1 Extraction Engine ("Tell MIMI")

Temperature 0.1. Deconstructs every task into 2–4 sequential sub-tasks of
10–25 minutes each, classifies urgency (`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`), and
returns strict JSON only.

### 6.2 Adaptive Planning Engine ("MIMI Adapts")

Temperature 0.35. Applies the chronotype/time rule, multiplies by course
variance, matches task friction to battery level, calibrates tone (Warm /
Direct / Cheerful), and recommends **exactly one** `actionStep`.

### 6.3 Behavioral Learning Engine ("MIMI Learns")

Temperature 0.2. Compares planned vs. actual time and feedback/obstacle to
produce a `learnedPattern` (<20 words, course-specific) and a `varianceRatio`
multiplier (actual/planned) used to recalibrate future estimates.

---

## 7. Frontend state machine & dynamic UI personalization

Four screens, driven by `App.tsx` (`Screen = 'screen1' | 'screen2' | 'screen3' | 'screen4'`):

```
Screen1 → Screen2 → Screen3 → Screen4 → Screen1 (loop)
```

- **Screen 1 — Dump & Ambient Home**
  [`DumpAmbientHomeScreen.tsx`](../src/components/screens/DumpAmbientHomeScreen.tsx)
  Theme shifts with battery (Sunset Rose vs. Mint, `src/lib/theme.ts`), quick
  persona picker (tone & chronotype), the "MIMI, I CAN'T" emergency button,
  and the brain-dump upload (image/PDF/pasted text).
- **Screen 2 — Workload Overview & Adapt**
  [`WorkloadOverviewScreen.tsx`](../src/components/screens/WorkloadOverviewScreen.tsx)
  Total identified workload vs. available time, the course-multiplier-adjusted
  recommendation, and the tone-calibrated companion message.
- **Screen 3 — One Next Action (Focus)**
  [`FocusActionScreen.tsx`](../src/components/screens/FocusActionScreen.tsx)
  A single micro-task card (15–20 min), a live ambient timer, and a pulsing
  "breathing" avatar.
- **Screen 4 — Reflection & Study Mirror**
  [`ReflectionScreen.tsx`](../src/components/screens/ReflectionScreen.tsx)
  Three feedback icons (Easy/Okay/Hard), an obstacle picker, and the Study
  Mirror insight update.

**Internationalization:** all screen copy is externalized to
[`src/i18n/locales.ts`](../src/i18n/locales.ts) via `react-i18next`, with a
`vi`/`en` toggle (`src/components/LanguageSwitcher.tsx`) persisted to
`localStorage` (`mimi_locale`) independent of the four core `mimi_*` keys.

---

## 8. Live pitch & demo resilience plan (hackathon safeguard)

Implemented in [`src/api/client.ts`](../src/api/client.ts):

- **Pre-warmed mock fallback** — every real call gets `3500ms`
  (`REQUEST_TIMEOUT_MS`) before it's abandoned; on timeout or any
  network/HTTP error, mock data from
  [`src/utils/mockData.ts`](../src/utils/mockData.ts) is swapped in silently
  after a `300ms` delay (`MOCK_FALLBACK_DELAY_MS`) — no spinner, no dead
  screen.
- **Personalization demo wow-moment** — dragging the battery slider on
  Screen 1 from 100% down to 20% instantly re-themes the whole app (Mint →
  Sunset Rose), and re-running the plan collapses the workload down to one
  15-minute step with a warmer companion message.
- **Session auto-resume** — `App.tsx` seeds its initial screen from
  `localStore.getSession()`; an F5 mid-focus (Screen 3) jumps straight back
  into the running step with the timer still counting, instead of losing
  progress.

---

## 9. Configuration & deployment notes

- Set `GEMINI_API_KEY` (server-side only, **no** `VITE_` prefix) via
  `.env.example` → `.env` locally, or the Vercel dashboard in production.
- `api/v1/**` are Vercel **Edge Functions** (`export const config = { runtime: 'edge' }`).
  Plain `vite dev` does not serve them, so every `/api/v1/*` call fails fast
  and the mock fallback in §8 takes over automatically — this is expected
  local-dev behavior, not a bug. Run `vercel dev` or deploy to Vercel to
  exercise the real Gemini calls end-to-end.
