import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import bank from '../data/questionBank.json';
import { Figure } from './Figures';
import { TEST_SPECS, TestKey, Question, pickN, formatDuration, scoreSimple } from '../lib';
import { currentUser } from '../identity';

type Bank = typeof bank;

function getQuestions(key: TestKey): Question[] {
  const list = (bank as unknown as Bank)[key] as Question[];
  const spec = TEST_SPECS[key];
  return pickN(list, spec.itemCount);
}

export default function TestRunner() {
  const params = useParams();
  const testKey = (params.testKey ?? 'iq') as TestKey;
  const spec = TEST_SPECS[testKey];

  const questions = useMemo(() => getQuestions(testKey), [testKey]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);

  const totalSeconds = spec.durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  const timerRef = useRef<number | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [testKey]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      submit(true).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const q = questions[idx];

  function choose(a: number) {
    setAnswers(prev => ({ ...prev, [q.id]: a }));
  }

  function next() {
    setIdx(i => Math.min(questions.length - 1, i + 1));
  }
  function prev() {
    setIdx(i => Math.max(0, i - 1));
  }

  async function submit(auto = false) {
    if (timerRef.current) window.clearInterval(timerRef.current);

    const user = currentUser();
    const email = user?.email ?? 'unknown';
    const scored = scoreSimple(questions, answers);
    const percent = Math.round((scored.correct / scored.total) * 100);

    const payload = {
      testKey,
      candidateEmail: email,
      submittedAtISO: new Date().toISOString(),
      durationMinutes: spec.durationMinutes,
      timeRemainingSeconds: secondsLeft,
      answers,
      score: { ...scored, percent },
      autoSubmitted: auto,
      // do not send full explanations to backend by default; admin can enable if desired
      items: questions.map(({ id, type, prompt, choices, answerIndex }) => ({ id, type, prompt, choices, answerIndex })),
    };

    const r = await fetch('/.netlify/functions/submitResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const msg = await r.text();
      alert(`Submission failed. Please contact MA Center.\n\n${msg}`);
      return;
    }

    sessionStorage.setItem(`lastResult:${testKey}`, JSON.stringify(payload));
    nav(`/results/${testKey}`);
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted">{spec.title}</div>
          <div className="text-xl font-semibold mt-1">Item {idx + 1} / {questions.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-panel/60 px-4 py-2 shadow-glow">
          <div className="text-xs text-muted">Time left</div>
          <div className="font-mono text-neon">{formatDuration(secondsLeft)}</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-panel/60 p-6 shadow-glow">
        <div className="text-sm text-muted">{q.type.replaceAll('_',' ').toUpperCase()}</div>
        <div className="mt-2 text-lg leading-snug">{q.prompt}</div>
        <Figure code={q.figure} />

        <div className="mt-5 grid gap-3">
          {q.choices.map((c, i) => {
            const selected = answers[q.id] === i;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                className={[
                  "text-left rounded-xl border px-4 py-3 transition",
                  selected ? "border-neon bg-neon/10" : "border-white/10 hover:bg-white/5"
                ].join(' ')}
              >
                <div className="flex gap-3">
                  <div className={`h-6 w-6 rounded-full grid place-items-center text-xs ${selected ? 'bg-neon text-ink' : 'bg-white/10 text-white/80'}`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <div className="flex-1">{c}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">Answered: {answeredCount} / {questions.length}</div>
          <div className="flex gap-3">
            <button onClick={prev} className="rounded-xl border border-white/15 px-4 py-2 hover:bg-white/5">Previous</button>
            {idx < questions.length - 1 ? (
              <button onClick={next} className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15">Next</button>
            ) : (
              <button onClick={() => submit(false)} className="rounded-xl bg-neon text-ink px-4 py-2 font-semibold hover:opacity-90">
                Submit
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-muted">
          If your time runs out, the system will auto-submit. Do not refresh the page during the test.
        </div>
      </div>
    </div>
  );
}
