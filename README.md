# ClearPath

A smart healthcare emergency routing platform for Ontario. ClearPath helps both **government planners** optimize ER placement and **patients** find the best hospital based on their medical condition, live traffic, and real-time ER congestion.

## Features

### Civilian Mode (Patient Routing)
- **Location detection** via browser geolocation or postal code geocoding (Mapbox)
- **Vitals capture** — enter heart rate, respiratory rate, and stress index
- **Symptom intake** — select from structured symptom cards (chest pain, shortness of breath, fever, dizziness, free text)
- **AI-powered triage** — GPT-4o-mini classifies severity as critical / urgent / non-urgent
- **Multi-factor smart routing** that scores every hospital using:
  - **Live driving time** via Mapbox Directions API (`driving-traffic` profile — accounts for real-time traffic, road closures, construction)
  - **Time-of-day traffic patterns** — rush hour penalties (7-9am, 4-6pm weekdays)
  - **ER wait time adjustments** — projects wait based on hourly ER volume patterns
  - **Hospital occupancy** — penalizes overcrowded ERs
  - **Specialty matching** — routes cardiac patients to cardiac centers, trauma patients to trauma centers, etc.
  - **Severity-based weight profiles** — critical patients prioritize drive time; non-urgent patients prioritize lowest total wait
- **Top 3 recommendations** with driving time, wait time, total estimated time, and reasoning
- **Route visualization** — actual driving route drawn on the map (green for recommended, dashed gray for alternatives)
- **User location marker** — pulsing blue dot shows your position
- **911 button** for critical severity cases

### Government Mode (ER Planning)
- **Interactive map** — click to place a proposed new ER location
- **Capacity slider** — set bed count for the proposed facility
- **Voronoi simulation** — recalculates patient distribution across the hospital network
- **Before/after analysis** — shows occupancy impact on every existing hospital
- **Flow arcs** — visualizes patient redistribution on the map

### Map Visualization
- **Mapbox GL** with dark theme and 3D building extrusions
- **Hospital congestion circles** — color-coded by occupancy (green → yellow → orange → red)
- **Live data** from Ontario Open Data API (with mock fallback)

### 3D Building Editor (`/editor`)
- Create and edit 3D building models with React Three Fiber
- Export to GLB format for map integration

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Maps**: Mapbox GL
- **AI**: OpenAI GPT-4o-mini (triage classification)
- **Database**: MongoDB (hospitals, congestion snapshots)
- **3D**: React Three Fiber + Three.js
- **Animations**: Framer Motion
- **GIS**: Turf.js, Mapbox Directions API

## Setup

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)

### Environment Variables

Create `.env.local` at the project root:

```env
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
MAPBOX_SECRET_TOKEN=pk.eyJ...
```

### Install & Run

```bash
npm install
npm run dev
```

### Seed the Database

After starting the dev server, seed hospitals and congestion data:

```bash
curl -X POST http://localhost:3000/api/clearpath/seed
```

### Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero and feature carousel |
| `/map` | Main ClearPath map with civilian & government modes |
| `/editor` | 3D building editor |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clearpath/hospitals` | GET | Fetch hospitals by city |
| `/api/clearpath/congestion` | GET | Get real-time ER congestion data |
| `/api/clearpath/triage` | POST | AI-powered symptom triage |
| `/api/clearpath/route` | POST | Smart multi-factor hospital routing |
| `/api/clearpath/simulate` | POST | Voronoi simulation for new ER placement |
| `/api/clearpath/seed` | POST | Seed database with Toronto hospitals |

## Routing Algorithm

The smart routing algorithm scores each hospital using a weighted formula:

```
score = w_drive * drivingTime + w_wait * adjustedWaitTime + w_occ * occupancyPenalty + w_spec * specialtyMismatch
```

**Weights by severity:**

| Factor | Critical | Urgent | Non-Urgent |
|--------|----------|--------|------------|
| Drive time | 5.0 | 2.0 | 1.0 |
| Wait time | 0.5 | 3.0 | 4.0 |
| Occupancy | 0.3 | 1.5 | 2.0 |
| Specialty | 3.0 | 1.5 | 0.5 |

- **Critical**: Get to the nearest ER as fast as possible
- **Urgent**: Balance drive time with hospital capacity
- **Non-urgent**: Minimize total time (drive + wait), prefer less crowded ERs

## Hospital Specialties (Toronto)

| Hospital | Specialties |
|----------|-------------|
| Toronto General | Cardiac, Transplant, Respiratory |
| St. Michael's | Trauma, Neurology, Cardiac |
| Sunnybrook | Trauma, Stroke, Burn |
| Mount Sinai | Obstetrics, Respiratory |
| Toronto Western | Neurology, Stroke, Orthopedic |
| Scarborough General | General, Cardiac |
| North York General | General, Respiratory, Orthopedic |
| Humber River | General, Cardiac |
