# 🎓 EDUcore Mastery — Daily Schema Quiz

A daily quiz app for learning the EDUcore education-data standards and tracking your
knowledge of each spec over time. Knowledge is separated into three layers per spec —
**Data Model**, **Transport**, and **API** — laid out as a clickable knowledge map.
Click any cell to get a **study narrative built from the questions you've missed**, then
drill that section until it's green.

> Scope: 16 standards. *Use cases* and *EdMatrix* are excluded by design.
> CEDS · SIF · Ed-Fi · PESC · CTDL · CLR · Open Badges · Ed-API · CASE · LIF · JEDx · SOC · CIP · SEDM · DCTAP · MedBiquitous

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm run build` for a production bundle, `npm run preview` to serve it.

## Login & deploying to Vercel

The app is gated by a **client-side passcode**. This is a *soft gate* for a personal app —
only the SHA-256 hash of the passcode ships in the bundle (never the passcode itself), so
the secret isn't in plain sight, but a determined visitor could bypass a purely
client-side check. For real multi-user security you'd need a backend/auth service.

- **Default passcode:** `educore`.
- **Set your own:** generate a hash and configure it as an env var — the passcode itself
  never enters the repo or the build.

  ```bash
  node scripts/hash-passcode.mjs "your secret passcode"
  # prints VITE_PASSCODE_SHA256=<hash>
  ```

  Put it in `.env.local` for local dev (see `.env.example`), and in Vercel as a project
  environment variable. Changing the hash invalidates existing unlocked sessions.
- Unlocking is remembered in this browser for 30 days; the 🔒 button in the top bar locks
  it again. The key is `educore-auth-v1` in `localStorage`.

### Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → import the repo.** It auto-detects Vite
   (build `npm run build`, output `dist`) — no extra config needed.
3. Add an env var **`VITE_PASSCODE_SHA256`** = your hash (Settings → Environment Variables),
   then deploy. (Skip this to ship with the default `educore` passcode.)

> Quiz progress is stored per-browser in `localStorage`, so it does **not** sync across
> devices. If you later want accounts + cross-device sync, that's the Supabase path — ask
> and I'll wire it up.

## How it works

- **Daily quiz** — opening the app on a new calendar day generates a fresh 10-question
  set, deterministically seeded by the date and weighted toward what you've **missed** and
  **haven't seen yet** (lightweight spaced repetition). Completing it advances your streak.
- **Knowledge map** — a 16 × 3 matrix (spec × layer). Each cell shows a blended mastery
  score (accuracy × coverage), a coverage bar, and a flag counting items due for review.
  Cells a spec genuinely lacks (e.g. CIP has no API) are marked "not in spec", not penalized.
- **Study narratives** — clicking a cell weaves the explanations of your missed questions
  into a concept-grouped lesson you can read before re-drilling.
- **Progress over time** — overall knowledge-score trend line, per-spec and per-layer
  mastery, streaks, lifetime accuracy, and a daily history strip.
- All progress is stored locally in your browser (`localStorage`, key `educore-mastery-v1`).
  "Reset all progress" on the dashboard wipes it.

## The question bank

`src/data/questions.ts` holds 303 multiple-choice questions mined directly from the live
EDUcore knowledge graph (via its MCP server). Every correct answer and explanation is
grounded in real graph nodes — entities, properties, code-set values, serialization
formats, and WSDL/REST operations — with distractors drawn from sibling nodes in the same
spec.

### Regenerating the bank (requires the EDUcore MCP server)

The bank is generated in two steps and can be rebuilt in-session by an agent with EDUcore
MCP access:

1. Per-spec extraction writes grounded questions to `src/data/raw/group*.json`.
2. `node scripts/assemble.mjs` validates every question (shape, 4 options, valid
   `answerIndex`, unique ids), reports the spec × layer distribution, and regenerates
   `src/data/questions.ts`.

## Project layout

```
src/
  data/
    raw/group*.json     # per-spec extracted questions (source of truth)
    questions.ts        # assembled + validated bank (generated)
  lib/
    types.ts            # Question / Layer / SpecKey + layer metadata
    specs.ts            # the 16 specs: colors, taglines, layer coverage, formats
    storage.ts          # localStorage progress model, streaks, date logic
    quiz.ts             # daily selection, mastery scoring, study narrative
  components/           # Quiz, Matrix, Study, Progress, Ring, Sparkline
  App.tsx               # dashboard + view routing + daily lifecycle
scripts/assemble.mjs    # validate + merge raw question files
```
