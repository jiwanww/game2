import * as T from './three.module.js';
import {V,Body,overlaps} from './physics.js';
import {box,mat} from './world.js';
import {expansionVisuals} from './visuals.js';
import {hitRegion} from './balance.js';

export const Expansion={
 resetExpansion(){
  for(const b of this.thornWalls||[]){b.active=false;this.scene.remove(b.mesh);}this.thornWalls=[];
  Object.assign(this,{sizeMode:null,sizeTime:0,bodyScale:1,moveScale:1,shrinkTime:0,energy:0,herb:0,ancestor:false,ancestorUnlocked:false,revivePower:1,visionFlight:false,flightGauge:100,healGauge:100,healOn:false,healBought:false,phased:0,beamTime:0,souls:0,soulOrbs:[],soulAbsorb:0,wallPreview:false,wallAngle:0,ants:[],fireTrails:[],fallPeak:0,bombSelected:false});this.player.phased=false;
 },
 outgoing(n){if(n<=0)return n;if(this.shrinkTime>0)return 10;return n*(this.revivePower||1)*(this.ancestor?1+.25*(this.sim?.roundDeaths||0):1);},
 allies(){return this.sim?[...this.sim.actors.values()].filter(a=>a.team===this.team&&!a.dead):[this];},
 openExpansionMenu(kind){this.menu=kind;this.keys={};if(this.id)return;this.mode='choice';this.lockExit();document.querySelector('#ui').innerHTML='<div class="modal-back"><section class="panel"><h2>크기 변경</h2><p>20초 지속 · E로 조기 해제</p><button id="grow" class="primary">5배 커지기</button><button id="shrink">0.2배 작아지기</button><button id="cancel-size">취소</button></section></div>';for(const [id,value] of [['grow','large'],['shrink','small'],['cancel-size','cancel']])document.getElementById(id).onclick=()=>{this.chooseExpansion(value);this.play();};},
 chooseExpansion(value){if(this.menu!=='size')return;if(value==='cancel'){this.menu=null;return;}if(!['large','small'].includes(value))return;
  const scale=value==='large'?5:.2;if(!this.resizeBody(scale,value==='large')){this.notify('크기를 변경할 공간이 부족합니다.');return;}
  if(!this.sizeFree&&!this.use(1)){this.resizeBody(1);this.menu=null;return;}this.sizeFree=false;this.sizeMode=value;this.sizeTime=20*(this.sizeCopyScale||1);this.menu=null;this.audio.play('ult');
 },
 resizeBody(scale,breakRoof=false){const b=this.player,feet=b.p.y-b.h.y,target={p:V(b.p.x,feet+.9*scale,b.p.z),h:V(.36*scale,.9*scale,.36*scale)};
  const blocking=this.physics.solids.filter(s=>s.active&&overlaps(target,s,.002));
  if(blocking.some(s=>!breakRoof||!s.destructible&&s.p.y-s.h.y<feet+1.7))return false;
  if(this.physics.movers.some(s=>s!==b&&s.active&&!s.phased&&overlaps(target,s,.002)))return false;
  for(const s of blocking){s.active=false;s.mesh.visible=false;this.burst(s.p,'#c8b599',8,2);}
  if(this.physics.movers.some(s=>s!==b&&s.active&&!s.phased&&overlaps(target,s,.002)))return false;
  b.p.copy(target.p);b.h.copy(target.h);this.bodyScale=scale;b.sync();return true;
 },
 expansionSkill(key,id,scale,copied){
  if(this.phased>0){if(key==='Q')this.endPhase();return true;}
  if(id==='panther'&&key==='R'&&this.ancestorUnlocked){this.ancestor=!this.ancestor;return true;}
  if(!['ant','hera','panther','vision'].includes(id))return false;
  const take=i=>copied||this.use(i);
  if(key==='R'){
   if(this.ultPoints<this.ultCost){this.notify(`궁극기 ${this.ultPoints} / ${this.ultCost}`);return true;}
   if(id==='hera'){const corpse=this.findCorpse();if(!corpse){this.notify('8m 내의 아군 잔해를 조준하세요.');return true;}this.sim.revive(corpse.id);}
   if(id==='ant'){const history=this.sim||this.timeline;if(!history?.history?.some(h=>h.at<=history.time-5)){this.notify('현재 라운드의 5초 기록이 필요합니다.');return true;}this.castFor('양자역학 · 무방비',2,()=>history.requestRewind(this),false);}
   if(id==='panther'){this.ancestorUnlocked=true;this.ancestor=true;}
   if(id==='vision')this.beamTime=3;
   this.ultPoints=0;this.ultReady=false;this.audio.play('ult');return true;
  }
  if(id==='ant'){
   if(key==='E'){if(this.sizeMode){if(this.resizeBody(1)){this.sizeMode=null;this.sizeTime=0;}return true;}if(copied||this.bank.count(1)>0){this.sizeFree=copied;this.sizeCopyScale=scale;this.openExpansionMenu('size');}else this.notify('크기변경 충전이 필요합니다.');}
   if(key==='Q'&&take(0)){this.projectile({kind:'change',speed:32,damage:0,radius:.11,color:'#fb9d88',scale});this.audio.play('beam');}
   if(key==='C'&&take(2)){const targets=this.world.bots.filter(b=>b.active&&b.p.distanceTo(this.player.p)<12&&this.visible(b));for(let i=0;i<70;i++)this.ants.push({p:this.player.p.clone().add(V(Math.sin(i)*.6,-this.player.h.y+.1,Math.cos(i)*.6)),target:targets[i%targets.length]||null,life:5,scale});this.audio.play('web');}
  }
  if(id==='hera'){
   if(key==='Q'&&take(0)){this.projectile({kind:'knife',speed:70,damage:20*scale,radius:.045,color:'#96ffd2',scale});this.audio.play('launch');}
   if(key==='E'){const orb=this.soulOrbs.find(o=>o.absorbAt===null&&o.expires>this.t);if(!orb){this.notify('처치 후 5초 안에 영혼 구슬을 흡수하세요.');return true;}if(take(1)){orb.absorbAt=this.t;this.soulAbsorb=.7;this.souls=Math.max(0,this.souls-1);this.hp=this.hp>=100?Math.min(150,this.hp+50*scale):Math.min(this.maxHP,this.hp+50*scale);const enemies=this.world.bots.filter(b=>b.active);if(enemies.length)this.hitBot(enemies[Math.floor(Math.random()*enemies.length)],25*scale);this.audio.play('shield');}}
   if(key==='C'){if(!this.wallPreview){if(copied||this.bank.count(2)>0){this.wallPreview=true;this.wallFree=copied;this.wallScale=scale;this.wallAngle=this.yaw;}else this.notify('가시 장벽을 구매하세요.');}else if(this.placeWall()){this.wallPreview=false;}}
  }
  if(id==='panther'){
   if(key==='Q'&&take(0)){this.projectile({kind:'nail',speed:36,damage:10*scale,radius:.24,color:'#d2a6ff',scale});this.audio.play('launch');}
   if(key==='E'&&take(1)){this.herb=8*scale;this.audio.play('launch');}
   if(key==='C'&&take(2)){this.area(this.player.p,6*scale,this.energy);for(const b of this.world.bots)if(b.active&&b.p.distanceTo(this.player.p)<6*scale&&this.visible(b)){b.v.add(b.p.clone().sub(this.player.p).normalize().multiplyScalar(18*scale));b.v.y+=4;}this.energy=0;this.ring(this.player.p,6*scale,'#cc9aff');this.audio.play('explode');}
  }
  if(id==='vision'){
   if(key==='E'){if(this.flightGauge>0){this.visionFlight=!this.visionFlight;this.audio.play('flight');}}
   if(key==='Q'&&take(0)){this.phased=8*scale;this.player.phased=true;this.equipped=null;this.release(false);this.audio.play('web');}
   if(key==='C'){if(!this.healBought){if(!take(2))return true;this.healBought=true;this.healGauge=100*scale;}if(this.healGauge>0)this.healOn=!this.healOn;}
  }
  return true;
 },
 findCorpse(){if(!this.sim)return null;const ray=new T.Ray(this.origin(),this.direction());return this.sim.corpses.filter(c=>c.team===this.team&&this.sim.actors.get(c.id)?.dead).map(c=>({c,d:ray.distanceToPoint(V(...c.pos).add(V(0,.2,0)))})).filter(x=>x.d<.65&&V(...x.c.pos).distanceTo(this.player.p)<8&&!this.raycast(this.origin(),V(...x.c.pos).add(V(0,.2,0)).sub(this.origin()),this.origin().distanceTo(V(...x.c.pos))-.4)).sort((a,b)=>a.d-b.d)[0]?.c;},
 wallPlan(){const p=this.player.p.clone().addScaledVector(this.direction().setY(0).normalize(),3.2);p.y=this.player.p.y-this.player.h.y;return [0,1,2].map(i=>{const x=p.x+(i-1)*1.5*Math.cos(this.wallAngle),z=p.z+(i-1)*1.5*Math.sin(this.wallAngle);return {x,y:p.y+2,z};});},
 placeWall(){const plan=this.wallPlan(),angle=this.wallAngle;const hx=.75*Math.abs(Math.cos(angle))+.25*Math.abs(Math.sin(angle)),hz=.75*Math.abs(Math.sin(angle))+.25*Math.abs(Math.cos(angle));
  if(plan.some(p=>[...this.physics.solids,...this.physics.movers].some(b=>b.active&&overlaps({p:V(p.x,p.y,p.z),h:V(hx,2,hz)},b,.01)))){this.notify('장벽 설치 공간이 부족합니다.');return false;}
  if(!this.wallFree&&!this.use(2))return false;
  for(const p of plan){const mesh=box(1.5,4,.5,'#6ea78e',p.x,p.y,p.z,this.scene);mesh.rotation.y=-angle;const b=new Body(V(p.x,p.y,p.z),V(hx,2,hz),mesh);b.thorn=true;b.owner=this.id||'solo';b.hp=400*(this.wallScale||1);b.destructible=true;b.decay=10;b.contacts={};mesh.userData.body=b;this.physics.solids.push(b);this.thornWalls.push(b);if(this.sim)this.sim.dynamicWalls.push(b);else this.world.colliders.push(mesh);}
  this.wallFree=false;this.audio.play('shield');return true;
 },
 damageWall(b,n){if(!b?.destructible||!b.active)return;b.hp-=n;if(b.hp<=0){b.active=false;b.mesh.visible=false;this.burst(b.p,'#a3c9af',10,1);}},
 expansionImpact(p,point,b,hit){
  if(b?.destructible)this.damageWall(b,this.outgoing(p.damage||0));
  if(p.kind==='change'&&b?.bot){const target=b.actor;if(target){if(target.team===this.team)return true;target.shrinkTime=5*(p.scale||1);target.resizeBody(.5);}else{b.shrinkTime=5*(p.scale||1);b.originalH??=b.h.clone();b.h.copy(b.originalH).multiplyScalar(.5);b.mesh.scale.setScalar(.5);}this.burst(point,'#ffbb9a',8,1);return true;}
  if(p.kind==='nail'&&b?.actor&&b.actor.team!==this.team)b.actor.armor=Math.max(0,b.actor.armor-50*(p.scale||1));
  if(p.kind==='knife'&&b?.bot&&hitRegion(b,point,hit?.object)==='head'&&Math.random()<.0005){this.hitBot(b,10000);return true;}
  return false;
 },
 endPhase(){this.phased=0;this.player.phased=false;if(this.physics.solids.some(b=>b.active&&overlaps(this.player,b,.002))){this.hp=1;this.armor=0;this.hurt(10000);}},
 spawnSoul(position){if(!['hera','widow'].includes(this.agent.id))return;this.soulOrbs.push({pos:position.toArray(),born:this.t,expires:this.t+5,absorbAt:null});this.souls=this.soulOrbs.filter(o=>o.absorbAt===null&&o.expires>this.t).length;},
 tickExpansion(dt){
  this.soulOrbs=this.soulOrbs.filter(o=>o.absorbAt===null?o.expires>this.t:this.t-o.absorbAt<.7);this.souls=this.soulOrbs.filter(o=>o.absorbAt===null&&o.expires>this.t).length;this.soulAbsorb=Math.max(0,this.soulAbsorb-dt);
  if(this.dead)return;if(!this.id&&this.frame%6===0){this.trainingVisuals??={g:this,me:this};const s={ants:this.ants.map(a=>a.p.toArray()),fire:this.fireTrails.map(f=>f.p.toArray()),projectiles:this.projectiles.map(p=>({kind:p.kind,dropped:p.dropped,pos:p.p.toArray()})),walls:[],corpses:[]};this.trainingVisuals.me={wallPreview:this.wallPreview,wallPlan:this.wallPreview?this.wallPlan():[],wallAngle:this.wallAngle};expansionVisuals(this.trainingVisuals,s);}if(this.stun>0){this.beamTime=0;this.visionFlight=false;this.herb=0;}
  if(this.sizeTime>0){this.sizeTime=Math.max(0,this.sizeTime-dt);if(!this.sizeTime&&this.resizeBody(1))this.sizeMode=null;}
  if(this.shrinkTime>0){this.shrinkTime=Math.max(0,this.shrinkTime-dt);if(!this.shrinkTime){if(!this.resizeBody(this.sizeMode==='large'?5:this.sizeMode==='small'?.2:this.agent.id==='bane'&&this.transformed?1.15:1)){this.shrinkTime=.1;}}}
  if(this.sizeMode&&this.sizeTime===0&&this.resizeBody(1))this.sizeMode=null;
  if(this.agent.id==='bane'&&this.transformed&&!this.shrinkTime&&this.bodyScale!==1.15)this.resizeBody(1.15);
  this.herb=Math.max(0,this.herb-dt);this.moveScale=(this.sizeMode==='large'?.5:this.sizeMode==='small'?5:1)*(this.herb>0?1.5:1)*(this.ancestor?1+.15*(this.sim?.roundDeaths||0):1);
  if(this.ancestorUnlocked){const max=100*(1+(this.ancestor?.25:0)*(this.sim?.roundDeaths||0));if(this.maxHP!==max){this.hp=this.hp/this.maxHP*max;this.maxHP=max;}}
  if(this.agent.id==='vision'||this.visionFlight){if(this.visionFlight){this.flightGauge=Math.max(0,this.flightGauge-dt);if(!this.flightGauge)this.visionFlight=false;this.flight=dt*2;this.flightKind='arc';this.ascend=!!this.keys.Space;}else this.flightGauge=Math.min(100,this.flightGauge+dt*.5);}
  if(this.phased>0){this.phased-=dt;if(this.phased<=0)this.endPhase();}
  if(this.healOn&&this.healGauge>0){for(const ally of this.allies())if(ally!==this&&ally.player.p.distanceTo(this.player.p)<=8&&this.visible(ally.player)){const amount=Math.min(dt,ally.maxHP-ally.hp,this.healGauge);if(amount>0){ally.hp+=amount;this.healGauge-=amount;}}if(this.healGauge<=0)this.healOn=false;}
  if(this.agent.id==='hera'){const spike=this.sim?.rules.spike||this.spike;let p;if(spike?.state==='planted')p=this.sim?V(spike.position.x,0,spike.position.z):V(0,0,9);else if(spike?.carrier)p=this.sim?.actors.get(spike.carrier)?.player.p;if(p&&this.player.p.distanceTo(p)<6)this.hp=Math.min(Math.max(100,this.hp),this.hp+dt);}
  for(let i=this.ants.length-1;i>=0;i--){const ant=this.ants[i];ant.life-=dt;if(!ant.target?.active)ant.target=this.world.bots.find(b=>b.active&&b.p.distanceTo(ant.p)<12&&this.visible(b,ant.p.clone().add(V(0,.4,0))));if(ant.target){const end=ant.target.p.clone();end.y-=ant.target.h.y-.12;const dir=end.sub(ant.p),step=Math.min(dir.length(),dt*8);if(!this.raycast(ant.p.clone().add(V(0,.1,0)),dir,step)){ant.p.addScaledVector(dir.normalize(),step);}if(ant.p.distanceTo(ant.target.p)<ant.target.h.y+.25){this.hitBot(ant.target,1*ant.scale);ant.target.antSlow=Math.min(.8,(ant.target.antSlow||0)+.2);ant.target.antSlowTime=1;ant.life=0;}}if(ant.life<=0)this.ants.splice(i,1);}
  if(this.herb>0){this.fireAt=(this.fireAt||0)-dt;if(this.fireAt<=0){this.fireAt=.15;this.fireTrails.push({p:this.player.p.clone().add(V(0,-this.player.h.y+.1,0)),life:1.3});}}
  for(const fire of this.fireTrails)fire.life-=dt;this.fireTrails=this.fireTrails.filter(f=>f.life>0);
  for(const b of this.world.bots)if(b.active&&this.fireTrails.some(f=>Math.hypot(f.p.x-b.p.x,f.p.z-b.p.z)<.8&&Math.abs(b.p.y-b.h.y-f.p.y)<1))this.hitBot(b,this.outgoing(5)*dt,null,true);
  if(this.beamTime>0){this.beamTime=Math.max(0,this.beamTime-dt);const start=this.origin(),dir=this.direction(),h=this.raycast(start,dir,40,new Set(this.world.bots)),length=h?.distance||40;for(const b of this.world.bots){const delta=b.p.clone().sub(start),along=delta.dot(dir);if(b.active&&along>=0&&along<length&&delta.addScaledVector(dir,-along).length()<1.5+b.h.x&&this.visible(b)){this.hitBot(b,this.outgoing(25)*dt,{dot:5,dotDamage:5},true);}}if(this.frame%4===0){const end=start.clone().addScaledVector(dir,length),muzzle=start.clone().addScaledVector(dir,Math.min(.9,length));this.beam(muzzle,end,'#bd79ff',.8,.15,.2);this.beam(muzzle,end,'#ffb94f',.4,.15,.55);this.beam(muzzle,end,'#fff8da',.12,.15,1);}}
  for(const b of this.thornWalls){if(!b.active)continue;b.decay-=dt;if(b.decay<=0){b.decay+=10;this.damageWall(b,100);}const bodies=this.sim?[...this.sim.actors.values()].filter(a=>!a.dead&&a!==this).map(a=>a.player):this.world.bots;for(const target of bodies){const id=target.actor?.id||this.world.bots.indexOf(target);b.contacts[id]=Math.max(0,(b.contacts[id]||0)-dt);if(!b.contacts[id]&&overlaps({p:b.p,h:b.h.clone().addScalar(.08)},target)){b.contacts[id]=1;if(target.actor)this.sim.hurt(target.actor,10,this.player);else this.hitBot(target,10);}}}
  const b=this.player;if(b.antSlowTime>0){b.antSlowTime-=dt;this.moveScale*=Math.max(.2,1-(b.antSlow||0));}else b.antSlow=0;
 }
};
