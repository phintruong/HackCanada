import Foundation

/// Parsed from the QR URL: `http(s)://host:appPort/scan?session=...&wsPort=...`
struct ScanSession: Equatable {
    let sessionId: String
    let host: String
    /// WebSocket port (e.g. 3001 in dev, or same as app when omitted)
    let wsPort: Int

    /// WebSocket URL for vitals
    var wsURL: URL? {
        var c = URLComponents()
        c.scheme = "ws"
        c.host = host
        c.port = wsPort
        c.path = "/ws"
        return c.url
    }

    /// Parse from scanned QR string (full URL)
    static func parse(from urlString: String) -> ScanSession? {
        guard let url = URL(string: urlString),
              let comp = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let host = comp.host, !host.isEmpty else { return nil }
        let sessionId = comp.queryItems?.first(where: { $0.name == "session" })?.value?.trimmingCharacters(in: .whitespaces) ?? ""
        let wsPort = comp.queryItems?.first(where: { $0.name == "wsPort" })?.value.flatMap(Int.init) ?? comp.port ?? 3000
        guard !sessionId.isEmpty else { return nil }
        return ScanSession(sessionId: sessionId, host: host, wsPort: wsPort)
    }
}
