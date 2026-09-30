// 2D balance is deliberately independent of the legacy 3D charge economy.
export const VERSION='0.8.0-beta.1';
export const MODES={standard:{name:'일반전',detail:'설치 폭탄 · 공격과 수비',seconds:150},elimination:{name:'섬멸전',detail:'전멸 승리 · 연장전 초당 1 HP 감소',seconds:120},ball:{name:'어빌리티볼',detail:'2골 선승 · 5초 부활',seconds:240},big:{name:'빅 에이전트',detail:'1 대 9 · 거대 요원을 저지하세요',seconds:180}};
const agent=(id,name,role,color,hp,speed,damage,range,reload,interval,kind,cooldowns,skills,ultCost,ball)=>({id,name,role,color,hp,speed,damage,range,reload,interval,kind,cooldowns,skills,ultCost,ball,ammo:3});
export const ARENA_AGENTS=[
 agent('spidey','스파이디','기동 / 제어','#ef685e',110,4.4,22,8,1.2,.35,'web',[8,7,10],['거미줄 폭탄','벽 넘기','거미줄 갈고리','스파이더'],330,'거미줄 공 · 적중 시 0.6초 둔화'),
 agent('arc','아크리터맨','원거리 / 방어','#f6b84e',120,3.6,32,9,1.5,.5,'repulsor',[14,20,12],['원자 보호막','활공','유도 사격','타임 스냅'],420,'리펄서 공 · 공 속도 25% 증가'),
 agent('bane','배인','탱커 / 변신','#84d968',150,3.8,14,1.7,1,.65,'punch',[9,12,13],['손뼉치기','돌진','휘두르기','변신 / 내려찍기'],250,'괴력 공 · 파괴 벽 1개 격파 후 감속'),
 agent('cap','캡 테인','탱커 / 근접','#68a9ef',135,4.5,30,1.9,1,.45,'punch',[8,2,15],['방패 던지기','방패막기','방패 돌리기','슈퍼혈청'],400,'반사 공 · 벽에 한 번 튕깁니다'),
 agent('thor','또르','근접 / 광역','#95e7ff',145,3.7,38,2.2,1.4,.6,'hammer',[9,18,12],['망치 던지기','하늘날기','번개 공격','라이트닝'],440,'천둥 공 · 적중 시 0.25초 기절'),
 agent('widow','블랙 윈도우','암살 / 함정','#c695eb',95,4.5,20,1.65,.85,.22,'punch',[8,13,11],['권총 8발','전기 충격기','덫 폭탄','스파이'],340,'독 공 · 적중 시 2초간 초당 3 피해'),
 agent('pigeon','피죤 아이','저격수','#b7a4ff',95,4,20,1.7,.9,.25,'punch',[1.4,16,10],['차징 활','회수','특수 화살','나이트 에로우'],350,'정밀 공 · 차는 거리 25% 증가'),
 agent('ant','개미맨','기동 / 변형','#f47779',115,4,23,1.8,1.1,.4,'punch',[11,24,15],['체인지 슈터','크기 변경','개미 군단','양자역학'],480,'양자 공 · 2초 동안 가로채기 반경 축소'),
 agent('hera','헤라','지원 / 투사체','#70dec2',105,4,24,9,1.15,.35,'knife',[7,12,20],['독의 칼','영혼 흡수','가시 장벽','영혼의 불'],420,'영혼 공 · 패스를 받은 아군 12 HP 회복'),
 agent('panther','검정 팬서','암살 / 근접','#b994ef',125,4.5,15,2,1.1,.45,'claws',[8,18,12],['바이브레이늄네일','허브','에너지 방출','선조들의 힘'],380,'충격 공 · 적중한 상대를 밀쳐냅니다'),
 agent('vision','뷔전','지원 / 광선','#f0a5c7',110,3.9,26,9,1.3,.4,'beam',[18,1,1],['위상 투명화','비행','마인드 컨트롤','마인드 빔'],440,'위상 공 · 파괴 벽 한 개 통과')
];
export const AGENT_BY_ID=Object.fromEntries(ARENA_AGENTS.map(a=>[a.id,a]));
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function direction(x,y){const n=Math.hypot(x,y)||1;return {x:x/n,y:y/n};}
export function inRect(p,r,pad=0){return Math.abs(p.x-r.x)<r.w/2+pad&&Math.abs(p.y-r.y)<r.h/2+pad;}
// Swept segment / expanded AABB. Returns distance fraction, not just endpoint overlap.
export function rayRect(a,b,r,pad=0){let lo=0,hi=1;for(const [key,span] of [['x','w'],['y','h']]){const d=b[key]-a[key],min=r[key]-r[span]/2-pad,max=r[key]+r[span]/2+pad;if(Math.abs(d)<1e-9){if(a[key]<min||a[key]>max)return null;continue;}let t1=(min-a[key])/d,t2=(max-a[key])/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}return lo;}
export function rayCircle(a,b,p,r){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;if(!len)return distance(a,p)<=r?0:null;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/len,0,1);if(Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y)>r)return null;const along=Math.sqrt(Math.max(0,r*r-(a.x+dx*t-p.x)**2-(a.y+dy*t-p.y)**2))/Math.sqrt(len);return Math.max(0,t-along);}
export function createArenaMap(mode='standard'){
 const standard=mode==='standard',w=standard?56:36,h=standard?64:44,walls=[],bushes=[],pits=[];
 // Twenty independently destroyable cover sections per mirrored half: 80% breakable.
 const layouts=standard?[[7,7,4,1],[12,13,1,5],[4,18,5,1],[18,21,5,1],[21,9,1,5],[9,25,5,1],[17,3,5,1],[3,9,1,4],[18,29,4,1],[23,17,1,4]]:[[5,5,3,1],[11,8,1,4],[4,13,4,1],[11,15,4,1],[13,2,1,4]];
 let n=0;for(const sy of [-1,1])for(const sx of [-1,1])for(const [x,y,cw,ch] of layouts){walls.push({id:'w'+n,x:x*sx,y:y*sy,w:cw,h:ch,hp:n%5===0?1e9:180,breakable:n%5!==0});n++;}
 for(const sy of [-1,1])for(const sx of [-1,1]){bushes.push({x:sx*(standard?16:9),y:sy*(standard?14:10),w:5,h:4});if(standard)pits.push({x:sx*23,y:sy*25,w:4,h:5});}
 return {name:standard?'유실된 중정':'네온 연구 정원',w,h,walls,bushes,pits,sites:[{x:-14,y:17,r:3},{x:14,y:17,r:3}],spawn:h/2-3,goals:[{team:'A',x:0,y:-h/2+1,w:7},{team:'B',x:0,y:h/2-1,w:7}]};
}
