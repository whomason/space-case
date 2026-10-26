// ===== RT: live rooms for arenas and duels =====
// On the website: Supabase Realtime (broadcast + presence), loaded only when a live match starts.
// In local tests (?api=localhost): a BroadcastChannel between browser tabs, same shape.
const RT = { client: null, loading: null };
const RT_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
function rtLoadLib() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
  if (RT.loading) return RT.loading;
  RT.loading = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = RT_LIB; s.async = true;
    s.onload = () => (window.supabase && window.supabase.createClient) ? res(window.supabase) : rej(new Error('LIVE PLAY DID NOT LOAD'));
    s.onerror = () => { RT.loading = null; rej(new Error("COULD NOT LOAD LIVE PLAY. CHECK YOUR INTERNET")); };
    document.head.appendChild(s);
  });
  return RT.loading;
}
// on: { msg(event, data, fromId), peers([{ id, cs, j }]) } — peers always includes yourself
async function rtJoin(topic, me, on) {
  if (NET.url !== NET_URL) return rtJoinLocal(topic, me, on);
  const lib = await rtLoadLib();
  if (!RT.client) RT.client = lib.createClient(NET_URL, NET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try { await RT.client.realtime.setAuth(await netToken()); } catch (e) { }
  const ch = RT.client.channel('sc-' + topic, { config: { broadcast: { self: false, ack: false }, presence: { key: me.id } } });
  ch.on('broadcast', { event: 'm' }, msg => { const p = msg && msg.payload; if (p && p.f !== me.id) on.msg(p.e, p.d, p.f); });
  ch.on('presence', { event: 'sync' }, () => {
    const st = ch.presenceState(); const list = [];
    for (const k in st) { const m = (st[k] && st[k][0]) || {}; list.push({ id: k, cs: m.cs || '?', j: m.j || 0 }); }
    if (!list.some(p => p.id === me.id)) list.push({ id: me.id, cs: me.cs, j: me.j });
    on.peers(list);
  });
  return new Promise((res, rej) => {
    let settled = false;
    const to = setTimeout(() => { if (!settled) { settled = true; try { RT.client.removeChannel(ch); } catch (e) { } rej(new Error('LIVE CONNECTION TIMED OUT')); } }, 12000);
    ch.subscribe(async status => {
      if (status === 'SUBSCRIBED' && !settled) {
        settled = true; clearTimeout(to);
        try { await ch.track({ cs: me.cs, j: me.j }); } catch (e) { }
        res({ live: true, send(e, d) { try { ch.send({ type: 'broadcast', event: 'm', payload: { e, d, f: me.id } }); } catch (er) { } }, leave() { try { ch.untrack(); RT.client.removeChannel(ch); } catch (er) { } } });
      } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !settled) { settled = true; clearTimeout(to); rej(new Error('LIVE CONNECTION FAILED')); }
    });
  });
}
function rtJoinLocal(topic, me, on) {
  const bc = new BroadcastChannel('sc-' + topic); const peers = new Map();
  const emit = () => on.peers([{ id: me.id, cs: me.cs, j: me.j }].concat([...peers.values()].map(p => ({ id: p.id, cs: p.cs, j: p.j }))));
  const hello = ask => bc.postMessage({ k: 'p', f: me.id, cs: me.cs, j: me.j, ask });
  bc.onmessage = ev => {
    const m = ev.data; if (!m || m.f === me.id) return;
    if (m.k === 'bye') { if (peers.delete(m.f)) emit(); return; }
    const old = peers.get(m.f);
    peers.set(m.f, { id: m.f, cs: m.cs || (old && old.cs) || '?', j: m.j !== undefined ? m.j : (old ? old.j : 0), t: performance.now() });
    if (!old || (m.k === 'p' && (old.cs !== m.cs))) emit();
    if (m.k === 'p' && m.ask) hello(false);
    if (m.k === 'm') on.msg(m.e, m.d, m.f);
  };
  const iv = setInterval(() => { hello(false); const now = performance.now(); let ch = false; for (const [k, p] of peers) if (now - p.t > 4500) { peers.delete(k); ch = true; } if (ch) emit(); }, 1000);
  hello(true); emit();
  return Promise.resolve({ live: false, send(e, d) { bc.postMessage({ k: 'm', e, d, f: me.id, cs: me.cs, j: me.j }); }, leave() { clearInterval(iv); try { bc.postMessage({ k: 'bye', f: me.id }); bc.close(); } catch (e) { } } });
}
