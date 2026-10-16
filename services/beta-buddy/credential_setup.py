"""One-use loopback credential handoff. User enters and submits; no email/chat.
No plaintext credential file, request log, third-party script, or external call.
"""
import argparse,hashlib,hmac,html,pathlib,re,secrets,threading,time
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import parse_qs
from operator_secrets import save_secret
def serve(destination,port=3329):
    origin='http://127.0.0.1:'+str(port);nonce=secrets.token_urlsafe(32);expires=time.monotonic()+900;saved=[False]
    class Setup(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def reply(self,code,body,cookie=False):
            raw=body.encode();self.send_response(code);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','same-origin');self.send_header('Content-Length',str(len(raw)))
            if cookie:self.send_header('Set-Cookie','buddy_setup='+nonce+'; HttpOnly; SameSite=Strict; Path=/')
            self.end_headers();self.wfile.write(raw)
        def do_GET(self):
            if self.headers.get('Host')!='127.0.0.1:'+str(port) or self.path not in ('/setup','/saved'):self.reply(404,'Not found');return
            if saved[0]:self.reply(200,'<h1>Saved securely</h1><p>The beta-only GitHub token is stored with Windows user protection. You can close this page and return to Codex.</p>');return
            if time.monotonic()>expires:self.reply(410,'Setup expired. Return to Codex.');return
            self.reply(200,'<!doctype html><title>Save beta-only GitHub token</title><main style="font:18px system-ui;max-width:680px;margin:50px auto;padding:20px"><h1>Save your beta-only token</h1><p>On the GitHub result page, click its copy button. Return here, paste below, then click Save securely.</p><p>This form stays on this computer. The value is stored with Windows user protection and is not sent to chat or the coding model.</p><form action="/setup" method="post" autocomplete="off"><input type="hidden" name="csrf" value="'+html.escape(nonce)+'"><label>GitHub token <input style="display:block;width:100%;padding:12px;margin:12px 0" name="credential" type="password" autocomplete="off" required maxlength="500"></label><button style="padding:12px 20px" type="submit">Save securely</button></form></main>',True)
        def do_POST(self):
            cookie=self.headers.get('Cookie','')
            checks={'already_saved':not saved[0],'expired':time.monotonic()<=expires,'path':self.path=='/setup','host':self.headers.get('Host')=='127.0.0.1:'+str(port),
                    'origin':self.headers.get('Origin')==origin,'cookie':'buddy_setup='+nonce in cookie,'content_type':self.headers.get('Content-Type')=='application/x-www-form-urlencoded'}
            if not all(checks.values()):
                print('Local entry validation rejected: '+next(key for key,value in checks.items() if not value),flush=True)
                self.reply(403,'Setup not authorized. Return to Codex; no credential was stored.');return
            try:size=int(self.headers.get('Content-Length','0'))
            except ValueError:self.reply(400,'Invalid entry');return
            if not 0<size<2000:self.reply(413,'Invalid entry');return
            try:values=parse_qs(self.rfile.read(size).decode(),strict_parsing=True)
            except (ValueError,UnicodeError):self.reply(400,'Invalid entry');return
            if set(values)!={'csrf','credential'} or any(len(x)!=1 for x in values.values()) or not hmac.compare_digest(values['csrf'][0],nonce):self.reply(403,'Setup not authorized');return
            token=values['credential'][0].strip()
            if not re.fullmatch(r'github_pat_[A-Za-z0-9_]{30,490}',token):self.reply(400,'This does not look like a fine-grained GitHub token. Return to the GitHub result page and copy it again.');return
            save_secret(destination,token);saved[0]=True
            print('Scoped GitHub credential saved in Windows-protected operator store.',flush=True)
            self.send_response(303);self.send_header('Location','/saved');self.send_header('Cache-Control','no-store');self.end_headers()
    class Server(ThreadingHTTPServer):
        daemon_threads=True
        def get_request(self):
            connection,address=super().get_request();connection.settimeout(10);return connection,address
    # Browsers preconnect idle sockets. One idle socket must not block the form.
    server=Server(('127.0.0.1',port),Setup)
    print('Private credential entry ready at '+origin+'/setup',flush=True)
    server.serve_forever()
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--destination',required=True);args=parser.parse_args()
    destination=pathlib.Path(args.destination).resolve()
    if destination.parent.name!='beta-buddy-operator' or not destination.parent.is_dir():raise ValueError('Existing private operator directory required')
    serve(destination)
