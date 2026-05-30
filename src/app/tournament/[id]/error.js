'use client';

export default function Error({ error, reset }) {
  return (
    <div className="p-10 bg-slate-900 min-h-screen text-white font-mono text-sm">
      <h2 className="text-red-500 text-xl font-bold mb-4">Something went wrong!</h2>
      <div className="bg-red-950 p-4 rounded-lg overflow-auto mb-4 border border-red-800">
        <p className="font-bold text-red-300">{error?.name}: {error?.message}</p>
        <pre className="text-red-200 mt-2 whitespace-pre-wrap">{error?.stack}</pre>
      </div>
      <button
        onClick={() => reset()}
        className="bg-white text-black px-4 py-2 rounded font-bold hover:bg-slate-200"
      >
        Try again
      </button>
    </div>
  );
}
