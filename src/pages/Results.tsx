import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TestKey, TEST_SPECS } from '../lib';
import jsPDF from 'jspdf';

function readLast(testKey: string) {
  const raw = sessionStorage.getItem(`lastResult:${testKey}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export default function Results() {
  const params = useParams();
  const testKey = (params.testKey ?? 'iq') as TestKey;
  const spec = TEST_SPECS[testKey];
  const nav = useNavigate();

  const data = useMemo(() => readLast(testKey), [testKey]);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-panel/60 p-6">
          <div className="text-lg font-semibold">No local result found</div>
          <div className="text-sm text-muted mt-2">Please re-take the test or contact MA Center.</div>
          <button onClick={() => nav('/portal')} className="mt-5 rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15">Back to Portal</button>
        </div>
      </div>
    );
  }

  const percent = data.score?.percent ?? 0;

  function downloadPDF() {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.text('BROWAVE MATTA CENTER', 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`Assessment: ${spec.title}`, 14, 28);
    doc.text(`Candidate: ${data.candidateEmail}`, 14, 36);
    doc.text(`Submitted: ${new Date(data.submittedAtISO).toLocaleString()}`, 14, 44);
    doc.text(`Score: ${data.score.correct}/${data.score.total} (${percent}%)`, 14, 52);
    doc.text('Notes:', 14, 64);
    doc.setTextColor(120);
    doc.text('This report is for recruitment screening and internal review only.', 14, 72);
    doc.setTextColor(0);

    doc.save(`BROWAVE_MATTA_${testKey}_Result.pdf`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border border-white/10 bg-panel/60 p-6 shadow-glow">
        <div className="text-sm text-muted">{spec.title}</div>
        <div className="mt-1 text-2xl font-semibold">Result: {percent}%</div>
        <div className="mt-3 text-sm text-muted">
          A copy of your submission has been sent to MA Center for review.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-muted">Correct</div>
            <div className="text-xl font-semibold">{data.score.correct}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-muted">Total (scored items)</div>
            <div className="text-xl font-semibold">{data.score.total}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={downloadPDF} className="rounded-xl bg-neon text-ink px-4 py-2 font-semibold hover:opacity-90">
            Download PDF report
          </button>
          <a href="/portal" className="rounded-xl border border-white/15 px-4 py-2 hover:bg-white/5">
            Back to Portal
          </a>
        </div>

        <div className="mt-6 text-xs text-muted">
          If you believe there was an error, email MA Center with your candidate email and submission time.
        </div>
      </div>
    </div>
  );
}
