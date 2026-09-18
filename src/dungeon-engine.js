import * as T from './three.module.js';
import {Simulation} from './simulation-core.js';
import {RoundSystem} from './round-system.js';
import {Game} from './game.js';
import {Physics,Body,V,overlaps} from './physics.js';
import {AGENTS} from './agents.js';
import {DungeonWorld,MONSTERS,monsterMesh} from './dungeon-world.js';
import {seeded,sample,rewardPool,byId} from './dungeon-data.js';
import {installDungeonAbilities,applyUpgrade,has,push} from './dungeon-abilities.js';
const clamp=T.MathUtils.clamp;

export class DungeonEngine extends Simulation {
 constructor(room){
  super({...room,options:{...room.options,map:'duel',rounds:12,unlimited:false}});
  this.room=room;this.room.options={...room.options,mode:'dungeon',map:'duel',rounds:12,unlimited:false};
  this.runId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);this.rng=seeded(room.options.seed??Math.floor(Math.random()*2**32));this.stage=1;this.difficulty='normal';this.phase='ready';this.elapsed=0;this.monsters=[];this.enemyBolts=[];this.telegraphs=[];this.zones=[];this.guardians=[];this.offers=new Map();this.votes=new Map();this.startReady=new Set();this.nextMonster=0;this.completed=new Set();this.rewardClaims=new Map();this.economy=false;this.reason='';this.won=false;this.rules.soloTeam=null;
  for(const a of this.actors.values()){a.team='A';this.room.players.get(a.id).team='A';installDungeonAbilities(a,this);a.armor=a.agent.id==='cap'?15:0;a.armorType=null;a.ultPoints=0;a.ultReady=false;}
  this.enterStage(1);
 }
 alive(){return [...this.actors.values()].filter(a=>a.connected&&!a.dead);}
 enterStage(stage,difficulty='normal'){
  this.stage=stage;this.difficulty=difficulty;this.phase='ready';this.rules.phase='buy';this.rules.round=stage;this.rules.time=0;this.startReady.clear();this.offers.clear();this.votes.clear();
  for(const child of [...this.scene.children]){this.scene.remove(child);child.traverse?.(m=>{if(m.isMesh){m.geometry?.dispose();if(m.material?.transparent)m.material.dispose();}});}
  this.physics=new Physics();this.world=new DungeonWorld(this.scene,this.physics,stage,difficulty);this.rules.time=this.world.spec.limit;
  this.monsters=[];this.enemyBolts=[];this.telegraphs=[];this.zones=[];this.guardians=[];this.dynamicWalls=[];this.history=[];this.pendingRewind=null;this.orbs={orbs:[]};this.wave=0;this.waveWait=2;this.roomElapsed=0;this.spawnPending=[];
  let index=0;for(const a of this.actors.values()){
   a.physics=this.physics;a.scene=this.scene;a.world={...this.world,reset(){},bots:this.monsters};
   for(const id of a.pendingBuild)applyUpgrade(a,id);a.pendingBuild=[];
   a.release(false);a.projectiles=[];a.effects=[];a.traps=[];a.arrows=[];a.tasks=[];a.ants=[];a.fireTrails=[];a.thornWalls=[];a.soulOrbs=[];a.souls=0;a.cast=null;a.grapple=null;a.scope=0;a.charge=null;a.menu=null;a.wallPreview=false;a.equipped=null;a.flight=0;a.visionFlight=false;a.slam=false;a.dash=0;a.webTime=0;a.shieldAway=false;a.shieldProp=null;a.hammer=null;a.spin=0;a.ult=0;a.shieldOn=false;a.beamTime=0;a.evadeTime=0;a.phased=0;a.player.phased=false;a.spiderUntil=0;if(a.agent.id==='spidey')a.transformed=false;
   a.sizeMode=null;a.sizeTime=0;a.shrinkTime=0;a.bodyScale=a.agent.id==='bane'&&a.transformed?1.15:1;a.player.h.set(.36*a.bodyScale,.9*a.bodyScale,.36*a.bodyScale);a.player.p.fromArray(this.world.spawn('attack',index++));a.player.p.y=a.player.h.y+.02;a.player.v.set(0,0,0);a.player.grounded=true;a.player.active=!a.dead;a.player.hp=a.hp;a.keys={};a.yaw=0;a.pitch=0;a.player.mesh.visible=!a.dead;a.player.sync();this.scene.add(a.player.mesh);this.physics.movers.push(a.player);a.bank.fill();a.dashCooldown=0;a.cool={punch:0,right:0,shield:0};a.entryGuard=a.build.has('phoenix')?5:0;
   if(a.build.has('steel'))a.armor=Math.max(25,a.armor);a.flightGauge=Math.min(100,a.flightGauge+30);a.healGauge=Math.min(100,a.healGauge+30);a.fallPeak=0;
   // Authoritative raycast includes monsters, doors/cover, props and teammates.
   a.raycast=(origin,dir,distance=60,ignore=null)=>{a.ray.set(origin,dir.clone().normalize());a.ray.far=distance;const ignored=b=>b===a.player||b===ignore||(ignore instanceof Set&&ignore.has(b));const bodies=[...this.physics.solids,...this.world.objects,...this.monsters,...[...this.actors.values()].map(t=>t.player)];const candidates=bodies.filter(b=>b.active&&!b.phased&&!ignored(b)&&b.mesh&&a.ray.ray.distanceSqToPoint(b.p)<=b.h.lengthSq()+1);for(const b of candidates)b.mesh.updateWorldMatrix(true,true);return a.ray.intersectObjects(candidates.map(b=>b.mesh),true).find(h=>h.object.userData.body?.active)||null;};this.camera(a);
  }
  this.revision++;this.prepareWaves();this.event({kind:'sound',type:'dungeonGate',power:.5,pos:[0,1,17],at:this.time});
 }
 prepareWaves(){
  if(this.stage===12){this.spawnPending=[['boss']];return;}
  const n=this.actors.size,mult=this.stage===6?({easy:.72,medium:1,hard:1.3}[this.difficulty]):1;
  const count=Math.round((5+this.stage*1.3+(n-1)*2)*mult),pool=Object.keys(MONSTERS).filter(k=>k!=='boss'&&MONSTERS[k].unlock<=this.stage);
  const waves=this.stage>=7?3:2;this.spawnPending=Array.from({length:waves},()=>[]);
  for(let i=0;i<count;i++){let kind=pool[Math.floor(this.rng()*pool.length)];if(i===count-1&&this.stage>=7)kind=this.stage>=9?'juggernaut':'summoner';this.spawnPending[i%waves].push(kind);}
 }
 spawnMonster(kind,at=null){
  if(this.monsters.filter(b=>b.active).length>=26)return null;
  const def=MONSTERS[kind],mesh=monsterMesh(kind),half=V(.38,.98,.38).multiplyScalar(def.size),spots=[[-13,-16],[0,-16],[13,-16],[-13,4],[13,4],[0,-8]];
  const pt=at||V(...(()=>{const p=spots[this.nextMonster%spots.length];return [p[0],half.y+.02,p[1]];})());
  const b=new Body(pt,half,mesh);b.id='m'+(++this.nextMonster);b.kind=kind;b.monster=true;b.bot=true;b.elite=!!def.elite;b.boss=!!def.boss;b.def=def;
  const difficulty=this.stage===6?({easy:.8,medium:1,hard:1.35}[this.difficulty]):1;
  b.maxHP=def.hp*(b.boss?1:1+(this.stage-1)*.095)*(1+.6*(this.actors.size-1))*difficulty;b.hp=b.maxHP;b.armor=def.armor||0;b.cool=1+this.rng();b.root=b.stun=b.slow=b.deaf=b.dot=0;b.mass=def.size*3;b.scale=def.size;b.phase=1;b.windup=0;b.spawnedAt=this.time;
  mesh.traverse(m=>{if(m.isMesh)m.userData.body=b;});this.scene.add(mesh);b.sync();this.monsters.push(b);this.physics.movers.push(b);this.event({kind:'sound',type:b.boss?'bossSpawn':'monsterSpawn',power:b.boss?.8:.45,pos:b.p.toArray(),at:this.time});return b;
 }
 input(id,data){
  const a=this.actors.get(id);if(!a)return;
  const actions=Array.isArray(data.actions)?data.actions.slice(0,16):[];
  for(const ev of actions){if(!ev||typeof ev.type!=='string')continue;
   if(ev.type==='dungeonReady'&&this.phase==='ready'&&!a.dead){this.startReady.add(id);if(this.alive().every(p=>this.startReady.has(p.id))){this.phase='combat';this.rules.phase='live';}continue;}
   if(ev.type==='dungeonPick')this.pick(id,ev.value);
   if(ev.type==='dungeonReroll')this.reroll(id);
   if(ev.type==='dungeonVote'&&this.phase==='branch'&&['easy','medium','hard'].includes(ev.value)&&!a.dead){this.votes.set(id,ev.value);this.resolveVotes();}
   if(ev.type==='dungeonUnlock'&&this.won&&this.phase==='done'&&AGENTS.some(x=>x.id===ev.value)&&!this.rewardClaims.has(id))this.rewardClaims.set(id,ev.value);
   if(ev.type==='dash'&&this.phase==='combat')a.dungeonDash();
   if(ev.type==='unequip'&&a.agent.id==='ant'&&a.sizeMode&&has(a,'ant:switch')){if(a.resizeBody(1)){a.sizeMode=null;a.sizeTime=0;}}
  }
  if(this.phase!=='combat'){a.keys={};return;}
  super.input(id,{...data,actions:actions.filter(e=>e&&['skill','attack','jump','release','releaseQ','unequip','chooseSize','chooseArrow','copy','drag','wheel'].includes(e.type))});
 }
 resolveVotes(){if(this.phase!=='branch'||!this.alive().every(a=>this.votes.has(a.id)))return;const counts={easy:0,medium:0,hard:0};for(const a of this.alive())counts[this.votes.get(a.id)]++;const max=Math.max(...Object.values(counts)),tied=Object.keys(counts).filter(k=>counts[k]===max);const host=this.votes.get(this.room.owner);this.enterStage(6,tied.includes(host)?host:tied[0]);}
 pick(id,value){
  const a=this.actors.get(id),offer=this.offers.get(id);if(!a||a.dead||!offer||!['reward','bonus'].includes(this.phase)||offer.left<=0||!offer.ids.includes(value)||a.build.has(value)||a.pendingBuild.includes(value))return false;
  a.pendingBuild.push(value);offer.ids=offer.ids.filter(x=>x!==value);offer.left--;this.advanceIfPicked();return true;
 }
 reroll(id){const a=this.actors.get(id),o=this.offers.get(id);if(this.phase!=='reward'||!a||a.dead||a.rerolls<=0||o?.left!==1)return false;a.rerolls--;o.ids=rewardPool(a.agent.id,new Set([...a.build,...a.pendingBuild]),this.stage,this.difficulty,this.rng).map(b=>b.id);return true;}
 advanceIfPicked(){if(!this.alive().every(a=>this.offers.get(a.id)?.left===0))return;
  if(this.phase==='bonus'){this.enterStage(12);return;}
  if(this.stage===5){this.phase='branch';this.offers.clear();return;}
  if(this.stage===11){this.phase='bonus';for(const a of this.alive())this.offers.set(a.id,{left:2,ids:rewardPool(a.agent.id,new Set([...a.build,...a.pendingBuild]),12,this.difficulty,this.rng).map(x=>x.id)});return;}
  this.enterStage(this.stage+1);
 }
 clearStage(){
  if(this.phase!=='combat'||this.completed.has(this.stage))return;this.completed.add(this.stage);this.rules.phase='result';
  for(const a of this.alive()){a.ultPoints=Math.min(a.ultCost,a.ultPoints+1);a.ultReady=a.ultPoints>=a.ultCost;a.keys={};a.release(false);a.cast=null;a.charge=null;a.menu=null;}
  this.phase='victory';this.victoryEndsAt=this.time+3;this.offers.clear();this.enemyBolts=[];this.telegraphs=[];
  this.event({kind:'sound',type:'roomClear',global:true,power:.7,pos:[0,1,10],at:this.time});
 }
 completeVictory(){
  if(this.phase!=='victory')return;
  if(this.stage===12){this.finish(true,'프로토타입 ZERO 격리 완료');return;}
  this.phase='reward';for(const a of this.alive())this.offers.set(a.id,{left:1,ids:rewardPool(a.agent.id,new Set([...a.build,...a.pendingBuild]),this.stage,this.difficulty,this.rng).map(x=>x.id)});
 }
 finish(won,reason){if(this.phase==='done')return;this.won=won;this.reason=reason;this.phase='done';this.rules.phase='done';this.enemyBolts=[];this.telegraphs=[];this.zones=[];this.guardians=[];for(const a of this.actors.values()){a.keys={};a.tasks=[];a.cast=null;a.build.clear();a.pendingBuild=[];a.ultPoints=0;a.ultReady=false;a.ult=0;a.transformed=false;a.rage=0;a.ancestor=false;a.ancestorUnlocked=false;a.energy=0;a.temporaryShield=0;}this.offers.clear();this.history=[];}
 disconnect(id){super.disconnect(id);if(!this.alive().length)this.finish(false,'생존 플레이어가 없습니다.');else if(this.phase==='branch')this.resolveVotes();else if(['reward','bonus'].includes(this.phase))this.advanceIfPicked();else if(this.phase==='ready'&&this.alive().every(a=>this.startReady.has(a.id))){this.phase='combat';this.rules.phase='live';}}
 status(b,status,a){if(!b?.active||!status)return;for(const k of ['root','stun','slow','deaf','dot'])if(status[k]>0){let n=status[k];if(b.boss&&['stun','root'].includes(k)){if((b.ccImmune||0)>this.time)continue;n=Math.min(.3,n);b.ccImmune=this.time+3;}b[k]=Math.max(b[k]||0,n);}if(status.dot){b.dotDamage=status.dotDamage||2;b.dotOwner=a.id;}}
 shrink(b,damage,a){if(!b.active)return;if(b.boss){b.weakenUntil=this.time+5;return;}b.shrinkUntil=this.time+5;b.shrinkDamage=damage;b.shrinkOwner=a.id;b.h.set(.38,.98,.38).multiplyScalar(b.def.size*.5);b.mesh.scale.setScalar(b.def.size*.5);}
 damage(a,b,amount,status,scaled=false){
  if(!b?.monster||!b.active||a.dead||this.phase!=='combat')return;
  const ctx=a.damageContext||{},secondary=ctx.secondary||scaled,build=a.build;let n=scaled?amount:a.outgoing(amount);if(n<0||!Number.isFinite(n))return;
  if(build.has('execution')&&b.hp/b.maxHP<=.3)n*=1.4;
  if(build.has('opportunity')&&(b.stun>0||b.root>0||b.slow>0||b.antSlowTime>0))n*=1.3;
  if(build.has('resolve')&&a.hp>=a.maxHP)n*=1.2;
  if(build.has('giant')&&ctx.melee)n*=1.2;
  if(ctx.focus)n*=1.5;
  if((ctx.ult||a.beamTime>0||a.agent.id==='thor'&&a.ult>0)&&build.has('mana'))n*=1.15;
  if(a.visionFlight&&!ctx.melee&&has(a,'vision:fuel'))n*=1.3;
  if((b.exposedUntil||0)>this.time&&b.stun>0)n*=1.4;
  const wind=build.has('wind')&&a.t-a.combatAt>4;
  if(!secondary&&(wind||build.has('critical')&&this.rng()<.15)){n*=1.5;b.shred=Math.max(b.shred||0,.2);b.shredUntil=this.time+3;}
  if(has(a,'widow:combo')&&ctx.melee&&!secondary){a.combo=(a.combo||0)+1;if(a.combo%5===0)n*=3;}
  const ignore=has(a,'arc:punch')&&ctx.melee;
  if(!ignore&&b.armor>0){const fraction=(b.shredUntil||0)>this.time?1-b.shred:1,absorbed=Math.min(b.armor,n*.45*fraction);b.armor-=absorbed;n-=absorbed;}
  const actual=Math.max(0,Math.min(n,b.hp));b.hp-=n;a.damageTotal+=actual;a.hitmark=.15;if(actual>0)a.combatAt=a.t;
  if(actual>0&&a.t>=(a.hitSoundAt||0)){a.hitSoundAt=a.t+.09;a.audio.play('hit',.35);}
  this.status(b,status,a);
  if(ctx.melee&&has(a,'spidey:venom')&&a.transformed)this.status(b,{dot:3,dotDamage:8},a);
  if(ctx.melee&&has(a,'cap:punch'))push(a,b,a.player.p,8);
  if(has(a,'panther:collision')&&ctx.slot==='C'){b.knockOwner=a.id;b.knockTime=.8;b.wallCollisionDamage=25;}
  if(a.agent.id==='bane'){a.rage=clamp(a.rage+actual,0,100);a.transformBane();}
  const died=b.hp<=0;
  if(build.has('vampire')&&(died||b.elite))a.hp=Math.min(a.maxHP,a.hp+actual*.05);
  if(!secondary&&n>0&&build.has('chain')&&a.t>=(a.chainAt||0)&&this.rng()<.1){a.chainAt=a.t+.4;const before=a.damageContext;a.damageContext={secondary:true};for(const target of [b,...this.monsters.filter(t=>t!==b&&t.active&&t.p.distanceTo(b.p)<6&&a.visible(t,b.p)).slice(0,2)]){a.beam(b.p,target.p,'#b5d8ff',.055,.25);this.damage(a,target,12);}a.damageContext=before;}
  if(ctx.melee&&!secondary&&has(a,'thor:hammer')){const before=a.damageContext;a.damageContext={secondary:true};for(const target of this.monsters.filter(t=>t.active&&t.p.distanceTo(a.player.p)<6&&t.p.clone().sub(a.player.p).normalize().dot(a.direction())>.5)){a.beam(a.origin(),target.p,'#c8d6ff',.04,.18);this.damage(a,target,12);}a.damageContext=before;}
  if(has(a,'vision:prism')&&a.beamTime>0&&!ctx.secondary&&a.t>=(a.prismAt||0)){a.prismAt=a.t+.25;const before=a.damageContext;a.damageContext={secondary:true};for(const target of this.monsters.filter(t=>t!==b&&t.active&&t.p.distanceTo(b.p)<8&&a.visible(t,b.p)).slice(0,2)){a.beam(b.p,target.p,'#f9d2ff',.15,.3);this.damage(a,target,25*.5*.25);}a.damageContext=before;}
  if(b.hp<=0&&b.active)this.killMonster(b,a);
 }
 killMonster(b,a=null){if(!b.active)return;b.hp=0;b.active=false;b.mesh.visible=false;
  if(a){a.kills++;a.spawnSoul(b.p);a.killHealUntil=a.t+5;if(a.build.has('haste')){a.hasteStacks=Math.min(5,a.hasteStacks+1);a.hasteUntil=a.t+4;}if(a.agent.id==='pigeon'&&has(a,'pigeon:night')&&a.ult>0)a.ult+=1.5;
   if(has(a,'ant:spread')&&b.shrinkUntil>this.time)for(const t of this.monsters.filter(t=>t.active&&t.p.distanceTo(b.p)<6).slice(0,2))this.shrink(t,has(a,'ant:virus')?1:10,a);
   if(has(a,'thor:spread')&&b.dot>0){const ctx=a.damageContext;a.damageContext={secondary:true};a.area(b.p,4,20);a.damageContext=ctx;}
  }
  if(b.elite)for(const actor of this.actors.values())actor.ancestorCount=Math.min(8,actor.ancestorCount+1);
  this.event({kind:'monsterKill',target:b.id,source:a?.id||null,at:this.time});
  this.event({kind:'sound',type:'monsterDefeat',owner:a?.id,power:b.boss?.85:.5,pos:b.p.toArray(),at:this.time});
 }
 hurt(a,n,source,reflected=false){
  if(this.phase!=='combat'||a.dead||a.entryGuard>0||a.phased>0)return;
  if(!Number.isFinite(n)||n<=0)return;
  if(a.spin>0&&source?.monster&&!reflected){const old=a.damageContext;a.damageContext={secondary:true};this.damage(a,source,n*(has(a,'cap:reflect')?3:1));a.damageContext=old;return;}
  if(a.temporaryShield>0){const absorbed=Math.min(n,a.temporaryShield);a.temporaryShield-=absorbed;n-=absorbed;}
  if(has(a,'thor:grace')&&a.ult>0)n*=.7;
  const before=a.hp+a.armor,shieldBefore=a.shieldHP;a.combatAt=a.t;
  super.hurt(a,n,source,reflected);
  const actual=Math.max(0,before-a.hp-a.armor);
  if(a.agent.id==='panther'&&has(a,'panther:absorb'))a.energy+=actual*.5;
  if(a.agent.id==='bane'&&has(a,'bane:rage')){a.rage=Math.min(100,a.rage+n);a.transformBane();}
  if(a.shieldKind==='cap'&&a.shieldOn&&has(a,'cap:guard')&&n>=50&&actual<1)for(const b of this.monsters)if(b.active&&b.p.distanceTo(a.player.p)<4&&b.p.clone().sub(a.player.p).normalize().dot(a.direction())>.3)this.status(b,{stun:1},a);
  if(shieldBefore>0&&a.shieldHP<=0&&has(a,'arc:shield'))for(const b of this.monsters)if(b.active&&b.p.distanceTo(a.player.p)<4)push(a,b,a.player.p,15);
  if(actual>0&&!a.dead){
   if(a.build.has('reflect')&&!reflected){const ctx=a.damageContext;a.damageContext={secondary:true};a.area(a.player.p,5,actual*.25);a.damageContext=ctx;}
   if(a.build.has('poison')&&a.t>=(a.poisonAt||0)){a.poisonAt=a.t+3;this.addZone(a,a.player.p.clone().setY(.05),3,3,6,'poison');}
   if(a.build.has('escape')&&a.hp/a.maxHP<=.2&&a.t>=(a.escapeAt||0)){a.escapeAt=a.t+60;a.escapeUntil=a.t+2;a.audio.play('web');}
  }
  if(!this.alive().length)this.finish(false,'체력이 소진되었습니다. 이번 도전의 강화는 모두 초기화됩니다.');
 }
 monsterHit(b,a,n,{area=false,status=null,projectile=false}={}){
  if(a.dead||a.phased>0)return;if(projectile&&has(a,'cap:speed')&&a.player.v.length()>1&&this.rng()<.2)return;
  if(b.shrinkUntil>this.time)n=b.shrinkDamage;else if(b.weakenUntil>this.time)n*=.7;
  if(area&&a.build.has('steel'))n*=.85;
  this.hurt(a,n,b);
  if(status&&!a.dead)for(const [key,duration] of Object.entries(status))a.player[key]=Math.max(a.player[key]||0,duration*(a.build.has('will')?.5:1));
 }
 addZone(a,p,r,life,dps,kind){if(this.zones.length>=100)return;this.zones.push({owner:a.id,p:p.clone(),r,life,dps,kind});}
 monsterSound(b){if(this.time>=(b.soundAt||0)){b.soundAt=this.time+.65;this.event({kind:'sound',type:b.boss?'bossAttack':'monsterAttack',power:b.boss?.7:.45,pos:b.p.toArray(),at:this.time});}}
 telegraph(b,p,r,delay,damage,kind='blast',extra={}){this.telegraphs.push({source:b,p:p.clone(),r,left:delay,total:delay,damage,kind,...extra});this.monsterSound(b);}
 bossPattern(b,target){
  const phase=b.hp/b.maxHP<.3?3:b.hp/b.maxHP<.65?2:1;b.phase=phase;const turn=(b.pattern||0)%4;b.pattern=(b.pattern||0)+1;
  if(turn===0){for(const a of this.alive())this.telegraph(b,a.player.p,3.4+phase*.35,1.5,38,'blast');}
  if(turn===1){this.telegraph(b,b.p,16,1.65,32,'shockwave');}
  if(turn===2){for(let i=0;i<phase+2;i++){const p=target.player.p.clone().add(V(Math.sin(i*2.1)*5,0,Math.cos(i*2.1)*5));this.telegraph(b,p,2.5,1.1+i*.3,28,'pool');}}
  if(turn===3){const dir=target.player.p.clone().sub(b.p).setY(0).normalize();this.telegraph(b,b.p,2.2,1.4,44,'line',{dir:dir.toArray(),length:35});if(phase>1)for(let i=0;i<phase;i++)this.spawnMonster(phase===3?'charger':'crawler',b.p.clone().add(V((i-1)*4,0,5)).setY(1.1));}
  b.cool=phase===3?2.5:phase===2?3.3:4.2;b.windup=1.5;
 }
 tickMonsters(dt){
  for(const b of this.monsters){if(!b.active)continue;for(const k of ['root','stun','slow','deaf'])b[k]=Math.max(0,(b[k]||0)-dt);
   if(b.dot>0){b.dot=Math.max(0,b.dot-dt);const a=this.actors.get(b.dotOwner);if(a){const ctx=a.damageContext;a.damageContext={secondary:true};this.damage(a,b,(b.dotDamage||2)*dt);a.damageContext=ctx;}if(!b.active)continue;}
   if(b.shrinkUntil&&b.shrinkUntil<=this.time){b.shrinkUntil=0;b.h.set(.38,.98,.38).multiplyScalar(b.def.size);b.mesh.scale.setScalar(b.def.size);}
   if(b.antSlowTime>0)b.antSlowTime-=dt;else b.antSlow=0;
   b.cool-=dt;b.windup=Math.max(0,b.windup-dt);b.knockTime=Math.max(0,(b.knockTime||0)-dt);
   const candidates=this.alive().filter(a=>a.phased<=0&&!(a.escapeUntil>a.t));const target=candidates.sort((a,c)=>a.player.p.distanceToSquared(b.p)-c.player.p.distanceToSquared(b.p))[0];if(!target){this.physics.step(b,dt);continue;}
   const delta=target.player.p.clone().sub(b.p),distance=delta.length(),horizontal=delta.clone().setY(0).normalize();b.yaw=Math.atan2(horizontal.x,horizontal.z);
   if(b.stun<=0&&b.root<=0&&!b.windup&&!b.knockTime){let speed=b.def.speed*(1+(this.stage-1)*.018)*(b.slow>0?(b.shockUntil>this.time?.2:.3):1)*(1-(b.antSlow||0));
    if(['spitter','sentinel','summoner','leech'].includes(b.kind)&&distance<9)speed=0;
    const ahead=b.p.clone().addScaledVector(horizontal,1.5),test={p:ahead,h:b.h};let dir=horizontal;
    if(!this.physics.floorAt(ahead.x,ahead.z)||this.physics.solids.some(s=>s.active&&overlaps(test,s,.05))){for(const angle of [Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI]){const d=horizontal.clone().applyAxisAngle(V(0,1,0),angle),p=b.p.clone().addScaledVector(d,1.7);if(this.physics.floorAt(p.x,p.z)&&!this.physics.solids.some(s=>s.active&&overlaps({p,h:b.h},s,.02))){dir=d;break;}}}
    b.v.x=T.MathUtils.damp(b.v.x,dir.x*speed,8,dt);b.v.z=T.MathUtils.damp(b.v.z,dir.z*speed,8,dt);
   }else if(!b.knockTime){b.v.x*=Math.exp(-10*dt);b.v.z*=Math.exp(-10*dt);}
   if(b.cool<=0&&b.stun<=0&&!b.windup&&target.visible(b)&&distance<(b.boss?60:b.def.range+2)){
    if(b.boss)this.bossPattern(b,target);
    else if((b.silenceUntil||0)>this.time&&['spitter','summoner','leech','sentinel'].includes(b.kind)){b.cool=.6;}
    else if(b.kind==='summoner'){this.monsterSound(b);if((b.summons||0)<2){b.summons=(b.summons||0)+1;for(const s of [-1,1])this.spawnMonster('crawler',b.p.clone().add(V(s*2,0,1)).setY(.7));}else this.fireMonster(b,target);b.cool=7;}
    else if(['spitter','sentinel','leech'].includes(b.kind)){this.telegraph(b,target.player.p,1.1,.7,b.def.damage,'shot',{target:target.id});b.cool=b.def.cool;b.windup=.7;}
    else if(b.kind==='charger'){const dir=horizontal.clone();this.telegraph(b,b.p,1.2,.9,b.def.damage,'charge',{dir:dir.toArray(),length:12});b.cool=5;b.windup=.9;}
    else if(b.kind==='bomber'){this.telegraph(b,b.p,3.5,1.1,b.def.damage,'blast');b.cool=4;b.windup=1.1;}
    else{this.telegraph(b,b.p,b.def.range,.5,b.def.damage,'melee');b.cool=b.def.cool;b.windup=.5;}
   }
   const speed=b.v.clone();this.physics.step(b,dt);if(b.knockTime>0&&Math.hypot(speed.x,speed.z)>6&&Math.hypot(b.v.x,b.v.z)<1){const owner=this.actors.get(b.knockOwner);if(owner&&(owner.build.has('gravity')||has(owner,'panther:collision'))){this.status(b,{stun:b.wallCollisionDamage?2:1.5},owner);if(b.wallCollisionDamage)this.damage(owner,b,b.wallCollisionDamage);}b.knockTime=0;b.wallCollisionDamage=0;}
   if(b.p.y<-5)this.killMonster(b);b.mesh.rotation.y=b.yaw;b.sync();
  }
 }
 fireMonster(b,a){const origin=b.p.clone().add(V(0,.4,0)),dir=a.origin().sub(origin).normalize();this.enemyBolts.push({p:origin,v:dir.multiplyScalar(b.kind==='sentinel'?18:13),damage:b.def.damage*(1+(this.stage-1)*.035),source:b,life:5,color:b.kind==='spitter'?'#c0ed85':'#f19cc2'});b.cool=b.def.cool;}
 tickThreats(dt){
  for(const q of this.telegraphs){q.left-=dt;if(q.left>0||q.done)continue;q.done=true;const b=q.source;if(!b.active||b.stun>0)continue;
   if(q.kind==='shot'){const a=this.actors.get(q.target);if(a&&!a.dead)this.fireMonster(b,a);continue;}
   if(q.kind==='charge'){b.v.fromArray(q.dir).multiplyScalar(20);b.knockTime=.65;}
   for(const a of this.alive()){
    const p=a.player.p;let inRange=Math.hypot(p.x-q.p.x,p.z-q.p.z)<q.r+a.player.h.x;
    if(q.dir){const delta=p.clone().sub(q.p),dir=V(...q.dir),along=delta.dot(dir);inRange=along>=0&&along<q.length&&delta.addScaledVector(dir,-along).setY(0).length()<q.r+a.player.h.x;}
    if(q.kind==='shockwave'&&p.y-a.player.h.y>.8)inRange=false;
    if(q.kind==='melee'&&Math.abs(p.y-b.p.y)>b.h.y+1)inRange=false;
    if(inRange&&a.visible(b))this.monsterHit(b,a,q.damage*(1+(this.stage-1)*.03),{area:q.kind!=='melee',status:q.kind==='pool'?{slow:2}:null});
   }
   if(q.kind==='pool')this.zones.push({owner:null,p:q.p.clone().setY(.05),r:q.r,life:5,dps:8,kind:'enemy'});
  }
  this.telegraphs=this.telegraphs.filter(q=>!q.done);
  for(const p of this.enemyBolts){p.life-=dt;const next=p.p.clone().addScaledVector(p.v,dt),ray=new T.Ray(p.p,p.v.clone().normalize()),length=p.v.length()*dt;let best=null,dist=length;
   for(const b of [...this.physics.solids,...this.world.objects,...this.alive().map(a=>a.player)]){if(!b.active||b.phased||b===p.source)continue;const hit=ray.intersectBox(new T.Box3(b.p.clone().sub(b.h),b.p.clone().add(b.h)),V());if(hit&&hit.distanceTo(p.p)<=dist){dist=hit.distanceTo(p.p);best=b;}}
   if(best){p.life=0;const a=best.actor;if(a){const front=p.source.p.clone().sub(a.player.p).normalize().dot(a.direction())>.3;if(a.spin>0||front&&a.shieldOn&&has(a,'arc:reflect')){this.damage(a,p.source,p.damage*(has(a,'cap:reflect')&&a.spin>0?3:1));a.beam(a.origin(),p.source.p,'#b4e6ff',.06,.2);a.audio.play('shield');}else this.monsterHit(p.source,a,p.damage,{projectile:true,status:p.source.kind==='leech'?{slow:1.5}:null});}else if(best.reflect){const owner=this.actors.get(best.dungeonOwner);if(owner)this.damage(owner,p.source,p.damage);}else if(best.destructible){best.hp-=p.damage;if(best.hp<=0){best.active=false;best.mesh.visible=false;}}}
   p.p.copy(next);
  }
  this.enemyBolts=this.enemyBolts.filter(p=>p.life>0);
 }
 objects(dt){for(const b of this.world.objects){if(!b.active)continue;const speed=b.v.length();if(speed>4&&b.hitTimer<=0){const a=this.actors.get(b.owner);if(a)for(const m of this.monsters)if(m.active&&overlaps({p:b.p,h:b.h.clone().addScalar(.2)},m)){this.damage(a,m,Math.min(80,speed*3));push(a,m,b.p,speed);b.hitTimer=.6;break;}}b.hitTimer=Math.max(0,b.hitTimer-dt);if(!b.held){b.v.x*=Math.exp(-(b.grounded?5:.5)*dt);b.v.z*=Math.exp(-(b.grounded?5:.5)*dt);}this.physics.step(b,dt);if(b.p.y<-5){b.active=false;b.mesh.visible=false;}}}
 tickEnvironment(dt){
  const s=this.world.spec;
  for(const a of this.alive()){
   if(a.player.p.y<-4){a.phased=0;a.entryGuard=0;a.temporaryShield=0;a.hp=0;a.dead=true;a.player.active=false;a.player.mesh.visible=false;a.keys={};a.tasks=[];this.recordDeath(a,null);continue;}
   const immune=has(a,'vision:speed')&&a.phased>0;
   if(!immune&&this.roomElapsed%8>3)for(const t of s.toxic)if(Math.hypot(a.player.p.x-t.x,a.player.p.z-t.z)<t.r&&a.player.p.y-a.player.h.y<.6)this.hurt(a,10*dt,null);
   if(!immune&&s.lasers&&this.roomElapsed%7>2){const angle=this.roomElapsed*.35,normal=V(Math.cos(angle),0,Math.sin(angle));if(Math.abs(a.player.p.dot(normal))<.35&&a.player.p.y-a.player.h.y<1.4)this.hurt(a,22*dt,null);}
   if(s.compress){const limit=Math.max(6,20-this.roomElapsed*.075);if(Math.abs(a.player.p.x)>limit||Math.abs(a.player.p.z)>limit+2)this.hurt(a,14*dt,null);}
  }
  for(const zone of this.zones){zone.life-=dt;const owner=this.actors.get(zone.owner);if(owner){const ctx=owner.damageContext;owner.damageContext={secondary:true};for(const b of this.monsters)if(b.active&&b.p.distanceTo(zone.p)<zone.r+b.h.y&&owner.visible(b,zone.p.clone().add(V(0,.6,0)))){this.damage(owner,b,zone.dps*dt);if(zone.kind==='acid'){b.shred=.4;b.shredUntil=this.time+.2;}if(zone.kind==='quake')this.status(b,{slow:.2},owner);}owner.damageContext=ctx;}else for(const a of this.alive())if(a.player.p.distanceTo(zone.p)<zone.r+a.player.h.y)this.hurt(a,zone.dps*dt,null);}
  this.zones=this.zones.filter(z=>z.life>0);
  for(const g of this.guardians){g.life-=dt;g.timer-=dt;const a=this.actors.get(g.owner);if(!a||a.dead)continue;g.p.lerp(a.player.p.clone().add(V(1.5,1,0)),Math.min(1,dt*4));if(g.timer<=0){g.timer=.5;const b=this.monsters.find(b=>b.active&&b.p.distanceTo(g.p)<25&&a.visible(b,g.p));if(b){const ctx=a.damageContext;a.damageContext={ult:true};a.beam(g.p,b.p,'#b4eac9',.09,.3);this.damage(a,b,25);a.damageContext=ctx;}}}
  this.guardians=this.guardians.filter(g=>g.life>0);
 }
 tick(dt){
  if(!Number.isFinite(dt)||dt<=0||this.phase==='done')return;this.time+=dt;
  if(this.phase==='victory'){if(this.time+1e-8>=this.victoryEndsAt)this.completeVictory();return;}
  if(this.phase!=='combat')return;
  if(!this.spawnPending.length&&!this.monsters.some(b=>b.active)){this.clearStage();return;}
  this.elapsed+=dt;this.roomElapsed+=dt;this.rules.time=Math.max(0,this.rules.time-dt);
  if(this.rules.time<=0){this.finish(false,'제한 시간 초과 · 실험 구역 봉쇄');return;}
  if(!this.alive().length){this.finish(false,'모든 플레이어가 쓰러졌습니다.');return;}
  for(const a of this.alive()){
   if(this.time-(a.lastInput||0)>1)a.keys={};a.entryGuard=Math.max(0,a.entryGuard-dt);a.world.bots=this.monsters;
   for(const k of ['root','stun','slow','deaf','dot']){a.player[k]=Math.max(0,(a.player[k]||0)-dt);a[k]=a.player[k];}
   if(a.stun>0){a.flight=0;a.dash=0;a.evadeTime=0;a.grapple=null;a.cast=null;a.charge=null;a.release(false);}
   this.camera(a);Game.prototype.tick.call(a,dt);a.player.hp=a.hp;a.player.mesh.scale.set(a.bodyScale||1,a.player.h.y/.9,a.bodyScale||1);a.player.mesh.rotation.y=a.yaw+Math.PI;a.player.sync();this.camera(a);
  }
  this.tickMonsters(dt);this.tickThreats(dt);this.objects(dt);this.tickEnvironment(dt);
  if(!this.alive().length){this.finish(false,'모든 플레이어가 쓰러졌습니다.');return;}
  if(this.phase!=='combat')return;
  if(!this.monsters.some(b=>b.active)){
   if(!this.spawnPending.length)this.clearStage();
   else{this.waveWait-=dt;if(this.waveWait<=0){const wave=this.spawnPending.shift();this.wave++;for(const kind of wave)this.spawnMonster(kind);this.waveWait=2;}}
  }
  if(this.pendingRewind)this.applyRewind();
  this.captureHistory();
 }
 captureHistory(){
  const previous=this.history.at(-1);RoundSystem.captureHistory.call(this);const saved=this.history.at(-1);if(!saved||saved===previous)return;
  saved.dungeon={wave:this.wave,waveWait:this.waveWait,spawnPending:this.spawnPending.map(w=>[...w]),roomElapsed:this.roomElapsed,monsters:[...this.monsters],states:this.monsters.map(b=>({b,armor:b.armor,cool:b.cool,summons:b.summons,phase:b.phase,shrinkUntil:b.shrinkUntil,shrinkDamage:b.shrinkDamage,dotOwner:b.dotOwner,windup:b.windup,pattern:b.pattern})),zones:this.zones.map(z=>({...z,p:z.p.clone()})),bolts:this.enemyBolts.map(p=>({...p,p:p.p.clone(),v:p.v.clone()})),threats:this.telegraphs.map(q=>({...q,p:q.p.clone()})),guardians:this.guardians.map(g=>({...g,p:g.p.clone()}))};
 }
 applyRewind(){const saved=this.history.filter(h=>h.at<=this.time-5).at(-1);if(!saved?.dungeon){this.pendingRewind=null;return;}
  const old=[...this.monsters];RoundSystem.applyRewind.call(this);const d=saved.dungeon;this.wave=d.wave;this.waveWait=d.waveWait;this.spawnPending=d.spawnPending.map(w=>[...w]);this.roomElapsed=d.roomElapsed;this.monsters=[...d.monsters];for(const b of old)if(!this.monsters.includes(b)){b.active=false;this.scene.remove(b.mesh);}this.physics.movers=this.physics.movers.filter(b=>!b.monster||this.monsters.includes(b));for(const b of this.monsters)if(!this.physics.movers.includes(b))this.physics.movers.push(b);for(const entry of d.states){const {b,...state}=entry;Object.assign(b,state);if(b.shrinkUntil>saved.at)b.shrinkUntil+=this.time-saved.at;b.mesh.scale.setScalar(b.def.size*(b.shrinkUntil>this.time?.5:1));}this.zones=d.zones.map(z=>({...z,p:z.p.clone()}));this.telegraphs=d.threats.map(q=>({...q,p:q.p.clone()}));this.enemyBolts=d.bolts.map(p=>({...p,p:p.p.clone(),v:p.v.clone()}));this.guardians=d.guardians.map(g=>({...g,p:g.p.clone()}));for(const a of this.actors.values())a.world.bots=this.monsters;
 }
 snapshot(){
  const s=super.snapshot();s.dungeon={version:2,runId:this.runId,stage:this.stage,difficulty:this.difficulty,phase:this.phase,victoryRemaining:this.phase==='victory'?Math.max(0,this.victoryEndsAt-this.time):0,title:this.world.spec.title,elapsed:this.elapsed,roomElapsed:this.roomElapsed,time:this.rules.time,limit:this.world.spec.limit,wave:this.wave,won:this.won,reason:this.reason,ready:[...this.startReady],votes:Object.fromEntries(this.votes),remaining:this.monsters.filter(b=>b.active).length,pendingWaves:this.spawnPending.length};
  s.match.round=this.stage;s.match.total=12;s.match.phase=this.phase==='done'?'done':this.phase==='combat'?'live':'buy';s.match.time=this.rules.time;s.options=this.room.options;
  s.monsters=this.monsters.filter(b=>b.active).map(b=>({id:b.id,kind:b.kind,pos:b.p.toArray(),hp:b.hp,maxHP:b.maxHP,armor:b.armor,scale:b.def.size*(b.shrinkUntil>this.time?.5:1),yaw:b.yaw||0,speed:b.v.length(),windup:b.windup,phase:b.phase}));
  s.threats=this.telegraphs.filter(q=>q.source.active).map(q=>({p:q.p.toArray(),r:q.r,left:q.left,total:q.total,kind:q.kind,dir:q.dir,length:q.length}));
  s.zones=this.zones.map(z=>({p:z.p.toArray(),r:z.r,life:z.life,kind:z.kind}));s.guardians=this.guardians.map(g=>({p:g.p.toArray(),life:g.life}));
  s.projectiles.push(...this.enemyBolts.map(p=>({pos:p.p.toArray(),radius:.16,color:p.color,kind:'enemy'})));
  for(const p of s.players){const a=this.actors.get(p.id);Object.assign(p,{build:[...a.build],pendingBuild:[...a.pendingBuild],offer:this.offers.get(a.id)||null,rerolls:a.rerolls,dashCooldown:a.dashCooldown,temporaryShield:a.temporaryShield,entryGuard:a.entryGuard,unlocked:this.rewardClaims.get(a.id)||null,bank:{base:[...a.bank.base],extra:[0,0,0],timers:[...a.bank.timers],capacity:[0,1,2].map(i=>a.bank.capacity(i))}});}
  return s;
 }
}
