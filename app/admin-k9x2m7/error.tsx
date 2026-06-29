'use client';

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-red-100 p-8 w-full max-w-md">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error en el panel</h2>
        <p className="text-sm text-gray-600 mb-4 font-mono break-all">{error.message}</p>
        <pre className="text-xs text-gray-400 overflow-auto mb-4 max-h-40">{error.stack}</pre>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
