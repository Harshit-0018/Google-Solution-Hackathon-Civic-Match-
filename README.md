# Smart-Resource-Allocation
=======
# 🎯 Smart Resource Allocation

> **Google Solution Challenge Hackathon**
> A three-portal web platform that digitises community needs, visualises urgency on a heatmap, and uses Vertex AI to match volunteers to tasks.

## 🏗️ Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + TailwindCSS |
| **Backend** | Java 21 + Spring Boot 3 (Cloud Run) |
| **Database** | Cloud Firestore |
| **AI/ML** | Vertex AI text-embedding-004 |
| **Auth** | Firebase Auth (Google Sign-In) |
| **Notifications** | Firebase Cloud Messaging |
| **Maps** | Google Maps JS API + Distance Matrix + Geocoding |
| **CI/CD** | GitHub Actions → Firebase Hosting + Cloud Run |

## 📁 Project Structure

```
smart-resource-allocation/
├── frontend/          # React + Vite + TailwindCSS
│   └── src/
│       ├── portals/   # ngo/ · volunteer/ · admin/
│       ├── components/ # Shared UI (TaskCard, HeatMap, etc.)
│       ├── hooks/     # useAuth, useTasks, useMatches
│       └── services/  # firebase.js, api.js, maps.js
├── backend/           # Java Spring Boot REST API
│   └── src/main/java/com/sra/
│       ├── config/    # Firebase, Security, VertexAI
│       ├── controller/ # REST endpoints
│       ├── service/   # Business logic
│       ├── model/     # Data models
│       └── middleware/ # Firebase JWT filter
├── functions/         # Cloud Functions (Node.js)
├── firestore.rules    # Firestore security rules
├── firestore.indexes.json
└── .github/workflows/ # CI/CD pipelines
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Java** 21+
- **Maven** 3.9+
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google Cloud SDK**: [Install Guide](https://cloud.google.com/sdk/docs/install)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/smart-resource-allocation.git
cd smart-resource-allocation

# Frontend
cd frontend
cp .env.example .env    # Fill in your Firebase config
npm install

# Backend
cd ../backend
# Place your serviceAccountKey.json in src/main/resources/
mvn clean install -DskipTests

# Cloud Functions
cd ../functions
npm install
```

### 2. Configure Environment

**Frontend** — edit `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_MAPS_API_KEY=your-maps-api-key
VITE_API_BASE_URL=http://localhost:8080
```

**Backend** — set environment variables or edit `application.yml`:
```bash
export FIREBASE_PROJECT_ID=your-project-id
export GCP_PROJECT_ID=your-gcp-project-id
export MAPS_API_KEY=your-maps-key
export TRANSLATE_API_KEY=your-translate-key
export PIPELINE_SECRET=your-secret
```

### 3. Firebase Setup

```bash
firebase login
firebase init  # Select: Firestore, Hosting, Functions, Storage
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4. Enable GCP APIs

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  maps-backend.googleapis.com \
  distance-matrix-backend.googleapis.com \
  geocoding-backend.googleapis.com \
  translate.googleapis.com \
  run.googleapis.com \
  cloudfunctions.googleapis.com \
  pubsub.googleapis.com \
  logging.googleapis.com
```

### 5. Run Locally

```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — Backend
cd backend && mvn spring-boot:run

# Terminal 3 — Functions emulator (optional)
cd functions && npm run serve
```

## 🎭 Three Portals

| Portal | Route | Role |
|--------|-------|------|
| **NGO** | `/ngo/*` | Post tasks, set urgency, view matches |
| **Volunteer** | `/volunteer/*` | Profile setup, browse tasks, accept matches, earn rewards |
| **Admin** | `/admin/*` | Approve NGOs/volunteers, trigger AI matching, audit logs |

## 🤖 AI Matching Algorithm

```
finalScore = 0.40 × skillScore
           + 0.30 × proximityScore
           + 0.20 × availabilityScore
           + 0.10 × impactScore
```

- **Skill**: Cosine similarity of Vertex AI 768-dim embeddings
- **Proximity**: `1 / (1 + distKm / 10)` via Google Maps Distance Matrix
- **Availability**: Date overlap × time slot fraction
- **Impact**: `min(1.0, completedTasks × avgRating / 25)`



