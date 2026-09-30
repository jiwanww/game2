import {AGENT_BY_ID,MODES,clamp,distance,direction,inRect,rayRect,rayCircle,createArenaMap} from './arena-data.js';
import {castSkill,tickAgent} from './arena-skills.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const timed=['slow','root','stun','phase','flight','ultTime','sizeTime','shrink','spin','herb','beam','basicLock','invulnerable','attackAnim'];
export class ArenaEngine {
 constructor(options={},players=[]){
  this.options={mode:'standard',rounds:3,bots:true,...options};if(!MODES[this.options.mode])this.options.mode='standard';this.options.rounds=clamp(Math.floor(+this.options.rounds||3),1,99);
  this.map=createArenaMap(this.options.mode);this.time=0;this.round=0;this.phase='ready';this.score={A:0,B:0};this.actors=new Map();this.tasks=[];this.shots=[];this.fields=[];this.souls=[];this.corpses=[];this.events=[];this.seq=0;this.nextId=1;this.history=[];this.roundDeaths=0;
  for(const p of players.slice(0,10))this.addPlayer(p);
  if(this.options.bots)while(this.actors.size<10){const i=this.actors.size,counts={A:0,B:0};for(const a of this.actors.values())counts[a.team]++;this.addPlayer({id:'bot'+i,name:'훈련 AI '+i,team:counts.A<=counts.B?'A':'B',agent:Object.keys(AGENT_BY_ID)[i%11],bot:true});}
  this.bossId=this.options.mode==='big'?[...this.actors.keys()][Math.floor(Math.random()*Math.max(1,this.actors.size))]:null;
  if(this.bossId)for(const a of this.actors.values())a.team=a.id===this.bossId?'A':'B';
  this.nextRound();
 }
 addPlayer(p){if(!p?.id||this.actors.has(p.id))return;const d=AGENT_BY_ID[p.agent]||AGENT_BY_ID.spidey;this.actors.set(p.id,{id:p.id,name:String(p.name||'플레이어').slice(0,20),team:p.team==='B'?'B':'A',agent:d.id,bot:!!p.bot,kills:0,damage:0,connected:true});}
 resetActor(a,respawn=false){const d=AGENT_BY_ID[a.agent],team=[...this.actors.values()].filter(b=>b.team===a.team),i=team.indexOf(a);const ult=respawn?a.ult||0:0;
  Object.assign(a,{x:(i-(team.length-1)/2)*1.8,y:(a.team==='A'?-1:1)*this.map.spawn,aimX:0,aimY:a.team==='A'?1:-1,hp:d.hp,maxHP:d.hp,armor:a.agent==='cap'?15:0,radius:.43,scale:1,ammo:3,reloadProgress:0,attackAt:0,cd:[0,0,0],ult,dead:false,respawnAt:0,energy:0,transformed:false,gun:0,shield:false,shieldHP:50,shieldAway:false,arrow:0,size:'normal',fuel:100,healFuel:100,healOn:false,flying:false,ancestor:false,ancestorUnlocked:false,input:{x:0,y:0,aimX:0,aimY:a.team==='A'?1:-1},cast:null,poison:[],copy:null,revivePower:1,thunderTick:0,fireTick:0,historyAt:0});for(const k of timed)a[k]=0;if(respawn)a.invulnerable=1;
  if(this.options.mode==='standard'){const attacking=a.team===this.attackTeam();a.y=(attacking?-1:1)*this.map.spawn;a.aimY=attacking?1:-1;a.input.aimY=a.aimY;}
  if(a.agent==='vision'&&team.some(t=>['thor','cap'].includes(t.agent))){a.maxHP+=20;a.hp=a.maxHP;}
  if(a.id===this.bossId){a.maxHP*=8;a.hp=a.maxHP;a.scale=1.9;a.radius*=1.9;}
 }
 nextRound(keepClock=null){this.round++;this.phase='ready';this.left=3;this.combatLeft=keepClock??MODES[this.options.mode].seconds;this.map=createArenaMap(this.options.mode);this.tasks=[];this.shots=[];this.fields=[];this.souls=[];this.corpses=[];this.history=[];this.roundDeaths=0;
  for(const a of this.actors.values())this.resetActor(a);
  this.spike={state:'idle',carrier:null,x:0,y:-this.map.spawn,progress:0,half:false,actor:null,left:45,dropUntil:0,lastCarrier:null};this.ball={x:0,y:0,vx:0,vy:0,holder:null,owner:null,power:null,powerUntil:0,pass:false,bounces:0,grace:0};this.emit('round',{round:this.round});
 }
 emit(kind,props={}){this.events.push({id:++this.seq,kind,at:this.time,...props});if(this.events.length>80)this.events.shift();}
 attackTeam(){return this.round<=Math.ceil(this.options.rounds/2)?'A':'B';}
 enemies(a){return [...this.actors.values()].filter(b=>!b.dead&&b.connected&&b.team!==a.team&&b.phase<=0);}
 allies(a){return [...this.actors.values()].filter(b=>!b.dead&&b.connected&&b.team===a.team);}
 wallAt(p,r=0){return this.map.walls.find(w=>w.hp>0&&inRect(p,w,r));}
 firstWall(a,b,r=0){let result=null;for(const w of this.map.walls){if(w.hp<=0)continue;const t=rayRect(a,b,w,r);if(t!==null&&(!result||t<result.t))result={w,t};}return result;}
 visible(a,b){if(distance(a,b)<2.4)return true;return !this.map.bushes.some(r=>inRect(b,r))||((b.revealedUntil||0)>this.time);}
 clearLine(a,b){return !this.firstWall(a,b);}
 move(a,dx,dy,phase=false){const pad=a.radius;let nx=clamp(a.x+dx,-this.map.w/2+pad,this.map.w/2-pad),ny=clamp(a.y+dy,-this.map.h/2+pad,this.map.h/2-pad);if(phase||!this.firstWall(a,{x:nx,y:a.y},pad))a.x=nx;if(phase||!this.firstWall(a,{x:a.x,y:ny},pad))a.y=ny;}
 setSize(a,size,seconds=20){const previous=a.maxHP,base=AGENT_BY_ID[a.agent].hp*(a.id===this.bossId?8:1),factor=size==='large'?1.7:size==='small'?.65:1;a.maxHP=base*factor;a.hp=clamp(a.hp/previous*a.maxHP,0,a.maxHP);a.size=size;a.sizeTime=size==='normal'?0:seconds;a.scale=(size==='large'?5:size==='small'?.2:1)*(a.id===this.bossId?1.9:1);a.radius=.43*a.scale;
  if(size==='large')for(const w of this.map.walls)if(w.hp>0&&w.breakable&&inRect(a,w,a.radius))this.breakWall(w);if(size==='normal'&&this.wallAt(a,a.radius))this.findFree(a);
 }
 findFree(a){for(let r=.5;r<8;r+=.5)for(let i=0;i<16;i++){const p={x:a.x+Math.cos(i*Math.PI/8)*r,y:a.y+Math.sin(i*Math.PI/8)*r};if(!this.wallAt(p,a.radius)&&!this.map.pits.some(w=>inRect(p,w))){a.x=p.x;a.y=p.y;return;}}}
 breakWall(w){if(w?.breakable&&w.hp>0){w.hp=0;this.emit('wall',{x:w.x,y:w.y,color:'#b6b8ba'});}}
 damageWall(w,amount){if(!w?.breakable||w.hp<=0)return;w.hp-=amount;if(w.hp<=0){w.hp=1;this.breakWall(w);}}
 outgoing(a,amount,skill=false){if(skill&&a.shrink>0)return 10;let scale=a.revivePower||1;if(a.id===this.bossId)scale*=1.6;if(a.agent==='spidey'&&a.ultTime>0)scale*=1.3;if(a.ancestor)scale*=1+.25*Math.min(8,this.roundDeaths);return amount*scale;}
 damage(a,b,amount,{skill=false,status=null,ignoreArmor=false,raw=false}={}){if(!b||b.dead||b.phase>0||b.invulnerable>0||this.phase!=='live'||(a&&a.team===b.team))return 0;let n=raw?amount:a?this.outgoing(a,amount,skill):amount;
  if(b.spin>0&&a&&!raw){this.damage(b,a,n,{raw:true});this.emit('reflect',{x:b.x,y:b.y});return 0;}
  if(b.shield&&a){const dir=direction(a.x-b.x,a.y-b.y);if(b.agent==='arc'){const take=Math.min(b.shieldHP,n);b.shieldHP-=take;n-=take;if(b.shieldHP<=0)b.shield=false;}else if(dir.x*b.aimX+dir.y*b.aimY>.3&&!b.shieldAway)n=Math.max(0,n-50);}
  const armor=ignoreArmor?0:Math.min(b.armor,n*.66);b.armor-=armor;n-=armor;const actual=Math.min(b.hp,n)+armor;b.hp=Math.max(0,b.hp-n);if(!actual)return 0;
  b.lastHit=this.time;if(b.cast?.interrupt)b.cast=null;if(b.agent==='panther')b.energy=Math.min(150,b.energy+actual*.5);if(b.agent==='bane'&&!b.transformed)b.ult=Math.min(AGENT_BY_ID.bane.ultCost,b.ult+actual);
  if(a){a.damage+=actual;a.ult=Math.min(AGENT_BY_ID[a.agent].ultCost,a.ult+actual*(a.id===this.bossId?.55:1));a.revealedUntil=this.time+1.5;}
  if(status)for(const [k,v] of Object.entries(status))if(timed.includes(k))b[k]=Math.max(b[k]||0,v);if(b.stun>0){b.cast=null;b.flying=false;}
  this.emit('hit',{x:b.x,y:b.y,amount:Math.ceil(actual),source:a?.id,target:b.id});if(b.hp<=0)this.kill(b,a);return actual;
 }
 kill(a,source=null){if(a.dead)return;a.dead=true;a.hp=0;a.cast=null;a.input={};a.shield=false;a.healOn=false;a.flying=false;a.beam=0;a.phase=0;this.roundDeaths++;this.corpses.push({id:a.id,agent:a.agent,name:a.name,team:a.team,x:a.x,y:a.y});if(source){source.kills++;if(source.agent==='hera')this.souls.push({id:this.nextId++,owner:source.id,x:a.x,y:a.y,expires:this.time+5});}
  if(this.spike.carrier===a.id)this.dropSpike(a);if(this.ball.holder===a.id)this.releaseBall(a,false);this.emit('kill',{source:source?.id,target:a.id});
  if(this.options.mode==='ball'||(this.options.mode==='big'&&a.id!==this.bossId))a.respawnAt=this.time+5;
 }
 dropSpike(a){if(this.spike.carrier!==a.id)return;Object.assign(this.spike,{carrier:null,x:a.x,y:a.y,lastCarrier:a.id,dropUntil:this.time+1,progress:0,actor:null});}
 heal(a,n){if(this.overtime||a.dead)return;a.hp=Math.min(a.maxHP,a.hp+n);}
 knock(a,b,amount){const d=direction(b.x-a.x,b.y-a.y);this.move(b,d.x*amount,d.y*amount,b.phase>0);}
 area(a,x,y,r,amount,{status=null,push=0,walls=false,ignoreLOS=false}={}){this.emit('circle',{x,y,r,color:AGENT_BY_ID[a.agent].color});for(const b of this.enemies(a))if(distance({x,y},b)<=r+b.radius&&(ignoreLOS||this.clearLine({x,y},b))){this.damage(a,b,amount,{skill:true,status});if(push)this.knock({x,y},b,push);}if(walls)for(const w of this.map.walls)if(w.hp>0&&w.breakable&&distance({x,y},w)<r+Math.hypot(w.w,w.h)/2)this.breakWall(w);}
 beamHit(a,range,width,amount,{pierce=true,status=null,skill=true}={}){const end={x:a.x+a.aimX*range,y:a.y+a.aimY*range},wall=this.firstWall(a,end),limit=wall?.t??1;const hits=this.enemies(a).map(b=>({b,t:rayCircle(a,end,b,width+b.radius)})).filter(h=>h.t!==null&&h.t<limit).sort((a,b)=>a.t-b.t);for(const h of pierce?hits:hits.slice(0,1))this.damage(a,h.b,amount,{skill,status});this.emit('beam',{x:a.x,y:a.y,ex:a.x+(end.x-a.x)*limit,ey:a.y+(end.y-a.y)*limit,width,color:AGENT_BY_ID[a.agent].color});return hits;}
 melee(a,amount,range=AGENT_BY_ID[a.agent].range,wide=.3,skill=false){for(const b of this.enemies(a)){const d=direction(b.x-a.x,b.y-a.y);if(distance(a,b)<range+b.radius&&d.x*a.aimX+d.y*a.aimY>wide&&this.clearLine(a,b))this.damage(a,b,amount,{skill});}this.emit('slash',{x:a.x,y:a.y,dx:a.aimX,dy:a.aimY,r:range,color:AGENT_BY_ID[a.agent].color});}
 projectile(a,kind,damage,range,speed=16,extra={}){const p={id:this.nextId++,owner:a.id,kind,x:a.x,y:a.y,dx:a.aimX,dy:a.aimY,speed,damage,range,traveled:0,r:.15,color:AGENT_BY_ID[a.agent].color,hit:[],...extra};this.shots.push(p);return p;}
 schedule(a,delay,fn){this.tasks.push({owner:a.id,at:this.time+delay,round:this.round,fn});}
 cast(a,name,delay,fn,interrupt=false){a.cast={name,ends:this.time+delay,interrupt};const token=a.cast;this.schedule(a,delay,()=>{if(a.cast!==token)return;a.cast=null;fn();});}
 attack(a){if(a.dead||a.stun>0||a.cast||a.phase>0||a.shield||a.basicLock>0||this.time<a.attackAt||this.phase!=='live')return false;if(this.ball.holder===a.id){this.releaseBall(a,true);a.attackAt=this.time+.3;return true;}if(a.ammo<1)return false;const d=AGENT_BY_ID[a.agent];a.ammo--;a.attackAt=this.time+(a.transformed?1.6:d.interval);a.attackAnim=.25;a.revealedUntil=this.time+1.5;this.emit('attack',{x:a.x,y:a.y,owner:a.id});
  let amount=a.transformed?80:d.damage,range=d.range*(a.id===this.bossId?1.4:1);if(a.size==='large'){amount*=5;range*=2.5;}if(a.size==='small')amount=4;
  if(a.gun>0){this.projectile(a,'bullet',20,10,26);a.gun--;return true;}
  if(a.agent==='panther'){this.melee(a,amount,range);this.schedule(a,.13,()=>this.melee(a,amount,range));}
  else if(['punch','hammer','claws'].includes(d.kind))this.melee(a,a.agent==='pigeon'&&a.ultTime>0?50:amount,range);
  else if(['beam','repulsor'].includes(d.kind))this.beamHit(a,range,.15,amount,{pierce:false,skill:false});
  else this.projectile(a,d.kind,amount,range,18,{status:d.kind==='web'?{slow:.4}:null});return true;
 }
 input(id,data={}){const a=this.actors.get(id);if(!a||a.dead)return;const finite=v=>Number.isFinite(v)?clamp(v,-1,1):0,dir=direction(finite(data.aimX),finite(data.aimY));a.input={x:finite(data.x),y:finite(data.y),aimX:dir.x,aimY:dir.y,interact:!!data.interact};a.inputAt=this.time;if(dir.x||dir.y){a.aimX=dir.x;a.aimY=dir.y;}
  for(const ev of Array.isArray(data.actions)?data.actions.slice(0,8):[]){if(!ev)continue;if(ev.type==='attack')this.attack(a);if(ev.type==='drop')this.dropSpike(a);if(ev.type==='skill'&&['Q','E','C','R'].includes(ev.key))castSkill(this,a,ev.key,{charge:clamp(+ev.charge||0,0,1),distance:clamp(+ev.distance||0,0,1),choice:ev.choice});}
 }
 stepShots(dt){const keep=[];for(const p of this.shots){const a=this.actors.get(p.owner);if(!a||a.dead)continue;if(p.target){const b=this.actors.get(p.target);if(b&&!b.dead)Object.assign(p,direction(b.x-p.x,b.y-p.y).x===undefined?{}:{dx:direction(b.x-p.x,b.y-p.y).x,dy:direction(b.x-p.x,b.y-p.y).y});}
   if(p.returning){const dir=direction(a.x-p.x,a.y-p.y);p.dx=dir.x;p.dy=dir.y;if(distance(p,a)<.7){a.shieldAway=false;continue;}}
   const next={x:p.x+p.dx*p.speed*dt,y:p.y+p.dy*p.speed*dt},wall=p.returning||p.lob?null:this.firstWall(p,next,p.r);let stop=false;
   if(p.lob&&p.traveled+p.speed*dt>=p.range){const ratio=Math.max(0,p.range-p.traveled)/(p.speed*dt);p.x+=p.dx*p.speed*dt*ratio;p.y+=p.dy*p.speed*dt*ratio;this.area(a,p.x,p.y,p.splash||2,p.damage,{status:p.status});if(p.kind==='webBomb')this.fields.push({kind:'web',owner:a.id,x:p.x,y:p.y,r:2,until:this.time+2});continue;}
   const hits=this.enemies(a).map(b=>({b,t:rayCircle(p,next,b,b.radius+p.r)})).filter(h=>h.t!==null&&!p.hit.includes(h.b.id)&&(!wall||h.t<wall.t)).sort((a,b)=>a.t-b.t);
   if(!p.lob)for(const {b} of hits){if(p.kind==='hook'){const dest={x:a.x+a.aimX*1.2,y:a.y+a.aimY*1.2};const dir=direction(dest.x-b.x,dest.y-b.y);this.move(b,dir.x*Math.max(0,distance(b,dest)),dir.y*Math.max(0,distance(b,dest)));}
    if(p.kind==='shrink'){b.shrink=5;b.scale=.5;}
    if(p.armorBreak)b.armor=Math.max(0,b.armor-p.armorBreak);
    this.damage(a,b,p.damage,{skill:!!p.skill,status:p.status});if(p.poison&&!b.dead)b.poison.push({owner:a.id,dps:p.poison,until:this.time+(p.poisonTime||3)});if(p.splash)this.area(a,b.x,b.y,p.splash,p.splashDamage||30);p.hit.push(b.id);if(!p.pierce&&!p.boomerang){stop=true;break;}}
   if(wall){this.damageWall(wall.w,p.damage);if(p.kind==='hook'){const x=p.x+(next.x-p.x)*wall.t-a.aimX*(a.radius+.1),y=p.y+(next.y-p.y)*wall.t-a.aimY*(a.radius+.1);this.move(a,x-a.x,y-a.y);this.emit('beam',{x:a.x,y:a.y,ex:x,ey:y,width:.06,color:'#ddf5ff'});}if(p.boomerang){p.returning=true;p.hit=[];}else stop=true;}
   if(stop)continue;p.x=next.x;p.y=next.y;p.traveled+=p.speed*dt;if(p.traveled>=p.range&&!p.returning){if(p.boomerang){p.returning=true;p.hit=[];}else continue;}if(p.traveled>p.range+80){a.shieldAway=false;continue;}keep.push(p);
  }this.shots=keep;
 }
 releaseBall(a,kick=true){const b=this.ball;if(b.holder!==a.id)return;b.holder=null;b.owner=a.id;b.team=a.team;b.x=a.x+a.aimX*.7;b.y=a.y+a.aimY*.7;b.vx=kick?a.aimX*15:0;b.vy=kick?a.aimY*15:0;b.power=a.agent;b.powerUntil=this.time+2;b.grace=this.time+.35;b.pass=false;b.bounces=0;if(kick&&a.agent==='arc'){b.vx*=1.25;b.vy*=1.25;}if(kick&&a.agent==='pigeon'){b.vx*=1.1;b.vy*=1.1;}this.emit('kick',{x:b.x,y:b.y});}
 tickBall(dt){const b=this.ball,holder=this.actors.get(b.holder);if(holder&&!holder.dead){b.x=holder.x;b.y=holder.y;b.power=holder.agent;b.powerUntil=this.time+2;return;}if(b.holder)b.holder=null;const active=b.powerUntil>this.time,next={x:b.x+b.vx*dt,y:b.y+b.vy*dt},wall=this.firstWall(b,next,.25);
  if(wall){if(active&&['bane','vision'].includes(b.power)&&wall.w.breakable&&!b.pass){b.pass=true;if(b.power==='bane'){this.breakWall(wall.w);b.vx*=.6;b.vy*=.6;}}else if(active&&b.power==='cap'&&b.bounces<1){const hit={x:b.x+(next.x-b.x)*wall.t,y:b.y+(next.y-b.y)*wall.t};if(Math.abs(hit.x-wall.w.x)/(wall.w.w/2)>Math.abs(hit.y-wall.w.y)/(wall.w.h/2))b.vx*=-1;else b.vy*=-1;b.bounces++;next.x=b.x+b.vx*dt;next.y=b.y+b.vy*dt;}else {b.vx=b.vy=0;next.x=b.x;next.y=b.y;}}
  b.x=clamp(next.x,-this.map.w/2+.4,this.map.w/2-.4);b.y=clamp(next.y,-this.map.h/2+.4,this.map.h/2-.4);const decay=active&&b.power==='pigeon'?.75:1.2;b.vx*=Math.exp(-dt*decay);b.vy*=Math.exp(-dt*decay);
  for(const goal of this.map.goals)if(Math.abs(b.x)<goal.w/2&&Math.abs(b.y-goal.y)<1){const team=goal.team==='A'?'B':'A';this.score[team]++;this.emit('goal',{team});this.phase='result';this.result={team,reason:'골!'};this.left=3;this.ballReset=true;if(this.score[team]>=2)this.winner=team;return;}
  for(const a of this.actors.values()){if(a.dead||a.phase>0||(a.id===b.owner&&this.time<b.grace))continue;const radius=active&&b.power==='ant'?.36:.75;if(distance(a,b)>a.radius+radius)continue;const enemy=b.team&&a.team!==b.team,source=this.actors.get(b.owner);if(enemy&&active&&source&&Math.hypot(b.vx,b.vy)>3){if(b.power==='spidey')a.slow=Math.max(a.slow,.6);if(b.power==='thor')a.stun=Math.max(a.stun,.25);if(b.power==='widow')a.poison.push({owner:source.id,dps:3,until:this.time+2});if(b.power==='panther')this.knock(b,a,1);}
   if(!enemy&&active&&b.power==='hera'&&a.id!==b.owner)this.heal(a,12);b.holder=a.id;b.owner=a.id;b.team=a.team;b.vx=b.vy=0;b.power=a.agent;b.powerUntil=this.time+2;this.emit('catch',{owner:a.id});break;
  }
 }
 finish(team,reason){if(this.phase==='result'||this.phase==='done')return;this.phase='result';this.result={team,reason};this.left=3;if(team)this.score[team]++;this.emit('victory',{team});}
 rules(dt){const attack=this.options.mode==='standard'?this.attackTeam():'A',defend=attack==='A'?'B':'A',alive=[...this.actors.values()].filter(a=>!a.dead&&a.connected),A=alive.filter(a=>a.team===attack),B=alive.filter(a=>a.team===defend);this.left-=dt;
  if(this.options.mode==='ball'){this.tickBall(dt);if(this.left<=0&&this.phase==='live'){this.phase='done';this.result={team:this.score.A===this.score.B?null:this.score.A>this.score.B?'A':'B',reason:'경기 시간 종료'};}return;}
  if(this.options.mode==='big'){if(this.actors.get(this.bossId)?.dead)this.finish('B','빅 에이전트 처치');else if(this.left<=0)this.finish('A','빅 에이전트 생존');return;}
  if(this.options.mode==='elimination'){if(!A.length||!B.length){this.finish(A.length?'A':B.length?'B':null,'전멸');return;}if(this.left<=0){this.overtime=true;for(const a of alive){a.hp=Math.max(0,a.hp-dt);if(a.hp<=1e-7)this.kill(a);}const leftA=A.some(a=>!a.dead),leftB=B.some(a=>!a.dead);if(!leftA||!leftB)this.finish(leftA?'A':leftB?'B':null,'연장전 전멸');}return;}
  const s=this.spike;if(!B.length){this.finish(A.length||s.state==='planted'?attack:null,'수비팀 전멸');return;}if(!A.length&&s.state!=='planted'){this.finish(defend,'설치 전 공격팀 전멸');return;}
  if(s.state==='idle'){if(this.left<=0){this.finish(defend,'설치 시간 종료');return;}if(!s.carrier){const a=A.find(a=>a.phase<=0&&distance(a,s)<1.2&&(a.id!==s.lastCarrier||this.time>=s.dropUntil));if(a)s.carrier=a.id;}const a=this.actors.get(s.carrier);if(a){s.x=a.x;s.y=a.y;}if(a&&!a.dead&&a.stun<=0&&a.phase<=0&&a.input.interact&&this.map.sites.some(t=>distance(a,t)<t.r)){if(s.actor!==a.id)s.progress=0;s.actor=a.id;s.progress+=dt;if(s.progress>=4){s.state='planted';s.carrier=null;s.progress=0;s.actor=null;this.emit('plant',{x:s.x,y:s.y});}}else {s.progress=0;s.actor=null;}}
  else if(s.state==='planted'){s.left-=dt;if(s.left<=0){this.finish(attack,'설치 폭탄 작동');return;}const a=B.find(a=>a.stun<=0&&a.phase<=0&&a.input.interact&&distance(a,s)<2.4);if(a){if(s.actor!==a.id)s.progress=s.half?3.5:0;s.actor=a.id;s.progress+=dt;if(s.progress>=3.5)s.half=true;if(s.progress>=7){s.state='defused';this.finish(defend,'설치 폭탄 해체');}}else {s.actor=null;s.progress=s.half?3.5:0;}}
 }
 botInput(a,dt){if(this.time<(a.botThink||0))return;a.botThink=this.time+.18;const foes=this.enemies(a).filter(b=>this.visible(a,b)).sort((x,y)=>distance(a,x)-distance(a,y)),enemy=foes[0];let target=enemy||{x:0,y:0};if(this.options.mode==='ball')target=this.ball.holder===a.id?this.map.goals.find(g=>g.team!==a.team):this.ball;else if(this.options.mode==='standard'){if(this.spike.state==='planted')target=this.spike;else if(this.spike.carrier===a.id)target=this.map.sites[a.id.length%2];else if(a.team==='A'&&!this.spike.carrier)target=this.spike;}
  const d=direction(target.x-a.x,target.y-a.y),aim=enemy?direction(enemy.x-a.x,enemy.y-a.y):d;let move=d;if(this.firstWall(a,{x:a.x+d.x*1.4,y:a.y+d.y*1.4},a.radius)){// choose an unblocked tangent, rather than walking forever into cover
   const side=a.id.length%2?1:-1;move={x:-d.y*side,y:d.x*side};if(this.firstWall(a,{x:a.x+move.x,y:a.y+move.y},a.radius))move={x:d.y*side,y:-d.x*side};}
  const at=distance(a,target),range=AGENT_BY_ID[a.agent].range;this.input(a.id,{x:enemy&&target===enemy&&at<range*.7?0:move.x,y:enemy&&target===enemy&&at<range*.7?0:move.y,aimX:aim.x,aimY:aim.y,interact:at<2,actions:[]});if(enemy&&distance(a,enemy)<range&&this.clearLine(a,enemy))this.attack(a);if(enemy&&this.time>(a.botSkill||0)){castSkill(this,a,['Q','E','C'][Math.floor(this.time+a.id.length)%3],{charge:.8,distance:.7,choice:a.agent==='ant'?'large':null});if(a.ult>=AGENT_BY_ID[a.agent].ultCost)castSkill(this,a,'R',{});a.botSkill=this.time+2.5;}
  if(this.options.mode==='ball'&&this.ball.holder===a.id){const goal=this.map.goals.find(g=>g.team!==a.team);if(distance(a,goal)<9){const dir=direction(goal.x-a.x,goal.y-a.y);a.aimX=dir.x;a.aimY=dir.y;this.releaseBall(a);}}
 }
 tick(dt){dt=clamp(dt,0,.05);this.time+=dt;if(this.phase==='done')return;if(this.phase==='ready'){this.left-=dt;if(this.left<=0){this.phase='live';this.left=this.combatLeft;this.overtime=false;}return;}if(this.phase==='result'){this.left-=dt;if(this.left<=0){if(this.winner||(!this.ballReset&&this.round>=this.options.rounds)){this.phase='done';return;}const clock=this.ballReset?this.combatLeft:undefined;this.ballReset=false;this.nextRound(clock);}return;}
  this.combatLeft=this.left;const pending=this.tasks;this.tasks=[];for(const t of pending){if(t.round!==this.round)continue;if(t.at>this.time){this.tasks.push(t);continue;}const a=this.actors.get(t.owner);if(a&&!a.dead)t.fn();}
  for(const a of this.actors.values()){
   if(a.dead){if(a.respawnAt&&this.time>=a.respawnAt&&a.connected){this.resetActor(a,true);this.corpses=this.corpses.filter(c=>c.id!==a.id);}continue;}if(a.bot)this.botInput(a,dt);else if(this.time-(a.inputAt||0)>1)a.input={};
   const prevPhase=a.phase,prevSize=a.sizeTime,prevShrink=a.shrink;for(const k of timed)a[k]=Math.max(0,a[k]-dt);if(prevPhase>0&&a.phase<=0&&this.wallAt(a,a.radius)){this.kill(a);continue;}if(prevSize>0&&!a.sizeTime)this.setSize(a,'normal');if(prevShrink>0&&!a.shrink)a.scale=(a.size==='large'?5:a.size==='small'?.2:1)*(a.id===this.bossId?1.9:1);
   const d=AGENT_BY_ID[a.agent];a.cd=a.cd.map(n=>Math.max(0,n-dt));if(a.ammo<3){a.reloadProgress+=dt/(d.reload/(a.agent==='cap'&&a.ultTime>0?4:1));while(a.reloadProgress>=1&&a.ammo<3){a.ammo++;a.reloadProgress--;}if(a.ammo>=3)a.reloadProgress=0;}else a.reloadProgress=0;
   const poison=a.poison;a.poison=[];for(const p of poison)if(p.until>this.time){this.damage(this.actors.get(p.owner),a,p.dps*dt,{raw:true});a.poison.push(p);}if(a.dead)continue;
   let speed=d.speed;if(a.id===this.bossId)speed*=.72;if(a.transformed)speed*=.7;if(a.size==='large')speed*=.5;if(a.size==='small')speed*=5;if(a.slow>0)speed*=.6;if(a.herb>0)speed*=1.5;if(a.ultTime>0&&a.agent==='spidey')speed*=1.3;if(a.ancestor)speed*=1+.15*Math.min(8,this.roundDeaths);if(a.cast||a.root>0||a.stun>0)speed=0;
   const dir=direction(a.input.x||0,a.input.y||0),mag=Math.min(1,Math.hypot(a.input.x||0,a.input.y||0));this.move(a,dir.x*mag*speed*dt,dir.y*mag*speed*dt,a.phase>0);if(this.map.pits.some(r=>inRect(a,r))&&a.flight<=0&&!a.flying&&a.phase<=0){this.kill(a);continue;}
   tickAgent(this,a,dt);
  }
  this.stepShots(dt);this.tickFields(dt);this.souls=this.souls.filter(s=>s.expires>this.time);this.events=this.events.filter(e=>this.time-e.at<3);this.rules(dt);
  if(this.actors.size&&[...this.actors.values()].some(a=>a.agent==='ant')&&this.time>=(this.historyAt||0)){this.historyAt=this.time+.1;this.history.push({time:this.time,left:this.left,actors:clone([...this.actors.values()]),walls:clone(this.map.walls),spike:clone(this.spike),ball:clone(this.ball)});this.history=this.history.filter(h=>this.time-h.time<5.5);}
 }
 tickFields(dt){this.fields=this.fields.filter(f=>f.until>this.time);for(const f of this.fields){const a=this.actors.get(f.owner);if(!a)continue;for(const b of this.enemies(a))if(distance(f,b)<f.r+b.radius){if(f.kind==='web')b.root=Math.max(b.root,.15);if(f.kind==='fire')this.damage(a,b,5*dt,{raw:true});if(f.kind==='trap'&&!f.trigger){f.trigger=this.time+.7;this.emit('warning',{x:f.x,y:f.y,r:f.r});}}if(f.trigger&&this.time>=f.trigger){this.area(a,f.x,f.y,f.r,50);f.until=0;}}
  for(const w of this.map.walls)if(w.dynamic&&w.hp>0){w.hp-=dt*10;const a=this.actors.get(w.owner);for(const b of this.actors.values())if(b.id!==w.owner&&!b.dead&&inRect(b,w,b.radius+.1)){if(a&&a.team!==b.team)this.damage(a,b,10*dt,{raw:true});else {b.hp=Math.max(0,b.hp-10*dt);if(!b.hp)this.kill(b,a);}}}
 }
 rewind(a){const h=[...this.history].reverse().find(h=>this.time-h.time>=5);if(!h)return false;const spentUlt=a.ult;for(const state of h.actors){const b=this.actors.get(state.id);if(!b)continue;const keep={input:b.input,inputAt:b.inputAt,connected:b.connected};Object.assign(b,clone(state),keep,{cast:null});}a.ult=spentUlt;this.left=h.left;this.map.walls=clone(h.walls);this.spike=clone(h.spike);this.ball=clone(h.ball);this.tasks=[];this.shots=[];this.fields=[];this.souls=[];this.corpses=[...this.actors.values()].filter(b=>b.dead).map(b=>({id:b.id,agent:b.agent,team:b.team,name:b.name,x:b.x,y:b.y}));this.emit('rewind',{x:a.x,y:a.y});return true;}
 disconnect(id){const a=this.actors.get(id);if(a){a.connected=false;this.kill(a);}}
 snapshot(){return {version:1,time:this.time,options:this.options,round:this.round,phase:this.phase,left:this.left,overtime:!!this.overtime,score:this.score,result:this.result,bossId:this.bossId,map:this.map,players:[...this.actors.values()].map(({input,botThink,inputAt,poison,...a})=>a),shots:this.shots,fields:this.fields,souls:this.souls,corpses:this.corpses,events:this.events,spike:this.spike,ball:this.ball};}
}
