import test from 'node:test';import assert from 'node:assert/strict';
import {MLS_DIRECTORY,parseMlsSelections} from '../src/lib/mls-selection.ts';
test('nationwide MLS snapshot has stable unique identifiers and the three local MLSs',()=>{
 assert.ok(MLS_DIRECTORY.organizations.length>400);assert.equal(new Set(MLS_DIRECTORY.organizations.map(r=>r.id)).size,MLS_DIRECTORY.organizations.length);
 for(const id of ['M00000580','M00000582','M00000584'])assert.ok(MLS_DIRECTORY.organizations.some(r=>r.id===id));
});
test('MLS selection is identification only, canonicalizes names, supports several or unsure, and refuses credentials',()=>{
 assert.deepEqual(parseMlsSelections([]),[]);
 const m=parseMlsSelections([{id:'M00000580',name:'forged label'},{id:'M00000582',name:'any'}]);assert.equal(m.length,2);assert.match(m[0].name,/Tennessee/);
 assert.deepEqual(parseMlsSelections([{id:'unsure',name:'anything'}]),[{id:'unsure',name:'Not sure yet'}]);
 assert.deepEqual(parseMlsSelections([{id:'other',name:'Example Regional MLS'}]),[{id:'other',name:'Example Regional MLS'}]);
 for(const bad of [[{id:'unsure',name:'x'},{id:'M00000580',name:'x'}],[{id:'other',name:'sk-secret-token'}],[{id:'fake',name:'Fake MLS'}],Array(11).fill({id:'other',name:'Test MLS'})])assert.throws(()=>parseMlsSelections(bad));
 assert.throws(()=>parseMlsSelections([{id:'M00000580',name:'x'},{id:'M00000580',name:'x'}]));
});
