# PRD — Smart Resource Allocation (SRA)

**Tag-line:** AI-powered volunteer matching for urgent community needs.
**Hackathon:** Google Solution Challenge 2026
**Stack:** React (CRA + Tailwind + shadcn) · FastAPI · MongoDB
**Google integrations:** Emergent-managed Google OAuth · Gemini 2.5 Flash (translations) · Leaflet+CartoDB (Google Maps drop-in when key provided)

## Original problem statement (verbatim)
> i have to make this website do all same as given in the md file and make all the things necessary and required, make it good looking and working prototype model of it, as i want to use it for google solution hackathon. All frontend backend and end to end with database. use google product as much as possible.

Reference: `/ARCHITECTURE.md` (Smart Resource Allocation — Full Architecture Document)

## User personas
1. **NGO** — posts community-need tasks, sets urgency 1-5, views coverage map.
2. **Volunteer** — skill-tagged profile, accepts matches, earns points & badges.
3. **Admin** — verifies NGOs/volunteers, runs AI matching, audits everything, seeds demo data.

## Core requirements
- Three-portal routing (`/ngo/*`, `/volunteer/*`, `/admin/*`).
- Google Sign-In + role onboarding.
- NGO: post tasks (title, description, urgency, required skills, location, dates, volunteers needed).
- AI matching engine with **4 signals** (skill 0.40 + proximity 0.30 + availability 0.20 + impact 0.10) with transparent per-signal scores.
- Heatmap (urgency-weighted) visible to all portals.
- Multilingual task descriptions (Gemini → en/hi/ta/ml/kn/te).
- Rewards: points per urgency, badges, leaderboard, redeemable catalog.
- Audit log on every admin/NGO mutation.
- Demo seed with Kerala context (3 NGOs · 15 volunteers · 10 tasks · 6 catalog items).

## What's implemented (2026-02)
- ✅ Full FastAPI backend: auth, users, ngos, tasks, matches, rewards, admin, audit (600+ LOC `server.py`).
- ✅ Matching algorithm with Haversine distance + Jaccard/coverage skill similarity + availability overlap + impact from completed tasks.
- ✅ Gemini 2.5 Flash multilingual translation on task creation (6 languages).
- ✅ Emergent Google OAuth end-to-end (session cookie + /auth/me + /auth/logout).
- ✅ Role-based onboarding (volunteer | NGO) with rich profile forms.
- ✅ Landing page (Swiss/Klein Blue aesthetic, 3 portal cards, integration grid, CTA).
- ✅ NGO portal: Dashboard + heatmap, Post Task, My Tasks, Task Detail with ranked candidate cards and score breakdown.
- ✅ Volunteer portal: Dashboard + heatmap, Browse Tasks with category/urgency/language filters, My Matches (accept/decline), Rewards (catalog + leaderboard + history).
- ✅ Admin portal: Control Room dashboard, Manage NGOs, Manage Volunteers, Run Matching, Audit Log, Seed Demo button.
- ✅ Leaflet+CartoDB heatmap with urgency color gradient (red → green).
- ✅ Demo seed: 3 Kerala NGOs + 15 volunteers + 10 tasks + 6 catalog items (scoped to `@demo.sra` emails to prevent production wipes).
- ✅ Full `data-testid` coverage on interactive elements.
- ✅ 27/27 backend tests passing; 100% frontend portal load pass.

## Backlog
### P1 (near-term)
- Google Maps JS swap-in when user provides API key (current: Leaflet+CartoDB).
- Swap Jaccard skill similarity with real Gemini embeddings + cosine similarity.
- Split `server.py` into routers (`auth`, `tasks`, `matching`, `rewards`, `admin`).
- Push notifications (FCM via Cloud Functions).

### P2 (nice-to-have)
- Google Forms → backend pipeline for paper-survey digitisation (`/api/pipeline/ingest` spec only).
- Firebase Storage for profile photos & NGO docs.
- Task ownership enforcement on `/api/match/run/{id}` for NGO role.
- Real Google Translate API (currently Gemini does this).
- Rate limiting on matching endpoint.
- Volunteer referral flow (+75 pts/referral).
- Deployment: Cloud Run (backend) + Firebase Hosting (frontend).

## Key files
- `/app/backend/server.py` — all APIs, matching algorithm, translation, seed
- `/app/frontend/src/App.js` — router with ProtectedRoute
- `/app/frontend/src/pages/Landing.jsx` — marketing landing
- `/app/frontend/src/pages/{NGO,Volunteer,Admin}Portal.jsx` — three portals
- `/app/frontend/src/components/HeatMap.jsx` — Leaflet heatmap
- `/app/auth_testing.md` — testing agent auth bypass playbook
- `/app/memory/test_credentials.md` — test identities

## Demo walkthrough
1. Open `/` → sign in with Google → (first user becomes admin).
2. `/admin` → click **SEED DEMO DATA** → 3 NGOs/15 vols/10 tasks populate.
3. `/admin/matching` → pick an urgent task → **RUN AI MATCHING** → see 4-signal scored candidates.
4. `/volunteer/browse` → filter by urgency → switch language to Malayalam/Hindi → view translated tasks.
5. `/ngo/post` → create a task → Gemini auto-translates to 5 Indian languages.
