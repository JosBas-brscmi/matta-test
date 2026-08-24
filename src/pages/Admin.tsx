import React, { useEffect, useState } from 'react';
import { currentToken } from '../identity';

type Row = {
  id: string;
  test_key: string;
  candidate_email: string;
  submitted_at: string;
  score_percent: number;
};

export default function Admin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await currentToken();
        const r = await fetch('/.netlify/functions/getResults', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setRows(data.rows ?? []);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
          <div className="text-sm text-muted mt-1">Results are stored in Supabase when configured. Otherwise, only email delivery is used.</div>
        </div>
        <a href="/portal" className="rounded-xl border border-white/15 px-4 py-2 hover:bg-white/5 text-sm">Back</a>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-panel/60 p-5 shadow-glow">
        {loading && <div className="text-muted">Loading…</div>}
        {!loading && err && (
          <div className="text-sm text-danger whitespace-pre-wrap">
            {err}
            {"\n\n"}If you did not configure Supabase, this is expected. Configure environment variables and redeploy.
          </div>
        )}
        {!loading && !err && (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-muted">
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4">Submitted</th>
                  <th className="text-left py-2 pr-4">Candidate</th>
                  <th className="text-left py-2 pr-4">Test</th>
                  <th className="text-left py-2 pr-4">Score</th>
                  <th className="text-left py-2 pr-4">ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2 pr-4">{new Date(r.submitted_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{r.candidate_email}</td>
                    <td className="py-2 pr-4">{r.test_key}</td>
                    <td className="py-2 pr-4">{r.score_percent}%</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted">{r.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-muted">
        Access control: protect /admin by requiring login (already) and optionally restrict via Identity roles in the getResults function.
      </div>
    </div>
  );
}
