import test from 'node:test';import assert from 'node:assert/strict';import {DungeonEngine} from '../src/dungeon-engine.js';import {AudioFX} from '../src/audio.js';import {V} from '../src/physics.js';
const make=()=>new DungeonEngine({owner:'a',options:{mode:'dungeon',seed:1},players:new Map([['a',{id:'a',name:'A',agent:'spidey',team:'A',connected:true}]])});
test('every clear has exactly three protected seconds, blocks early reward selection, awards once, then transitions',()=>{
 for(const stage of [1,5,6,11,12]){const s=make();s.enterStage(stage);s.input('a',{actions:[{type:'dungeonReady'}]});const a=s.actors.get('a'),hp=a.hp,timer=s.rules.time;
 s.clearStage();assert.equal(s.phase,'victory');assert.equal(a.ultPoints,1);assert.equal(s.offers.size,0);assert(!s.pick('a','giant'));s.input('a',{actions:[{type:'dungeonPick',value:'giant'},{type:'attack',button:0},{type:'dash'}]});s.hurt(a,80);s.tick(2.99);assert.equal(a.hp,hp);assert.equal(s.rules.time,timer);assert.equal(s.phase,'victory');assert(s.snapshot().dungeon.victoryRemaining>0);s.clearStage();assert.equal(a.ultPoints,1);s.tick(.01);assert.equal(s.phase,stage===12?'done':'reward');if(stage===12)assert(s.won);else assert.equal(s.offers.get('a').ids.length,3);}
});
test('spawn, windup, defeat and global stage clear emit independent authoritative audio cues once',()=>{
 const s=make();s.input('a',{actions:[{type:'dungeonReady'}]});const a=s.actors.get('a'),m=s.spawnMonster('crawler',V(0,1,0));s.telegraph(m,m.p,2,.5,10,'melee');s.damage(a,m,999);s.killMonster(m,a);s.clearStage();s.clearStage();
 const cues=s.snapshot().events.filter(e=>e.kind==='sound');for(const type of ['monsterSpawn','monsterAttack','monsterDefeat','roomClear'])assert.equal(cues.filter(e=>e.type===type).length,1,type);assert(cues.find(e=>e.type==='roomClear').global);
});
test('dungeon synth schedules distinct note patterns and limits simultaneous wave sounds without audio assets',()=>{
 const fx=new AudioFX(),notes=[];const node=()=>({connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},pan:{value:0}});
 fx.ctx={currentTime:0,createGain:node,createStereoPanner:node,createOscillator(){const o={...node(),frequency:{setValueAtTime:f=>notes.push(f),exponentialRampToValueAtTime(){}},start(){},stop(){}};return o;}};fx.master=node();
 for(const type of ['monsterSpawn','monsterAttack','monsterDefeat','roomClear']){fx.ctx.currentTime+=2;const before=notes.length;fx.play(type);assert(notes.length>before,type);fx.play(type);const after=notes.length;fx.play(type);assert.equal(notes.length,after);}
 const before=notes.length;fx.muted=true;fx.play('roomClear');assert.equal(notes.length,before);assert(new Set(notes).size>5);
});
