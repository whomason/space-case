"""A tiny stand-in for Supabase, for testing the game locally: email/password auth, the REST
RPC endpoint (runs the real schema.sql functions in a local Postgres as the signed-in player,
with the same roles and row rules), and it serves the game page too."""
import json, os, uuid, threading, re
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import psycopg2, psycopg2.extras

DSN = dict(host='localhost', user='postgres', password='pg')
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, '..', 'index.html')

def setup_db(name='sc_e2e'):
    adm = psycopg2.connect(dbname='postgres', **DSN); adm.autocommit = True
    adm.cursor().execute(f'drop database if exists {name}'); adm.cursor().execute(f'create database {name}')
    db = psycopg2.connect(dbname=name, **DSN); db.autocommit = True; c = db.cursor()
    c.execute("""
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    end $$;
    create schema auth; create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    """)
    c.execute(open(os.path.join(HERE, 'schema.sql')).read())
    return name

class Mock:
    def __init__(self, dbname):
        self.dbname = dbname; self.users = {}; self.tokens = {}; self.refresh = {}; self.lock = threading.Lock(); self.calls = []
    def session(self, uid, email):
        at, rt = 'tok-' + uuid.uuid4().hex, 'ref-' + uuid.uuid4().hex
        self.tokens[at] = uid; self.refresh[rt] = (uid, email)
        return {'access_token': at, 'token_type': 'bearer', 'expires_in': 3600, 'refresh_token': rt, 'user': {'id': uid, 'email': email}}
    def conn(self): return psycopg2.connect(dbname=self.dbname, **DSN)

def make_handler(M):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass
        def send(self, code, obj=None, raw=None, ctype='application/json'):
            body = raw if raw is not None else (b'' if obj is None and code == 204 else json.dumps(obj).encode())
            self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
        def do_GET(self):
            p = urlparse(self.path).path
            if p in ('/', '/index.html', '/space-case.html'): return self.send(200, raw=open(GAME, 'rb').read(), ctype='text/html; charset=utf-8')
            self.send(404, {'message': 'not found'})
        def do_POST(self):
            u = urlparse(self.path); n = int(self.headers.get('Content-Length') or 0); body = json.loads(self.rfile.read(n) or b'{}')
            if self.headers.get('apikey') is None: return self.send(401, {'message': 'No API key found in request'})
            if u.path == '/auth/v1/signup':
                em = body.get('email', '').lower()
                if em in M.users: return self.send(422, {'code': 422, 'error_code': 'user_already_exists', 'msg': 'User already registered'})
                if len(body.get('password', '')) < 6: return self.send(422, {'code': 422, 'error_code': 'weak_password', 'msg': 'Password should be at least 6 characters.'})
                uid = str(uuid.uuid4()); M.users[em] = (uid, body['password'])
                with M.conn() as cn: cn.cursor().execute('insert into auth.users values (%s, %s)', (uid, em))
                return self.send(200, M.session(uid, em))
            if u.path == '/auth/v1/token':
                g = parse_qs(u.query).get('grant_type', [''])[0]
                if g == 'password':
                    em = body.get('email', '').lower(); rec = M.users.get(em)
                    if not rec or rec[1] != body.get('password'): return self.send(400, {'code': 400, 'error_code': 'invalid_credentials', 'msg': 'Invalid login credentials'})
                    return self.send(200, M.session(rec[0], em))
                if g == 'refresh_token':
                    rec = M.refresh.pop(body.get('refresh_token'), None)
                    if not rec: return self.send(400, {'code': 400, 'error_code': 'refresh_token_not_found', 'msg': 'Invalid Refresh Token: Refresh Token Not Found'})
                    return self.send(200, M.session(*rec))
            if u.path == '/auth/v1/logout': return self.send(204)
            m = re.match(r'^/rest/v1/rpc/(\w+)$', u.path)
            if m:
                fn = m.group(1); auth = (self.headers.get('Authorization') or '').replace('Bearer ', '')
                uid = M.tokens.get(auth)
                with M.lock: M.calls.append(fn)
                cn = M.conn()
                try:
                    c = cn.cursor()
                    c.execute("select p.proargnames, array(select format_type(t, null) from unnest(p.proargtypes) t) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = %s", (fn,))
                    row = c.fetchone()
                    if not row: return self.send(404, {'code': 'PGRST202', 'message': f'Could not find the function public.{fn}'})
                    names, types = row[0] or [], row[1] or []
                    parts, vals = [], []
                    for nm, ty in zip(names, types):
                        if nm in body:
                            v = body[nm]
                            if ty == 'jsonb': v = json.dumps(v)
                            parts.append(f'{nm} => %s::{ty}'); vals.append(v)
                    c.execute('set local role ' + ('authenticated' if uid else 'anon'))
                    c.execute("select set_config('request.jwt.claim.sub', %s, true)", (uid or '',))
                    c.execute(f'select public.{fn}({", ".join(parts)})', vals)
                    res = c.fetchone()[0]; cn.commit()
                    return self.send(200, res)
                except psycopg2.Error as e:
                    cn.rollback()
                    return self.send(400 if e.pgcode != '42501' else 401 if not uid else 403, {'code': e.pgcode, 'message': (e.diag.message_primary or str(e)), 'details': None, 'hint': None})
                finally: cn.close()
            self.send(404, {'message': 'not found'})
    return H

def start(port=8123):
    name = setup_db(); M = Mock(name)
    srv = ThreadingHTTPServer(('127.0.0.1', port), make_handler(M))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, M

if __name__ == '__main__':
    srv, M = start(); print('mock supabase on http://localhost:8123'); threading.Event().wait()
