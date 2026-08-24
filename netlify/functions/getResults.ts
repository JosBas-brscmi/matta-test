// netlify/functions/getResults.ts
import type { Handler } from '@netlify/functions';

function isAdmin(event: any): boolean {
  // Option A: allow any logged-in user
  // Option B: restrict by email domain / allowlist
  const allowlist = (process.env.ADMIN_ALLOWLIST_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);

  // When Netlify Identity is enabled, user info may be available in context.
  const user = event?.context?.clientContext?.user;
  const email = user?.email;

  if (allowlist.length > 0) return !!email && allowlist.includes(email);
  return !!user; // default: any authenticated user
}

export const handler: Handler = async (event) => {
  try {
    if (!isAdmin(event)) return { statusCode: 401, body: 'Unauthorized. Configure ADMIN_ALLOWLIST_EMAILS to restrict access.' };

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { statusCode: 500, body: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };

    const r = await fetch(`${url}/rest/v1/matta_results?select=id,test_key,candidate_email,submitted_at,score_percent&order=submitted_at.desc&limit=200`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (!r.ok) {
      const t = await r.text();
      return { statusCode: 500, body: `Supabase query error: ${r.status} ${t}` };
    }

    const rows = await r.json();
    return { statusCode: 200, body: JSON.stringify({ rows }), headers: { 'Content-Type': 'application/json' } };
  } catch (e: any) {
    return { statusCode: 500, body: String(e?.message ?? e) };
  }
};
