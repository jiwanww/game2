import * as T from './three.module.js';
export function drawSouls(g,items){
 g.soulMeshes??=[];let count=0;
 for(const orb of items){const now=orb.clock,absorbing=orb.absorbAt!==null,u=absorbing?Math.max(0,Math.min(1,(now-orb.absorbAt)/.7)):0;if(absorbing?u>=1:now>=orb.expires)continue;
  let group=g.soulMeshes[count++];if(!group){group=new T.Group();const core=new T.Mesh(new T.SphereGeometry(.23,20,12),new T.MeshBasicMaterial({color:'#b9ffe2'}));const halo=new T.Mesh(new T.SphereGeometry(.34,20,12),new T.MeshBasicMaterial({color:'#5fffc4',transparent:true,opacity:.22,depthWrite:false}));const ring=new T.Mesh(new T.TorusGeometry(.43,.025,6,32),new T.MeshBasicMaterial({color:'#92ffe1',transparent:true,opacity:.8}));ring.rotation.x=Math.PI/3;group.add(core,halo,ring);g.soulMeshes.push(group);g.scene.add(group);}
  group.visible=true;group.position.fromArray(orb.pos);group.position.y+=.55+Math.sin(now*3)*.12;if(absorbing){const to=new T.Vector3(...orb.to);group.position.lerp(to,u*u);group.position.y+=Math.sin(u*Math.PI)*.65;}group.scale.setScalar(absorbing?1-u*.85:1+Math.sin(now*4)*.06);group.children[2].rotation.z=now*2;group.children[2].rotation.y=now;group.children[1].material.opacity=absorbing?.35:.18+Math.sin(now*4)*.06;
 }
 for(let i=count;i<g.soulMeshes.length;i++)g.soulMeshes[i].visible=false;
}
