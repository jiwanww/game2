import * as T from './three.module.js';
import {AGENTS} from './agents.js';
import {V} from './physics.js';
import {box,sphere,cylinder,mat} from './world.js';
const $=s=>globalThis.document?.querySelector(s),ui=$('#ui'),clamp=T.MathUtils.clamp;
export class AbilitySystem {
 skill(key,override=null,scale=1){
  if(this.busy())return;if(this.scope&&key==='R'){this.notify('조준경을 해제한 후 궁극기를 사용하세요.');return;}if(this.copyAwait&&!override&&key!=='R'){const c=this.copySkill;this.copyAwait=false;this.copySkill=null;this.skill(c.key,c.id,.7);if(this.charge)this.charge.releaseKey=key;return;}const id=override||this.agent.id;const copied=!!override;const take=i=>copied||this.use(i);if(this.expansionSkill(key,id,scale,copied))return;if(key==='R'){if(this.ultPoints<this.ultCost){this.notify(`궁극기 포인트 ${this.ultPoints} / ${this.ultCost}`);return;}if(this.ult>0||id==='spidey'&&this.transformed){this.notify('궁극기가 이미 활성화되어 있습니다.');return;}if(id==='bane'&&!this.transformed){this.notify('분노 100에 변신한 후 사용할 수 있습니다.');return;}this.shieldOn=false;this.release(false);this.equipped=null;this.updateHeldVisual();this.ultPoints=0;this.ultReady=false;this.ultimate();return;}
  if(id==='bane'&&!this.transformed&&!copied){this.notify('주고받은 피해로 분노를 100까지 채우세요.');return;}if(this.scope){if(key==='C'){this.scope=0;this.equipped=null;}else this.notify('유도탄 조준 중입니다. C 또는 1로 해제하세요.');return;}
  if(id==='spidey'){
   if(key==='Q'){if(!copied&&this.bank.count(0)<=0){this.notify('거미줄 폭탄을 구매하세요.');return;}this.equipped=this.equipped==='bomb'?null:'bomb';this.bombScale=scale;this.bombFree=copied;}
   if(key==='E'){if(!this.player.grounded){this.notify('지면에서 슈퍼 점프를 사용하세요.');return;}if(take(1)){this.jump((this.transformed&&this.agent.id==='spidey'?3:2.55)*scale);this.ring(this.player.p.clone().setY(.06),1.3,this.agent.color);}}
   if(key==='C'){if(this.webTime>0){this.equipped=this.equipped==='web'?null:'web';}else if(take(2)){this.webTime=10*scale;this.webScale=scale;this.equipped='web';this.notify('좌클릭 이동 · 우클릭 물체 잡기 → 시점을 돌린 뒤 놓기',4);}}
  }
  if(id==='arc'){
   if(key==='Q'){if(this.shieldHP>0){this.shieldOn=!this.shieldOn;}else if(take(0)){this.shieldHP=50*scale;this.shieldOn=true;}this.shieldKind='arc';this.audio.play('shield');}
   if(key==='E'&&take(1)){this.flight=8*scale;this.flightKind='arc';this.flightScale=scale;this.ascend=true;this.audio.play('launch');this.notify('활공 · Space로 상승 켜기 / 끄기');}
   if(key==='C'){if(!copied&&this.bank.count(2)<=0){this.notify('유도탄을 구매하세요.');return;}this.castFor('유도탄 조준경 전개',.3*scale,()=>{this.scope=1;this.scopeScale=scale;this.scopeFree=copied;this.equipped='scope';});}
  }
  if(id==='bane'){
   if(key==='Q'&&take(0))this.castFor('손뼉치기',1.1*scale,()=>{const d=this.direction();this.audio.play('explode');this.ring(this.player.p.clone().setY(.06),12*scale,'#b7efa0');for(const b of this.world.bots){const delta=b.p.clone().sub(this.player.p);if(b.active&&delta.length()<12*scale&&delta.normalize().dot(d)>.45&&this.visible(b)){b.v.add(delta.multiplyScalar(24*scale));b.v.y=-12*scale;b.slow=3*scale;b.deaf=3*scale;this.burst(b.p,'#b4ee9e',15,1);}}});
   if(key==='E'&&take(1)){this.dash=.84*scale;this.dashDir=this.direction();this.dashDir.y=0;this.dashDir.normalize();this.dashHits=new Set();this.dashScale=scale;this.audio.play('launch');}
   if(key==='C'){const h=this.aim(3.3*scale);const b=h?.object.userData.body;if(!b?.bot){this.notify('잡을 적에게 가까이 접근하세요.');return;}if(take(2)){const token={};this.grabToken=token;this.castFor('휘두르기',3*scale,()=>{this.grabToken=null;},true);for(let n=1;n<=4;n++)this.schedule(n*.72*scale,()=>{if(this.cast&&this.grabToken===token&&b.active){this.hitBot(b,25*scale,{stun:.8*scale});b.v.y=3*scale;this.beam(this.origin(),b.p,'#b7efa0',.09,.14);this.ring(b.p.clone().setY(.08),.8,'#b7efa0');}});}}
  }
  if(id==='cap'){
   if(this.shieldAway&&key!=='R'){this.notify('떨어진 방패에 접근해 F로 회수하세요.');return;}
   if(key==='E'&&(this.cool.shield<=0||this.ult>0)){this.shieldOn=!this.shieldOn;this.shieldKind='cap';this.capScale=scale;this.cool.shield=2;this.audio.play('shield');}
   if(key==='Q'){if(copied||this.bank.count(0)>0||this.ult>0){this.shieldOn=false;this.charge={kind:'cap',start:this.t,scale,free:copied};this.audio.play('charge');}else this.notify('방패 던지기를 구매하세요.');}
   if(key==='C'&&take(2)){this.spin=3.5*scale;this.audio.play('shield');this.spinScale=scale;}
  }
  if(id==='thor'){
   if(key==='Q'){if(this.hammer){this.hammer.returning=true;this.hammer.life=8;this.hammer.hit.clear();this.audio.play('web');}else if(take(0)){this.hammer=this.projectile({kind:'hammer',speed:22,damage:50*scale,life:8,radius:.2,color:'#ccdcff',returning:false,scale});this.hammer.mesh.geometry.dispose();this.hammer.mesh.geometry=new T.BoxGeometry(.35,.23,.23);this.audio.play('launch');}}
   if(key==='E'&&take(1)){this.flight=4*scale;this.flightKind='thor';this.flightScale=scale;this.ascend=true;this.thorLand=scale;this.audio.play('launch');}
   if(key==='C'&&take(2)){const origin=this.player.p.clone(),dir=this.direction();dir.y=0;dir.normalize();const wall=this.raycast(this.origin(),dir,40*scale,new Set(this.world.bots));const maxDistance=wall&&!wall.object.userData.body?.bot?wall.distance:40*scale;this.castFor('번개 공격',2*scale,()=>{for(let n=0;n<16;n++){const p=origin.clone().addScaledVector(dir,2+n*2.4*scale);if(p.distanceTo(origin)>maxDistance)break;this.schedule(n*.12*scale,()=>this.lightning(p,20*scale,2.5*scale));}});}
  }
  if(id==='widow'){
   if(key==='Q'){if(copied||this.bank.count(0)>0){this.equipped=this.equipped==='gun'?null:'gun';this.gunScale=scale;this.gunFree=copied;}else this.notify('총 스킬 탄환을 구매하세요.');}
   if(key==='E'&&take(1)){this.projectile({kind:'net',speed:22,gravity:3,color:'#a8f7eb',radius:.14,damage:0,status:{stun:2.5*scale,dot:5*scale,dotDamage:2*scale}});this.audio.play('electric');}
   if(key==='C'&&take(2)){const m=cylinder(.28,.3,.08,'#e29cc7');m.position.copy(this.player.p);m.position.y-=this.player.h.y-.06;this.scene.add(m);this.traps.push({mesh:m,p:m.position.clone(),timer:-1,beep:0,scale});this.audio.play('buy');}
  }
  if(id==='pigeon'){
   if(key==='Q'){if(copied||this.bank.count(0)>0||this.ult>0){this.charge={kind:'arrow',start:this.t,scale,free:copied};this.audio.play('charge');}else this.notify('화살이 없습니다. E로 회수하거나 B로 구매하세요.');}
   if(key==='E'){if(!this.arrows.length){this.notify('회수할 화살이 없습니다.');return;}if(take(1)){const n=this.arrows.length;this.bank.extra[0]=Math.min(this.agent.skills[0][3]-this.bank.base[0],this.bank.extra[0]+Math.floor(n*scale));const specials=this.arrows.filter(a=>a.type>0).length;this.bank.extra[2]=Math.min(this.agent.skills[2][3]-this.bank.base[2],this.bank.extra[2]+specials);for(const a of this.arrows){this.beam(a.p,this.origin(),'#7ef0d3',.01,.4);if(a.mesh)this.scene.remove(a.mesh);}this.arrows=[];this.audio.play('web');this.notify(`화살 ${n}개 회수`);}}
   if(key==='C'){if(copied){this.arrowType=1;this.specialFree=true;this.notify('복제 스턴 화살 장착 · Q 홀드 후 놓기');this.charge={kind:'arrow',start:this.t,scale,free:true};}else if(this.bank.count(2)>0){this.arrowSelection=this.arrowType;this.arrowMenu=true;this.mode='arrow';this.lockExit();this.renderArrows();}else this.notify('특수 화살을 구매하세요.');}
  }
  this.updateHeldVisual();
 }
 stowCharge(){if(this.charge?.kind==='arrow')this.cool.punch=Math.max(this.cool.punch||0,.7);this.charge=null;}
 releaseCharge(){const c=this.charge;if(!c)return;this.stowCharge();const rate=clamp((this.t-c.start)*(this.agent.id==='pigeon'&&this.ult>0?2:1)/1.4,.05,1);if(!c.free&&!this.use(0))return;this.audio.play('launch');this.attackAnim=.3;
  if(c.kind==='cap'){this.shieldAway=true;const p=this.projectile({kind:'shield',speed:18+rate*14,damage:Math.max(5,80*rate)*c.scale,radius:.3,color:'#a8d6ff',life:5,returning:false,autoReturn:rate<.5,scale:c.scale});p.mesh.geometry.dispose();p.mesh.geometry=new T.CylinderGeometry(.3,.3,.06,16);p.mesh.rotation.x=Math.PI/2;}
  else {let type=this.ult>0?0:this.arrowType||0;if(type&&!this.specialFree&&!this.use(2))type=0;this.specialFree=false;this.projectile({kind:'arrow',speed:12+rate*36,gravity:7,damage:Math.max(3,50*rate)*c.scale,color:type===1?'#b9a8ff':type===2?'#ffd084':'#95efd8',radius:.045,life:8,arrowType:type,chargeRate:rate,scale:c.scale,status:type===1?{stun:2*rate*c.scale}:null});}this.updateHeldVisual();
 }
 renderArrows(){ui.innerHTML=`<div class="modal-back"><section class="panel" style="max-width:700px"><div class="eyebrow">SPECIAL ARROW</div><h2>화살 선택</h2><p class="small">마우스 휠로 선택 · C 또는 아래 버튼으로 장착</p><div class="shop-grid">${['기본 화살','스턴 화살','폭발 화살'].map((n,i)=>`<button class="shop-item ${i===this.arrowSelection?'active':''}" data-arrow="${i}"><h3>${n}</h3><p>${['최대 50 피해','차징에 따라 최대 2초 기절','명중 지점 반경 1m · 30 피해'][i]}</p></button>`).join('')}</div><div class="bottomline"><button id="confirm-arrow" class="primary">선택 장착</button></div></section></div>`;ui.querySelectorAll('[data-arrow]').forEach(b=>b.onclick=()=>{this.arrowSelection=+b.dataset.arrow;this.renderArrows();});$('#confirm-arrow').onclick=()=>this.confirmArrow();}
 confirmArrow(){this.arrowType=this.arrowSelection;this.arrowMenu=false;this.play();this.notify(['기본 화살','스턴 화살','폭발 화살'][this.arrowType]+' 장착');}
 ultimate(){const id=this.agent.id;this.audio.play('ult');this.burst(this.player.p,this.agent.color,35,3);
  if(id==='spidey'){this.transformed=true;this.notify('스파이더 변신 · 기동력 / 펀치 강화',3);}
  if(id==='arc')this.castFor('타임 스냅 · 무방비',3,()=>{this.hp=100;this.armor=50;this.armorType=1;this.reserve=0;this.bank.fill();this.shieldHP=0;this.notify('체력 · 방어구 · 일반 스킬 복원');this.audio.play('shield');});
  if(id==='bane'){this.slam=true;this.slamTime=2;this.player.v.y=9;this.notify('내려찍기');}
  if(id==='cap'){this.ult=15;this.notify('슈퍼혈청 · 15초간 스킬 무제한');}
  if(id==='thor'){this.ult=8;this.ultTick=0;this.ultIndex=0;this.notify('라이트닝 · 8초간 표적 추적');}
  if(id==='pigeon'){this.ult=8;this.notify('나이트 에로우 · 화살 무한 / 차징 2배 / 우클릭 검');}
  if(id==='widow'){this.mode='copy';this.lockExit();ui.innerHTML=`<div class="modal-back"><section class="panel"><div class="eyebrow">SPY / COPY ABILITY</div><h2>복제할 일반 스킬 선택</h2><p class="small">선택한 스킬을 1회 사용합니다. 수치 효과는 원본의 70%입니다.</p><div class="copy-list">${AGENTS.flatMap(a=>a.skills.slice(0,3).map(s=>`<button data-copy="${a.id}:${s[0]}">${a.name} · ${s[1]}<small>${s[0]} / 효과 70%</small></button>`)).join('')}</div></section></div>`;ui.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{const [id,key]=b.dataset.copy.split(':');this.copySkill={id,key};this.copyAwait=true;this.play();this.notify('복제 준비 · Q / E / C 중 하나를 눌러 사용하세요.',4);});}
 }
 lightning(p,damage=20,r=1.25){const ground=p.clone();ground.y=Math.max(.07,ground.y-.8);const end=ground.clone().add(V(0,8,0));const obstruction=this.raycast(end,V(0,-1,0),8);if(obstruction&&!obstruction.object.userData.body?.bot&&obstruction.point.y>ground.y+.35){this.beam(end,obstruction.point,'#d4c3ff',.08,.25);this.burst(obstruction.point,'#c5d4ff');this.audio.play('electric');return;}const mid=ground.clone().add(V(.4,4,.3));this.beam(end,mid,'#d4c3ff',.09,.25);this.beam(mid,ground,'#adccff',.08,.25);this.ring(ground,r,'#b1cfff');this.area(ground.clone().add(V(0,.8,0)),r,damage);this.audio.play('electric');}
 attack(button){if(this.phased>0||this.bombSelected)return;if(this.wallPreview){if(button===2)this.wallAngle=(this.wallAngle||0)+Math.PI/8;return;}if(this.shieldOn||this.charge)return;const id=this.agent.id;
  if(this.equipped==='bomb'){if(this.bombFree||this.use(0)){const scale=this.bombScale||1;const vel=button===2?V(0,-5,0).addScaledVector(this.direction(),3):this.direction().multiplyScalar(18).add(V(0,5,0));this.projectile({kind:'webBomb',velocity:vel,gravity:16,radius:.15,color:'#d5fcfb',scale});this.audio.play('web');this.bombFree=false;this.equipped=null;this.updateHeldVisual();}return;}
  if(this.equipped==='web'&&this.webTime>0){const h=this.aim(36*(this.webScale||1));if(!h){this.notify('벽, 물체 또는 표적을 조준하세요.');return;}const b=h.object.userData.body;this.audio.play('web');if(button===0){this.grapple={point:h.point.clone(),target:b?.bot?b:null,time:1.3};this.beam(this.origin(),h.point,'#d8fcff',.025,.35);}else if(button===2){if(b?.movable){this.hold=b;b.held=true;this.holdDistance=Math.min(5,Math.max(2.2,h.distance));this.dragAmount=0;this.dragVelocity=V();this.holdStart=this.t;}else if(b?.bot){b.v.copy(this.player.p.clone().sub(b.p).normalize().multiplyScalar(16*(this.webScale||1)));b.v.y+=5;this.beam(this.origin(),b.p,'#d8fcff',.03,.35);}else this.notify('우클릭으로 이동 가능한 물체·적만 당길 수 있습니다.');}return;}
  if(this.equipped==='scope'&&this.scope){if(button!==0)return;const targets=this.world.bots.filter(b=>b.active&&this.inScope(b)&&this.visible(b));if(!targets.length){this.notify('원형 조준경 안의 보이는 표적을 조준하세요.');return;}if(!this.scopeFree&&!this.use(2))return;this.scopeFree=false;for(const b of targets)this.projectile({kind:'missile',target:b,speed:18,damage:80*(this.scopeScale||1),radius:.1,color:'#ffda8d',life:5});this.audio.play('launch');this.scope=0;this.equipped=null;return;}
  if(this.equipped==='gun'){const free=this.gunFree;if(button===0&&(free||this.use(0))){this.shootRay(20*(this.gunScale||1),'#ffdbc1');if(free)this.gunFree=false;}if(free&&button===0||!this.gunFree&&this.bank.count(0)===0&&!this.sim?.room.options.unlimited){this.equipped=null;this.updateHeldVisual();}return;}
  if(button===0){this.melee(id==='bane'&&this.transformed?80:id==='spidey'&&this.transformed?40:this.agent.punch,2.3*(this.sizeMode==='large'?5:1),id==='bane'&&this.transformed?1.6:id==='spidey'&&this.transformed?.28:this.agent.cadence);}
  if(button===2){if(id==='arc'&&this.cool.right<=0){this.cool.right=3.6;this.shootRay(50,'#ffce80',this.flight>0?.0025:0);}if(id==='thor'&&this.cool.right<=0&&!this.hammer){this.cool.right=1.6;this.melee(50,2.7,0);}if(id==='pigeon'&&this.ult>0){this.melee(50,2.5,0);this.beam(this.origin().addScaledVector(this.direction(),.4),this.origin().addScaledVector(this.direction(),1.5),'#bcb0ff',.035,.16);}}
 }
 inScope(b){const projected=b.p.clone().project(this.camera);if(projected.z>1||projected.z<0)return false;const x=projected.x*innerWidth/2,y=projected.y*innerHeight/2;return Math.hypot(x,y)<innerHeight*.27;}
 release(throwIt=true){if(!this.hold)return;const b=this.hold;b.held=false;if(throwIt){if(this.dragAmount>14&&this.t-this.holdStart>.1){b.v.copy(this.dragVelocity).addScaledVector(this.direction(),12);b.v.clampLength(0,30);this.audio.play('launch');this.notify('물체 투척');}else{b.v.copy(this.player.p.clone().sub(b.p).normalize().multiplyScalar(5));b.v.y=1;}}this.hold=null;}
}
