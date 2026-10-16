import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function handler(fails=false) {
  let calls=0;
  const exports={};
  const js=ts.transpileModule(fs.readFileSync('src/app/auth/confirm/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js,{exports,URL,require:name=>name==='next/server'?{NextResponse:{redirect:(url,options)=>({url:String(url),options})}}:{createClient:async()=>({auth:{verifyOtp:async value=>{calls++;assert.equal(value.type,'email');return {error:fails?Error('rejected'):null};}}})}});
  return {run:exports.GET,calls:()=>calls};
}
test('email confirmation works without a signup-browser PKCE verifier and ignores external next URLs',async()=>{
  const h=handler(); const r=await h.run({url:'https://example.test/auth/confirm?token_hash='+ 'a'.repeat(64)+'&type=email&next=https://attacker.example'});
  assert.equal(r.url,'https://example.test/dashboard');assert.equal(h.calls(),1);
  assert.equal(r.options.headers['Referrer-Policy'],'no-referrer');
});
test('invalid, recovery and expired tokens cannot create a dashboard session or echo the token',async()=>{
  for(const query of ['type=email','token_hash=short&type=email','token_hash='+ 'a'.repeat(64)+'&type=recovery']){
    const h=handler();const r=await h.run({url:'https://example.test/auth/confirm?'+query});assert.match(r.url,/\/login\?/);assert.equal(h.calls(),0);assert.equal(r.url.includes('token_hash'),false);
  }
  const h=handler(true);const r=await h.run({url:'https://example.test/auth/confirm?token_hash='+ 'a'.repeat(64)+'&type=email'});assert.match(r.url,/\/login\?/);
});
