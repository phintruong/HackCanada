import Foundation

/// Sends one vitals message to the ClearPath WebSocket server.
final class VitalsWebSocketClient: NSObject {
    private var task: URLSessionWebSocketTask?
    private var pendingVitals: (sessionId: String, hr: Int, rr: Int, stress: Double)?
    private var onSent: (() -> Void)?
    private var onError: ((Error) -> Void)?

    /// Connect to `wsURL`; when connected, send `{ type: "vitals", sessionId, hr, rr, stress }`.
    /// Callbacks run on main queue.
    func sendVitals(sessionId: String, hr: Int, rr: Int, stress: Double, wsURL: URL, onSent: @escaping () -> Void, onError: @escaping (Error) -> Void) {
        self.pendingVitals = (sessionId, hr, rr, stress)
        self.onSent = onSent
        self.onError = onError

        var req = URLRequest(url: wsURL)
        req.timeoutInterval = 15
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        task = session.webSocketTask(with: req)
        task?.resume()
        receiveLoop()
    }

    private func sendPending() {
        guard let p = pendingVitals else { return }
        let json = vitalsJSON(sessionId: p.sessionId, hr: p.hr, rr: p.rr, stress: p.stress)
        task?.send(.string(json)) { [weak self] err in
            DispatchQueue.main.async {
                if let err = err {
                    self?.onError?(err)
                    return
                }
                self?.onSent?()
            }
            self?.task?.cancel(with: .normalClosure, reason: nil)
        }
        pendingVitals = nil
    }

    private func vitalsJSON(sessionId: String, hr: Int, rr: Int, stress: Double) -> String {
        let dict: [String: Any] = [
            "type": "vitals",
            "sessionId": sessionId,
            "hr": hr,
            "rr": rr,
            "stress": stress
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let s = String(data: data, encoding: .utf8) else { return "{}" }
        return s
    }

    private func receiveLoop() {
        task?.receive { [weak self] _ in
            self?.receiveLoop()
        }
    }
}

extension VitalsWebSocketClient: URLSessionWebSocketDelegate {
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol _: String?) {
        sendPending()
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let e = error, pendingVitals != nil {
            DispatchQueue.main.async { [weak self] in
                self?.onError?(e)
            }
        }
    }
}
