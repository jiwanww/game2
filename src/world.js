import * as T from './three.module.js';
import {Body,V} from './physics.js';
const mats=new Map();export function mat(color,emissive=false){const key=color+':'+emissive;if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:.65,metalness:.25,emissive:emissive?color:0,emissiveIntensity:emissive?1.2:0}));return mats.get(key);}
export function box(w,h,d,color,x=0,y=0,z=0,parent=null){let m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m;}
export function sphere(r,color,parent=null){const m=new T.Mesh(new T.IcosahedronGeometry(r,1),mat(color));m.castShadow=true;if(parent)parent.add(m);return m;}
export function cylinder(r1,r2,h,color,parent=null){let m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,16),mat(color));m.castShadow=true;if(parent)parent.add(m);return m;}
export function label(text,color='#bde6ee',w=5,h=1){const c=document.createElement('canvas');c.width=1024;c.height=200;const ctx=c.getContext('2d');ctx.fillStyle='#0e202b';ctx.fillRect(0,0,1024,200);ctx.fillStyle=color;ctx.font='bold 90px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,105);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));return mesh;}
export function humanoid(color='#eb8a71',dark='#304756',kind='bot'){
 const root=new T.Group();const torso=box(.68,.74,.36,dark,0,.16,0,root);box(.54,.38,.07,color,0,.26,.22,root);const core=sphere(.095,'#d9fcff',root);core.material=mat('#a7f6ff',true);core.position.set(0,.32,.27);
 const head=new T.Group();head.position.y=.78;root.add(head);const helmet=sphere(.275,color,head);helmet.scale.set(.92,1.1,.9);box(.4,.1,.035,'#94f8f0',0,.025,.245,head).material=mat('#94f8f0',true);
 const arms=[],legs=[];for(const s of [-1,1]){const a=new T.Group();a.position.set(s*.47,.42,0);root.add(a);sphere(.19,color,a);box(.23,.47,.25,dark,0,-.3,0,a);box(.29,.25,.29,color,0,-.61,.015,a);arms.push(a);const l=new T.Group();l.position.set(s*.19,-.26,0);root.add(l);box(.24,.5,.27,dark,0,-.25,0,l);box(.25,.27,.3,color,0,-.58,0,l);box(.27,.18,.45,dark,0,-.78,.07,l);legs.push(l);}
 if(kind==='cap'){const shield=cylinder(.46,.46,.065,color,arms[0]);shield.rotation.x=Math.PI/2;shield.position.set(0,-.45,.23);const inr=cylinder(.29,.29,.07,'#d7e5e8',shield);inr.position.y=.04;}
 if(kind==='thor'){box(.42,.24,.24,'#cbd8e1',0,-.8,.13,arms[1]);box(.07,.55,.07,'#654752',0,-.5,.13,arms[1]);}
 if(kind==='pigeon'){const bow=new T.Mesh(new T.TorusGeometry(.45,.035,6,20,Math.PI),mat(color));bow.rotation.z=Math.PI/2;bow.position.set(-.1,-.45,.2);arms[0].add(bow);}
 if(kind==='arc'){for(const s of [-1,1])box(.14,.4,.22,color,s*.31,.24,-.29,root);}
 if(kind==='bane'){root.scale.set(1,1,1);}
 if(kind==='ant'){for(const side of [-1,1]){const antenna=box(.035,.32,.035,'#c5e5f2',side*.15,.28,0,head);antenna.rotation.z=-side*.35;sphere(.06,'#ff8c74',antenna).position.y=.17;}}
 if(kind==='hera'){for(let i=-2;i<=2;i++){const spike=new T.Mesh(new T.ConeGeometry(.06,.35+Math.abs(i)*.08,5),mat('#9df2c2'));spike.position.set(i*.12,.3,0);spike.rotation.z=-i*.18;head.add(spike);}}
 if(kind==='panther'){for(const side of [-1,1]){const ear=new T.Mesh(new T.ConeGeometry(.09,.2,4),mat('#8a64c4'));ear.position.set(side*.2,.26,0);head.add(ear);for(let i=0;i<3;i++)box(.025,.18,.025,'#dfc1ff',i*.06-.06,-.82,.08,arms[side<0?0:1]);}}
 if(kind==='vision'){const gem=new T.Mesh(new T.OctahedronGeometry(.07),mat('#ffd877',true));gem.position.set(0,.12,.24);head.add(gem);box(.65,.9,.035,'#9a5664',0,-.02,-.27,root);}
 root.traverse(m=>{if(m.isMesh)m.userData.hitRegion="body";});head.traverse(m=>{if(m.isMesh)m.userData.hitRegion="head";});legs.forEach(l=>l.traverse(m=>{if(m.isMesh)m.userData.hitRegion="legs";}));root.userData={arms,legs,head,torso};return root;
}
export class World {
 constructor(scene,physics){this.scene=scene;this.physics=physics;this.objects=[];this.bots=[];this.colliders=[];this.build();}
 block(x,y,z,w,h,d,color='#637780',destructible=false){const mesh=box(w,h,d,color,x,y,z,this.scene);const b=new Body(V(x,y,z),V(w/2,h/2,d/2),mesh);b.destructible=destructible;b.hp=100;mesh.userData.body=b;this.physics.solids.push(b);this.colliders.push(mesh);return b;}
 prop(x,z,size=.9){const mesh=new T.Group();box(size,size,size,'#c68c4d',0,0,0,mesh);for(const y of [-.32,.32])box(size+.04,.06,size+.04,'#273d46',0,y*size,0,mesh);for(const x of [-.32,.32])box(.065,size+.03,size+.025,'#273d46',x*size,0,0,mesh);this.scene.add(mesh);const b=new Body(V(x,size/2,z),V(size/2,size/2,size/2),mesh);b.movable=true;b.mass=2;b.bounce=.12;b.hitTimer=0;mesh.traverse(m=>{if(m.isMesh)m.userData.body=b;});this.physics.movers.push(b);this.objects.push(b);b.sync();return b;}
 bot(x,z,mode){const mesh=humanoid(mode==='attack'?'#ef776a':mode==='follow'?'#b4a5ec':'#5bc7ca');this.scene.add(mesh);const b=new Body(V(x,1.04,z),V(.43,1.04,.38),mesh);b.bot=true;b.hp=100;b.mode=mode;b.root=0;b.stun=0;b.slow=0;b.deaf=0;b.dot=0;b.respawn=0;b.shot=1.8;b.mass=2;mesh.traverse(m=>{if(m.isMesh)m.userData.body=b;});this.physics.movers.push(b);this.bots.push(b);b.sync();return b;}
 build(){
 const floor=box(100,.2,100,'#334a53',0,-.1,0,this.scene);floor.receiveShadow=true;
 const colors=['#50c8ce','#ee946b','#bca7ea','#8bd192'];const centers=[[-14,-14],[14,-14],[-14,14],[14,14]];
 centers.forEach(([x,z],i)=>{const tile=box(24,.035,24,i%2?'#3c535a':'#40565d',x,.018,z,this.scene);for(const s of [-1,1]){box(24,.045,.12,colors[i],x,.045,z+s*12,this.scene).material=mat(colors[i],true);box(.12,.045,24,colors[i],x+s*12,.045,z,this.scene).material=mat(colors[i],true);}const sign=label(`0${i+1} / ${['MOBILITY','DEFENSE','MULTI TARGET','PURSUIT'][i]}`,colors[i],9,1.6);sign.position.set(x,5.4,z<0?-26.8:26.8);if(z>0)sign.rotation.y=Math.PI;this.scene.add(sign);
 for(let tx=-10;tx<=10;tx+=4)for(let tz=-10;tz<=10;tz+=4){box(.02,.01,3.85,'#4a6269',x+tx,.05,z+tz,this.scene);box(3.85,.01,.02,'#4a6269',x+tx,.05,z+tz,this.scene);}});
 for(const s of [-1,1]){this.block(0,3.5,s*27.5,56,7,1,'#233a45');this.block(s*27.5,3.5,0,1,7,56,'#233a45');for(let n=-24;n<26;n+=6){box(.18,5,.2,'#4e6872',n,3,s*26.94,this.scene);box(4,.11,.12,'#9de9ef',n+2,6.4,s*26.94,this.scene).material=mat('#9de9ef',true);}}
 for(const [x,z] of [[-2,-2],[2,-2],[-2,2],[2,2]]){this.block(x,4,z,.5,8,.5,'#21333f');box(.53,.1,.53,'#9be4e6',x,6.9,z,this.scene).material=mat('#9be4e6',true);}box(5,.4,5,'#21333f',0,8,0,this.scene);
 // Traversable stepped platforms, cover and a walk-in structure in mobility sector.
 this.block(-20,.5,-8,4,1,4);this.block(-20,1.05,-12,4,2.1,4,'#607b87');this.block(-20,1.7,-16,4,3.4,4,'#728c96');this.block(-20,2.5,-21,4,5,5,'#7d939c');
 this.block(-8,1,-9,3,2,2,'#70858b');this.block(-11,.45,-13,2,.9,2,'#6d8991');this.block(-6,1.65,-17,2,3.3,2,'#718b94');
 this.block(-13,1.6,-23,7,3.2,.5,'#718995');this.block(-16.5,1.6,-21,.5,3.2,4,'#718995');this.block(-9.5,1.6,-21,.5,3.2,4,'#718995');this.block(-13,3.35,-21,7.5,.3,4.5,'#738a94');
 this.prop(-11,-6);this.prop(-13,-8,1.1);this.prop(-6,-12,.8);this.prop(-16,-17);this.bot(-12,-17,'still');
 this.block(9,.65,-9,4,1.3,1);this.block(17,.85,-16,3,1.7,1);this.block(7,1.4,-20,2,2.8,3);this.block(21,1.5,-8,3,3,1,'#bd8d64',true);this.bot(14,-22,'attack');
 for(let i=0;i<5;i++){this.bot(-22+i*4,21,'still');const base=cylinder(.85,.95,.07,'#263e49',this.scene);base.position.set(-22+i*4,.07,21);}
 this.block(-13,.6,12,7,1.2,.8);this.block(-23,1.4,12,2,2.8,2);this.prop(-7,12);
 this.bot(10,21,'follow');this.bot(15,22,'follow');this.bot(20,21,'follow');this.block(10,1,12,2,2,2,'#ad8b66',true);this.block(20,.75,13,2,1.5,3);this.prop(15,14);
 const site=cylinder(2.7,2.7,.03,'#415c63',this.scene);site.position.set(0,.04,9);const ring=new T.Mesh(new T.RingGeometry(2.6,2.68,48),new T.MeshBasicMaterial({color:'#ffc368',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(0,.07,9);this.scene.add(ring);const s=label('A / SPIKE','#ffc368',3,.6);s.rotation.x=-Math.PI/2;s.position.set(0,.08,9);this.scene.add(s);
 // Architectural skyline beyond the training arena.
 for(let i=0;i<28;i++){const angle=i/28*Math.PI*2,r=44+Math.sin(i*8)*5,h=9+(i*7%17);box(5,h,5,'#455e6a',Math.sin(angle)*r,h/2-1,Math.cos(angle)*r,this.scene);}
 }
 reset(){for(const b of [...this.objects,...this.bots]){b.active=true;b.p.copy(b.home);b.v.set(0,0,0);b.held=false;b.hp=100;b.respawn=0;b.root=b.stun=b.slow=b.dot=0;b.mesh.visible=true;b.sync();}for(const b of this.physics.solids){b.active=true;b.hp=100;b.mesh.visible=true;}}
}
