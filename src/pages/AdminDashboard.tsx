import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { currentToken } from '../identity';

type ResultRow = {
  id: string;
  test_key: string;
  candidate_email: string;
  submitted_at: string;
  score_percent: number | null;
};

type EnglishLevel = 'Ready' | 'Trainable' | 'High Risk' | 'Unknown';
type IQBand = 'Top 20%' | '21–50%' | '51–70%' | 'Bottom 30%' | 'Unknown';
type Recommend = 'Fast Track' | 'Interview' | 'Consider' | 'Hold' | 'No';

function classifyEnglish(score: number | null): EnglishLevel {
  if (score === null || score === undefined || Number.isNaN(score)) return 'Unknown';
  if (score >= 75) return 'Ready';
  if (score >= 55) return 'Trainable';
  return 'High Risk';
}

function bandFromPercentile(p: number | null): IQBand {
  if (p === null || p === undefined || Number.isNaN(p)) return 'Unknown';
  if (p >= 80) return 'Top 20%';
  if (p >= 50) return '21–50%';
  if (p >= 30) return '51–70%';
  return 'Bottom 30%';
}

function computePercentile(sortedAsc: number[], value: number): number {
  // percentile in [0,100], using rank-based method
  if (!sortedAsc.length) return 0;
  let lo = 0, hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  const rank = lo; // number of items <= value
  return Math.round((rank / sortedAsc.length) * 100);
}

function isIQKey(k: string) {
  const s = k.toLowerCase();
  return s.includes('iq');
}
function isEnglishKey(k: string) {
  const s = k.toLowerCase();
  return s.includes('english');
}
function isAptitudeKey(k: string) {
  const s = k.toLowerCase();
  return s.includes('aptitude') || s.includes('personality');
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-28 text-xs text-muted">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-2 bg-neon/80" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right text-xs">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr('');
        const tok = await currentToken();
        const r = await fetch('/api/getResults', { headers: { Authorization: `Bearer ${tok}` } });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        setRows(j.rows || []);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return rows.filter(r => new Date(r.submitted_at).getTime() >= cutoff);
  }, [rows, days]);

  const latestByCandidate = useMemo(() => {
    // latest result per candidate per category (iq/english/aptitude)
    const map = new Map<string, { iq?: ResultRow; english?: ResultRow; aptitude?: ResultRow }>();
    for (const r of filtered) {
      const email = r.candidate_email || 'unknown';
      if (!map.has(email)) map.set(email, {});
      const obj = map.get(email)!;
      const key = r.test_key || '';
      const t = new Date(r.submitted_at).getTime();
      const assign = (slot: 'iq'|'english'|'aptitude') => {
        const cur = obj[slot];
        if (!cur || new Date(cur.submitted_at).getTime() < t) obj[slot] = r;
      };
      if (isIQKey(key)) assign('iq');
      else if (isEnglishKey(key)) assign('english');
      else if (isAptitudeKey(key)) assign('aptitude');
    }
    return map;
  }, [filtered]);

  const iqScores = useMemo(() => {
    const arr: number[] = [];
    for (const r of filtered) if (isIQKey(r.test_key) && typeof r.score_percent === 'number') arr.push(r.score_percent);
    arr.sort((a,b)=>a-b);
    return arr;
  }, [filtered]);

  const candidates = useMemo(() => {
    const out: Array<{
      email: string;
      iqScore: number | null;
      iqPercentile: number | null;
      iqBand: IQBand;
      englishScore: number | null;
      englishLevel: EnglishLevel;
      recommend: Recommend;
      lastSubmittedAt: string | null;
    }> = [];
    latestByCandidate.forEach((v, email) => {
      const iqScore = typeof v.iq?.score_percent === 'number' ? v.iq!.score_percent : null;
      const englishScore = typeof v.english?.score_percent === 'number' ? v.english!.score_percent : null;

      const iqPercentile = (iqScore !== null && iqScores.length) ? computePercentile(iqScores, iqScore) : null;
      const iqBand = bandFromPercentile(iqPercentile);
      const englishLevel = classifyEnglish(englishScore);

      let recommend: Recommend = 'Hold';
      // Decision logic (aligned with matrix)
      if (iqBand === 'Bottom 30%') recommend = 'No';
      else if (iqBand === 'Top 20%' && englishLevel === 'Ready') recommend = 'Fast Track';
      else if ((iqBand === 'Top 20%' || iqBand === '21–50%') && (englishLevel === 'Ready' || englishLevel === 'Trainable')) recommend = 'Interview';
      else if (iqBand === '51–70%' && englishLevel === 'Ready') recommend = 'Consider';
      else if (englishLevel === 'High Risk') recommend = 'Hold';

      const last = [v.iq, v.english, v.aptitude]
        .filter(Boolean)
        .map(x => new Date((x as ResultRow).submitted_at).getTime())
        .sort((a,b)=>b-a)[0];
      out.push({
        email,
        iqScore,
        iqPercentile,
        iqBand,
        englishScore,
        englishLevel,
        recommend,
        lastSubmittedAt: last ? new Date(last).toISOString() : null,
      });
    });
    out.sort((a,b)=> (b.lastSubmittedAt||'').localeCompare(a.lastSubmittedAt||''));
    return out;
  }, [latestByCandidate, iqScores]);

  const overview = useMemo(() => {
    const totalAssessments = filtered.length;
    const uniqueCandidates = candidates.length;

    const rec = { fast: 0, interview: 0, consider: 0, hold: 0, no: 0 };
    for (const c of candidates) {
      if (c.recommend === 'Fast Track') rec.fast++;
      else if (c.recommend === 'Interview') rec.interview++;
      else if (c.recommend === 'Consider') rec.consider++;
      else if (c.recommend === 'No') rec.no++;
      else rec.hold++;
    }

    const english = { ready: 0, trainable: 0, risk: 0, unknown: 0 };
    const iqbands = { top: 0, mid: 0, low: 0, bottom: 0, unknown: 0 };

    for (const c of candidates) {
      if (c.englishLevel === 'Ready') english.ready++;
      else if (c.englishLevel === 'Trainable') english.trainable++;
      else if (c.englishLevel === 'High Risk') english.risk++;
      else english.unknown++;

      if (c.iqBand === 'Top 20%') iqbands.top++;
      else if (c.iqBand === '21–50%') iqbands.mid++;
      else if (c.iqBand === '51–70%') iqbands.low++;
      else if (c.iqBand === 'Bottom 30%') iqbands.bottom++;
      else iqbands.unknown++;
    }

    const avgIQ = (() => {
      const xs = candidates.map(c => c.iqScore).filter((x): x is number => typeof x === 'number');
      if (!xs.length) return null;
      return Math.round(xs.reduce((a,b)=>a+b,0)/xs.length);
    })();

    const readyPct = uniqueCandidates ? Math.round((english.ready/uniqueCandidates)*100) : 0;
    const interviewPct = uniqueCandidates ? Math.round(((rec.fast+rec.interview)/uniqueCandidates)*100) : 0;

    return { totalAssessments, uniqueCandidates, rec, english, iqbands, avgIQ, readyPct, interviewPct };
  }, [filtered, candidates]);

  const maxIQBand = Math.max(overview.iqbands.top, overview.iqbands.mid, overview.iqbands.low, overview.iqbands.bottom, overview.iqbands.unknown);
  const maxEng = Math.max(overview.english.ready, overview.english.trainable, overview.english.risk, overview.english.unknown);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted">BROWAVE MATTA CENTER</div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <div className="mt-1 text-sm text-muted">Recruitment visibility: IQ × English gate, recommendations, and distribution.</div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-sm text-neon hover:underline">Results Table</Link>
            <Link to="/portal" className="text-sm text-neon hover:underline">Portal</Link>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm">
          <span className="text-muted">Time window:</span>
          <select
            value={days}
            onChange={(e)=>setDays(Number(e.target.value))}
            className="rounded-xl bg-white/5 px-3 py-2 border border-white/10"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
          <span className="ml-auto text-xs text-muted">Data source: last 200 submissions from Supabase (getResults).</span>
        </div>

        {loading && <div className="mt-8 text-muted">Loading dashboard…</div>}
        {err && <div className="mt-8 text-red-300">{err}</div>}

        {!loading && !err && (
          <>
            {/* Overview cards */}
            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-muted">Assessments</div>
                <div className="mt-1 text-2xl font-semibold">{overview.totalAssessments}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-muted">Unique Candidates</div>
                <div className="mt-1 text-2xl font-semibold">{overview.uniqueCandidates}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-muted">Interview Recommended</div>
                <div className="mt-1 text-2xl font-semibold">{overview.interviewPct}%</div>
                <div className="mt-1 text-xs text-muted">(Fast Track + Interview)</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-muted">English Ready</div>
                <div className="mt-1 text-2xl font-semibold">{overview.readyPct}%</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-muted">Avg IQ Score</div>
                <div className="mt-1 text-2xl font-semibold">{overview.avgIQ ?? '—'}</div>
              </div>
            </div>

            {/* Distributions */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">IQ Percentile Bands</div>
                  <div className="text-xs text-muted">Derived from IQ scores within the selected window</div>
                </div>
                <div className="mt-3">
                  <Bar label="Top 20%" value={overview.iqbands.top} max={maxIQBand} />
                  <Bar label="21–50%" value={overview.iqbands.mid} max={maxIQBand} />
                  <Bar label="51–70%" value={overview.iqbands.low} max={maxIQBand} />
                  <Bar label="Bottom 30%" value={overview.iqbands.bottom} max={maxIQBand} />
                  <Bar label="Unknown" value={overview.iqbands.unknown} max={maxIQBand} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">English Usability</div>
                  <div className="text-xs text-muted">Thresholds: Ready ≥75, Trainable 55–74</div>
                </div>
                <div className="mt-3">
                  <Bar label="Ready" value={overview.english.ready} max={maxEng} />
                  <Bar label="Trainable" value={overview.english.trainable} max={maxEng} />
                  <Bar label="High Risk" value={overview.english.risk} max={maxEng} />
                  <Bar label="Unknown" value={overview.english.unknown} max={maxEng} />
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Decision Recommendation Summary</div>
                <div className="text-xs text-muted">Aligned with MATTA matrix (IQ gate + English usability)</div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-muted">Fast Track</div>
                  <div className="text-xl font-semibold">{overview.rec.fast}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-muted">Interview</div>
                  <div className="text-xl font-semibold">{overview.rec.interview}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-muted">Consider</div>
                  <div className="text-xl font-semibold">{overview.rec.consider}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-muted">Hold</div>
                  <div className="text-xl font-semibold">{overview.rec.hold}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-muted">No</div>
                  <div className="text-xl font-semibold">{overview.rec.no}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted">
                Note: Percentiles are computed within the selected time window (use a consistent window per batch for stable comparisons).
              </div>
            </div>

            {/* Candidate list */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Candidate Snapshot</div>
                <div className="text-xs text-muted">{candidates.length} candidates (latest IQ/English per candidate)</div>
              </div>
              <div className="mt-3 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-4">Candidate</th>
                      <th className="text-left py-2 pr-4">IQ</th>
                      <th className="text-left py-2 pr-4">IQ Band</th>
                      <th className="text-left py-2 pr-4">English</th>
                      <th className="text-left py-2 pr-4">English Level</th>
                      <th className="text-left py-2 pr-4">Recommendation</th>
                      <th className="text-left py-2 pr-4">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.slice(0, 200).map(c => (
                      <tr key={c.email} className="border-b border-white/5">
                        <td className="py-2 pr-4">{c.email}</td>
                        <td className="py-2 pr-4">{c.iqScore ?? '—'}{typeof c.iqPercentile === 'number' ? <span className="text-xs text-muted"> ({c.iqPercentile}p)</span> : null}</td>
                        <td className="py-2 pr-4">{c.iqBand}</td>
                        <td className="py-2 pr-4">{c.englishScore ?? '—'}</td>
                        <td className="py-2 pr-4">{c.englishLevel}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                            {c.recommend}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted">{c.lastSubmittedAt ? new Date(c.lastSubmittedAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-xs text-muted">
                If you need funnel metrics (Registered → Completed), connect Netlify Identity user list or capture registration events to Supabase.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
