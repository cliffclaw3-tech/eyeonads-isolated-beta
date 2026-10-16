import test from 'node:test';
import assert from 'node:assert/strict';
import {buddyEnabled,sanitizeBuddyReport,readBuddyBody} from '../src/lib/beta-buddy.ts';
const beta={BETA_BUDDY_ENV:'beta',VERCEL_ENV:'preview',BETA_BUDDY_ISOLATED_DATA:'1',BETA_BUDDY_APP_ORIGIN:'https://eyeonads-beta.example.invalid',NEXT_PUBLIC_SUPABASE_URL:'https://isolated.supabase.co',BETA_BUDDY_SERVICE_URL:'https://buddy.example.invalid',BETA_BUDDY_PRODUCT_SECRET:'fixture'};
test('production environment, production hosts and production database each independently deny Buddy',()=>{
  assert.equal(buddyEnabled(beta),true);
  for(const change of [{VERCEL_ENV:'production'},{BETA_BUDDY_APP_ORIGIN:'https://eyeonads.com'},{NEXT_PUBLIC_SUPABASE_URL:'https://vcdvqhchjxqnuuruobqg.supabase.co/'},{BETA_BUDDY_ISOLATED_DATA:'0'},{BETA_BUDDY_PRODUCT_SECRET:''}])assert.equal(buddyEnabled({...beta,...change}),false);
});
test('stream size is bounded even without a content-length header',async()=>{
  assert.equal(await readBuddyBody(new Request('https://beta.invalid',{method:'POST',body:'hello'})),'hello');
  await assert.rejects(()=>readBuddyBody(new Request('https://beta.invalid',{method:'POST',body:'x'.repeat(12001)})));
});
test('reports drop arbitrary tenant, commands, bodies and redact credentials and contact data',()=>{
  const r=sanitizeBuddyReport({kind:'bug',description:'Cannot save. password=secret sk-private123 user@example.com https://example.com?token=secret',consent:true,page:'/broker?token=secret',tenant:'other',command:'delete all',diagnostics:[{code:'http_error',status:403,body:'contract',stack:'secret'}]});
  assert.equal(r.page,'/other');assert.equal('tenant' in r,false);assert.equal('command' in r,false);assert.equal(JSON.stringify(r).includes('secret'),false);assert.deepEqual(r.diagnostics,[{code:'http_error',status:403}]);
  assert.throws(()=>sanitizeBuddyReport({kind:'bug',description:'Cannot save brokerage',consent:false}));
});
