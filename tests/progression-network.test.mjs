import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';import {DungeonEngine} from '../src/dungeon-engine.js';
import {chooseStarter,recordMilestones,rewardCount} from '../src/profile.js';
test('server refuses locked agents for custom and co-op, retains isolated player entitlement sets',async()=>{
 for(const options of [{mode:'dungeon'},{map:'duel',rounds:2,unlimited:false}]){
  const app=createServer({publicOrigin:'https://friends.trycloudflare.com'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const root='http://127.0.0.1:'+app.server.address().port;
  const post=async(path,data={},p)=>{const r=await fetch(root+'/api/'+path,{method:'POST',headers:{Origin:'http://127.0.0.1:8787','Content-Type':'application/json',...(p?{Authorization:'Bearer '+p.token}:{})},body:JSON.stringify(data)});return {status:r.status,...await r.json()};};
  try{
   const pre=await fetch(root+'/api/create',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:8787'}});assert.equal(pre.status,204);
   const a=await post('create',{options,profile:chooseStarter({},'ant')}),b=await post('join',{code:a.room.code,profile:chooseStarter({},'hera')});
   await post('select',{},a);assert.equal((await post('ready',{agent:'spidey'},a)).status,400);assert.equal((await post('ready',{agent:'ant'},b)).status,400);
   assert.equal((await post('ready',{agent:'ant'},a)).status,200);assert.equal((await post('ready',{agent:'hera'},b)).status,200);
   const room=app.rooms.get(a.room.code);assert.equal(room.stage,'match');assert.equal(room.sim.actors.size,2);
   assert.equal((await post('profile',{profile:{allUnlocked:true}},a)).status,400);
   assert.equal((await post('input',{keys:[],actions:[]},b)).status,200);
   const info=await fetch(root+'/api/info').then(r=>r.json());assert.equal(info.protocol,2);assert.equal(info.version,'0.7.3-beta.1');assert.deepEqual(info.addresses,['https://friends.trycloudflare.com']);
   app.setPublicOrigin(null);assert(!(await fetch(root+'/api/info').then(r=>r.json())).addresses.includes('https://friends.trycloudflare.com'));
  }finally{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));}
 }
});
test('authoritative milestones survive boss entry and failure; absent players cannot gain them',()=>{
 const make=()=>new DungeonEngine({owner:'a',options:{mode:'dungeon'},players:new Map([['a',{id:'a',agent:'ant',team:'A',connected:true}],['b',{id:'b',agent:'cap',team:'A',connected:true}]])});
 let p=chooseStarter({},'ant');
 for(let attempt=0;attempt<2;attempt++){
  const s=make();s.enterStage(11);s.actors.get('b').connected=false;s.phase='combat';s.clearStage();s.completeVictory();s.pick('a',s.offers.get('a').ids[0]);assert.equal(s.phase,'bonus');
  let snap=s.snapshot();assert(snap.players.find(a=>a.id==='a').progress.bonus);assert(!snap.players.find(a=>a.id==='b').progress.bonus);
  p=recordMilestones(p,s.runId,snap.players.find(a=>a.id==='a').progress);p=recordMilestones(p,s.runId,snap.players.find(a=>a.id==='a').progress);
  for(const id of [...s.offers.get('a').ids].slice(0,2))s.pick('a',id);assert.equal(s.stage,12);s.finish(false,'time');snap=s.snapshot();p=recordMilestones(p,s.runId,snap.players.find(a=>a.id==='a').progress);
 }
 assert.equal(p.bonusRuns.length,2);assert.equal(rewardCount(p),1);
 const win=make();win.finish(true,'boss');assert(win.snapshot().players.every(a=>a.progress.boss));p=recordMilestones(p,win.runId,win.snapshot().players[0].progress);assert.equal(rewardCount(p),2);
});
