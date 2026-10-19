import test from 'node:test';import assert from 'node:assert/strict';
import {mergePublicRoster} from '../src/lib/public-roster-merge.ts';
test('public suggestions cannot overwrite existing agent details or office',()=>{
 const person={name:'Jane Smith',email:'jane@example.com',office:'Confirmed office',social_url:'https://example.com/jane'};
 const result=mergePublicRoster([person],[{name:'Jane Smith',office:'Suggested default'},{name:'Alex Jones',office:'Selected office'}]);
 assert.equal(result.agents[0],person);assert.equal(result.added,1);assert.equal(result.existing,1);assert.equal(result.agents[1].office,'Selected office');
});
test('two same-name public identities require explicit reconciliation instead of silent collapse',()=>{
 assert.throws(()=>mergePublicRoster([],[{name:'John Smith',office:'Main',profile_url:'https://example.com/1'},{name:'John Smith',office:'Main',profile_url:'https://example.com/2'}]),/More than one public profile/);
});
