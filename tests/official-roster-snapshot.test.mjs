import test from 'node:test';
import assert from 'node:assert/strict';
import { officialRosterSnapshot, knownPublicOffices } from '../src/lib/official-roster-snapshot.ts';
const office = {name:'Greater Impact Realty Knoxville',location:'420 Bearden Road, Knoxville, TN 37919',website:'https://www.girknox.com',source_url:'https://www.girknox.com/agents.php'};
const now = Date.parse('2026-10-22T18:00:00Z');
test('observed Knoxville office does not depend on a model search or supplied website',()=>{
 for(const site of ['', 'https://www.girknox.com','https://greaterimpactrealty.com']) {
  const result=knownPublicOffices('Greater Impact Realty','Knoxville, TN',site,now);
  assert.equal(result.length,1);assert.equal(result[0].website,'https://www.girknox.com');
 }
 for(const args of [['Other Realty','Knoxville',''],['Greater Impact Realty','Kingsport',''],['Greater Impact Realty','Knoxville','https://unrelated.example']])assert.equal(knownPublicOffices(...args,now).length,0);
 assert.equal(knownPublicOffices('Greater Impact Realty','Knoxville','',Date.parse('2026-10-29')).length,0);
});
test('dated official fallback keeps source identities and separates team cards',()=>{
 const result=officialRosterSnapshot([office],office,now);
 assert.equal(result.agents.length,35);assert.equal(result.unresolved.length,4);
 assert.ok(result.agents.some(a=>a.name==='Keyen Green'));
 assert.ok(result.agents.every(a=>a.profile_url && a.source_url===office.source_url));
 assert.match(result.note,/2026-10-22/);assert.match(result.note,/not a verified complete roster/);
});
test('fallback cannot leak to another office, domain, multi-office scope or stale date',()=>{
 for(const changed of [{...office,location:'Jonesborough, Tennessee'},{...office,website:'https://other.example'},{...office,website:'https://girknox.com.attacker.example'}])assert.equal(officialRosterSnapshot([changed],changed,now),null);
 assert.equal(officialRosterSnapshot([office,{...office,name:'Another office'}],office,now),null);
 assert.equal(officialRosterSnapshot([office],office,Date.parse('2026-10-29')),null);
 assert.equal(officialRosterSnapshot([office],office,Date.parse('2026-10-21')),null);
});
