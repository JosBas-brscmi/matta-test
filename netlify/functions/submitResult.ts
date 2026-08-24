// netlify/functions/submitResult.ts
import type { Handler } from '@netlify/functions';

type Payload = any;

async function sendEmail(payload: Payload) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const to = process.env.MA_CENTER_EMAIL;
  const from = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !to || !from) return { skipped: true };

  const summary = {
    testKey: payload.testKey,
    candidateEmail: payload.candidateEmail,
    submittedAtISO: payload.submittedAtISO,
    score: payload.score,
    autoSubmitted: payload.autoSubmitted,
  };

  const bodyText =
`BROWAVE MATTA CENTER - New submission

Candidate: ${summary.candidateEmail}
Test: ${summary.testKey}
Submitted: ${summary.submittedAtISO}
Score: ${summary.score.correct}/${summary.score.total} (${summary.score.percent}%)
Auto-submitted: ${summary.autoSubmitted ? 'YES' : 'NO'}

This email is generated automatically.`;

  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }], subject: `MATTA Result: ${summary.testKey} (${summary.score.percent}%) - ${summary.candidateEmail}` }],
      from: { email: from, name: 'BROWAVE MATTA CENTER' },
      content: [{ type: 'text/plain', value: bodyText }],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`SendGrid error: ${r.status} ${t}`);
  }

  return { skipped: false };
}

async function insertSupabase(payload: Payload) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return { skipped: true };

  const r = await fetch(`${url}/rest/v1/matta_results`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify([{
      test_key: payload.testKey,
      candidate_email: payload.candidateEmail,
      submitted_at: payload.submittedAtISO,
      score_percent: payload.score?.percent ?? null,
      score_correct: payload.score?.correct ?? null,
      score_total: payload.score?.total ?? null,
      payload_json: payload,
    }]),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase insert error: ${r.status} ${t}`);
  }
  const rows = await r.json();
  return { skipped: false, rows };
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const payload = JSON.parse(event.body || '{}');

    // basic validation
    if (!payload.testKey || !payload.candidateEmail || !payload.submittedAtISO) {
      return { statusCode: 400, body: 'Missing required fields.' };
    }

    await sendEmail(payload);
    await insertSupabase(payload);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (e: any) {
    return { statusCode: 500, body: String(e?.message ?? e) };
  }
};
