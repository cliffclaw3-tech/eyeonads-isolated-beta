import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUsePublicSearch } from '../src/lib/public-search-access.ts';
const beta = { VERCEL_ENV:'preview', BETA_BUDDY_ENV:'beta', BETA_BUDDY_ISOLATED_DATA:'1', NEXT_PUBLIC_SUPABASE_URL:'https://whmxiocdtulylddebjpm.supabase.co', BETA_BUDDY_APP_ORIGIN:'https://eyeonads-isolated-beta.vercel.app' };
const fresh = { id:'new-broker', app_metadata:{} };
test('fresh broker can use the specifically isolated beta without a hidden invite', () => {
  assert.equal(canUsePublicSearch(fresh,beta),true);
  assert.equal(canUsePublicSearch({id:'',app_metadata:{}},beta),false);
});
test('self-service does not grant access in production or another database or host', () => {
  for (const changed of [{VERCEL_ENV:'production'},{BETA_BUDDY_ISOLATED_DATA:'0'},{NEXT_PUBLIC_SUPABASE_URL:'https://vcdvqhchjxqnuuruobqg.supabase.co'},{BETA_BUDDY_APP_ORIGIN:'https://eyeonads.com'},{BETA_BUDDY_ENV:'production'}]) {
    assert.equal(canUsePublicSearch(fresh,{...beta,...changed}),false);
  }
  assert.equal(canUsePublicSearch(fresh,{}),false);
});
test('existing explicitly invited pilots retain their access', () => {
  assert.equal(canUsePublicSearch({id:'existing',app_metadata:{eyeonads_pilot:true}},{}),true);
  assert.equal(canUsePublicSearch({id:'not-invited',app_metadata:{eyeonads_pilot:'true'}},{}),false);
});
