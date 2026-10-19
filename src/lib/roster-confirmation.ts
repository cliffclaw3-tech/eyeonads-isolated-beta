import { createHash } from 'node:crypto';
type Agent = {name:string; email?:string; office?:string};
type Setup = {name:string;expected_agents:number;offices?:{name:string;location:string}[];agents:Agent[];roster_confirmation?:unknown};
function signature(setup:Setup) {
 const agents=setup.agents.map(a=>[a.name.trim().toLowerCase(),(a.email||'').trim().toLowerCase(),(a.office||'').trim().toLowerCase()].join('|')).sort();
 const offices=(setup.offices||[]).map(o=>`${o.name.trim()}|${o.location.trim()}`.toLowerCase()).sort();
 return createHash('sha256').update(JSON.stringify([setup.name.trim().toLowerCase(),setup.expected_agents,offices,agents])).digest('hex');
}
export function confirmationEligible(setup:Setup) {
 const offices=new Set((setup.offices||[]).map(o=>`${o.name.trim()}|${o.location.trim()}`.toLowerCase()));
 return setup.agents.length>0 && setup.agents.length===setup.expected_agents && offices.size>0 && setup.agents.every(a=>offices.has((a.office||'').trim().toLowerCase()));
}
export function rosterConfirmation(setup:Setup|null|undefined):{status:'draft'|'broker_confirmed';confirmed_at?:string} {
 if(!setup || !confirmationEligible(setup))return {status:'draft'};
 const c=setup.roster_confirmation as {signature?:string;confirmed_at?:string;basis?:string}|null;
 if(!c || c.basis!=='broker_company_records' || c.signature!==signature(setup) || !c.confirmed_at || !Number.isFinite(Date.parse(c.confirmed_at)))return {status:'draft'};
 return {status:'broker_confirmed',confirmed_at:c.confirmed_at};
}
export function recordRosterConfirmation(setup:Setup,previous:Setup|null,confirm:boolean,actor:string,now:string) {
 if(confirm) {
   if(!confirmationEligible(setup))throw Error('Reconcile the exact agent total and assign every agent to a selected office before confirming. You can save a draft instead.');
   return {signature:signature(setup),confirmed_at:now,confirmed_by:actor,basis:'broker_company_records'};
 }
 return previous && rosterConfirmation(previous).status==='broker_confirmed' && signature(previous)===signature(setup) ? previous.roster_confirmation : null;
}
