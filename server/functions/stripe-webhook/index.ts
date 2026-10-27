// Space Crates: Stripe tells us a payment went through, and we give the player what they paid for.
// Deploy as the Edge Function "stripe-webhook" with "Verify JWT" turned OFF (Stripe has no Supabase token).
// Needs the secret STRIPE_WEBHOOK_SECRET (Stripe dashboard -> Developers -> Webhooks -> your endpoint -> Signing secret).
// Listens for checkout.session.completed (grant) and charge.refunded (take it back).
const enc = new TextEncoder();
async function hmacHex(secret: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function verify(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((x) => x.split('=') as [string, string]).filter((x) => x.length === 2));
  const t = Number(parts.t); if (!t || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const want = await hmacHex(secret, `${t}.${payload}`);
  return header.split(',').some((x) => x.startsWith('v1=') && same(x.slice(3), want));
}
function serviceKey() {
  const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (k) return k;
  try { const all = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return all.default || Object.values(all)[0] as string; } catch (_) { return ''; }
}
async function rpc(fn: string, args: Record<string, unknown>) {
  const key = serviceKey();
  const r = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const t = await r.text(); if (!r.ok) throw new Error(fn + ' failed: ' + t); return t;
}
Deno.serve(async (req) => {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('not set up', { status: 503 });
  const payload = await req.text();
  if (!(await verify(payload, req.headers.get('stripe-signature') || '', secret))) return new Response('bad signature', { status: 400 });
  const ev = JSON.parse(payload);
  try {
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
      const s = ev.data.object;
      if (s.payment_status !== 'paid') return new Response('not paid yet', { status: 200 });
      const out = await rpc('grant_purchase', { p_session: s.id, p_user: s.metadata?.user || s.client_reference_id, p_product: s.metadata?.product, p_cents: s.amount_total || 0 });
      return new Response(out, { status: 200 });
    }
    if (ev.type === 'charge.refunded') {
      // find the checkout session for this payment and take the purchase back
      const pi = ev.data.object.payment_intent;
      const key = Deno.env.get('STRIPE_SECRET_KEY');
      if (pi && key) {
        const r = await fetch('https://api.stripe.com/v1/checkout/sessions?payment_intent=' + pi, { headers: { Authorization: 'Bearer ' + key } });
        const j = await r.json();
        for (const s of j.data || []) await rpc('refund_purchase', { p_session: s.id });
      }
      return new Response('ok', { status: 200 });
    }
  } catch (e) { return new Response(String(e), { status: 500 }); }
  return new Response('ignored', { status: 200 });
});
