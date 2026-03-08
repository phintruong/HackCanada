'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Optional landing page for the QR URL. Swift app parses the same URL for sessionId and wsPort.
 * Humans opening the link see this message.
 */
export default function ScanPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') ?? '';
  const wsPort = searchParams.get('wsPort') ?? '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <h1 className="text-lg font-bold text-slate-800 mb-2">ClearPath</h1>
      <p className="text-sm text-slate-600 text-center">
        Session ready. Use the ClearPath iOS app to scan the QR code and capture your vitals.
      </p>
      {sessionId && (
        <p className="mt-4 text-xs text-slate-400 font-mono break-all text-center max-w-md">
          session={sessionId}
          {wsPort ? ` · wsPort=${wsPort}` : ''}
        </p>
      )}
    </div>
  );
}
