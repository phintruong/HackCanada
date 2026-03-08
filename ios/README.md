# ClearPath Vitals — iOS App

Sends face-capture vitals from your iPhone to the ClearPath laptop app via WebSocket. Uses the Presage SmartSpectra SDK for pulse and breathing rate.

## 1. Create the Xcode project

1. Open Xcode → **File → New → Project**.
2. Choose **App** (iOS) → Next.
3. Product Name: **ClearPathVitals**, Interface: **SwiftUI**, Language: **Swift**, minimum iOS **15**.
4. Save inside this `ios/` folder (e.g. `ios/ClearPathVitals/`).
5. Delete the default `ContentView.swift` and add the Swift files from `ClearPathVitals/` in this repo (or replace their contents).

## 2. Add the Presage SmartSpectra SDK

- Get the SDK (Swift package or local `swift/sdk` from Presage).
- In Xcode: **File → Add Package Dependencies** (or **Add Files** for local SDK).
- Add the **SmartSpectraSwiftSDK** (and any dependencies it needs, e.g. PresagePreprocessing).
- See `presage_swift_sdk.txt` in the project root for full SDK docs.

## 3. Configure the SDK

In your app init or `ContentView`:

```swift
// Option A: API key (dev)
sdk.setApiKey("YOUR_PRESAGE_API_KEY")  // from https://physiology.presagetech.com

// Option B: OAuth (TestFlight/App Store)
// Add PresageService-Info.plist from Presage developer portal to the app target.
```

Set camera usage in **Info.plist**:

```xml
<key>NSCameraUsageDescription</key>
<string>Used to measure your pulse and breathing for ClearPath triage.</string>
```

## 4. App flow

1. **Scan QR** — Shown on the laptop when you tap “Scan with phone”. QR URL looks like:  
   `http://<laptop-ip>:3000/scan?session=<uuid>&wsPort=3001`
2. **Parse** — Read `session` and optional `wsPort` (default `3000`). Host = URL host.
3. **Measure** — Use SmartSpectra in **spot** mode; get `metricsBuffer.pulse.strict.value` (hr) and `metricsBuffer.breathing.strict.value` (rr). SDK has no stress metric; send **stress: 0**.
4. **Send** — Open WebSocket to `ws://<host>:<wsPort>/ws`, send one JSON message:

```json
{
  "type": "vitals",
  "sessionId": "<from QR>",
  "hr": 72,
  "rr": 14,
  "stress": 0
}
```

5. Laptop receives vitals and continues triage.

## 5. Run the laptop side

- In project root: `pnpm run dev:all` (or `pnpm dev` + `pnpm run dev:ws`).
- In `.env.local`: `NEXT_PUBLIC_WS_PORT=3001`.
- Open the web app at `http://<laptop-ip>:3000`, go to triage, tap **Scan with phone**, then scan the QR with this app.

## 6. SDK mapping to WebSocket payload

| WebSocket field | SDK source |
|-----------------|------------|
| `hr`            | `metricsBuffer.pulse.strict.value` (clamp 30–220) |
| `rr`            | `metricsBuffer.breathing.strict.value` (clamp 5–60) |
| `stress`        | `0` (SDK does not provide stress) |
