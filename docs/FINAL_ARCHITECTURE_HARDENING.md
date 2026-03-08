# Final Architecture Hardening Pass — ClearPath Swift → WebSocket → Laptop

## 1. Issues Addressed (current / previous implementation)

- **No explicit message types:** Message parsing relied on ad-hoc checks. Added `LaptopMessage`, `VitalsMessage`, `ClientMessage`, and `ForwardedVitals` in [lib/clearpath/wsServer.ts](lib/clearpath/wsServer.ts) so parsing is type-safe and consistent.
- **Session lifecycle unclear:** Sessions are now explicit: CREATED when laptop sends `{ type: "laptop", sessionId }`, ACTIVE while the laptop WebSocket is open, CLOSED on laptop disconnect, after vitals are forwarded, or when the 120s TTL expires. TTL timeout is cleared when the session is closed early.
- **Duplicate vitals:** A second vitals message for the same session could be forwarded. Added `receivedVitals` on `SessionEntry`; after the first valid vitals message we set it and ignore further vitals for that session, then close the session.
- **Validation not strict enough:** Vitals are validated with `typeof sessionId === "string"`, `typeof hr/rr/stress === "number"`, and ranges (hr 30–220, rr 5–60, stress 0–1). NaN/non-finite values are rejected. Invalid messages are ignored; no server crash. `JSON.parse` is inside try/catch.
- **WebSocket robustness:** Message handler is wrapped in try/catch; unknown message types are ignored; no uncaught exceptions from the WS layer.
- **Laptop UI copy and retry:** Connection failure now shows "Connection lost. Please scan again." Retry closes the previous socket, fetches a new sessionId, and regenerates the QR. Socket is closed on component unmount via `closePhoneScanSocket()` in the effect cleanup.
- **Multiple sessions:** Sessions are stored in `Map<string, SessionEntry>`. Each entry has `ws`, `timeoutId`, and `receivedVitals`. Reconnecting with the same sessionId replaces the previous laptop for that session (clearSession then set).

---

## 2. wsServer.ts — Summary of implementation

- **Interfaces:** `LaptopMessage`, `VitalsMessage`, `ClientMessage`, `ForwardedVitals`, `SessionEntry` (ws, timeoutId, receivedVitals).
- **Session store:** `Map<string, SessionEntry>`; `clearSession(sessionId)` clears the timeout and removes the entry.
- **Laptop message:** Registers the WebSocket for the session, sets 120s TTL, and attaches close/error handlers that call `clearSession`.
- **Vitals message:** Validates with type guards and range checks; if `session.receivedVitals` is true, returns without forwarding; otherwise sets `receivedVitals = true`, forwards `ForwardedVitals` to the laptop, then calls `clearSession(sessionId)`.
- **Logging:** "session created, laptop connected", "vitals received", "vitals forwarded", "session closed" (with sessionId where useful). No noisy logs.

---

## 3. VitalsCapture.tsx — Summary of changes

- **Phone-scan state:** `waitingPhoneScan`; state for `phoneScanSessionId` and `phoneScanConnectionLost`.
- **Socket ref:** `socketRef` and `vitalsReceivedRef` so we only call `onComplete` once and can close the socket on unmount.
- **startPhoneScan:** Fetches `/api/scan/session`, builds WebSocket URL (using `NEXT_PUBLIC_WS_PORT` when set), opens socket, sends `{ type: "laptop", sessionId }`, and on `vitals` message maps to `VitalsPayload` and calls `onComplete`.
- **Connection lost:** On close/error before vitals, sets `phoneScanConnectionLost`; UI shows "Connection lost. Please scan again." with a "Try again" button.
- **Retry:** `retryPhoneScan` calls `closePhoneScanSocket()`, resets lost state, then `startPhoneScan()` (new session, new QR).
- **Cleanup:** Effect cleanup calls `closePhoneScanSocket()` on unmount.
- **QR URL:** `${origin}/scan?session=${sessionId}&wsPort=${NEXT_PUBLIC_WS_PORT}` (wsPort only if set) for Swift app to parse.

---

## 4. scripts/ws-server-standalone.ts

- Creates an HTTP server on `WS_PORT` (default 3001), attaches `attachWsServer(server)`, returns 404 for non-upgrade requests. Used in dev so Next.js can run with HMR on port 3000 while WS runs on 3001.

---

## 5. Swift compatibility

The server accepts exactly:

```json
{
  "type": "vitals",
  "sessionId": "<string>",
  "hr": <number>,
  "rr": <number>,
  "stress": <number>
}
```

No extra fields are required. Ranges enforced: hr 30–220, rr 5–60, stress 0–1.

---

## 6. Demo flow verification

1. **Laptop:** Click "Scan with phone" → QR appears (session created, laptop connected to WS).
2. **Swift app:** Scan QR → capture vitals → send one WebSocket message in the format above.
3. **Server:** Validates message, forwards to laptop (first vitals only), closes session.
4. **Laptop:** Receives vitals → `onComplete(vitals)` → CivilianPanel continues triage.

No changes to CivilianPanel, `/api/clearpath/triage`, geminiService, or VitalsPayload types.
