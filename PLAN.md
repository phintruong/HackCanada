# ER Triage E-Clip — Technical Implementation Plan

**Full Product — Web + iOS + Android | B2C + B2B | Hack Canada 2026**

---

## 1. Product Overview

ER Triage E-Clip is a cross-platform triage guidance application targeting both individual Canadians (B2C) and healthcare operators like hospitals and clinics (B2B). Using camera-based vitals, a structured symptom intake, and an AI triage model, it tells users where to seek care — virtual, urgent care, or ER — and explains why in plain language.

| Attribute | Detail |
|-----------|--------|
| Platforms | Web app, iOS (React Native), Android (React Native) |
| Primary Users | Individual patients (B2C) + hospitals and clinics (B2B) |
| Core Loop | Scan QR or open app → vitals via camera → symptom questions → AI triage → recommendation |
| AI Stack | Gemini 1.5 Flash for classification |
| Vitals | Presage SmartSpectra SDK — heart rate, respiratory rate, stress from front camera |
| Backend | Node.js + Express, hosted on Vultr |
| Database | PostgreSQL (user data, triage history) + Redis (caching, sessions) |

---

## 2. System Architecture

The system is split into two clearly separated layers: a frontend (React / React Native) and a backend (Node.js REST API). All AI calls, data persistence, and third-party integrations live in the backend. The frontend is responsible only for UI, camera access, and consuming the API.

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│   React Native (Web + iOS + Android via Expo)           │
│   Presage SDK  ·  Mapbox GL  ·  Zustand  ·  i18next    │
│   ResponsiveContainer (mobile/tablet/desktop)           │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS / REST
┌───────────────────────▼─────────────────────────────────┐
│                      BACKEND (Vultr)                    │
│   Node.js + Express API                                 │
│   ├── /triage     → Gemini API                          │
│   ├── /vitals     → Presage validation                  │
│   ├── /waittimes  → CIHI / Fraser data cache            │
│   ├── /clinics    → Mapbox Places API                   │
│   ├── /users      → PostgreSQL                          │
│   ├── /family     → PostgreSQL                          │
│   └── /history    → PostgreSQL                          │
│   Redis (wait time cache)                               │
│   PostgreSQL (users · sessions · triage history)        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Frontend Structure

```
ertriage-frontend/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Landing, QR scan entry
│   │   ├── VitalsScreen.tsx        # Presage camera capture
│   │   ├── SymptomsScreen.tsx      # 6 question intake form
│   │   ├── ResultScreen.tsx        # Triage output + CTA
│   │   ├── HistoryScreen.tsx       # Past triage sessions
│   │   ├── FamilyScreen.tsx        # Family profile management
│   │   ├── BookingScreen.tsx       # Clinic / doctor booking
│   │   ├── OHIPScreen.tsx          # Insurance guidance
│   │   └── SettingsScreen.tsx      # Language, notifications
│   ├── components/
│   │   ├── ResponsiveContainer.tsx # Responsive layout wrapper
│   │   ├── VitalsMeter.tsx         # Live HR / RR / stress display
│   │   ├── RiskBadge.tsx           # Green / yellow / red CTA
│   │   ├── WaitTimeCard.tsx        # ER wait estimate widget
│   │   ├── ClinicMap.tsx           # Mapbox nearest clinic
│   │   ├── SymptomCard.tsx         # Individual question card
│   │   └── FamilyMemberCard.tsx
│   ├── hooks/
│   │   └── useResponsive.ts       # Breakpoints + responsive helpers
│   ├── api/
│   │   ├── triage.ts               # POST /triage
│   │   ├── vitals.ts               # POST /vitals
│   │   ├── waittimes.ts            # GET /waittimes
│   │   ├── clinics.ts              # GET /clinics
│   │   └── user.ts                 # Profile + history calls
│   ├── store/                      # Zustand global state
│   ├── i18n/                       # EN / FR language files
│   └── App.tsx
└── package.json
```

### 2.3 Backend Structure

```
ertriage-backend/
├── src/
│   ├── routes/
│   │   ├── triage.ts               # POST /triage
│   │   ├── vitals.ts               # POST /vitals
│   │   ├── waittimes.ts            # GET /waittimes/:city
│   │   ├── clinics.ts              # GET /clinics/:lat/:lng
│   │   ├── users.ts                # GET/PATCH /users/:id
│   │   ├── family.ts               # CRUD /family
│   │   └── history.ts              # GET /history/:userId
│   ├── services/
│   │   ├── geminiService.ts        # Gemini API calls
│   │   ├── presageService.ts       # Presage validation
│   │   ├── waitTimeService.ts      # CIHI data fetch + cache
│   │   ├── mapboxService.ts        # Clinic lookup
│   │   └── notificationService.ts  # Push notifications (Phase 2)
│   ├── middleware/
│   │   ├── auth.ts                 # Auth stub (passthrough)
│   │   ├── rateLimit.ts            # Rate limiting
│   │   └── errorHandler.ts
│   ├── db/
│   │   ├── schema.sql              # PostgreSQL schema
│   │   ├── migrations/
│   │   └── queries.ts              # Typed DB queries
│   ├── cache/
│   │   └── redis.ts                # Redis client + helpers
│   └── index.ts                    # Express entry point
├── .env
└── package.json
```

---

## 3. Database Schema

PostgreSQL handles all persistent data. Redis handles wait time caching (refreshed every 30 minutes).

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id    TEXT UNIQUE NOT NULL,
  email       TEXT,
  name        TEXT,
  language    TEXT DEFAULT 'en',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Family members linked to a user
CREATE TABLE family_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  dob         DATE,
  relation    TEXT,
  notes       TEXT
);

-- Triage sessions
CREATE TABLE triage_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  member_id     UUID REFERENCES family_members(id),
  vitals        JSONB,
  symptoms      JSONB,
  risk_level    TEXT,
  recommendation TEXT,
  explanation   TEXT,
  city          TEXT,
  wait_time_est TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Clinic bookings
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  clinic_name     TEXT,
  clinic_address  TEXT,
  booked_at       TIMESTAMP,
  status          TEXT DEFAULT 'pending'
);
```

---

## 4. API Endpoints

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/triage` | Vitals + symptoms JSON | Risk level, recommendation, Gemini explanation |
| POST | `/vitals/validate` | Raw Presage payload | Validated + normalized vitals object |
| GET | `/waittimes/:city` | City name | Estimated ER wait time string from cache |
| GET | `/clinics/:lat/:lng` | Coordinates | Nearest urgent care + virtual care options |
| GET | `/users/:id` | User ID | User profile |
| PATCH | `/users/:id` | Updated fields | Updated user profile |
| GET | `/family/:userId` | User ID | All family members for user |
| POST | `/family` | Member details | Created family member object |
| DELETE | `/family/:id` | Member ID | Success confirmation |
| GET | `/history/:userId` | User ID | Array of past triage sessions |
| GET | `/health` | — | Server status |

---

## 5. Feature Breakdown

### 5.1 Core Triage Flow (MVP)

- Camera vitals capture via Presage SmartSpectra — heart rate, respiratory rate, stress
- Display live readings on screen during capture for trust and engagement
- 30-second capture window with progress indicator
- Manual input fallback if camera/Presage fails
- Symptom intake — 6 questions rendered as tappable cards:
  - Chest pain or pressure
  - Shortness of breath
  - Fever — duration and severity
  - Dizziness or loss of balance
  - Severe headache or confusion
  - Injury or bleeding
- Gemini triage classification — combines vitals + symptoms into risk tier:
  - **Green**: virtual care recommended
  - **Yellow**: urgent care clinic today
  - **Red**: go to ER now / call 911
- Plain-language explanation of why the recommendation was made
- ER wait time estimate for user's city using CIHI data cache
- Nearest clinic map via Mapbox — urgent care + virtual care options

### 5.2 Symptom History & Health Trends

- All triage sessions saved to user's history automatically
- Timeline view of past sessions — date, symptoms, outcome
- Trend chart: frequency of triage checks over time
- Flag patterns — e.g. repeated chest pain checks trigger a gentle nudge to see a GP
- Export history as PDF for sharing with a doctor

### 5.3 Family Profiles

- Add family members with name, date of birth, relationship, and health notes
- Run a triage check on behalf of a family member — history stored under their profile
- Chronic condition notes per member — fed into Gemini prompt for context
- Age-aware triage — Gemini prompt adjusts thresholds for children and elderly

### 5.4 Doctor & Clinic Booking Integration

- After triage, surface nearby clinics from Mapbox with distance and hours
- Direct link to clinic's booking page or phone number
- Phase 2: integrate with Maple and Teladoc APIs for in-app virtual visit booking
- Booking saved to user history with status tracking (pending / confirmed / completed)

### 5.5 OHIP & Insurance Guidance

- Province selector — guidance adjusts per province (ON, BC, AB, QC, etc.)
- Explains what provincial insurance covers for ER visits, urgent care, virtual care
- Flags services that are NOT covered — e.g. ambulance fees, some virtual platforms

### 5.6 Multi-Language Support

- English and French at launch (bilingual Canada requirement)
- Punjabi, Mandarin, Arabic in Phase 2 — targeting major immigrant communities
- i18n via react-i18next — all strings externalized from day one
- Language persisted in user profile and applied across all screens

### 5.7 Responsive Design

- All screens use `ResponsiveContainer` wrapper for cross-platform layout
- `useResponsive` hook provides breakpoints: mobile (<768), tablet (768-1023), desktop (1024+)
- Content constrained to max-width 800px and centered on tablet/desktop
- Responsive padding: 24px mobile → 32px tablet → 40px desktop
- Cursor pointer support on web for all interactive elements
- Mobile layout unchanged — responsive only adds constraints on larger screens

### 5.8 B2B Operator Dashboard (Phase 3)

- Hospital and clinic accounts can access an analytics dashboard
- Aggregate triage volume by risk tier — helps predict ER surge
- Heatmap of triage checks by neighbourhood — identifies high-need areas
- QR code generator — operators create and deploy their own branded QR codes

---

## 6. Service Integrations

### 6.1 Presage SmartSpectra

Handles camera-based vitals. The most technically risky integration — validate early.

- SDK: `@presagetech/smartspectra-web` (web) + React Native bridge for mobile
- Requires front camera permission — request on VitalsScreen mount
- Returns: `{ heartRate, respiratoryRate, stressIndex, emotionState }`
- Fallback: if Presage fails or user denies camera, show manual input fields for HR and symptoms only

**Health Check**: On app load, call Presage SDK `.initialize()` and verify a non-null token is returned. If it fails, set a global `presageFailed` flag and render the manual input fallback silently.

```typescript
// presageService.ts — backend validation
export function validateVitals(raw: PresagePayload) {
  if (raw.heartRate < 30 || raw.heartRate > 200) throw new Error('HR out of range');
  if (raw.respiratoryRate < 5 || raw.respiratoryRate > 50) throw new Error('RR out of range');
  return { hr: raw.heartRate, rr: raw.respiratoryRate, stress: raw.stressIndex };
}
```

### 6.2 Gemini API

Core triage classification engine. Takes normalized vitals + symptom answers and returns a risk tier with explanation.

- Model: `gemini-1.5-flash` (fast, cost-efficient for real-time use)
- Prompt is constructed server-side — never expose logic to the frontend
- System prompt includes: Canadian triage guidelines (CTAS), disclaimer framing, output format spec
- Response format: `{ riskLevel: 'green'|'yellow'|'red', recommendation: string, explanation: string }`

```typescript
// geminiService.ts
const SYSTEM_PROMPT = `
You are a Canadian triage guidance assistant. You are NOT a doctor.
Given patient vitals and symptom answers, classify urgency into one of:
  green  = virtual care appropriate
  yellow = urgent care clinic today
  red    = ER immediately or call 911
Respond only in valid JSON:
{ "riskLevel", "recommendation", "explanation" }
Explanation must be plain language, max 3 sentences.
Always include: 'This is guidance only. See a doctor for diagnosis.'
`;
```

**Health Check**: On backend startup, send a test payload to Gemini with known inputs and assert `riskLevel` is present in the response.

### 6.3 Mapbox

Used for location-based clinic lookup and the QR code destination for B2B deployments.

- Geocode user's postal code → coordinates on triage session start
- Query Mapbox Places API for nearest: urgent care clinics, ERs, pharmacies
- Display results as a card list with distance and hours
- Full Mapbox GL map shown only on the web version for B2B operator dashboard

**Health Check**: On backend start, run a test geocode call for 'Kitchener, ON' and assert a valid coordinate pair is returned.

### 6.4 Redis Cache

Two primary uses: ER wait time data (expensive to fetch, changes slowly) and health check status.

```typescript
// cache/redis.ts
export async function getWaitTime(city: string): Promise<string | null> {
  return redis.get(`waittime:${city.toLowerCase()}`);
}

export async function setWaitTime(city: string, value: string) {
  await redis.set(`waittime:${city.toLowerCase()}`, value, { EX: 1800 }); // 30 min
}
```

**Health Check**: On startup, call `redis.ping()` and assert 'PONG'. If Redis is down, the app still works — fall back to direct API calls.

---

## 7. Frontend / Backend Split

| Team | Owns |
|------|------|
| Frontend Team | React Native (Web + iOS + Android via Expo), Presage SDK, Mapbox GL, Zustand state, i18n, responsive layout, all screens and components |
| Backend Team | Node.js + Express, PostgreSQL, Redis, Gemini API, Presage validation, Mapbox Places, Vultr deployment |
| Shared Contract | API types defined in a shared `/types` folder — both sides import the same TypeScript interfaces |
| Communication | Frontend calls backend only via the `/api` routes. No frontend component ever directly calls Gemini or Presage backend — all goes through the API |

### 7.1 Shared Type Contract

```typescript
// types/triage.ts  (imported by both frontend and backend)

export interface VitalsPayload {
  heartRate: number;
  respiratoryRate: number;
  stressIndex: number;
  emotionState: string;
}

export interface SymptomsPayload {
  chestPain: boolean;
  shortnessOfBreath: boolean;
  fever: boolean;
  feverDays?: number;
  dizziness: boolean;
  severeHeadache: boolean;
  injuryOrBleeding: boolean;
}

export interface TriageRequest {
  vitals: VitalsPayload;
  symptoms: SymptomsPayload;
  city: string;
  memberId?: string;
}

export interface TriageResponse {
  riskLevel: 'green' | 'yellow' | 'red';
  recommendation: string;
  explanation: string;
  waitTimeEstimate?: string;
  nearbyClinics: ClinicResult[];
}
```

---

## 8. Environment Variables

```bash
# Backend .env
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/ertriage
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_key_here
PRESAGE_API_KEY=your_key_here
MAPBOX_SECRET_TOKEN=your_key_here

# Frontend .env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_MAPBOX_TOKEN=your_public_token
EXPO_PUBLIC_PRESAGE_KEY=your_key_here
```

---

## 9. Product Roadmap

| Phase | Deliverables |
|-------|-------------|
| Hackathon MVP | Core triage flow, Presage vitals, Gemini classification, live wait times, Mapbox clinic lookup, responsive web + mobile, EN/FR |
| Month 1 | Full iOS + Android builds, family profiles, symptom history, push notifications |
| Month 2 | Doctor booking integration (Maple / Teladoc APIs), OHIP guidance module |
| Month 3 | B2B operator dashboard, QR code generator, aggregate analytics |
| Month 4 | Additional languages (Punjabi, Mandarin, Arabic), wearable integration research |
| Long Term | Provincial licensing, integration with provincial health card systems, white-label for hospital chains |

---

**ER Triage E-Clip** — The right care, at the right place, in under 3 minutes.
