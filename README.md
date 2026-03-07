# ER Triage E-Clip

The right care, at the right place, in under 3 minutes.

A cross-platform triage guidance app for Canadians. Uses camera-based vitals, structured symptom intake, and AI classification to recommend where to seek care — virtual, urgent care, or ER.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo), TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Redis |
| AI | Gemini 1.5 Flash, Backboard.io multi-agent |
| Vitals | Presage SmartSpectra SDK |
| Auth | Auth0 |
| Maps | Mapbox |

## Project Structure

```
HackCanada/
├── shared/              # Shared TypeScript types (imported by both sides)
│   └── types/
├── ertriage-backend/    # Node.js + Express API
│   └── src/
│       ├── routes/      # API endpoints
│       ├── services/    # Gemini, Presage, Backboard, Mapbox, wait times
│       ├── middleware/  # Auth0 JWT, rate limiting, error handling
│       ├── db/          # PostgreSQL schema + queries
│       └── cache/       # Redis client
└── ertriage-frontend/   # Expo (React Native) app
    └── src/
        ├── screens/     # Home, Vitals, Symptoms, Result, History, Family, etc.
        ├── components/  # VitalsMeter, RiskBadge, WaitTimeCard, SymptomCard, etc.
        ├── api/         # API client functions
        ├── store/       # Zustand global state
        └── i18n/        # EN + FR translations
```

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Expo CLI (`npm install -g expo-cli`)

## Setup

### 1. Clone and install

```bash
git clone <repo-url> && cd HackCanada
cd ertriage-backend && npm install
cd ../ertriage-frontend && npm install
```

### 2. Configure environment variables

```bash
# Backend
cp ertriage-backend/.env.example ertriage-backend/.env

# Frontend
cp ertriage-frontend/.env.example ertriage-frontend/.env
```

Edit each `.env` file and fill in your keys:

**Backend (`ertriage-backend/.env`)**
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `AUTH0_AUDIENCE` | Auth0 API audience |
| `AUTH0_ISSUER_BASE_URL` | Auth0 tenant URL |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PRESAGE_API_KEY` | Presage SmartSpectra key |
| `BACKBOARD_API_KEY` | Backboard.io key |
| `MAPBOX_SECRET_TOKEN` | Mapbox secret token |

**Frontend (`ertriage-frontend/.env`)**
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend URL (default: `http://localhost:3001`) |
| `EXPO_PUBLIC_AUTH0_DOMAIN` | Auth0 domain |
| `EXPO_PUBLIC_AUTH0_CLIENT_ID` | Auth0 client ID |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Mapbox public token |
| `EXPO_PUBLIC_PRESAGE_KEY` | Presage key |

> Auth0 is optional for local dev — the backend runs without it and skips auth middleware.

### 3. Set up the database

```bash
psql -U postgres -c "CREATE DATABASE ertriage;"
psql -U postgres -d ertriage -f ertriage-backend/src/db/schema.sql
```

### 4. Run

```bash
# Terminal 1 — Backend
cd ertriage-backend && npm run dev

# Terminal 2 — Frontend
cd ertriage-frontend && npm start
```

Then press `w` for web, `i` for iOS simulator, or `a` for Android emulator.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/triage` | Submit vitals + symptoms, get AI triage result |
| POST | `/vitals/validate` | Validate raw Presage vitals payload |
| GET | `/waittimes/:city` | Get estimated ER wait time |
| GET | `/clinics/:lat/:lng` | Find nearby urgent care / ER |
| GET | `/users/:id` | Get user profile |
| PATCH | `/users/:id` | Update user profile |
| GET | `/family/:userId` | List family members |
| POST | `/family` | Add family member |
| GET | `/history/:userId` | Get past triage sessions |
| POST | `/agents/query` | Query Backboard multi-agent |
| GET | `/health` | Server health check |

## Core Flow

1. User opens app or scans QR code
2. Camera captures vitals via Presage (heart rate, respiratory rate, stress)
3. User answers 6 symptom questions
4. Backend sends vitals + symptoms to Gemini for classification
5. User receives a risk level (green / yellow / red) with plain-language explanation
6. App shows ER wait times and nearest clinics

## Team

| Role | Scope |
|------|-------|
| Frontend Team | React Native screens, Presage SDK, Auth0 SDK, Mapbox GL, Zustand, i18n |
| Backend Team | Express API, PostgreSQL, Redis, Gemini, Backboard, Mapbox Places, Auth0 JWT, Vultr |

## License

Built for Hack Canada 2026.
