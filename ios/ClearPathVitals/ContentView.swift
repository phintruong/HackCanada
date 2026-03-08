import SwiftUI

#if canImport(SmartSpectraSwiftSDK)
import SmartSpectraSwiftSDK
#endif

struct ContentView: View {
    @State private var scanSession: ScanSession?
    @State private var status: Status = .idle
    @State private var errorMessage: String?
    @State private var sentSuccess = false

    #if canImport(SmartSpectraSwiftSDK)
    @ObservedObject private var sdk = SmartSpectraSwiftSDK.shared
    #endif

    private let wsClient = VitalsWebSocketClient()

    enum Status {
        case idle
        case measuring
        case sending
        case sent
        case error
    }

    var body: some View {
        NavigationStack {
            Group {
                if let session = scanSession {
                    sessionView(session)
                } else {
                    scannerView
                }
            }
            .navigationTitle("ClearPath Vitals")
        }
        #if canImport(SmartSpectraSwiftSDK)
        .onChange(of: sdk.metricsBuffer) { newBuffer in
            guard let session = scanSession,
                  status == .measuring,
                  let buf = newBuffer, buf.isInitialized else { return }
            let hr = Int(buf.pulse.strict.value.rounded())
            let rr = Int(buf.breathing.strict.value.rounded())
            guard hr >= 30, hr <= 220, rr >= 5, rr <= 60 else { return }
            SmartSpectraVitalsProcessor.shared.stopRecording()
            sendVitals(session: session, hr: hr, rr: rr)
        }
        .onAppear {
            configureSDKIfNeeded()
        }
        #endif
    }

    private var scannerView: some View {
        VStack {
            Text("Scan the QR code on the laptop")
                .font(.headline)
                .padding()
            QRCodeScannerView { str in
                if let session = ScanSession.parse(from: str) {
                    scanSession = session
                } else {
                    errorMessage = "Invalid QR. Use the QR from the laptop’s “Scan with phone” screen."
                    status = .error
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil; status = .idle }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func sessionView(_ session: ScanSession) -> some View {
        VStack(spacing: 20) {
            Text("Session: \(session.sessionId.prefix(8))...")
                .font(.caption)
                .foregroundStyle(.secondary)

            if sentSuccess {
                Label("Vitals sent", systemImage: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.green)
                Text("Return to the laptop to continue.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else if status == .error {
                if let msg = errorMessage {
                    Text(msg)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
                Button("Try again") {
                    errorMessage = nil
                    status = .idle
                }
            } else {
                #if canImport(SmartSpectraSwiftSDK)
                Button(status == .measuring ? "Measuring…" : "Start measurement") {
                    startMeasurement()
                }
                .disabled(status == .measuring || status == .sending)
                .buttonStyle(.borderedProminent)
                #else
                Button("Send test vitals") {
                    sendVitals(session: session, hr: 72, rr: 14)
                }
                .disabled(status == .sending)
                .buttonStyle(.borderedProminent)
                #endif

                Button("Scan different QR") {
                    scanSession = nil
                    status = .idle
                    errorMessage = nil
                }
                .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    #if canImport(SmartSpectraSwiftSDK)
    private func configureSDKIfNeeded() {
        let sdk = SmartSpectraSwiftSDK.shared
        // Set your API key from https://physiology.presagetech.com (or use OAuth with PresageService-Info.plist)
        sdk.setApiKey("YOUR_PRESAGE_API_KEY")
        sdk.setSmartSpectraMode(.spot)
        sdk.setMeasurementDuration(30.0)
        sdk.setCameraPosition(.front)
    }

    private func startMeasurement() {
        status = .measuring
        SmartSpectraVitalsProcessor.shared.startProcessing()
        SmartSpectraVitalsProcessor.shared.startRecording()
    }
    #endif

    private func sendVitals(session: ScanSession, hr: Int, rr: Int) {
        status = .sending
        guard let url = session.wsURL else {
            status = .error
            errorMessage = "Invalid WebSocket URL"
            return
        }
        let hrClamped = min(220, max(30, hr))
        let rrClamped = min(60, max(5, rr))
        wsClient.sendVitals(
            sessionId: session.sessionId,
            hr: hrClamped,
            rr: rrClamped,
            stress: 0,
            wsURL: url,
            onSent: {
                status = .sent
                sentSuccess = true
            },
            onError: { err in
                status = .error
                errorMessage = err.localizedDescription
            }
        )
    }
}

#Preview {
    ContentView()
}
