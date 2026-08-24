import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './Home';
import Portal from './Portal';
import TestRunner from './TestRunner';
import Results from './Results';
import Admin from './Admin';
import AdminDashboard from './AdminDashboard';
import { currentUser, onIdentityChange } from '../identity';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const update = () => {
      const u = currentUser();
      setAuthed(!!u);
      setReady(true);
    };
    onIdentityChange(update);
    update();
  }, []);

  if (!ready) return <div className="min-h-screen grid place-items-center text-muted">Loading…</div>;
  if (!authed) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  const loc = useLocation();
  const showFrame = useMemo(() => !['/'].includes(loc.pathname), [loc.pathname]);

  return (
    <div className="min-h-screen bg-ink text-white">
      {showFrame && (
        <div className="sticky top-0 z-10 border-b border-white/10 bg-ink/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/matta-logo.png" className="h-9 w-9 rounded-full shadow-glow" alt="MATTA logo" />
              <div>
                <div className="text-sm text-muted">BROWAVE</div>
                <div className="font-semibold tracking-wide">MATTA CENTER</div>
              </div>
            </div>
            <a className="text-sm text-neon hover:underline" href="/portal">Portal</a>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/portal" element={<RequireAuth><Portal /></RequireAuth>} />
        <Route path="/test/:testKey" element={<RequireAuth><TestRunner /></RequireAuth>} />
        <Route path="/results/:testKey" element={<RequireAuth><Results /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
        <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
