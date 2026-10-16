import { createHash, createHmac, randomUUID } from 'node:crypto';

export function buddyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.BETA_BUDDY_ENV !== 'beta' || env.VERCEL_ENV === 'production' || env.BETA_BUDDY_ISOLATED_DATA !== '1') return false;
  try {
    const origin = new URL(env.BETA_BUDDY_APP_ORIGIN || '');
    const database=new URL(env.NEXT_PUBLIC_SUPABASE_URL || '');
    return origin.protocol === 'https:' && !origin.username && !origin.password && !origin.search && !origin.hash && ['','/'].includes(origin.pathname) && !['eyeonads.com','www.eyeonads.com','trueclose.homes','www.trueclose.homes'].includes(origin.hostname)
      && database.protocol==='https:' && database.hostname !== 'vcdvqhchjxqnuuruobqg.supabase.co'
      && !!env.BETA_BUDDY_SERVICE_URL && !!env.BETA_BUDDY_PRODUCT_SECRET;
  } catch { return false; }
}

export async function readBuddyBody(request:Request):Promise<string> {
  if(Number(request.headers.get('content-length'))>12000)throw Error('Too large');
  if(!request.body)return '';
  const reader=request.body.getReader(), chunks:Uint8Array[]=[];let bytes=0;
  try {while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;if(bytes>12000){await reader.cancel();throw Error('Too large');}chunks.push(item.value);}}
  finally {reader.releaseLock();}
  return Buffer.concat(chunks).toString('utf8');
}

// Send only explicit reports and bounded diagnostics, never DOM, form contents,
// cookies, storage, request/response bodies, stacks or screenshots.
export function sanitizeBuddyReport(value: unknown) {
  if (!value || typeof value !== 'object') throw Error('Describe the problem first.');
  const v = value as Record<string, unknown>;
  if (v.consent !== true || !['bug','feature','correction'].includes(String(v.kind))) throw Error('Choose a report type and allow the report to be sent.');
  const description = redactBuddyText(String(v.description || '')).trim();
  if (description.length < 10 || description.length > 2000) throw Error('Use between 10 and 2,000 characters.');
  const page = ['/broker','/broker/discovery','/broker/report','/dashboard','/dashboard/compliance','/signup','/login'].includes(String(v.page)) ? String(v.page) : '/other';
  const diagnostics = Array.isArray(v.diagnostics) ? v.diagnostics.slice(-10).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').map(x => ({
    code: ['network','http_error','client_error'].includes(String(x.code)) ? String(x.code) : 'client_error',
    status: Number.isInteger(x.status) && Number(x.status) >= 400 && Number(x.status) <= 599 ? Number(x.status) : null,
  })) : [];
  return { kind: v.kind, description, page, diagnostics, consent: true };
}

export function redactBuddyText(text: string): string {
  return text.replace(/\bBearer\s+\S+/gi,'[credential removed]')
    .replace(/\b(?:sk[-_]|sb_secret_)[A-Za-z0-9_-]+/g,'[credential removed]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[credential removed]')
    .replace(/(?:password|token|api[_ -]?key|secret)\s*[:=]\s*\S+/gi,'[credential removed]')
    .replace(/https?:\/\/\S+/gi,'[link removed]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[email removed]')
    .replace(/\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b/g,'[phone removed]');
}

export async function buddyRequest(method: 'GET'|'POST', path: '/v1/reports'|'/v1/notifications', user: string, value?: unknown) {
  const base = new URL(process.env.BETA_BUDDY_SERVICE_URL!);
  if (base.protocol !== 'https:' && !(['localhost','127.0.0.1'].includes(base.hostname) && process.env.NODE_ENV !== 'production')) throw Error('Beta support is not configured.');
  if (base.username || base.password || base.search || base.hash) throw Error('Beta support is not configured.');
  const body = method === 'POST' ? JSON.stringify(value) : '';
  const time = String(Math.floor(Date.now()/1000)), nonce = randomUUID();
  const product = 'eyeonads', tenant = user; // Current EyeOnAds data is account-owner scoped.
  const canonical = [method,path,product,tenant,user,time,nonce,createHash('sha256').update(body).digest('hex')].join('\n');
  const response = await fetch(new URL(path,base), { method, cache:'no-store', redirect:'error', signal:AbortSignal.timeout(10000),
    headers:{'Content-Type':'application/json','X-Buddy-Product':product,'X-Buddy-Tenant':tenant,'X-Buddy-User':user,'X-Buddy-Time':time,'X-Buddy-Nonce':nonce,
      'X-Buddy-Signature':createHmac('sha256',process.env.BETA_BUDDY_PRODUCT_SECRET!).update(canonical).digest('hex')},
    ...(method === 'POST' ? {body} : {}) });
  if (!response.ok) throw Error(response.status === 429 ? 'Please wait before sending another report.' : 'Beta support could not save this report. Your message is still here; retry shortly.');
  const result = await response.json();
  return result;
}
