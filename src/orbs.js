import * as T from './three.module.js';
import {V} from './physics.js';
export class OrbSystem {
 constructor(world,physics,rng=Math.random){
  const w=world.map?.w||52,d=world.map?.d||52;
  const blocked=(x,z)=>[...physics.solids,...world.objects].some(b=>b.active&&b.p.y-b.h.y<1.9&&Math.abs(x-b.p.x)<b.h.x+.7&&Math.abs(z-b.p.z)<b.h.z+.7);
  const cells=new Map();for(let x=-Math.floor(w/2)+2;x<w/2-1;x++)for(let z=-Math.floor(d/2)+2;z<d/2-1;z++)if(!blocked(x,z))cells.set(`${x},${z}`,{x,z});
  // Use the largest connected walkable region, excluding walls, roofs and enclosed pockets.
  let largest=[];const unseen=new Set(cells.keys());while(unseen.size){const key=unseen.values().next().value,queue=[cells.get(key)];unseen.delete(key);for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=`${p.x+dx},${p.z+dz}`;if(unseen.delete(k))queue.push(cells.get(k));}}if(queue.length>largest.length)largest=queue;}
  let candidates=largest.filter(p=>!(world.map?.sites||[{x:0,z:9,r:2.6}]).some(s=>Math.hypot(p.x-s.x,p.z-s.z)<s.r+2));
  if(candidates.length<2)candidates=largest;
  this.orbs=[];for(let i=0;i<2&&candidates.length;i++){const p=candidates[Math.floor(rng()*candidates.length)];this.orbs.push({id:i,...p,active:true,owner:null,progress:0});candidates=candidates.filter(q=>Math.hypot(q.x-p.x,q.z-p.z)>4);}
 }
 tick(dt,actors,priority=()=>false){
  const previous=new Map(actors.map(a=>[a,a.orbChannel]));for(const a of actors)a.orbChannel=null;
  for(const o of this.orbs){if(!o.active)continue;
   const valid=a=>!a.dead&&a.connected!==false&&a.keys.KeyF&&!a.cast&&!a.scope&&!a.menu&&!(a.stun>0)&&a.player.grounded&&a.ultPoints<a.ultCost&&!priority(a)&&!['KeyW','KeyA','KeyS','KeyD'].some(k=>a.keys[k])&&Math.hypot(a.player.p.x-o.x,a.player.p.z-o.z)<1.7&&Math.abs(a.player.p.y-a.player.h.y)<.25&&(()=>{const start=a.origin(),delta=V(o.x,.8,o.z).sub(start);return !a.raycast(start,delta,delta.length());})();
   let a=actors.find(a=>(a.id||'solo')===o.owner&&valid(a));if(!a){o.progress=0;o.owner=null;a=actors.find(valid);}
   if(!a)continue;const prev=previous.get(a);if(prev&&prev.damage!==a.lastDamage){o.progress=0;continue;}
   o.owner=a.id||'solo';o.progress+=dt;a.orbChannel={id:o.id,progress:o.progress,damage:a.lastDamage};
   if(o.progress>=2){o.active=false;o.owner=null;o.progress=0;a.orbChannel=null;a.gainUlt('구슬 획득');a.audio.play('buy');}
  }
 }
}
export function drawOrbs(g,orbs=g.orbs?.orbs||[]){g.orbMeshes??=[];orbs.forEach((o,i)=>{let mesh=g.orbMeshes[i];if(!mesh){mesh=new T.Mesh(new T.IcosahedronGeometry(.28,1),new T.MeshStandardMaterial({color:'#d5bcff',emissive:'#9564e8',emissiveIntensity:1.3,roughness:.2}));g.scene.add(mesh);g.orbMeshes.push(mesh);}mesh.visible=o.active;mesh.position.set(o.x,.8+Math.sin((g.t||0)*2+i)*.08,o.z);mesh.rotation.y=(g.t||0)*.7;});for(let i=orbs.length;i<g.orbMeshes.length;i++)g.orbMeshes[i].visible=false;}
