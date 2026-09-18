import * as T from './three.module.js';
export const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export class Body {
 constructor(pos,half,mesh=null){this.p=pos.clone();this.h=half.clone();this.v=V();this.mesh=mesh;this.grounded=false;this.mass=1;this.active=true;this.hitTimer=0;this.home=pos.clone();}
 sync(){if(this.mesh)this.mesh.position.copy(this.p);}
}
export function overlaps(a,b,epsilon=0){return Math.abs(a.p.x-b.p.x)<a.h.x+b.h.x-epsilon&&Math.abs(a.p.y-b.p.y)<a.h.y+b.h.y-epsilon&&Math.abs(a.p.z-b.p.z)<a.h.z+b.h.z-epsilon;}
export class Physics {
 constructor(){this.solids=[];this.movers=[];this.bounds={x:27,z:27};}
 step(body,dt,gravity=22){
  if(!body.active)return;
  const travel=(body.v.length()+Math.abs(gravity)*dt)*dt;
  const stride=Math.max(.03,Math.min(body.h.x,body.h.y,body.h.z)*.45);
  const steps=Math.min(32,Math.ceil(travel/stride));
  if(steps>1){for(let i=0;i<steps;i++)this.integrate(body,dt/steps,gravity);return;}
  this.integrate(body,dt,gravity);
 }
 integrate(body,dt,gravity){
  if(body.phased){body.grounded=false;body.v.y-=gravity*dt;body.p.addScaledVector(body.v,dt);if(body.p.y<body.h.y&&(!this.floorAt||this.floorAt(body.p.x,body.p.z))){body.p.y=body.h.y;body.v.y=0;body.grounded=true;}body.p.x=T.MathUtils.clamp(body.p.x,-this.bounds.x+body.h.x,this.bounds.x-body.h.x);body.p.z=T.MathUtils.clamp(body.p.z,-this.bounds.z+body.h.z,this.bounds.z-body.h.z);body.sync();return;}
  const wasGrounded=body.grounded;body.grounded=false;body.v.y-=gravity*dt;
  for(const axis of ['x','z','y']){
   const before=body.p[axis],vel=body.v[axis];body.p[axis]+=vel*dt;
   const other=[...this.solids,...this.movers];
   for(const b of other){if(b===body||!b.active||b.phased||!overlaps(body,b))continue;
    if(axis!=='y'&&b.stair&&body.bot&&wasGrounded&&body.v.y<=0){const rise=b.p.y+b.h.y-(body.p.y-body.h.y);if(rise>0&&rise<=.32){const raised={p:body.p.clone().add(V(0,rise+.001,0)),h:body.h};if(!other.some(c=>c!==body&&c.active&&!c.phased&&overlaps(raised,c,.0001))){body.p.copy(raised.p);body.grounded=true;continue;}}}
    let side=before<b.p[axis]?-1:1;
    if(Math.abs(before-b.p[axis])<.0001)side=vel>0?-1:1;
    body.p[axis]=b.p[axis]+side*(body.h[axis]+b.h[axis]+.0001);
    if(axis==='y'){if(side===1){body.grounded=true;} body.v.y=side===1&&body.bounce?Math.abs(vel)*body.bounce:Math.min(0,body.v.y);if(side===1&&!body.bounce)body.v.y=0;}
    else {if(b.movable&&!b.held){b.v[axis]+=vel*dt*10/(b.mass||1);}body.v[axis]=0;}
   }
  }
  if(body.p.y<=body.h.y+.0001&&body.v.y<=0&&(!this.floorAt||this.floorAt(body.p.x,body.p.z))){body.p.y=body.h.y;body.grounded=true;body.v.y=body.bounce&&Math.abs(body.v.y)>1?-body.v.y*body.bounce:0;}
  body.p.x=T.MathUtils.clamp(body.p.x,-this.bounds.x+body.h.x,this.bounds.x-body.h.x);body.p.z=T.MathUtils.clamp(body.p.z,-this.bounds.z+body.h.z,this.bounds.z-body.h.z);
  if(!body.grounded&&body.v.y<=0)body.grounded=[...this.solids,...this.movers].some(b=>b!==body&&b.active&&!b.phased&&Math.abs(body.p.y-body.h.y-b.p.y-b.h.y)<.002&&Math.abs(body.p.x-b.p.x)<body.h.x+b.h.x&&Math.abs(body.p.z-b.p.z)<body.h.z+b.h.z);
  body.sync();
 }
}
export class ChargeBank {
 constructor(agent){this.agent=agent;this.base=agent.skills.slice(0,3).map(s=>s[5]);this.extra=[0,0,0];this.timers=[0,0,0];}
 count(i){return this.base[i]+this.extra[i];}
 canBuy(i){return this.count(i)+(this.timers[i]>0?1:0)<this.agent.skills[i][3];}
 buy(i){if(!this.canBuy(i))return false;this.extra[i]++;return true;}
 use(i,infinite=false){if(infinite)return true;if(this.base[i]){this.base[i]--;const secs=this.agent.id==='arc'&&i===1?20:this.agent.id==='ant'&&i===1?40:this.agent.id==='panther'&&i===1?40:this.agent.id==='spidey'&&i===1?30:this.agent.id==='bane'&&i===1?40:this.agent.id==='thor'&&i===1?45:0;if(secs&&!this.timers[i])this.timers[i]=secs;return true;}if(this.extra[i]){this.extra[i]--;return true;}return false;}
 tick(dt){for(let i=0;i<3;i++)if(this.timers[i]>0){this.timers[i]=Math.max(0,this.timers[i]-dt);if(this.timers[i]===0)this.base[i]=1;}}
 fill(){this.agent.skills.slice(0,3).forEach((s,i)=>{this.base[i]=s[5];this.extra[i]=s[3]-s[5];this.timers[i]=0;});}
}
