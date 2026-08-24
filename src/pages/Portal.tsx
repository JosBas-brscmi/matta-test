import React, { useEffect, useState } from 'react';
import { TEST_SPECS, TestKey } from '../lib';
import { currentUser, logout } from '../identity';

export default function Portal() {
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const u = currentUser();
    setEmail(u?.email ?? '');
  }, []);

  const cards: { key: TestKey; tone: string; }[] = [
    { key: 'iq', tone: 'text-neon' },
    { key: 'english', tone: 'text-neon2' },
    { key: 'aptitude', tone: 'text-white' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Candidate Portal</h2>
          <div className="text-sm text-muted mt-1">Signed in as {email || 'Unknown'}</div>
        </div>
        <div className="flex gap-3">
          <a href="/admin" className="rounded-xl border border-white/15 px-4 py-2 hover:bg-white/5 text-sm">Admin</a>
          <button onClick={logout} className="rounded-xl border border-white/15 px-4 py-2 hover:bg-white/5 text-sm">Sign out</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map(({ key, tone }) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-panel/60 p-5 shadow-glow">
            <div className={`font-semibold ${tone}`}>{TEST_SPECS[key].title}</div>
            <div className="mt-2 text-sm text-muted">Duration: {TEST_SPECS[key].durationMinutes} min</div>
            <div className="text-sm text-muted">Items: {TEST_SPECS[key].itemCount} (randomized)</div>

            <a href={`/test/${key}`} className="mt-4 inline-flex rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15 text-sm">
              Start
            </a>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-panel/40 p-5 text-sm text-muted">
        Your results will be available immediately after submission. You can download a PDF report. A copy will be sent to the MA Center for review.
      </div>
    </div>
  );
}
