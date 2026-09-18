// Original architectural layout: three lanes, symmetric mid contest and optional breaches.
export const ATRIUM={id:'atrium',name:'아트리움',en:'ATRIUM',size:5,w:128,d:144,spawn:61.2,color:'#dfb775',desc:'5대5 · 낮은 복도와 12m 중앙 홀, 2층 회랑·계단·파괴 지름길',sites:[{x:-39,z:30,r:5},{x:39,z:30,r:5}],blocks:[],props:[[-40,-38],[40,-38],[-29,29],[29,29],[-9,-8],[9,8]],breakable:[],stairs:[],architecture:true};
const add=(x,y,z,w,h,d)=>{ATRIUM.blocks.push([x,y,z,w,h,d]);return ATRIUM.blocks.length-1;};
// Building wings compress the three approaches. Rear concourses join all lanes.
for(const side of [-1,1]){
 for(const z of [-36,36]){
  add(side*(z>0?14:19),5,z,z>0?20:30,10,32); // inner wings: mid corridor remains 8m wide
  add(side*(z>0?60:56),5,z,z>0?12:24,10,32); // outer walls: side corridor remains 10m wide
  add(side*39,z>0?7.2:3.3,z,z>0?30:10,.4,32); // low 3.1m corridor ceiling
  add(side*37,1.5,z-5,5,3,1); // two staggered screens break long sight lines
  add(side*41,1.5,z+5,5,3,1);
 }
 // Site rooms replace the northern corridor's ceiling with a taller lobby.
 // Site center is beyond the staggered screens; planting disc is free at (39,30).
 // Mid-to-site connector is below each bridge, six metres wide.
 add(side*22,6,0,1,12,12);
 add(side*22,6,-18,1,12,4);add(side*22,6,18,1,12,4);
 add(side*33,4,0,20,8,12);
 add(side*50,4,0,12,8,12);
 // Optional breach on one of the two connector passages; the other stays open.
 ATRIUM.breakable.push(add(side*28,1.6,10,1,3.2,8));
 // Two flights per side reach an actual second-floor gallery without jumping.
 for(const direction of [-1,1])for(let i=0;i<14;i++){
  const height=(i+1)*.3;
  ATRIUM.stairs.push(add(side*17,height/2,direction*(17.5-i),4,height,1));
 }
 add(side*17,4,0,6,.4,8); // floor top 4.2m
 add(side*13.85,4.7,0,.3,1,8); // inner safety parapet
 add(side*20.15,4.7,0,.3,1,8);
 for(const z of [-15,15])add(side*9,6,z,1.2,12,1.2);
 // Site cover is offset, not on the planting center.
 add(side*41,1.2,33,3,2.4,3);
}
// Mid low tunnels release into the monumental hall; solid lintels block vertical shortcuts.
for(const direction of [-1,1]){
 add(0,3.3,direction*36,8,.4,32);
 add(0,1.5,direction*40,3,3,1); // entrance screen: no spawn-to-spawn sightline
 add(-12,6,direction*20,20,12,1);add(12,6,direction*20,20,12,1); // 4m mid door
 add(0,7.6,direction*20,4,8.8,1); // 3.2m clear doorway
}
add(0,12.2,0,45,.4,41); // continuous hall roof, 12m clear ceiling
// Low central cover enables crossing but does not wall off the open hall.
add(-4,.6,-2,3,1.2,3);add(4,.6,2,3,1.2,3);
ATRIUM.scaleInfo={agentHeight:1.8,widthInAgents:128/1.8,depthInAgents:144/1.8,reference:'original atrium layout'};
