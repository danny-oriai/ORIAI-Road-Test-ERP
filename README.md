# Road Test Management ERP — Front-End Prototype

Internal road-testing operations ERP. Phase 0 = clickable front-end prototype with
mock data only. No real backend, no Lark API, no Supabase yet.

## Stack

- **Vite 6** + **React 18** + **TypeScript 5** (strict mode)
- **Tailwind CSS 3** (core utilities only — no custom plugins)
- **lucide-react** for icons

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # builds to dist/
npm run preview  # serves the built dist/
npm run lint     # tsc --noEmit
```

## Project structure

```
src/
├── main.tsx, App.tsx, index.css
├── types/index.ts                  ← All domain types & enums
├── mock/                           ← One file per entity, typed
│   ├── users.ts        projects.ts        vehicles.ts
│   ├── plates.ts       routes.ts          tasks.ts
│   ├── attendance.ts   checks.ts          issues.ts
│   ├── expenses.ts     files.ts
├── lib/
│   ├── lookups.ts                  ← userById / projectById / ...
│   ├── statusStyles.ts             ← All status badge color maps
│   └── api.ts                      ← Data accessor — see "swap seam" below
├── components/
│   ├── primitives/                 ← StatusBadge, Avatar, StatCard, Button, FilterBar, Drawer, Field
│   ├── tables/                     ← Reusable table components
│   └── layout/                     ← Sidebar, TopBar, navConfig
└── pages/                          ← One file per page
```

## Swap seam — preparing for Step 5 / 6

All page code reads data through `src/lib/api.ts` ONLY — never directly from
`src/mock/*`. Today `api.projects()` returns `Promise.resolve(MOCK)`. In Step 6
the body becomes `fetch(import.meta.env.VITE_API_BASE_URL + "/projects")`. Page
components do not change.

The browser will only ever see the URL of the Cloudflare Worker. Supabase service
role key and Lark App Secret stay inside the Worker — never in this repo.

## Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.
3. Pick the repo. Build settings:
   - **Framework preset:** None (we configure manually)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (default)
   - **Node version:** set env var `NODE_VERSION=20` if needed
4. Deploy. You will get `https://<project>.pages.dev`.

That URL goes into Lark Open Platform as Desktop Homepage and Mobile Homepage in
Step 7.

## Migration progress

| Page                            | Status |
|---------------------------------|--------|
| Dashboard                       | ✅ batch 1 |
| Projects                        | ✅ batch 1 |
| Project Detail (11 tabs)        | ✅ batch 1 |
| Vehicles / Vehicle Detail       | ✅ batch 2 |
| Vehicle Check Form              | ✅ batch 2 |
| Plates / Plate Timeline         | ✅ batch 2 |
| Routes / POIs                   | ✅ batch 2 |
| Tasks / Staff / Attendance      | ⏳ batch 3 |
| Issues / Expenses / Files       | ⏳ batch 3 |
| Users & Roles / Settings        | ⏳ batch 3 |
| Mobile Driver View              | ⏳ batch 3 |

Pages not yet migrated render a placeholder card; the rest of the shell still works.
