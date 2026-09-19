import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {AGENTS} from '../src/agents.js';
import {normalizeProfile,unlockedAgents,isAgentUnlocked,rewardCount,chooseStarter,recordMilestones,spendReward,ProfileStore,PROFILE_KEY,verifyOwnerCode} from '../src/profile.js';
function memory(raw){const data=new Map(raw?[[PROFILE_KEY,raw]]:[]);return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
test('new profile starts with all eleven locked; ANY single starter can be chosen once',()=>{
 assert.equal(unlockedAgents({}).length,0);
 for(const a of AGENTS){const p=chooseStarter({},a.id);assert.deepEqual(unlockedAgents(p),[a.id]);assert.equal(p.starter,a.id);assert.throws(()=>chooseStarter(p,'spidey'));}
 assert.throws(()=>chooseStarter({},'unknown'));
});
test('two DISTINCT bonus runs earn a choice; failures afterwards do not revoke it',()=>{
 let p=chooseStarter({},'hera');p=recordMilestones(p,'run-1',{bonus:true});assert.equal(rewardCount(p),0);
 p=recordMilestones(p,'run-1',{bonus:true});assert.equal(p.bonusRuns.length,1);
 p=recordMilestones(p,'run-2',{bonus:true});assert.equal(rewardCount(p),1);
 p=recordMilestones(p,'run-2',{bonus:false,boss:false});assert.equal(rewardCount(p),1);
 p=spendReward(p,'thor');assert.equal(rewardCount(p),0);assert(isAgentUnlocked(p,'thor'));assert.throws(()=>spendReward(p,'cap'));
});
test('boss win and bonus threshold stack and can be redeemed on separate agents later',()=>{
 let p=chooseStarter({},'vision');for(const id of ['one','two'])p=recordMilestones(p,id,{bonus:true,boss:true});
 assert.equal(rewardCount(p),3);p=recordMilestones(p,'two',{bonus:true,boss:true});assert.equal(rewardCount(p),3);
 for(const id of ['arc','cap','ant'])p=spendReward(p,id);
 assert.equal(rewardCount(p),0);assert.throws(()=>spendReward(p,'cap'));
 p=recordMilestones(recordMilestones(p,'three',{bonus:true}),'four',{bonus:true});assert.equal(rewardCount(p),1);
});
test('old legitimate unlocks migrate without granting old wins a duplicate credit',()=>{
 const p=normalizeProfile({schema:1,unlocked:['ant'],wins:['old-win']});assert(isAgentUnlocked(p,'ant'));assert.equal(rewardCount(p),0);
 assert.equal(rewardCount(recordMilestones(p,'old-win',{boss:true})),0);assert.equal(rewardCount(recordMilestones(p,'new-win',{boss:true})),1);
 assert(!('build' in normalizeProfile({build:['giant'],wins:[]})));
});
test('starter, one bonus run, pending credits and unlocks survive store recreation',()=>{
 const storage=memory();let store=new ProfileStore(storage);store.starter('pigeon');store.record('one',{bonus:true});
 store=new ProfileStore(storage);assert(store.owns('pigeon'));assert.equal(store.read().bonusRuns.length,1);
 store.record('two',{bonus:true});store=new ProfileStore(storage);assert.equal(rewardCount(store.read()),1);store.unlock('bane');
 assert(new ProfileStore(storage).owns('bane'));assert.equal(rewardCount(new ProfileStore(storage).read()),0);
});
test('bad saves and failed writes are not silently overwritten or reported as saved',()=>{
 const storage=memory('bad json');assert.throws(()=>new ProfileStore(storage).starter('cap'));assert.equal(storage.getItem(PROFILE_KEY),'bad json');
 assert.throws(()=>normalizeProfile({schema:50}));const good=memory();const store=new ProfileStore(good);store.starter('cap');
 const original=good.setItem;good.setItem=()=>{throw Error('Quota');};assert.throws(()=>store.record('win',{boss:true}));assert.equal(rewardCount(store.read()),0);
 good.setItem=original;store.record('win',{boss:true});assert.equal(rewardCount(store.read()),1);
});
test('owner code uses a verifier, invalid codes leave profile unchanged, correct code persists all unlocks',async()=>{
 // Deliberately NOT the owner's distributed code.
 const digest=createHash('sha256').update('TESTCODE1234').digest('hex'),options={digest,subtle:webcrypto.subtle};
 assert(await verifyOwnerCode(' test-code-1234 ',options));assert(!await verifyOwnerCode('wrongcode',options));
 const storage=memory(),store=new ProfileStore(storage);store.starter('arc');await assert.rejects(store.redeem('wrongcode',options));assert.deepEqual(unlockedAgents(store.read()),['arc']);
 await store.redeem('TESTCODE1234',options);assert.equal(unlockedAgents(new ProfileStore(storage).read()).length,11);assert.equal(rewardCount(store.read()),0);
 assert(!storage.getItem(PROFILE_KEY).includes('TESTCODE'));
});
test('friends use independent profiles and one cannot spend another players credits',()=>{
 const a=new ProfileStore(memory()),b=new ProfileStore(memory());a.starter('ant');b.starter('cap');a.record('same-party-run',{boss:true});a.unlock('thor');
 assert(!b.owns('thor'));assert.equal(rewardCount(b.read()),0);assert.deepEqual(unlockedAgents(b.read()),['cap']);
});
