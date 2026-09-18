import * as T from './three.module.js';
import {V,overlaps} from './physics.js';
import {DungeonBank} from './dungeon-data.js';
import {hitRegion,HIT_MULTIPLIERS} from './balance.js';

export const has=(a,key)=>a.build.has(key.includes(':')?key:a.agent.id+':'+key);
const nearby=(a,p,r)=>a.world.bots.filter(b=>b.active&&b.p.distanceTo(p)<r&&a.visible(b,p.clone().add(V(0,.2,0))));
export function push(a,b,from,power=12){if(b.boss)return;const d=b.p.clone().sub(from).setY(0).normalize();b.v.addScaledVector(d,power*(a.build.has('gravity')?2:1));b.v.y=Math.max(b.v.y,3);b.knockOwner=a.id;b.knockTime=.65;}
export function installDungeonAbilities(a,sim){
 a.build=new Set();a.pendingBuild=[];a.rerolls=0;a.dashCooldown=0;a.evadeTime=0;a.combatAt=-100;a.focusAt=-100;a.temporaryShield=0;a.shieldUntil=0;a.entryGuard=0;a.hasteStacks=0;a.hasteUntil=0;a.energy=0;a.ancestorCount=0;a.phaseMarks=new Set();a.bank=new DungeonBank(a);
 const old={};for(const k of ['skill','ultimate','attack','projectile','impact','melee','shootRay','castFor','schedule','releaseCharge','stowCharge','chooseExpansion','transformBane','resizeBody','tickExpansion','tickPlayer','tickTraps','lightning','wallPlan','placeWall','endPhase','spawnSoul','outgoing'])old[k]=a[k];
 const context=(value,fn)=>{const previous=a.damageContext;a.damageContext=value;try{return fn();}finally{a.damageContext=previous;}};
 a.gainUlt=()=>{}; // Dungeon progress is awarded once in DungeonEngine.clearStage only.
 a.use=i=>{const infinite=(a.agent.id==='cap'&&a.ult>0)||(a.agent.id==='pigeon'&&a.ult>0&&i===0);if(!a.bank.use(i,infinite)){a.notify('재충전 중 · '+Math.ceil(a.bank.timers[i])+'초');return false;}if(a.build.has('overclock'))a.hp=Math.max(1,a.hp-a.maxHP*.02);if(a.build.has('focus')&&a.t-a.lastDamage>=3&&a.t>=a.focusAt){a.focusAt=a.t+3;if(a.damageContext)a.damageContext.focus=true;}return true;};
 a.outgoing=n=>{if(n<=0)return n;if(a.shrinkTime>0)return 10;return n*(a.revivePower||1)*(a.ancestor?1+.25*Math.min(8,a.ancestorCount):1);};
 a.schedule=(delay,fn)=>{const ctx=a.damageContext?{...a.damageContext}:null;return old.schedule.call(a,delay,()=>context(ctx,fn));};
 a.castFor=(name,duration,done,interrupt=false)=>{
  if(has(a,'arc:snap')&&name.startsWith('타임'))duration=0;
  if(has(a,'bane:grip')&&name==='휘두르기')interrupt=false;
  const ctx=a.damageContext?{...a.damageContext}:null;
  const finish=()=>context(ctx,()=>{done();if(name.startsWith('타임')){a.hp=a.maxHP;a.bank.fill();}});
  if(duration===0){finish();return;}return old.castFor.call(a,name,duration,finish,interrupt);
 };
 a.skill=(key,override=null,scale=1)=>context({slot:key,ult:key==='R'},()=>{
  if(a.busy())return;
  if(a.copyAwait&&!override&&key!=='R'&&has(a,'widow:master')){const copied=a.copySkill;a.copyAwait=false;a.copySkill=null;return a.skill(copied.key,copied.id,1.4);}
  if(key==='E'&&a.agent.id==='ant'&&a.sizeMode&&has(a,'ant:switch')){const next=a.sizeMode==='large'?'small':'large';if(a.resizeBody(next==='large'?5:.2,next==='large'))a.sizeMode=next;return;}
  if(key==='C'&&a.agent.id==='cap'&&a.shieldAway)return old.skill.call(a,key,override,scale);
  if(key==='Q'&&a.agent.id==='bane'&&a.transformed&&!override){
   if(!a.use(0))return;
   a.castFor('손뼉치기',has(a,'bane:instant')?0:1.1,()=>{const radius=has(a,'bane:instant')?24:12;
    a.ring(a.player.p.clone().setY(.1),radius,'#a3df9d');a.audio.play('explode');
    for(const b of nearby(a,a.player.p,radius)){const delta=b.p.clone().sub(a.player.p).normalize();if(!has(a,'bane:circle')&&delta.dot(a.direction())<=.45)continue;push(a,b,a.player.p,24);b.v.y=-12;sim.status(b,{slow:3,deaf:3,stun:has(a,'bane:sonic')?2:0},a);if(has(a,'bane:sonic'))b.weakenUntil=sim.time+3;}
   });return;
  }
  if(key==='R'&&a.agent.id==='hera'&&!override){
   if(a.ultPoints<a.ultCost){a.notify('궁극기 '+a.ultPoints+' / '+a.ultCost);return;}
   const corpse=a.findCorpse();if(corpse){if(!sim.revive(corpse.id))return;}else{sim.guardians.push({owner:a.id,p:a.player.p.clone(),life:15,timer:0});a.notify('영혼의 불 · 15초간 혼령 수호자가 함께 전투합니다.');}
   a.ultPoints=0;a.ultReady=false;a.audio.play('ult');return;
  }
  if(key==='E'&&a.agent.id==='hera'&&!override){const orb=a.soulOrbs.find(o=>o.absorbAt===null&&o.expires>a.t);if(!orb){a.notify('처치 후 5초 안에 영혼 구슬을 흡수하세요.');return;}if(!a.use(1))return;orb.absorbAt=a.t;a.soulAbsorb=.7;a.souls=Math.max(0,a.souls-1);a.hp=a.hp>=a.maxHP?Math.min(a.maxHP+50,a.hp+50):Math.min(a.maxHP,a.hp+50);const target=a.world.bots.filter(b=>b.active);if(target.length)a.hitBot(target[Math.floor(sim.rng()*target.length)],25);a.audio.play('shield');return;}
  const flight=a.flight,herb=a.herb,shield=a.shieldHP,spin=a.spin,oldArrows=a.arrows.length,points=a.ultPoints,cCharges=a.bank.count(2);
  old.skill.call(a,key,override,scale);
  if(key==='R'&&a.ultPoints<points&&a.agent.id==='vision'&&a.build.has('mana'))a.beamTime*=1.15;
  if(a.agent.id==='arc'&&key==='Q'&&a.shieldHP>shield&&has(a,'arc:shield'))a.shieldHP=150;
  if(a.agent.id==='thor'&&key==='E'&&a.flight>flight&&has(a,'thor:glide'))a.flight+=3;
  if(a.agent.id==='panther'&&key==='E'&&a.herb>herb&&has(a,'panther:duration'))a.herb=15;
  if(a.agent.id==='panther'&&key==='C'&&a.bank.count(2)<cCharges&&has(a,'panther:shield')){a.temporaryShield=Math.max(a.temporaryShield,a.maxHP*.25);a.shieldUntil=a.t+5;}
  if(a.agent.id==='cap'&&key==='C'&&a.spin>spin){if(has(a,'cap:spin'))a.spin+=2;if(has(a,'cap:reflect'))a.spinScale=3;}
  if(a.agent.id==='pigeon'&&key==='E'&&oldArrows&&!a.arrows.length&&has(a,'pigeon:recover')){a.hp=Math.min(a.maxHP,a.hp+30);a.recoverSpeed=a.t+5;}
 });
 a.ultimate=()=>{old.ultimate.call(a);if(a.agent.id==='spidey')a.spiderUntil=a.t+25*(a.build.has('mana')?1.15:1);if(a.ult>0&&a.build.has('mana'))a.ult*=1.15;if(has(a,'thor:grace'))a.hp=a.maxHP;if(has(a,'widow:reset'))a.bank.fill();};
 a.attack=button=>context({slot:a.equipped==='gun'?'Q':a.equipped==='bomb'?'Q':a.scope?'C':null,melee:!a.equipped&&(button===0||a.agent.id==='thor'||a.agent.id==='pigeon'),ult:a.agent.id==='pigeon'&&button===2&&a.ult>0},()=>{
  if(a.agent.id==='widow'&&a.equipped==='gun'&&button===0&&a.cool.gun>0)return;
  old.attack.call(a,button);
  if(a.agent.id==='widow'&&button===0&&a.damageContext.slot==='Q')a.cool.gun=.18/(1+a.hasteStacks*.1);
  if(button===2&&a.equipped==='web'&&has(a,'spidey:anchor')){const h=a.aim(36),b=h?.object.userData.body;if(b?.monster)for(const other of nearby(a,b.p,3)){if(other.elite||other.boss)continue;other.v.copy(a.player.p.clone().sub(other.p).normalize().multiplyScalar(16));other.v.y+=5;other.knockTime=.6;}}
 });
 a.melee=(damage,range,cool)=>{
  if(a.agent.id==='cap'&&has(a,'cap:punch'))damage*=1.3;
  if(a.agent.id==='thor'&&has(a,'thor:hammer'))a.cool.right=0;
  const before=a.attackAnim;old.melee.call(a,damage,range,cool/(1+a.hasteStacks*.1));
  if(a.attackAnim!==before&&has(a,'spidey:wave')&&a.transformed)old.projectile.call(a,{kind:'webWave',speed:25,life:.4,damage:20,radius:.3,color:'#a9efff',context:{slot:'R',ult:true}});
 };
 a.shootRay=(damage,color,spread=0)=>{
  const piercing=has(a,'arc:repulsor')||has(a,'widow:pierce');
  const shot=()=>{if(!piercing){old.shootRay.call(a,damage,color,spread);return;}
   const dir=a.direction(),origin=a.origin(),ignore=new Set();let distance=65*(a.build.has('precision')?1.25:1),start=origin.clone();
   for(let i=0;i<30&&distance>0;i++){const h=a.raycast(start,dir,distance,ignore),end=h?.point||start.clone().addScaledVector(dir,distance);a.beam(start,end,color,.04,.2);if(!h)break;const b=h.object.userData.body;if(!b?.monster){a.damageWall(b,a.outgoing(damage));break;}const region=hitRegion(b,h.point,h.object),mult=has(a,'widow:pierce')&&region==='head'?2.5:HIT_MULTIPLIERS[region];a.hitBot(b,damage*mult);ignore.add(b);distance-=h.distance+.02;start.copy(h.point).addScaledVector(dir,.02);}
   a.audio.play('beam');a.attackAnim=.2;
  };
  shot();if(has(a,'arc:repulsor')){a.schedule(.12,shot);a.schedule(.24,shot);}
 };
 a.projectile=options=>{
  const o={...options,context:options.context||{...a.damageContext}};
  if(o.kind==='webBomb'&&has(a,'spidey:vortex'))o.enemyContact=true;
  if(a.build.has('precision')){if(o.velocity)o.velocity=o.velocity.clone().multiplyScalar(1.4);else o.speed=(o.speed||22)*1.4;o.life=(o.life||5)*1.25/1.4;}
  if(o.kind==='knife'&&has(a,'hera:knife'))o.speed=(o.speed||70)*2;
  if(o.kind==='missile'&&o.context?.slot==='C'&&has(a,'arc:buster')&&o.target?.elite)o.damage*=2;
  if(o.kind==='net'&&has(a,'widow:voltage'))o.status={...o.status,stun:o.status.stun*2};
  if(o.kind==='shield'&&has(a,'cap:bounce'))o.autoReturn=true;
  const p=old.projectile.call(a,o);p.piercing=(o.kind==='knife'&&has(a,'hera:triple'))||(o.kind==='arrow'&&o.chargeRate>=.95&&has(a,'pigeon:pierce'));
  const multi=!o.split&&((o.kind==='knife'&&has(a,'hera:triple'))||(o.kind==='change'&&has(a,'ant:triple'))||(o.kind==='arrow'&&o.arrowType>0&&has(a,'pigeon:triple')));
  if(multi)for(const angle of [-.12,.12])old.projectile.call(a,{...o,split:true,velocity:p.v.clone().applyAxisAngle(V(0,1,0),angle),piercing:p.piercing});
  return p;
 };
 a.impact=(p,point,b,hit)=>context(p.context||{},()=>{
  if(b?.monster&&p.piercing){if(!p.hit.has(b)){a.hitDirect(b,p.damage,point,hit?.object,p.status);p.hit.add(b);if(p.kind==='knife'&&has(a,'hera:knife'))a.bank.timers[0]*=.5;if(p.kind==='arrow'&&p.chargeRate>=.95&&has(a,'pigeon:wind'))for(const t of nearby(a,point,4))if(!t.boss){t.v.copy(point.clone().sub(t.p).multiplyScalar(6));t.knockTime=.4;}}p.p.copy(point).addScaledVector(p.v.clone().normalize(),.5);return false;}
  if(p.piercing&&b?.destructible&&p.kind==='arrow'){a.damageWall(b,Math.max(b.hp,p.damage));p.p.copy(point).addScaledVector(p.v.clone().normalize(),.5);return false;}
  if(p.kind==='change'&&b?.monster){sim.shrink(b,has(a,'ant:virus')?1:10,a);return true;}
  if(p.kind==='nail'&&b?.monster){b.armor=Math.max(0,b.armor-(has(a,'panther:nail')?b.armor*.8:50));if(has(a,'panther:charge'))a.energy=Math.min(has(a,'panther:capacity')?400:200,a.energy+20);}
  if(p.kind==='knife'&&b?.monster&&has(a,'hera:knife'))a.bank.timers[0]*=.5;
  if(p.kind==='webBomb'){
   if(has(a,'spidey:vortex'))for(const target of nearby(a,point,4)){if(!target.boss){target.v.copy(point.clone().sub(target.p).multiplyScalar(6));target.knockTime=.45;}}
   if(has(a,'spidey:acid'))sim.addZone(a,point,3,4,8,'acid');
  }
  if(p.kind==='net'&&b?.monster){if(has(a,'widow:voltage'))b.exposedUntil=sim.time+5;if(has(a,'widow:net')&&!p.split)for(const t of nearby(a,point,6).filter(t=>t!==b).slice(0,2))a.projectile({kind:'net',origin:point.clone(),split:true,target:t,speed:22,damage:0,status:{stun:2.5,dot:5,dotDamage:2},context:p.context,color:'#9df0d9'});}
  if(p.kind==='shield'&&b?.monster){if(has(a,'cap:shred')){b.shred=.5;b.shredUntil=sim.time+5;}if(has(a,'cap:bounce')){const next=nearby(a,point,10).find(t=>t!==b&&!p.hit.has(t));if(next&&p.hit.size<3){p.target=next;}else{p.target=null;p.returning=true;}}}
  if(p.kind==='hammer'&&b?.monster&&has(a,'thor:strike'))a.lightning(point,20,1.3);
  if(p.kind==='arrow'&&p.chargeRate>=.95&&b?.monster&&has(a,'pigeon:wind'))for(const t of nearby(a,point,4))if(!t.boss){t.v.copy(point.clone().sub(t.p).multiplyScalar(6));t.knockTime=.4;}
  const done=old.impact.call(a,p,point,b,hit);
  if(p.kind==='missile'&&has(a,'arc:splash')&&p.context?.slot==='C')context({secondary:true},()=>a.area(point,2.5,30));
  return done;
 });
 a.releaseCharge=()=>{const c=a.charge;if(!c)return;const factor=a.agent.id==='pigeon'?(has(a,'pigeon:charge')?1.5:1)*(has(a,'pigeon:night')&&a.ult>0?2:1):1;const start=c.start;c.start=a.t-(a.t-start)*factor;context({slot:'Q',ult:a.agent.id==='pigeon'&&a.ult>0},()=>old.releaseCharge.call(a));};
 a.stowCharge=()=>{old.stowCharge.call(a);if(has(a,'pigeon:switch'))a.cool.punch=0;};
 a.chooseExpansion=value=>{old.chooseExpansion.call(a,value);if(a.sizeTime>0&&has(a,'ant:duration'))a.sizeTime=40;};
 a.transformBane=()=>{if(a.agent.id!=='bane'||a.transformed)return;if(has(a,'bane:rage')&&a.rage>=70)a.rage=100;old.transformBane.call(a);if(a.transformed&&has(a,'bane:skin')){a.maxHP=350+(a.build.has('giant')?50:0);a.hp=Math.min(a.maxHP,a.hp+150);a.armor+=30;}};
 a.resizeBody=(scale,breakRoof=false)=>{const before=a.physics.solids.filter(b=>b.active);const result=old.resizeBody.call(a,scale,breakRoof);if(result&&breakRoof&&has(a,'ant:debris'))for(const b of before)if(!b.active)context({secondary:true},()=>a.area(b.p,4,35));return result;};
 a.lightning=(p,damage=20,r=1.25)=>{if(a.damageContext?.slot==='C'&&has(a,'thor:wide'))r*=2;old.lightning.call(a,p,damage,r);if(a.damageContext?.slot==='C'&&has(a,'thor:shock'))for(const b of nearby(a,p,r+1)){sim.status(b,{dot:3,dotDamage:6,slow:3},a);b.shockUntil=sim.time+3;}};
 a.wallPlan=()=>{const plan=old.wallPlan.call(a);if(!has(a,'hera:wall'))return plan;const p=plan[1];return [-2,-1,0,1,2].map(i=>({x:p.x+i*1.5*Math.cos(a.wallAngle),y:p.y,z:p.z+i*1.5*Math.sin(a.wallAngle)}));};
 a.placeWall=()=>{const result=old.placeWall.call(a);if(result)for(const b of a.thornWalls){b.dungeonOwner=a.id;b.reflect=has(a,'hera:wall');}return result;};
 a.endPhase=()=>{if(has(a,'vision:safe')&&a.physics.solids.some(b=>b.active&&overlaps(a.player,b,.002))){const origin=a.player.p.clone();let found=false;for(let r=.5;r<=12&&!found;r+=.5)for(let k=0;k<16;k++){const p=origin.clone().add(V(Math.sin(k*Math.PI/8)*r,0,Math.cos(k*Math.PI/8)*r));if(Math.abs(p.x)>sim.world.map.w/2-1||Math.abs(p.z)>sim.world.map.d/2-1||!sim.physics.floorAt(p.x,p.z))continue;if(!sim.physics.solids.some(b=>b.active&&overlaps({p,h:a.player.h},b,.01))){a.player.p.copy(p);found=true;break;}}}
  old.endPhase.call(a);if(has(a,'vision:bomb'))for(const b of a.phaseMarks)if(b.active)context({secondary:true},()=>a.hitBot(b,35));a.phaseMarks.clear();
 };
 a.spawnSoul=p=>{old.spawnSoul.call(a,p);if(has(a,'hera:double')&&a.damageContext?.slot==='Q')old.spawnSoul.call(a,p);};
 a.tickTraps=dt=>{if(has(a,'widow:trap'))for(const tr of a.traps)if(tr.timer<0&&nearby(a,tr.p,1.2).length)tr.timer=0;old.tickTraps.call(a,dt);};
 a.tickExpansion=dt=>{
  // The PvP ancestry counter is not the number of ordinary monsters killed.
  const ancestry=a.ancestor,unlocked=a.ancestorUnlocked,max=a.maxHP;a.ancestor=false;a.ancestorUnlocked=false;old.tickExpansion.call(a,dt);a.ancestor=ancestry;a.ancestorUnlocked=unlocked;
  if(ancestry){const expected=(100+(a.build.has('giant')?50:0))*(1+.25*Math.min(8,a.ancestorCount));if(expected!==max){a.maxHP=expected;a.hp=Math.min(expected,a.hp/max*expected);}else{a.maxHP=max;a.hp=Math.min(max,a.hp);}}
  if(a.agent.id==='spidey'&&has(a,'spidey:regen')&&!a.transformed)a.hp=Math.min(a.maxHP,a.hp+dt*(a.hp/a.maxHP<=.3?8:2));
  if(a.agent.id==='spidey'&&a.transformed&&has(a,'spidey:venom'))a.hp=Math.min(a.maxHP,a.hp+dt*5);
  if(a.spiderUntil&&a.t>=a.spiderUntil){a.transformed=false;a.spiderUntil=0;}
  if(a.hasteUntil<a.t)a.hasteStacks=0;
  let mult=1+a.hasteStacks*.1;
  if(a.build.has('wind')&&a.t-a.combatAt>4)mult*=1.3;
  if(a.escapeUntil>a.t)mult*=1.5;
  if(has(a,'bane:beast')&&a.transformed)mult/=.7;
  if(has(a,'cap:speed'))mult*=1.25;
  if(has(a,'arc:flight')&&a.flight>0)mult*=2;
  if(a.recoverSpeed>a.t)mult*=1.25;
  if(has(a,'panther:trail')&&a.herb>0)mult*=1.8/1.5;
  if(has(a,'vision:speed')&&a.phased>0)mult*=2;
  if(ancestry)mult*=1+.15*Math.min(8,a.ancestorCount);
  a.moveScale*=mult;
  if(a.shieldUntil<a.t)a.temporaryShield=0;
  a.energy=Math.min(has(a,'panther:capacity')?400:200,a.energy);
  a.dashCooldown=Math.max(0,a.dashCooldown-dt);
  if(a.visionFlight&&has(a,'vision:fuel'))a.flightGauge=Math.min(100,a.flightGauge+dt*.5);
  if(a.phased>0&&has(a,'vision:bomb'))for(const b of nearby(a,a.player.p,1.5))a.phaseMarks.add(b);
  if(a.agent.id==='vision'&&a.healOn&&a.healGauge>0){const rate=has(a,'vision:heal')?2:1,r=has(a,'vision:heal')?16:8;
   for(const ally of a.allies()){const own=ally===a;if(!own&&!has(a,'vision:heal'))continue;if(ally.player.p.distanceTo(a.player.p)>r||(!own&&!a.visible(ally.player)))continue;const gain=Math.max(0,Math.min(own?rate*dt:dt,ally.maxHP-ally.hp,a.healGauge));ally.hp+=gain;a.healGauge-=gain;}
   if(has(a,'vision:collapse'))for(const b of nearby(a,a.player.p,r))context({secondary:true},()=>a.hitBot(b,rate*dt));
  }
  if(a.agent.id==='hera'){
   if(a.soulOrbs.some(o=>o.absorbAt===null&&o.expires>a.t&&V(...o.pos).distanceTo(a.player.p)<6))a.hp=Math.min(Math.max(a.maxHP,a.hp),a.hp+dt);
   if(has(a,'hera:aura')&&a.killHealUntil>a.t)a.hp=Math.min(a.maxHP,a.hp+dt*3);
   if(has(a,'hera:auto')&&a.bank.count(1)>0&&a.souls&&!a.busy())a.skill('E');
  }
  if(has(a,'ant:army'))for(const ant of a.ants)if(ant.target&&ant.p.distanceTo(ant.target.p)<2)ant.target.silenceUntil=sim.time+1;
  if(a.ants.length===70&&has(a,'ant:army')&&!a.ants[0].expanded){const seed=[...a.ants];for(const ant of seed)ant.expanded=true;for(let i=0;i<80;i++)a.ants.push({...seed[i%70],p:seed[i%70].p.clone(),expanded:true});}
  if(has(a,'ant:stomp')&&a.sizeMode==='large'&&a.t>=(a.stompAt||0)){a.stompAt=a.t+.8;for(const b of nearby(a,a.player.p,3))context({secondary:true},()=>a.hitBot(b,b.elite?25:b.hp*10));a.ring(a.player.p.clone().setY(.1),3,'#f0b290');}
  if(has(a,'thor:glide')&&a.flight>0&&a.t>=(a.flightStrikeAt||0)){a.flightStrikeAt=a.t+1;const b=nearby(a,a.player.p,15)[0];if(b)a.lightning(b.p,10,1);}
  if(has(a,'cap:spin')&&a.spin>0)for(const b of nearby(a,a.player.p,2))push(a,b,a.player.p,dt*20);
  if(has(a,'arc:flight')&&a.flight>0)for(const b of nearby(a,a.player.p,1.8))if((b.flightHitAt||0)<a.t){b.flightHitAt=a.t+1;a.hitBot(b,20);push(a,b,a.player.p,12);}
  for(const wall of a.thornWalls)if(wall.active)for(const b of a.world.bots)if(b.active&&overlaps({p:wall.p,h:wall.h.clone().addScalar(.1)},b)&&(b.wallHitAt||0)<a.t){b.wallHitAt=a.t+1;context({secondary:true},()=>a.hitBot(b,10));if(has(a,'hera:stun')&&(b.wallStunAt||0)<a.t){b.wallStunAt=a.t+3;sim.status(b,{stun:2},a);}}
  if(has(a,'panther:trail')&&a.herb>0)for(const fire of a.fireTrails)for(const b of a.world.bots)if(b.active&&Math.hypot(fire.p.x-b.p.x,fire.p.z-b.p.z)>.8&&Math.hypot(fire.p.x-b.p.x,fire.p.z-b.p.z)<1.6)context({secondary:true},()=>a.hitBot(b,5*dt));
 };
 a.tickPlayer=dt=>{
  const airborne=!a.player.grounded,wasSlam=a.slam,wasThor=a.thorLand,away=a.shieldAway;
  old.tickPlayer.call(a,dt);
  if(a.evadeTime>0){a.evadeTime=Math.max(0,a.evadeTime-dt);const desired=a.evadeDir.clone().multiplyScalar(22);a.player.v.x=desired.x;a.player.v.z=desired.z;sim.physics.step(a.player,dt,0);
   if(a.build.has('flame')&&a.t>=(a.flameAt||0)){a.flameAt=a.t+.12;sim.addZone(a,a.player.p.clone().setY(.05),.75,3,8,'flame');}
   if(!a.evadeTime&&a.build.has('boots')){for(const b of nearby(a,a.player.p,3)){push(a,b,a.player.p,10);sim.status(b,{slow:2},a);}a.ring(a.player.p.clone().setY(.05),3,'#95d9ee');}
  }
  if(airborne&&a.player.grounded&&a.meteor){a.meteor=false;context({slot:'E'},()=>a.area(a.player.p,4,35));a.ring(a.player.p.clone().setY(.1),4,'#b3eafa');}
  if(wasSlam&&!a.slam&&has(a,'bane:quake'))sim.addZone(a,a.player.p.clone().setY(.05),6.8,5,12,'quake');
  if(wasThor&&!a.thorLand&&has(a,'thor:landing'))for(const b of nearby(a,a.player.p,18).slice(3,7))a.lightning(b.p,20,1);
  if(away&&!a.shieldAway&&has(a,'cap:return')){a.temporaryShield=Math.max(a.temporaryShield,a.maxHP*.2);a.shieldUntil=a.t+3;}
 };
 const jump=a.jump;a.jump=mult=>{const valid=a.player.grounded;jump.call(a,mult);if(valid&&mult>1&&has(a,'spidey:meteor')){a.meteor=true;for(const b of nearby(a,a.player.p,3))if(!b.boss){b.v.y=9;b.knockTime=.5;}}};
 const skill=a.skill;a.skill=(key,override,scale)=>{const souls=a.souls;skill(key,override,scale);if(a.agent.id==='hera'&&key==='E'&&a.souls<souls&&has(a,'hera:blast')){const b=nearby(a,a.player.p,50)[0];if(b)context({secondary:true},()=>{a.area(b.p,3,35);a.ring(b.p.clone().setY(.05),3,'#a4eac6');});}};
 a.dungeonDash=()=>{if(a.busy(false)||a.scope||a.root>0||a.dashCooldown>0||a.dead)return false;const d=V((a.keys.KeyD?1:0)-(a.keys.KeyA?1:0),0,(a.keys.KeyS?1:0)-(a.keys.KeyW?1:0));if(!d.lengthSq())d.z=-1;a.evadeDir=d.normalize().applyAxisAngle(V(0,1,0),a.yaw);a.evadeTime=.18;a.dashCooldown=3;a.audio.play('launch',.55);return true;};
}
export function applyUpgrade(a,id){
 if(a.build.has(id))return false;a.build.add(id);
 if(id==='giant'){a.maxHP+=50;a.hp+=50;}
 if(id==='steel')a.armor+=25;
 if(id==='reroll')a.rerolls+=2;
 if(id==='bane:skin'&&a.transformed){a.maxHP+=150;a.hp+=150;a.armor+=30;}
 if(id==='vision:resonance'&&a.maxHP<(a.build.has('giant')?170:120)){a.maxHP+=20;a.hp+=20;}
 if(['widow:magazine','widow:trap','pigeon:double'].includes(id))a.bank.fill();
 return true;
}
