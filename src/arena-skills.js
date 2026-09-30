import {AGENT_BY_ID,clamp,distance,direction,inRect} from './arena-data.js';
const index={Q:0,E:1,C:2};
export function castSkill(g,a,key,opts={},copied=null){
 if(a.dead||a.stun>0||a.cast||g.phase!=='live')return false;
 const id=copied?.id||a.agent,d=AGENT_BY_ID[id];if(!d)return false;
 if(key==='R')return ultimate(g,a,opts);
 if(a.copy&&!copied){const choice=opts.choice?.split?.(':');if(choice&&AGENT_BY_ID[choice[0]]&&choice[0]!=='widow'&&['Q','E','C'].includes(choice[1]))a.copy={id:choice[0],key:choice[1]};const picked=a.copy;if(castSkill(g,a,picked.key,opts,{id:picked.id,scale:.7})){a.copy=null;return true;}return false;}
 const i=index[key];if(i===undefined)return false;
 if(id==='bane'&&!a.transformed)return false;
 // Toggled skills are permitted to turn off without consuming or restarting cooldown.
 if(id==='arc'&&key==='Q'&&a.shield){a.shield=false;return true;}
 if(id==='cap'&&key==='E'&&a.shield){a.shield=false;return true;}
 if(id==='vision'&&key==='Q'&&a.phase>0){a.phase=0;if(g.wallAt(a,a.radius))g.kill(a);return true;}
 if(id==='ant'&&key==='E'&&a.size!=='normal'){g.setSize(a,'normal');return true;}
 if(!copied&&a.cd[i]>0)return false;
 if(a.phase>0&&!(id==='vision'&&['E','C'].includes(key)))return false;
 const scale=copied?.scale||1,n=value=>value*scale,aim={x:a.aimX,y:a.aimY},origin={x:a.x,y:a.y},charge=clamp(opts.charge||0,0,1),range=clamp(opts.distance||.7,.1,1);
 const shot=(kind,damage,dist,speed=18,extra={})=>g.projectile(a,kind,n(damage),dist,speed,{skill:true,...extra});
 const aoe=(x,y,r,damage,extra={})=>g.area(a,x,y,r*scale,n(damage),extra);
 let success=true;
 if(id==='spidey'){
  if(key==='Q')shot('webBomb',26,2+6*range,12,{lob:true,splash:n(2),status:{root:n(1.5)}});
  if(key==='E'){const end={x:a.x+aim.x*3,y:a.y+aim.y*3},hit=g.firstWall(a,end,a.radius);if(hit&&Math.min(hit.w.w,hit.w.h)>1.25)return false;if(g.wallAt(end,a.radius))return false;a.x=clamp(end.x,-g.map.w/2+.5,g.map.w/2-.5);a.y=clamp(end.y,-g.map.h/2+.5,g.map.h/2-.5);a.flight=.4;g.emit('hop',{...origin,ex:a.x,ey:a.y});}
  if(key==='C')shot('hook',16,11,22);
 }else if(id==='arc'){
  if(key==='Q'){a.shield=true;a.shieldHP=n(50);}
  if(key==='E')a.flight=n(8);
  if(key==='C'){const foes=g.enemies(a).filter(b=>distance(a,b)<11&&g.visible(a,b)&&g.clearLine(a,b)&&((b.x-a.x)*aim.x+(b.y-a.y)*aim.y)>0);if(!foes.length)return false;g.cast(a,'유도탄 준비',.3,()=>{for(const b of foes)if(!b.dead)shot('missile',45,20,14,{target:b.id,splash:0});});}
 }else if(id==='bane'){
  if(key==='Q')g.cast(a,'손뼉치기',1.1,()=>{for(const b of g.enemies(a)){const v=direction(b.x-a.x,b.y-a.y);if(distance(a,b)<7*scale&&v.x*a.aimX+v.y*a.aimY>.15&&g.clearLine(a,b)){g.damage(a,b,n(35),{skill:true,status:{slow:3}});g.knock(a,b,n(5));b.flight=0;b.flying=false;}}g.emit('cone',{x:a.x,y:a.y,dx:a.aimX,dy:a.aimY,r:7*scale,color:d.color});});
  if(key==='E'){const total=n(7);for(let step=0;step<14;step++)g.schedule(a,step*.035,()=>{const next={x:a.x+aim.x*total/14,y:a.y+aim.y*total/14};for(const w of g.map.walls)if(w.breakable&&w.hp>0&&inRect(next,w,a.radius+.2))g.breakWall(w);g.move(a,aim.x*total/14,aim.y*total/14);for(const b of g.enemies(a))if(distance(a,b)<1.6&&!hits.has(b.id)){hits.add(b.id);g.damage(a,b,n(65),{skill:true});g.knock(a,b,n(3));}});const hits=new Set();}
  if(key==='C'){const target=g.enemies(a).find(b=>distance(a,b)<2.1&&g.clearLine(a,b));if(!target)return false;const token={name:'휘두르기',ends:g.time+3,interrupt:true};a.cast=token;target.root=3;for(let j=1;j<=4;j++)g.schedule(a,j*.7,()=>{if(a.cast!==token||target.dead)return;g.damage(a,target,n(25),{skill:true});g.emit('circle',{x:target.x,y:target.y,r:1,color:d.color});if(j===4)a.cast=null;});}
 }else if(id==='cap'){
  if(key==='Q'){if(a.shieldAway)return false;a.shield=false;a.shieldAway=true;shot('shield',25+35*charge,3+6*charge,18,{boomerang:true,r:.38});}
  if(key==='E'){if(a.shieldAway)return false;a.shield=!a.shield;}
  if(key==='C'){if(a.shieldAway)return false;a.shield=false;a.spin=n(3.5);}
 }else if(id==='thor'){
  if(key==='Q')shot('hammer',50,9,16,{boomerang:true,r:.32});
  if(key==='E'){a.flight=n(4);g.schedule(a,n(4),()=>{aoe(a.x,a.y,1.2,30);for(const b of g.enemies(a).filter(b=>distance(a,b)<7&&g.clearLine(a,b)).sort((x,y)=>distance(a,x)-distance(a,y)).slice(0,3)){g.damage(a,b,n(30),{skill:true});g.emit('lightning',{x:b.x,y:b.y});}});}
  if(key==='C')g.cast(a,'번개 공격',2,()=>{for(let j=0;j<6;j++)g.schedule(a,j*.16,()=>{const x=origin.x+aim.x*(2+j*2),y=origin.y+aim.y*(2+j*2);if(g.clearLine(origin,{x,y})){aoe(x,y,1.8,20);g.emit('lightning',{x,y});}});});
 }else if(id==='widow'){
  if(key==='Q')a.gun=a.gun>0?0:8;
  if(key==='E')shot('net',2,9,14,{status:{stun:n(2.5)},poison:n(2),poisonTime:n(5)});
  if(key==='C')g.fields.push({id:g.nextId++,kind:'trap',owner:a.id,x:a.x,y:a.y,r:1.8*scale,until:g.time+40});
 }else if(id==='pigeon'){
  if(key==='Q'){const enhanced=a.ultTime>0,amount=20+30*charge;shot('arrow',amount,5+8*charge,20+10*charge,{status:!enhanced&&a.arrow===1?{stun:n(2*charge)}:null,splash:!enhanced&&a.arrow===2?1:0,splashDamage:n(30)});a.basicLock=.7;if(!enhanced)a.arrow=0;}
  if(key==='E'){a.ammo=3;a.reloadProgress=0;a.cd[0]=0;g.emit('recall',{x:a.x,y:a.y,color:d.color});}
  if(key==='C'){a.arrow=opts.choice==='explosive'?2:1;}
 }else if(id==='ant'){
  if(key==='Q')shot('shrink',10,10,19);
  if(key==='E')g.setSize(a,opts.choice==='small'?'small':'large',n(20));
  if(key==='C'){const foes=g.enemies(a).filter(b=>distance(a,b)<8&&g.clearLine(a,b));if(!foes.length)return false;for(let j=0;j<70;j++){const b=foes[j%foes.length];g.schedule(a,j*.012,()=>{if(!b.dead){g.damage(a,b,n(1),{skill:true,status:{slow:1}});}});}g.emit('ants',{x:a.x,y:a.y,targets:foes.map(b=>({x:b.x,y:b.y})),color:d.color});}
 }else if(id==='hera'){
  if(key==='Q')shot('poisonKnife',24,11,26,{poison:n(5),poisonTime:3});
  if(key==='E'){const orb=g.souls.find(o=>o.owner===a.id&&o.expires>g.time);if(!orb)return false;g.souls=g.souls.filter(o=>o!==orb);g.emit('absorb',{x:orb.x,y:orb.y,ex:a.x,ey:a.y,color:d.color});if(!g.overtime){if(a.hp>=a.maxHP)a.armor=Math.min(50,a.armor+n(50));else g.heal(a,n(50));}const foes=g.enemies(a);if(foes.length)g.damage(a,foes[Math.floor(Math.random()*foes.length)],n(25),{skill:true});}
  if(key==='C'){const angle=Number.isInteger(+opts.choice)?clamp(+opts.choice,-8,8)*Math.PI/8:0,cos=Math.cos(angle),sin=Math.sin(angle),ax=aim.x*cos-aim.y*sin,ay=aim.x*sin+aim.y*cos,x=a.x+aim.x*3,y=a.y+aim.y*3;for(let j=-1;j<=1;j++){const wall={id:'thorn'+g.nextId++,x:x-ay*j*1.5,y:y+ax*j*1.5,w:Math.abs(ay)*1.5+Math.abs(ax)*.55,h:Math.abs(ax)*1.5+Math.abs(ay)*.55,hp:n(400),breakable:true,dynamic:true,owner:a.id};if(!g.wallAt(wall,.4)&&![...g.actors.values()].some(b=>!b.dead&&inRect(b,wall,b.radius)))g.map.walls.push(wall);}}
 }else if(id==='panther'){
  if(key==='Q')shot('clawWave',10,8,20,{armorBreak:n(50),pierce:true,r:.5});
  if(key==='E')a.herb=n(8);
  if(key==='C'){if(a.energy<=0)return false;aoe(a.x,a.y,4,a.energy,{push:2});a.energy=0;}
 }else if(id==='vision'){
  if(key==='Q')a.phase=n(8);
  if(key==='E'){if(a.fuel<=0&&!a.flying)return false;a.flying=!a.flying;}
  if(key==='C'){if(a.healFuel<=0&&!a.healOn)return false;a.healOn=!a.healOn;}
 }else success=false;
 if(!success)return false;if(!copied)a.cd[i]=(a.agent==='cap'&&a.ultTime>0?.35:a.agent==='pigeon'&&key==='Q'&&a.ultTime>0?.35:d.cooldowns[i])*(a.id===g.bossId?.7:1);a.revealedUntil=g.time+1.5;g.emit('skill',{owner:a.id,key,x:a.x,y:a.y,color:d.color});return true;
}
function ultimate(g,a,opts){const d=AGENT_BY_ID[a.agent];if(a.agent==='panther'&&a.ancestorUnlocked){a.ancestor=!a.ancestor;return true;}if(a.ult<d.ultCost)return false;
 if(a.agent==='hera'&&!g.corpses.some(c=>c.team===a.team&&g.actors.get(c.id)?.dead&&distance(a,c)<10&&g.clearLine(a,c)))return false;
 if(a.agent==='ant'&&!g.history.some(h=>g.time-h.time>=5))return false;
 a.ult=0;g.emit('ultimate',{x:a.x,y:a.y,color:d.color,owner:a.id});
 switch(a.agent){
  case 'spidey':a.ultTime=15;break;
  case 'arc':g.cast(a,'타임 스냅',3,()=>{if(!g.overtime)a.hp=a.maxHP;a.armor=50;a.cd=[0,0,0];a.ammo=3;a.shieldHP=50;});break;
  case 'bane':if(!a.transformed){a.transformed=true;a.maxHP=240*(a.id===g.bossId?8:1);a.hp=a.maxHP;a.scale*=1.25;a.radius*=1.25;}else {a.flight=2.2;const x=a.x+a.aimX*(2+3*(opts.distance||.7)),y=a.y+a.aimY*(2+3*(opts.distance||.7));g.emit('warning',{x,y,r:5.1});g.cast(a,'내려찍기',2,()=>{a.x=clamp(x,-g.map.w/2+1,g.map.w/2-1);a.y=clamp(y,-g.map.h/2+1,g.map.h/2-1);g.area(a,a.x,a.y,5.1,70,{walls:true,ignoreLOS:true,status:{stun:3}});g.findFree(a);});}break;
  case 'cap':a.ultTime=15;break;
  case 'thor':a.ultTime=8;a.thunderTick=0;break;
  case 'widow':a.copy={id:'spidey',key:'Q'};break;
  case 'pigeon':a.ultTime=8;a.cd[0]=0;break;
  case 'ant':g.cast(a,'양자역학 · 5초 전',2,()=>g.rewind(a));break;
  case 'hera':{const c=g.corpses.filter(c=>c.team===a.team&&g.actors.get(c.id)?.dead&&distance(a,c)<10&&g.clearLine(a,c)).sort((x,y)=>distance(a,x)-distance(a,y))[0],b=g.actors.get(c.id);g.resetActor(b,true);b.x=c.x;b.y=c.y;b.hp=50;b.revivePower=2;g.corpses=g.corpses.filter(x=>x!==c);g.emit('revive',{x:c.x,y:c.y});break;}
  case 'panther':a.ancestorUnlocked=true;a.ancestor=true;break;
  case 'vision':a.beam=3;break;
 }return true;
}
export function tickAgent(g,a,dt){
 if(a.ancestorUnlocked){const max=AGENT_BY_ID[a.agent].hp*(a.id===g.bossId?8:1)*(1+(a.ancestor?.25:0)*Math.min(8,g.roundDeaths));if(max!==a.maxHP){a.hp=a.hp/a.maxHP*max;a.maxHP=max;}}
 if(a.agent==='spidey')g.heal(a,(a.ultTime>0?5:1)*dt);
 if(a.agent==='hera'){const carrier=g.actors.get(g.spike.carrier),p=g.spike.state==='planted'?g.spike:carrier;if(p&&distance(a,p)<5)g.heal(a,dt);}
 if(a.agent==='vision'){
  if(a.flying){a.fuel=Math.max(0,a.fuel-dt);if(!a.fuel)a.flying=false;}else a.fuel=Math.min(100,a.fuel+dt*.5);
  if(a.healOn){a.healFuel=Math.max(0,a.healFuel-dt);if(!a.healFuel)a.healOn=false;for(const b of g.allies(a))if(distance(a,b)<6)g.heal(b,dt);}
 }
 if(a.beam>0&&a.stun<=0){const amount=a.shrink>0?10*dt:25*dt;const hits=g.beamHit(a,16,1.1,amount,{pierce:true,skill:false});for(const {b} of hits){const old=b.poison.find(p=>p.beamOwner===a.id);if(old)old.until=g.time+5;else b.poison.push({owner:a.id,beamOwner:a.id,dps:5,until:g.time+5});}}
 if(a.ultTime>0&&a.agent==='thor'&&g.time>=a.thunderTick){a.thunderTick=g.time+.65;for(const b of g.enemies(a).filter(b=>distance(a,b)<10&&g.clearLine(a,b))){g.damage(a,b,22,{skill:true});g.emit('lightning',{x:b.x,y:b.y});}}
 if(a.herb>0&&g.time>=a.fireTick){a.fireTick=g.time+.18;g.fields.push({kind:'fire',owner:a.id,x:a.x,y:a.y,r:.6,until:g.time+1.3});}
 if(a.spin>0)for(const b of g.enemies(a))if(distance(a,b)<1.2)g.knock(a,b,dt*3);
 if(a.cast&&a.cast.ends<g.time-.1)a.cast=null;
}
