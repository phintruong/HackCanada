# ER Triage E-Clip

The right care, at the right place, in under 3 minutes.

A cross-platform triage guidance app for Canadians. Uses camera-based vitals, structured symptom intake, and AI classification to recommend where to seek care — virtual, urgent care, or ER. Works on mobile (iOS/Android) and web (laptop/desktop).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo), TypeScript, React Native Web |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Redis (caching) |
| AI | Gemini 1.5 Flash (Google Generative AI) |
| Vitals | Presage SmartSpectra SDK |
| Maps | Mapbox (geocoding + Places API) |
| State | Zustand |
| i18n | react-i18next (EN + FR) |
| Rate Limiting | express-rate-limit |

## Project Structure

```
HackCanada/
├── shared/              # Shared TypeScript types (imported by both sides)
│   └── types/
├── ertriage-backend/    # Node.js + Express API
│   └── src/
│       ├── routes/      # API endpoints
│       ├── services/    # Gemini, Presage, Mapbox, wait times
│       ├── middleware/  # Rate limiting, error handling
│       ├── db/          # PostgreSQL schema + queries
│       └── cache/       # Redis client
└── ertriage-frontend/   # Expo (React Native + Web) app
    └── src/
        ├── screens/     # Home, Vitals, Symptoms, Result, History, Family, etc.
        ├── components/  # VitalsMeter, RiskBadge, ResponsiveContainer, etc.
        ├── hooks/       # useResponsive (breakpoints + responsive helpers)
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
| `GEMINI_API_KEY` | Google Gemini API key |
| `PRESAGE_API_KEY` | Presage SmartSpectra key |
| `MAPBOX_SECRET_TOKEN` | Mapbox secret token |

**Frontend (`ertriage-frontend/.env`)**
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend URL (default: `http://localhost:3001`) |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Mapbox public token |
| `EXPO_PUBLIC_PRESAGE_KEY` | Presage key |

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

## Responsive Design

The frontend uses a `ResponsiveContainer` wrapper and `useResponsive` hook to adapt layouts across devices:

| Breakpoint | Width | Padding | Max Content Width |
|------------|-------|---------|-------------------|
| Mobile | < 768px | 24px | Full width |
| Tablet | 768–1023px | 32px | 720px centered |
| Desktop | 1024px+ | 40px | 800px centered |

All 9 screens use `ResponsiveContainer` so content is constrained and centered on larger screens while remaining full-width on mobile.

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
| DELETE | `/family/:id` | Remove family member |
| GET | `/history/:userId` | Get past triage sessions |
| GET | `/health` | Server health check |

## Core Flow

1. User opens app or scans QR code
2. Camera captures vitals via Presage (heart rate, respiratory rate, stress)
3. User answers 6 symptom questions (tappable cards)
4. Backend sends vitals + symptoms to Gemini for classification
5. User receives a risk level (green / yellow / red) with plain-language explanation
6. App shows ER wait times and nearest clinics

## Team

| Role | Scope |
|------|-------|
| Frontend Team | React Native screens, Presage SDK, Mapbox GL, Zustand, i18n, responsive layout |
| Backend Team | Express API, PostgreSQL, Redis, Gemini, Mapbox Places, Vultr deployment |

## License

Built for Hack Canada 2026.
