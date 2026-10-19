import test from 'node:test';import assert from 'node:assert/strict';
import {recordRosterConfirmation,rosterConfirmation} from '../src/lib/roster-confirmation.ts';
const setup={name:'Example Realty',expected_agents:2,offices:[{name:'Main',location:'Austin, Texas'}],agents:[{name:'Jane Smith',email:'jane@example.com',office:'Main|Austin, Texas'},{name:'Alex Jones',email:'alex@example.com',office:'Main|Austin, Texas'}]};
test('count matching alone cannot confirm; broker attestation is bound to exact roster and offices',()=>{
 assert.equal(rosterConfirmation(setup).status,'draft');
 const c=recordRosterConfirmation(setup,null,true,'broker-id','2026-10-19T15:00:00Z');
 const confirmed={...setup,roster_confirmation:c};assert.equal(rosterConfirmation(confirmed).status,'broker_confirmed');
 assert.equal(rosterConfirmation({...confirmed,agents:[setup.agents[0],{...setup.agents[1],name:'Different Person'}]}).status,'draft');
 assert.equal(rosterConfirmation({...confirmed,expected_agents:260}).status,'draft');
 assert.equal(rosterConfirmation({...confirmed,offices:[{name:'Other',location:'Austin, Texas'}]}).status,'draft');
 assert.equal(recordRosterConfirmation({...setup,agents:[...setup.agents].reverse()},confirmed,false,'broker-id','2026-10-20T15:00:00Z'),c);
});
test('cannot confirm a short roster, empty roster or out-of-scope agent; drafts can be saved',()=>{
 for(const bad of [{...setup,expected_agents:260},{...setup,agents:[]},{...setup,agents:[setup.agents[0],{...setup.agents[1],office:'Foreign|Dallas, Texas'}]}]){
  assert.throws(()=>recordRosterConfirmation(bad,null,true,'broker','2026-10-19T15:00:00Z'));
  assert.equal(recordRosterConfirmation(bad,null,false,'broker','2026-10-19T15:00:00Z'),null);
 }
});
