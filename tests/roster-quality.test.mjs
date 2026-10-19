import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspectDirectory, readOfficialDirectory } from '../src/lib/public-directory.ts';
import { previewAgents } from '../src/lib/public-brokerage-preview.ts';
import { rosterQuality } from '../src/lib/roster-quality.ts';
const office={name:'Test Realty',location:'Test, Tennessee',website:'https://example.com/agents',source_url:'https://example.com/agents'};
test('134 of 260 and 259 of 260 cannot pass reconciliation; even matching counts require review',()=>{
 assert.equal(rosterQuality(134,260,false).missing,126);
 assert.equal(rosterQuality(259,260,false).status,'incomplete');
 assert.equal(rosterQuality(260,260,false).complete,false);
 assert.equal(rosterQuality(260,260,false).status,'needs_broker_review');
 assert.equal(rosterQuality(261,260,false).extra,1);
 assert.equal(rosterQuality(260,260,true).status,'incomplete');
 assert.equal(rosterQuality(0,0,false).status,'incomplete');
});
test('independent Jackson live card fixture includes Nick Kesner, not just cached 28',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/roster-redteam/town-country-jackson-observed.json',import.meta.url),'utf8'));
 const result=inspectDirectory('<html><body>'+f.records.map(r=>r.observed_card_html).join('')+'</body></html>',f.source_url,true);
 assert.equal(result.names.length,f.observed_card_count);
 assert.ok(result.names.includes('Nick Kesner'));
 assert.ok(result.names.includes('Cole Murray'));
 assert.equal(result.people.length,29);
});
test('four page traversal includes last page sentinel, deduplicates profiles and stops cycles',async()=>{
 const result=await readOfficialDirectory([office],office,async url=>{
   const page=Number(new URL(url).searchParams.get('page')||1);
   return {url,html:`<body><p>4 Agents Found</p><a href="/agents/person${page}">${['Aaron Murphy','Bethany Wisdom','Wes Shields','Jane Thornton'][page-1]}</a><a href="/agents?page=${Math.min(page+1,4)}">Next</a></body>`};
 });
 assert.equal(result.pagesRead,4);assert.equal(result.agents.length,4);assert.ok(result.agents.some(a=>a.name==='Jane Thornton'));assert.equal(result.incomplete,false);
});
test('blocked fourth page is retained in audit even after three successful pages',async()=>{
 const result=await readOfficialDirectory([office],office,async url=>{
  const page=Number(new URL(url).searchParams.get('page')||1);if(page===4)throw Error('429');
  return {url,html:`<body><a href="/agents/person${page}">Agent Person${['One','Two','Three'][page-1]}</a><a href="/agents?page=${page+1}">Next</a></body>`};
 });assert.equal(result.incomplete,true);assert.ok(result.audit.some(row=>row.url.endsWith('page=4')&&row.status==='blocked'));
});
test('published total drift and unrendered load more never indicate completeness',async()=>{
 const result=await readOfficialDirectory([office],office,async url=>({url,html:'<body><p>54 Agents Found</p><p>55 Agents Found</p><a href="/agents/jane">Jane Thornton</a><button>Load more agents</button></body>'}));
 assert.equal(result.incomplete,true);assert.deepEqual(result.publishedTotals,[54,55]);
});
test('roster larger than 250 is not silently truncated and unrelated source is rejected',()=>{
 const rows=Array.from({length:320},(_,i)=>({name:`Person ${i}`,office:'Test Realty|Test, Tennessee',source_url:'https://example.com/agents'}));
 assert.equal(previewAgents(rows,[office]).length,320);
 assert.equal(previewAgents([{...rows[0],source_url:'https://unrelated.com/agents'}],[office]).length,0);
});

test('independent Blue Ridge live five-page fixture finds exactly the 55 profile identities',async()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/roster-redteam/blue-ridge-live-html.json',import.meta.url),'utf8'));
 const selected={name:'Blue Ridge Properties',location:'Kingsport, Tennessee',website:f.pages[0].url,source_url:f.pages[0].url};
 const r=await readOfficialDirectory([selected],selected,async url=>{const page=f.pages.find(p=>p.url===url);assert.ok(page,`Unexpected URL ${url}`);return {url,html:page.html};});
 const expected=new Set(f.pages.flatMap(page=>page.observed_records.map(person=>person.profile_url)));
 assert.equal(r.agents.length,55);assert.equal(r.incomplete,false);assert.ok(r.agents.some(a=>a.name==='Jane Thornton'));
 assert.deepEqual(new Set(r.agents.map(a=>a.profile_url)),expected);
 assert.ok(!r.agents.some(a=>a.name==='Daily Rotation'));
});


test('local Kingsport Town & Country captures exact 24 sales cards and no About CTA aliases',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/roster-redteam/town-country-kingsport-agents.json',import.meta.url),'utf8'));
 const p=inspectDirectory(f.html,f.url,true);
 assert.deepEqual(new Set(p.names),new Set(f.observed_records.map(row=>row.name)));
 assert.equal(p.names.length,24);assert.ok(p.names.includes('Randy Robinette'));assert.ok(!p.names.some(name=>name.startsWith('About ')));
});
test('Conservus records are reconciled without pretending two-person teams and support roles are individual agents',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/roster-redteam/conservus-live-html.json',import.meta.url),'utf8'));
 const p=inspectDirectory(f.html,f.url,true);
 assert.equal(p.names.length,23);assert.equal(p.unresolved.length,3);
 assert.deepEqual(new Set([...p.names,...p.unresolved.map(row=>row.name)]),new Set(f.observed_records.map(row=>row.name)));
 assert.ok(p.names.includes('Jeremy Pippin'));assert.ok(p.names.includes('Cecilia "CC" Harless'));
 assert.ok(!p.names.includes('Broker Support'));assert.ok(p.unresolved.some(row=>row.name==='Gary Baker'));
});
