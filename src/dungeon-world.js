import * as T from './three.module.js';
import {World,box,sphere,cylinder,mat} from './world.js';
import {V} from './physics.js';

export const MONSTERS={
 crawler:{name:'균열 추적체',hp:55,speed:3.8,damage:9,range:1.6,cool:1.3,color:'#647d80',size:.68,unlock:1},
 stalker:{name:'실패한 실험체',hp:90,speed:2.4,damage:15,range:1.9,cool:1.8,color:'#62705e',size:1,unlock:1},
 spitter:{name:'산성 포격체',hp:65,speed:1.7,damage:12,range:19,cool:2.8,color:'#8b9555',size:.9,unlock:2},
 charger:{name:'철골 돌진체',hp:140,speed:2.1,damage:22,range:14,cool:5,color:'#a57860',size:1.2,unlock:3},
 shield:{name:'봉쇄 수호체',hp:170,speed:1.5,damage:16,range:2.2,cool:2,color:'#647eaa',size:1.25,armor:70,unlock:4},
 bomber:{name:'불안정 핵',hp:65,speed:3,damage:30,range:3.5,cool:2.5,color:'#e0955c',size:.75,unlock:4},
 leech:{name:'에너지 포식체',hp:110,speed:2.9,damage:13,range:9,cool:3.6,color:'#ae76a7',size:1,unlock:5},
 sentinel:{name:'감시 촉수',hp:180,speed:0,damage:19,range:30,cool:2.6,color:'#7c9fad',size:1.4,elite:true,unlock:6},
 summoner:{name:'군체 지휘체',hp:200,speed:1.4,damage:10,range:16,cool:7,color:'#9e79b1',size:1.25,elite:true,unlock:7},
 phantom:{name:'위상 잔향',hp:100,speed:3.6,damage:18,range:2,cool:1.6,color:'#76b8bd',size:.9,unlock:8},
 juggernaut:{name:'격리구역 집행체',hp:340,speed:1.8,damage:30,range:3,cool:2.5,color:'#9b7b74',size:1.65,armor:90,elite:true,unlock:9},
 boss:{name:'프로토타입 ZERO',hp:4200,speed:1.65,damage:34,range:4.5,cool:3.5,color:'#b18bd1',size:3,armor:100,elite:true,boss:true,unlock:12}
};
export function roomSpec(stage,difficulty='normal'){
 const r={stage,difficulty,w:40,d:48,holes:[],toxic:[],lasers:false,compress:false,title:'격리 연구동',limit:85+stage*7};
 if(stage===6){r.title={easy:'보관실 / 위험도 I',medium:'격리 병동 / 위험도 II',hard:'반응로 / 위험도 III'}[difficulty];r.limit={easy:110,medium:145,hard:170}[difficulty];}
 else if(stage>=7){r.title='심층 변이 연구동';r.limit=110+stage*5;}
 if(stage===3||stage===5||stage>=7)r.holes=[{x:-10,z:0,w:4,d:8},{x:10,z:0,w:4,d:8}];
 if(stage===4||stage===6&&difficulty!=='easy'||stage>=8)r.toxic=[{x:-8,z:-9,r:3},{x:8,z:9,r:3}];
 r.lasers=stage===5||stage===6&&difficulty==='hard'||stage>=9;
 r.compress=stage===6&&difficulty==='hard'||stage===10||stage===11;
 if(stage===12)Object.assign(r,{title:'최종 격리실 / PROTOTYPE ZERO',w:48,d:48,limit:300,holes:[{x:-14,z:-4,w:4,d:8},{x:14,z:4,w:4,d:8}],toxic:[],lasers:false,compress:false});
 return r;
}
export class DungeonWorld extends World {
 build(){}
 constructor(scene,physics,stage=1,difficulty='normal'){
  super(scene,physics);this.spec=roomSpec(stage,difficulty);const s=this.spec;
  this.map={id:'dungeon',name:s.title,w:s.w,d:s.d,size:4,sites:[],spawn:s.d/2-5};this.physics.bounds={x:s.w/2-.6,z:s.d/2-.6};
  this.physics.floorAt=(x,z)=>!s.holes.some(h=>Math.abs(x-h.x)<h.w/2&&Math.abs(z-h.z)<h.d/2);
  this.buildRoom();
 }
 spawn(role,i=0){return [(i-1.5)*1.6,.92,17];}
 buildRoom(){
  const s=this.spec,scene=this.scene;
  // Tile geometry has actual gaps; floor collision uses the same rectangles.
  const tiles=[[],[]];for(let x=-s.w/2;x<s.w/2;x+=2)for(let z=-s.d/2;z<s.d/2;z+=2){
   if(!this.physics.floorAt(x+1,z+1))continue;
   tiles[Math.abs((x+z)/2)%2].push([x+1,-.12,z+1]);
  }
  // Identical full-quality tiles share geometry; this does not reduce resolution or shadows.
  tiles.forEach((positions,i)=>{const floor=new T.InstancedMesh(new T.BoxGeometry(1.98,.2,1.98),mat(i?'#242e35':'#202b32'),positions.length);positions.forEach((p,n)=>floor.setMatrixAt(n,new T.Matrix4().makeTranslation(...p)));floor.receiveShadow=true;floor.castShadow=true;scene.add(floor);});
  for(const sign of [-1,1]){this.block(sign*s.w/2,6,0,.65,12,s.d,'#152128');this.block(0,6,sign*s.d/2,s.w,12,.65,'#18212a');}
  // High ceiling and structural ribs leave room for flight and giant agents.
  this.block(0,11.7,0,s.w,.3,s.d,'#0c151d');
  for(let z=-20;z<=20;z+=8){for(const x of [-s.w/2+.6,s.w/2-.6]){
   box(.5,10,.8,'#35434c',x,5,z,scene);
   box(.09,3,.12,'#6ce5d9',x-Math.sign(x)*.3,5,z,scene).material=mat('#479e9a',true);
  }box(s.w,.5,.6,'#293944',0,10.4,z,scene);}
  for(const x of [-12,12]){const tank=cylinder(1.1,1.1,4.2,'#213d46',scene);tank.position.set(x,2.1,-17);const core=cylinder(.75,.75,3,'#477c77',tank);core.material=mat('#347c71',true);}
  if(s.stage!==12){
   for(const x of [-7,7]){this.block(x,1.1,-7,3,2.2,1.2,'#465053',true).hp=150;this.block(x,1.2,8,3,2.4,1.2,'#384955',true).hp=150;}
   if(s.stage%2===0){for(const side of [-1,1]){this.block(side*14,2.2,-3,1.2,4.4,14,'#24343b');for(let i=0;i<6;i++){const b=this.block(side*17,(i+1)*.18,10-i*1.2,3,(i+1)*.36,1.2,'#43565d');b.stair=true;}this.block(side*17,2.12,-2,3,.3,16,'#465c65');}}
   this.prop(-5,13);this.prop(5,13);this.prop(-12,-12);this.prop(12,12);
  }else{
   for(const x of [-8,8])for(const z of [-9,9])this.block(x,1.1,z,2,2.2,2,'#48515b',true).hp=240;
   const seal=cylinder(5,5,.05,'#353047',scene);seal.position.set(0,.02,-8);
  }
  for(const h of s.holes){box(h.w,6,h.d,'#020408',h.x,-3.2,h.z,scene);for(const k of [-1,1]){box(h.w+.4,.06,.18,'#e4ac60',h.x,.05,h.z+k*h.d/2,scene).material=mat('#d29a45',true);box(.18,.06,h.d,'#e4ac60',h.x+k*h.w/2,.05,h.z,scene).material=mat('#d29a45',true);}}
  for(const t of s.toxic){const pad=cylinder(t.r,t.r,.04,'#52714d',scene);pad.position.set(t.x,.03,t.z);pad.material=mat('#416638',true);}
  // Two practical fill lights; real-time shadow/AA/resolution settings are unchanged.
  for(const x of [-9,9]){const light=new T.PointLight(x<0?'#74c7c9':'#ce9fb9',38,26,2);light.position.set(x,6,2);scene.add(light);}
  this.door=box(4,5,.3,'#264c53',0,2.5,-s.d/2+.4,scene);
  for(const x of [-2.2,2.2])box(.13,5.5,.1,'#80d8c5',x,2.7,-s.d/2+.7,scene).material=mat('#80d8c5',true);
 }
}
export function monsterMesh(kind){
 const d=MONSTERS[kind],root=new T.Group();
 const torso=sphere(.52,d.color,root);torso.scale.set(1,1.4,.75);torso.position.y=.15;torso.userData.hitRegion='body';
 const head=sphere(.31,d.color,root);head.position.set(0,.91,.09);head.userData.hitRegion='head';
 for(const side of [-1,1]){const eye=sphere(.055,'#f5c8ff',head);eye.position.set(side*.12,.02,.25);eye.material=mat('#e6acff',true);eye.userData.hitRegion='head';}
 const limbs=[];for(let i=0;i<(kind==='boss'?6:4);i++){const limb=new T.Group(),side=i%2?1:-1;limb.position.set(side*.38,i<2?.35:-.38,0);root.add(limb);const bone=box(.15,.6,.17,'#30313d',side*.14,-.19,0,limb);bone.rotation.z=side*-.45;box(.18,.24,.31,d.color,side*.26,-.5,.1,limb);limb.traverse(m=>{m.userData.hitRegion=i<2?'body':'legs';});limbs.push(limb);}
 for(let i=0;i<3;i++){const fin=new T.Mesh(new T.ConeGeometry(.13,.7,5),mat(d.color));fin.position.set((i-1)*.3,.66,-.2);fin.rotation.x=-.6;root.add(fin);}
 if(d.armor){const shield=cylinder(.52,.52,.07,'#899bc2',root);shield.rotation.x=Math.PI/2;shield.position.set(0,.2,.42);}
 const core=sphere(.16,'#cd92d1',root);core.position.set(0,.25,.36);core.material=mat('#cd92d1',true);
 root.userData.limbs=limbs;root.userData.core=core;root.userData.head=head;root.scale.setScalar(d.size);return root;
}
export function poseMonster(mesh,state,time){mesh.rotation.y=state.yaw||0;const moving=state.speed||0;mesh.userData.limbs.forEach((l,i)=>l.rotation.x=Math.sin(time*8+i*Math.PI)*Math.min(.55,moving*.18));mesh.userData.core.scale.setScalar(1+Math.sin(time*5)*.12);if(state.windup>0)mesh.userData.head.rotation.x=-.35;else mesh.userData.head.rotation.x=0;}
