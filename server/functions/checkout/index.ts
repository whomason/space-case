// Space Crates: start a Stripe Checkout for a signed-in player.
// Deploy as the Edge Function "checkout". Needs the secret STRIPE_SECRET_KEY (Stripe dashboard -> Developers -> API keys).
// Optional secret SITE_URL (defaults to the GitHub Pages site).
// The game calls it with the player's session token; prices live here and in the database, never in the game.
const PRODUCTS: Record<string, { name: string; cents: number }> = {
  sd_180: { name: '180 Stardust', cents: 199 },
  sd_500: { name: '500 Stardust', cents: 499 },
  sd_1100: { name: '1,100 Stardust', cents: 999 },
  sd_2400: { name: '2,400 Stardust', cents: 1999 },
  pass_frostfall: { name: 'FROSTFALL Season Pass', cents: 499 },
  supporter: { name: 'Supporter Nameplate', cents: 499 },
};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ message: 'POST ONLY' }, 405);
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return json({ message: 'PAYMENTS ARE NOT SET UP YET' }, 503);
  // who is buying: check the session token with Supabase Auth
  const auth = req.headers.get('Authorization') || '';
  const u = await fetch(Deno.env.get('SUPABASE_URL') + '/auth/v1/user', { headers: { Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY') || req.headers.get('apikey') || '' } });
  if (!u.ok) return json({ message: 'SIGN IN FIRST' }, 401);
  const user = await u.json();
  let body: { product?: string } = {};
  try { body = await req.json(); } catch (_) { /* empty */ }
  const p = body.product && PRODUCTS[body.product];
  if (!p) return json({ message: 'UNKNOWN PRODUCT' }, 400);
  const site = Deno.env.get('SITE_URL') || 'https://whomason.github.io/space-case/';
  const f = new URLSearchParams();
  f.set('mode', 'payment');
  f.set('line_items[0][quantity]', '1');
  f.set('line_items[0][price_data][currency]', 'usd');
  f.set('line_items[0][price_data][unit_amount]', String(p.cents));
  f.set('line_items[0][price_data][product_data][name]', p.name);
  f.set('client_reference_id', user.id);
  f.set('metadata[user]', user.id);
  f.set('metadata[product]', body.product!);
  f.set('success_url', site + '?paid=1');
  f.set('cancel_url', site + '?paid=0');
  if (user.email) f.set('customer_email', user.email);
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' }, body: f });
  const s = await r.json();
  if (!r.ok) return json({ message: 'STRIPE SAID NO: ' + ((s.error && s.error.message) || r.status) }, 502);
  return json({ url: s.url, id: s.id });
});
