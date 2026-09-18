import * as T from './three.module.js';
import {ATRIUM} from './atrium.js';
import {World,box,label,mat} from './world.js';
export const MAPS=[
 {id:'duel',name:'테라스',en:'TERRACE',size:1,w:44,d:44,color:'#7ed9c8',desc:'1대1 · 좌우 설치 구역, 중앙 통로와 계단형 고지대',sites:[{x:-14,z:0,r:3},{x:14,z:0,r:3}],blocks:[[-7,2,-7,1,4,16],[7,2,7,1,4,16],[-7,2,9,1,4,8],[7,2,-9,1,4,8],[0,.6,0,4,1.2,4],[-17,.5,6,4,1,3],[-17,1,9,4,2,3],[-17,1.5,12,4,3,3],[17,.5,-6,4,1,3],[17,1,-9,4,2,3],[17,1.5,-12,4,3,3],[-13,.8,-3,3,1.6,2],[13,.8,3,3,1.6,2]],props:[[-12,8],[12,-8],[0,8],[0,-8]],spawn:18},
 {id:'trio',name:'분기점',en:'JUNCTION',size:3,w:52,d:52,color:'#b8adff',desc:'3대3 · A/B 설치 구역, 중앙 교차로와 실내 우회로',sites:[{x:-17,z:0,r:3.2},{x:17,z:0,r:3.2}],blocks:[[-9,2,-9,1,4,18],[-9,2,13,1,4,10],[9,2,9,1,4,18],[9,2,-13,1,4,10],[0,2,0,5,4,2],[-19,1,-3,4,2,2],[19,1,3,4,2,2],[-18,1,8,5,2,2],[18,1,-8,5,2,2],[-20,2,-14,1,4,6],[-14,2,-14,1,4,6],[-17,4.15,-14,7,.3,6],[20,2,14,1,4,6],[14,2,14,1,4,6],[17,4.15,14,7,.3,6],[-4,.5,-8,3,1,3],[-4,1,-11,3,2,3],[4,.5,8,3,1,3],[4,1,11,3,2,3]],props:[[-15,4],[15,-4],[-4,15],[4,-15]],spawn:22},
 {id:'squad',name:'스카이라인',en:'SKYLINE',size:5,w:64,d:80,color:'#e8c79c',desc:'5대5 · A/B 정원, 중앙 광장, 공수 베이스와 고가 통로',sites:[{x:-22,z:14,r:4},{x:22,z:14,r:4}],blocks:[
 [-12,3,-22,2,6,20],[12,3,-22,2,6,20],[-23,3,-8,16,6,2],[23,3,-8,16,6,2],
 [-10,3,10,2,6,20],[10,3,10,2,6,20],[-22,2.5,23,14,5,2],[22,2.5,23,14,5,2],
 [-24,1.2,12,4,2.4,4],[24,1.2,12,4,2.4,4],[0,1.1,-1,5,2.2,5],
 [-5,3.5,24,2,7,13],[5,3.5,24,2,7,13],[-18,.5,-27,4,1,3],[-18,1,-24,4,2,3],[-18,1.5,-21,4,3,3],[-18,2,-18,4,4,3],
 [18,.5,-27,4,1,3],[18,1,-24,4,2,3],[18,1.5,-21,4,3,3],[18,2,-18,4,4,3],
 [-22,4.2,-15,12,.4,4],[22,4.2,-15,12,.4,4],[-29,3,0,2,6,10],[29,3,0,2,6,10],
 [-17,2.8,6,2,5.6,5],[17,2.8,6,2,5.6,5],[-4,2.5,-12,1,5,7],[4,2.5,12,1,5,7]
 ],props:[[-20,-29],[20,-29],[-7,-4],[7,4],[-27,17],[27,17]],spawn:34}
];
// Horizontal scale is independent of the unchanged 1.8-unit agent height.
const squad=MAPS.find(m=>m.id==='squad');
squad.w=128;squad.d=144;squad.spawn*=1.8;
squad.blocks=squad.blocks.map(([x,y,z,w,h,d])=>[x*2,y,z*1.8,w*2,h,d*1.8]);
squad.props=squad.props.map(([x,z])=>[x*2,z*1.8]);
squad.sites=squad.sites.map(s=>({...s,x:s.x*2,z:s.z*1.8,r:6}));
squad.scaleInfo={agentHeight:1.8,widthInAgents:128/1.8,depthInAgents:144/1.8,reference:'independent tactical scale; exact Ascent dimensions unverified'};
// Broken sight lines across the expanded plaza, without closing either lane.
for(const side of [-1,1])for(const [x,z] of [[25,-40],[22,-6],[35,33],[10,-32]])squad.blocks.push([x*side,1.1,z,3,2.2,3]);
MAPS.push(ATRIUM);
export class Arena extends World {
 constructor(scene,physics,id){super(scene,physics);this.map=MAPS.find(m=>m.id===id)||MAPS[0];this.construct();}
 build(){}
 construct(){const m=this.map;this.physics.bounds={x:m.w/2,z:m.d/2};box(m.w,.2,m.d,'#354d58',0,-.1,0,this.scene);const wall='#263d4a';for(const s of [-1,1]){this.block(s*(m.w/2+.5),3,0,1,6,m.d+2,wall);this.block(0,3,s*(m.d/2+.5),m.w+2,6,1,wall);}m.blocks.forEach((b,i)=>{const breach=m.architecture?m.breakable.includes(i):i%7===3;const body=this.block(...b,breach?'#bc8959':m.architecture?(b[4]<.5?'#dad1bb':'#637b80'):i%4===0?'#7895a1':'#587583',breach);body.stair=!!m.stairs?.includes(i);});if(m.architecture)this.decorateAtrium();if(m.id==='squad'){for(const side of [-1,1]){for(let i=0;i<5;i++){const facade=box(4,7+i%2,1,'#b8a58e',side*(m.w/2+.6),3.5,-24+i*12,this.scene);facade.castShadow=false;}for(const z of [-m.spawn,m.spawn]){const glow=box(m.w-6,.025,.18,side<0?'#ebad75':'#79bdff',0,.08,z,this.scene);glow.castShadow=false;}if(typeof document!=='undefined'&&document.createElement){for(const [name,z] of [['ATTACK BASE',-m.spawn],['DEFENSE BASE',m.spawn]]){const sign=label(name,z<0?'#ffd099':'#9bd8ff',9,1.3);sign.rotation.x=-Math.PI/2;sign.position.set(0,.07,z);this.scene.add(sign);}}}}m.props.forEach(p=>this.prop(...p));
 for(const [i,s] of m.sites.entries()){const ring=new T.Mesh(new T.RingGeometry(s.r-.1,s.r,48),new T.MeshBasicMaterial({color:m.color,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(s.x,.055,s.z);this.scene.add(ring);if(typeof document!=='undefined'&&document.createElement){const sign=label(String.fromCharCode(65+i),m.color,2.2,1.3);sign.rotation.x=-Math.PI/2;sign.position.set(s.x,.06,s.z);this.scene.add(sign);}}
 for(let x=-m.w/2+2;x<m.w/2;x+=4)box(.015,.012,m.d-1,'#496674',x,.02,0,this.scene);
 for(let z=-m.d/2+2;z<m.d/2;z+=4)box(m.w-1,.012,.015,'#496674',0,.02,z,this.scene);
 for(const s of [-1,1]){box(m.w-2,.04,.1,s<0?'#ffb67b':'#89dfff',0,.07,s*(m.spawn+1),this.scene).material=mat(s<0?'#ffb67b':'#89dfff',true);}
 }
 decorateAtrium(){
  // Restrained architectural accents: no dynamic lights or particle emitters.
  const detail=(w,h,d,c,x,y,z,glow=false)=>{const m=box(w,h,d,c,x,y,z,this.scene);m.castShadow=false;if(glow)m.material=mat(c,true);return m;};
  detail(42,.035,38,'#b0aaa0',0,.025,0);
  for(const side of [-1,1]){for(const z of [-15,15])detail(1.26,.12,1.26,'#f9d894',side*9,10.5,z,true);detail(.1,.07,36,'#edc786',side*12,.06,0,true);detail(.1,.15,8,'#e8c991',side*13.65,5.25,0,true);for(const z of [-36,36])detail(.1,.05,30,side<0?'#69bcc7':'#e5a979',side*39,3.07,z,true);}
  for(const x of [-14,0,14])detail(.18,.15,39,'#e9c992',x,11.8,0,true);
  if(typeof document!=='undefined'&&document.createElement)for(const [text,x,y,z,color] of [['ATRIUM / MID',0,7,-19.4,'#ffe0a6'],['A / ARCHIVE',-22.6,3,10,'#8fdae5'],['B / GALLERY',22.6,3,-10,'#ffca92'],['ATTACK BASE',0,.08,-61,'#ffd099'],['DEFENSE BASE',0,.08,61,'#9bd8ff']]){const sign=label(text,color,text.includes('BASE')?10:7,1);sign.position.set(x,y,z);if(text.includes('BASE'))sign.rotation.x=-Math.PI/2;else if(x)sign.rotation.y=x<0?Math.PI/2:-Math.PI/2;this.scene.add(sign);}
 }
 spawn(role,index){return [(index-(this.map.size-1)/2)*2.2,.9,role==='attack'?-this.map.spawn:this.map.spawn];}
}
