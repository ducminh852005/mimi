# MIMIwithYOU

Adaptive AI study companion — helps students manage the workload they have,
with the capacity they actually have. Full architecture & technical design:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Core idea

React 19 + TypeScript + Tailwind CSS on the client, everything persisted to
`localStorage` (profile, tasks, session, Study Mirror), and a serverless BFF
(`api/v1/**`, Vercel Edge Functions) that proxies **Gemini 1.5 Flash** for
task extraction, adaptive planning, and behavioral learning — never exposing
the API key to the browser.

A demo-resilience layer (`src/api/client.ts`) gives every real API call
3.5s before silently swapping in pre-warmed mock data, so a live pitch never
shows a spinner or a dead screen, online or offline.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Plain `vite dev` does not serve the `/api/v1/*`
Edge Functions, so every call falls back to mock data automatically — the app
is still fully click-through-able offline.

### Enable the real Gemini calls

```bash
cp .env.example .env
# fill in GEMINI_API_KEY in .env
```

`GEMINI_API_KEY` is only ever read by the server-side handlers in `api/v1/**`
— it is never bundled into client code. To exercise it locally, run the
project through the Vercel CLI instead of plain Vite:

```bash
npm i -g vercel   # once
vercel dev
```

Or deploy to Vercel and set `GEMINI_API_KEY` as an environment variable in the
project dashboard.

## Language

The UI ships in Vietnamese and English via `react-i18next`
(`src/i18n/locales.ts`), toggled with the switcher in the header. The choice
is remembered in `localStorage` (`mimi_locale`).

## Scripts

```bash
npm run dev       # dev server
npm run build     # type-check (tsc --noEmit) + production build
npm run preview   # preview the production build
npm run lint      # eslint
```

## Directory structure

```
src/
├── types/api.ts          # shared domain & API contract types
├── utils/storage.ts       # localStorage engine (mimi_* keys)
├── utils/mockData.ts      # pre-warmed demo-resilience fallback data
├── api/client.ts          # fetch wrapper: 3.5s timeout → mock fallback
├── i18n/                  # react-i18next setup + vi/en resources
├── lib/theme.ts            # dynamic ambient theme (battery → Sunset Rose / Mint)
└── components/
    ├── screens/            # Screen 1–4 of the state machine (see App.tsx)
    ├── BatteryIcon.tsx
    └── LanguageSwitcher.tsx
api/
├── _lib/                   # shared Gemini client + response envelope helpers
└── v1/
    ├── dump/extract.ts             # POST /api/v1/dump/extract
    └── companion/
        ├── adapt-plan.ts           # POST /api/v1/companion/adapt-plan
        └── reflect.ts              # POST /api/v1/companion/reflect
docs/
└── ARCHITECTURE.md          # full technical design (source of truth)
```

## Pre-pitch checklist

- [ ] No network / Gemini down → app still shows a full plan and a
      companion message (mock fallback), no crash, no blank screen.
- [ ] Valid `GEMINI_API_KEY` + deployed to Vercel → extraction, planning, and
      reflection all return real Gemini output within ~3.5s.
- [ ] Dragging the battery slider on Screen 1 from 100% → 20% visibly
      re-themes the app and shrinks the recommended step.
- [ ] F5 while a focus step is running (Screen 3) resumes the same step and
      timer instead of resetting.
