# CivicMatch — Smart Resource Allocation for NGOs

**Google Solution Challenge 2026 | Team TechieDinosaurs**

CivicMatch is an AI-powered platform that helps NGOs and local social groups identify the most urgent community problems and automatically match the right volunteers to solve them. It bridges the gap between handwritten community data and real-world action — from paper survey to deployed volunteer, in one platform.


---

## The Problem

NGOs working at the grassroots level face two compounding problems. First, community needs are collected through paper surveys that are never digitised, making it impossible to prioritise at scale. Second, even when problems are known, matching volunteers to tasks is done manually — by phone calls, WhatsApp groups, and gut feel. The result is slow response times, mismatched deployments, and burnt-out coordinators.

Existing platforms like VolunteerMatch and JustServe only list opportunities for volunteers to self-select. They do not digitise surveys, rank problems by urgency, or assign volunteers intelligently.

---

## The Solution

CivicMatch provides a complete end-to-end workflow in three steps:

**Digitise.** NGO staff photograph or upload handwritten community survey forms. Gemini Vision OCR extracts structured problem data automatically — no manual entry required.

**Rank.** Google Gemini analyses all survey inputs, clusters related issues, and generates an urgency-ranked problem list scored 1 to 5 based on severity, frequency, and community impact.

**Match.** The platform scores every registered volunteer across four dimensions — Skill fit, Proximity, Availability, and Past impact — and surfaces a ranked candidate list for each open task. Admins confirm and dispatch with one click.

---

## Three Role-Based Portals

The platform is built around three distinct user types, each with a dedicated workspace.

**Admin Portal**
The platform operator has full oversight. Admins can view all NGOs and volunteers registered on the system, trigger the Gemini-powered matching engine for any open task, review the ranked candidate list with transparent scoring, and access a timestamped audit log of every action taken.

**NGO Portal**
Verified NGOs can post community problems with category tags, urgency context, required skills, and location. They can track the status of every posted task — open, active, or completed — and see which volunteer has been matched to each task.

**Volunteer Portal**
Volunteers register with their skills, languages spoken, base location (city or GPS coordinates), and availability by date and time slot. Once onboarded, they are automatically considered for matching to urgent tasks in their area. They receive notifications when matched and can confirm or decline tasks from their dashboard.

---

## Architecture

```
Frontend        React.js + Tailwind CSS
                Three role-based portals — Admin, NGO, Volunteer
                Hosted on Google Cloud Run

Backend         Node.js (Express) / Python FastAPI
                REST API for business logic, matching engine, user management
                Hosted on Google Cloud Run

AI Layer        Google Gemini API
                Gemini Vision  — OCR and data extraction from survey images
                Gemini 1.5 Pro — NLP urgency ranking, problem clustering, matching intelligence

Database        Google Firestore (NoSQL, real-time)
                Stores users, problems, volunteers, match records

Storage         Google Cloud Storage
                Survey image uploads and processed documents

Auth            Firebase Authentication
                OAuth 2.0 with role-based access control (Admin / NGO / Volunteer)

Notifications   Firebase Cloud Messaging + SendGrid
                Push and email alerts to matched volunteers

Maps            Google Maps API
                Volunteer proximity scoring and location display

Deployment      Google Cloud Run — containerised, serverless, auto-scaling
                Google Cloud Build — CI/CD pipeline
```

---

##Visualisation and Working Prototype

Dashboard <img width="916" height="897" alt="image" src="https://github.com/user-attachments/assets/74315fed-135d-47c6-8db2-44fd55232d8f" />

Dashboard <img width="904" height="905" alt="image" src="https://github.com/user-attachments/assets/b26adccf-52eb-4af0-b731-6891096f1e71" />

Create your account (Volunteer/NGO) <img width="662" height="715" alt="image" src="https://github.com/user-attachments/assets/7921d013-67ac-4e62-b671-696a9a2f7246" />

NGO <img width="767" height="722" alt="image" src="https://github.com/user-attachments/assets/4e075d06-18da-4542-86db-e408736e869e" />

Volunteer <img width="595" height="900" alt="image" src="https://github.com/user-attachments/assets/98461c81-bb4b-4c21-b15b-2ccaf98bd85a" />

Admin  <img width="1913" height="902" alt="image" src="https://github.com/user-attachments/assets/e1853d13-ba17-406c-895d-bfea4dfab17c" />

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Tailwind CSS |
| Backend | Node.js (Express), Python FastAPI |
| AI / ML | Google Gemini API (Gemini 1.5 Pro + Vision) |
| Database | Google Firestore |
| Storage | Google Cloud Storage |
| Auth | Firebase Authentication |
| Hosting | Google Cloud Run, Google Cloud Build |
| Notifications | Firebase Cloud Messaging, SendGrid, Twilio |
| Maps | Google Maps API |
| Dev Tools | GitHub, VS Code, Postman |

---

## Key Features

- Paper survey digitisation via Gemini Vision OCR — no manual data entry
- AI urgency ranking of community problems with a 1-5 severity score
- Volunteer onboarding with skills, languages, location, and availability time slots
- Gemini-powered auto-matching scoring volunteers on Skill, Proximity, Availability, and Impact
- Three fully separate role-based dashboards with tailored workflows
- Audit log for every admin action — transparent and accountable
- Automated notifications to matched volunteers via email and push
- Impact reports showing problems resolved, volunteer hours, and community coverage

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Firebase project with Firestore and Authentication enabled
- Google Cloud project with Gemini API, Cloud Run, Cloud Storage, and Maps API enabled

### Environment Variables

Create a `.env` file in the root of both the frontend and backend directories. Required variables:

```
# Firebase
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# Google Cloud
GOOGLE_CLOUD_PROJECT=
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=

# SendGrid
SENDGRID_API_KEY=

# Backend
PORT=8000
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Harshit-0018/Google-Solution-Hackathon-Civic-Match-.git
cd Google-Solution-Hackathon-Civic-Match-

# Install frontend dependencies
cd frontend
npm install
npm run dev

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Running with Docker

```bash
docker-compose up --build
```

---

## Project Structure

```
civicmatch/
├── frontend/               # React.js application
│   ├── src/
│   │   ├── pages/          # Admin, NGO, Volunteer portal pages
│   │   ├── components/     # Shared UI components
│   │   └── lib/            # Firebase config, API clients
│   └── public/
├── backend/                # FastAPI / Node.js API
│   ├── routes/             # API route handlers
│   ├── services/           # Gemini AI, matching engine, notifications
│   └── models/             # Data models and schemas
└── docs/                   # Architecture diagrams, API documentation
```

---

## How the Matching Engine Works

When an admin runs matching for an open task, the system queries all registered volunteers and scores each one across four dimensions:

- **Skill fit** — overlap between volunteer skills and task requirements, expanded using Gemini's semantic understanding (e.g. "teaching" matches "education workshop")
- **Proximity** — haversine distance between volunteer base location and task location, normalised to a 0-100 score with a 50 km soft cap
- **Availability** — whether the volunteer has indicated availability on dates and time slots overlapping with the task window
- **Past impact** — a reputation score derived from completed tasks, confirmation rate, and volunteer feedback

Gemini ranks the resulting scored list and returns it to the admin with a breakdown of each dimension per candidate. The admin selects the best match and confirms — the volunteer is notified immediately.

---

## Team

**TechieDinosaurs — Google Solution Challenge 2026**

| Name | Role |
|---|---|
| Harshit Singh | Team Leader, Backend & AI integration |
| Vanshdeep Singh | Frontend & Platform architecture |

---

## License

This project was built for the Google Solution Challenge 2026. All rights reserved by Team TechieDinosaurs.
