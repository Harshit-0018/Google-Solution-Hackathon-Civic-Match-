# PRD — Smart Resource Allocation (SRA)

**Tag-line:** AI-powered volunteer matching for urgent community needs.
**Hackathon:** Google Solution Challenge 2026
**Stack:** React (CRA + Tailwind + shadcn) · FastAPI · MongoDB
**Google integrations:** Emergent-managed Google OAuth · Gemini 2.5 Flash (translation + semantic skill expansion) · Google Maps JS optional (Leaflet+CartoDB fallback)

## Original problem statement (verbatim)
> i have to make this website do all same as given in the md file and make all the things necessary and required, make it good looking and working prototype model of it, as i want to use it for google solution hackathon. All frontend backend and end to end with database. use google product as much as possible.

Reference: `/ARCHITECTURE.md`

## User personas
1. **NGO** — posts community-need tasks with urgency 1-5.
2. **Volunteer** — skill-tagged profile, accepts matches, earns points & badges.
3. **Admin** — verifies, runs matching, audits, seeds demo data.
4. **Public visitor** — browses aggregate impact at `/impact` (no login).

## What's implemented

### Iteration 1 (2026-04-23)
- Full FastAPI backend (30+ endpoints): auth (Emergent Google OAuth), users, ngos, tasks, matches, rewards, admin, audit.
- Matching algorithm: 4 transparent signals (skill 0.40 + proximity 0.30 + availability 0.20 + impact 0.10).
- Gemini 2.5 Flash multilingual translation on task creation (6 languages).
- Three React portals (NGO / Volunteer / Admin) with Swiss/Klein-Blue design.
- Heatmap via Leaflet+CartoDB (urgency-weighted).
- Demo seed: 3 Kerala NGOs · 15 volunteers · 10 tasks · 6 catalog items.
- 27/27 backend tests pass; all portal UIs render.

### Iteration 2 (2026-04-23) — "do all suggested changes"
- **Gemini semantic skill expansion**: on task creation, Gemini generates 8-12 related/synonym skills. Stored in `task.semantic_skills` and used in the matching algorithm's skill similarity (boosts score up to +0.25 for volunteers matching semantic neighbors).
- **In-app notifications**: new `notifications` collection, endpoints `/api/notifications`, `/api/notifications/{id}/read`, `/api/notifications/read-all`. Notifications auto-created on match-created, match-accepted, match-declined, task-completed. Frontend `NotificationsBell` component with unread badge, dropdown, and smart polling (15s when unread, 45s idle).
- **Public Impact Dashboard** at `/impact`: no auth required. Live stats (NGOs, volunteers, tasks, matches, total points), heatmap, top-5 leaderboard, category distribution, recent completed tasks. 45s cache + 2-decimal lat/lng rounding for privacy/DoS protection.
- **Google Maps optional swap**: `REACT_APP_GOOGLE_MAPS_API_KEY` env var; if set, uses Google Maps JS (with visualization heatmap layer + light/monochrome style), else Leaflet fallback. Same props contract, zero code changes for pages.
- **NGO task-ownership enforcement**: NGO role can only run `/api/match/run/{task_id}` on tasks they own. Admin unrestricted.
- Landing page now has a `PUBLIC IMPACT ↗` link for share-ability.
- 39/39 backend tests pass (27 regression + 12 new-feature).

## Backlog

### P1
- Split `server.py` into FastAPI routers (auth / tasks / matching / rewards / admin / notifications / impact).
- Full Google Maps Places Picker on NGO Post-Task form (requires key).
- Swap Gemini skill expansion → true Gemini embeddings when emergent proxy exposes embedding models.
- Firebase Cloud Messaging (FCM) for push notifications outside the app.

### P2
- Google Forms → `/api/pipeline/ingest` for paper-survey digitisation.
- Firebase Storage for profile photos & NGO docs.
- Server-Sent Events instead of polling for notifications.
- Rate limiting on matching endpoint.
- Referral flow (+75 pts/referral).
- Cloud Run + Firebase Hosting deployment configs.

## Key files
- `/app/backend/server.py` — all APIs (~1,360 LOC; needs router split).
- `/app/frontend/src/App.js` — router with ProtectedRoute + /impact public.
- `/app/frontend/src/pages/{Landing,Login,AuthCallback,Onboarding,Impact}.jsx`
- `/app/frontend/src/pages/{NGO,Volunteer,Admin}Portal.jsx`
- `/app/frontend/src/components/HeatMap.jsx` → dispatcher → Leaflet or Google.
- `/app/frontend/src/components/NotificationsBell.jsx` — bell with smart polling.
- `/app/auth_testing.md` — testing-agent session bypass playbook.
- `/app/backend/tests/test_sra_api.py` (27) + `/app/backend/tests/test_sra_new_features.py` (12).

## Demo walkthrough
1. `/impact` — no login, share-ready public dashboard.
2. `/` → **SIGN IN** → (first user auto-admin).
3. `/admin` → **SEED DEMO DATA** → 3 NGOs/15 vols/10 tasks.
4. `/ngo/post` → create task → watch Gemini translate to 5 langs AND expand skills.
5. `/admin/matching` → pick a task → **RUN AI MATCHING** → see 4-bar score + semantic skill match.
6. `/volunteer/matches` → accept → NGO admin gets a notification bell ping.
