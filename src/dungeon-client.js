import {nativeMobile} from './platform.js';
import * as T from './three.module.js';
import {AGENTS} from './agents.js';
import {Physics,V} from './physics.js';
import {DungeonWorld,MONSTERS,monsterMesh,poseMonster} from './dungeon-world.js';
import {COOLDOWNS,byId,DUNGEON_VERSION} from './dungeon-data.js';
import {unlockedAgents} from './profile.js';
import {unlockRewardsHTML,bindUnlockRewards} from './profile-ui.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dungeonMenu(lobby){
 lobby.shell(`<section class="lan-home dungeon-menu"><div class="eyebrow">03 / ABANDONED LAB · ${DUNGEON_VERSION}</div><h1>던전 : 격리 프로토콜</h1><p>제한 시간 안에 살아남고, 이번 도전만의 빌드를 완성하세요.</p><div class="dungeon-route"><span>01—05<br>능력치 성장</span><span>06<br>위험도 선택</span><span>07—11<br>스킬 진화</span><span>보너스<br>자유 선택 2개</span><span>12<br>프로토타입 ZERO</span></div><div class="lan-modes"><button id="dungeon-solo" class="lan-mode"><span>SOLO</span><h2>싱글 플레이</h2><p>오프라인 실행 가능 · Esc 일시정지<br>사망 또는 시간 초과 시 모든 강화 초기화</p><strong>요원 선택 →</strong></button><button id="dungeon-coop" class="lan-mode custom"><span>CO-OP / 1—4</span><h2>멀티 플레이</h2><p>각자 요원·강화 선택 · 6층 방 투표<br>전원 탈락 시 실패 · 사망자는 팀원 관전</p><strong>방 만들기 / 참가 →</strong></button></div><p class="small">첫 요원 1명 무료 선택 · 보스 클리어 또는 보너스 2회 도달마다 1명 해금 · 공통 버프 23종 + 요원별 강화 8종<br>궁극기: 스테이지 클리어 +1만 적용 · V 대시 · 일반 스킬은 재충전 방식<br>시각적 긴장감 중심의 어두운 연구소. 섬광을 빠르게 반복하는 연출은 사용하지 않습니다.</p><button id="dungeon-back">← 모드 선택</button></section>`);
 lobby.bind('#dungeon-back',()=>lobby.home());
 lobby.bind('#dungeon-solo',()=>soloAgent(lobby));
 lobby.bind('#dungeon-coop',()=>coopSetup(lobby));
}
function soloAgent(lobby){if(!lobby.g.profile.owns(lobby.selection))lobby.selection=unlockedAgents(lobby.g.profile.read())[0];const selected=AGENTS.find(a=>a.id===lobby.selection)||AGENTS[0];
 lobby.shell(`<section class="lan-config dungeon-menu"><div class="eyebrow">DUNGEON / SOLO · 해금한 요원</div><div class="lan-heading"><h1>누구로 진입할까요?</h1><button id="dungeon-back">뒤로</button></div><div class="lan-agent-list">${AGENTS.map(a=>`<button data-dagent="${a.id}" class="${a.id===selected.id?'active':''}" style="--agent:${a.color}" ${lobby.g.profile.owns(a.id)?'':'disabled'}><b>${a.name}</b><span>${lobby.g.profile.owns(a.id)?a.role:'잠금'}</span></button>`).join('')}</div><h2>${selected.name}</h2><p>${selected.desc}</p><div class="dungeon-cds">${selected.skills.slice(0,3).map((s,i)=>`<p><b>${s[0]} · ${s[1]}</b> 기본 재사용 ${COOLDOWNS[selected.id][i]}초${i===0&&['widow','pigeon','hera'].includes(selected.id)?' / 8발 소진 후 탄창 완충':''}</p>`).join('')}</div><p class="small">V 대시: 3초마다 사용 · 무적 회피가 아닌 이동 기술입니다.<br>헤라 R은 혼자일 때 15초 혼령 수호자를 소환합니다. 검정 팬서 R은 엘리트 처치 수(최대 8)를 기준으로 강화됩니다.<br>스파이디 R은 던전에서 25초 유지됩니다. 방 사이 체력은 자동으로 완충되지 않습니다.</p><button id="dungeon-launch" class="primary">${selected.name} · 연구소 진입</button></section>`);
 for(const b of document.querySelectorAll('[data-dagent]'))b.onclick=()=>{if(!lobby.g.profile.owns(b.dataset.dagent))return;lobby.selection=b.dataset.dagent;soloAgent(lobby);};lobby.bind('#dungeon-back',()=>dungeonMenu(lobby));lobby.bind('#dungeon-launch',()=>lobby.startDungeonSolo(selected.id));
}
function coopSetup(lobby){
 if(nativeMobile()&&!lobby.base){lobby.serverSettings();return;}
 if(location.protocol==='file:'&&!lobby.base){lobby.shell('<section class="lan-home"><h1>협동 던전 서버가 필요해요</h1><p>압축을 푼 뒤 START-WINDOWS.bat을 실행하세요.<br>다른 집 친구와 함께라면 START-INTERNET.bat의 HTTPS 주소를 공유하세요.</p><button id="dungeon-back">던전으로 돌아가기</button></section>');lobby.bind('#dungeon-back',()=>dungeonMenu(lobby));return;}
 lobby.shell(`<section class="lan-home dungeon-menu"><div class="eyebrow">CO-OP / 1—4 PLAYERS</div><h1>연구팀 구성</h1><label>플레이어 이름 <input id="dungeon-name" maxlength="20" value="${esc(lobby.name)}" placeholder="연구원"></label><div class="lan-modes"><section class="lan-mode"><h2>방 만들기</h2><p>전원 같은 팀 · 개인별 요원과 강화 선택<br>몬스터 체력과 수는 인원에 따라 증가</p><button id="dungeon-create" class="primary">협동 방 생성</button></section><section class="lan-mode"><h2>친구 방 참가</h2><input id="dungeon-code" maxlength="6" placeholder="6자리 방 코드"><button id="dungeon-join">참가</button></section></div><button id="dungeon-back">뒤로</button></section>`);
 lobby.bind('#dungeon-back',()=>dungeonMenu(lobby));lobby.bind('#dungeon-create',async()=>{lobby.name=$('#dungeon-name').value;lobby.connect(await lobby.api('create',{name:lobby.name,options:{mode:'dungeon'}}));});lobby.bind('#dungeon-join',async()=>{lobby.name=$('#dungeon-name').value;lobby.connect(await lobby.api('join',{name:lobby.name,code:$('#dungeon-code').value.trim().toUpperCase()}));});
}
export function dungeonLobby(lobby){const r=lobby.room,host=r.owner===lobby.identity.id;
 lobby.shell(`<section class="lan-config dungeon-menu"><div class="eyebrow">ABANDONED LAB / CO-OP</div><div class="lan-heading"><h1>협동 방 <span class="room-code">${esc(r.code)}</span></h1><button id="dungeon-leave">방 나가기</button></div><p>친구에게 같은 게임 주소와 방 코드를 알려주세요.</p><div class="dungeon-party">${r.players.map(p=>`<div><b>${esc(p.name)}</b><span>${p.id===r.owner?'방장':'연구원'} · ${p.connected?'접속 중':'연결 끊김'}</span></div>`).join('')}</div><p>${r.players.length} / 4명 · 요원 중복 선택 가능</p><p class="small">개인별 요원·버프·스킬 강화 선택. 6층은 생존자 투표, 동률이면 방장 선택 우선.<br>일시정지는 내 조작만 멈춥니다. 전원 사망 또는 시간 초과 시 실패합니다.<br>사망자는 자동 부활하지 않습니다. 헤라 R로 아군을 되살릴 수 있습니다.</p>${host?'<button id="dungeon-select" class="primary">요원 선택 시작</button>':'<p>방장의 시작을 기다리는 중</p>'}</section>`);
 lobby.bind('#dungeon-leave',()=>lobby.leave());lobby.bind('#dungeon-select',()=>lobby.api('select'));
}
export function buildDungeonScene(net,s){
 const g=net.g;net.monsterMeshes??=new Map();net.threatMeshes??=[];net.zoneMeshes??=[];net.guardianMeshes??=[];
 for(const mesh of [...net.monsterMeshes.values(),...net.threatMeshes,...net.zoneMeshes,...net.guardianMeshes]){g.scene.remove(mesh);mesh.traverse(o=>{if(o.isMesh)o.geometry?.dispose();});}
 net.monsterMeshes.clear();net.threatMeshes=[];net.zoneMeshes=[];net.guardianMeshes=[];
 for(const child of [...g.scene.children])if(child!==g.camera&&!net.baseLights?.includes(child))g.scene.remove(child);
 for(const b of net.remotes.values())g.scene.add(b.mesh);
 for(const pool of [net.meshPool,net.effectPool])for(const mesh of pool){mesh.visible=false;g.scene.add(mesh);}
 g.orbMeshes=[];g.soulMeshes=[];net.wallMeshes=[];net.corpseMeshes=new Map();net.extraVisuals=[];net.instances={};
 g.physics=new Physics();g.world=new DungeonWorld(g.scene,g.physics,s.dungeon.stage,s.dungeon.difficulty);g.physics.movers.push(g.player);
 g.scene.background=new T.Color('#050b12');g.scene.fog=new T.Fog('#0b1520',12,55);
 for(const light of net.baseLights||[]){if(light.isHemisphereLight)light.intensity=.65;if(light.isDirectionalLight){light.intensity=.95;light.color.set('#b0d7e8');}}
 net.sceneStage=s.dungeon.stage;net.sceneDifficulty=s.dungeon.difficulty;g.arms.visible=true;
}
export function receiveDungeon(net,s){
 if(!s.dungeon)return;if(net.sceneStage!==s.dungeon.stage||net.sceneDifficulty!==s.dungeon.difficulty)buildDungeonScene(net,s);
 const active=new Set();for(const m of s.monsters||[]){active.add(m.id);let mesh=net.monsterMeshes.get(m.id);if(!mesh){mesh=monsterMesh(m.kind);net.g.scene.add(mesh);net.monsterMeshes.set(m.id,mesh);}mesh.visible=true;mesh.position.fromArray(m.pos);mesh.scale.setScalar(m.scale);mesh.userData.state=m;}
 for(const [id,mesh] of net.monsterMeshes)if(!active.has(id))mesh.visible=false;
 const rings=(items,pool,color)=>{items.forEach((q,i)=>{let mesh=pool[i];if(!mesh){mesh=new T.Mesh(new T.RingGeometry(.88,1,48),new T.MeshBasicMaterial({color,transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;net.g.scene.add(mesh);pool[i]=mesh;}mesh.visible=true;mesh.position.fromArray(q.p);mesh.position.y=.08;mesh.scale.setScalar(q.r);mesh.material.color.set(q.kind==='enemy'?'#b372b7':q.kind==='flame'?'#e8a16b':color);if(q.dir){mesh.scale.set(q.r,q.length/2,1);mesh.position.addScaledVector(V(...q.dir),q.length/2);mesh.rotation.set(-Math.PI/2,0,-Math.atan2(q.dir[0],q.dir[2]));}else mesh.rotation.set(-Math.PI/2,0,0);mesh.material.opacity=q.left?Math.min(.95,.35+.6*(1-q.left/q.total)):.5;});for(let i=items.length;i<pool.length;i++)pool[i].visible=false;};
 const sEnv=net.g.world.spec,t=s.dungeon.roomElapsed,threats=[...(s.threats||[])];
 if(sEnv.lasers)threats.push({p:[0,0,0],r:.45,dir:[-Math.sin(t*.35),0,Math.cos(t*.35)],length:42,left:t%7<=2?2-t%7:.1,total:2,kind:'laser'});
 rings(threats,net.threatMeshes,'#f18c9d');rings(s.zones||[],net.zoneMeshes,'#92c78d');
 for(let i=0;i<(s.guardians||[]).length;i++){let mesh=net.guardianMeshes[i];if(!mesh){mesh=new T.Mesh(new T.OctahedronGeometry(.45),new T.MeshBasicMaterial({color:'#a4ebce',wireframe:true}));net.g.scene.add(mesh);net.guardianMeshes[i]=mesh;}mesh.visible=true;mesh.position.fromArray(s.guardians[i].p);}for(let i=(s.guardians||[]).length;i<net.guardianMeshes.length;i++)net.guardianMeshes[i].visible=false;
 if(sEnv.compress){net.boundary??=new T.LineLoop(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#f69a83'}));if(!net.boundary.parent)net.g.scene.add(net.boundary);const r=Math.max(6,20-t*.075);net.boundary.geometry.dispose();net.boundary.geometry=new T.BufferGeometry().setFromPoints([V(-r,.2,-r-2),V(r,.2,-r-2),V(r,.2,r+2),V(-r,.2,r+2)]);}
}
export function dungeonHud(net){
 const s=net.state,d=s.dungeon,p=net.me,g=net.g;
 $('#timer').textContent=d.phase==='combat'?Math.ceil(d.time)+'초':d.phase==='victory'?'승리':d.phase==='ready'?'진입 준비':d.phase==='done'?(d.won?'격리 성공':'도전 종료'):'성장 선택';
 $('#timer').classList.toggle('dungeon-urgent',d.phase==='combat'&&d.time<20);
 $('#zone').textContent=`${String(d.stage).padStart(2,'0')} / 12 · ${d.title}`;
 $('#stats').innerHTML=`<strong>${p.kills} 처치 · ${d.remaining} 잔여 표적</strong><br>V 대시 ${p.dashCooldown>0?p.dashCooldown.toFixed(1)+'초':'준비'}<br>강화 ${p.build.length}개 · ${Math.floor(d.elapsed/60)}:${String(Math.floor(d.elapsed%60)).padStart(2,'0')}`;
 $('#hp').textContent=Math.ceil(p.hp);$('#hpbar').style.width=clampPercent(p.hp/p.maxHP);$('#armor').textContent='◇ '+Math.ceil(p.armor)+(p.temporaryShield>0?' + 보호막 '+Math.ceil(p.temporaryShield):'');$('.health .name').textContent=p.agent==='bane'&&p.transformed?'그린 몬스터':g.agent.name;
 $('#abilities').innerHTML=g.agent.skills.map((sk,i)=>`<div class="ability ${i===3&&p.ultReady?'ready':''}"><kbd>${sk[0]}</kbd><span>${i===3?p.ultReady?'준비':p.ultPoints+' / '+p.ultCost:p.bank.base[i]+'/'+p.bank.capacity[i]}</span><strong>${sk[1]}</strong><em>${i<3&&p.bank.timers[i]>0?p.bank.timers[i].toFixed(1)+'초':i===3?'클리어당 +1':''}</em></div>`).join('');
 $('#scope').className=p.scope?'scope':'';$('#crosshair').className='crosshair'+(p.hit?' hit':'');$('#flash').className=p.flash?'damage-flash':'';
 $('#toast').innerHTML=p.toast?'<div class="toast">'+esc(p.toast)+'</div>':'';
 const label=p.cast?p.cast.name:p.charge?'차징':'',ratio=p.cast?1-p.cast.left/p.cast.total:p.charge?.rate||0;$('#cast').innerHTML=label?esc(label)+'<div><i style="width:'+clampPercent(ratio)+'"></i></div>':'';
 $('#target').textContent='V 대시 · Q/E/C 스킬 · R 궁극기 · Esc 메뉴';$('.hud-hint').innerHTML='V 대시 · Space 점프<br>Shift 걷기 · Ctrl 앉기<br>1 기본 공격 · Esc 메뉴';$('.map-caption').textContent='ABANDONED LAB / N ↑';
 const boss=s.monsters.find(m=>m.kind==='boss');$('#net-banner').innerHTML=boss?'<div class="boss-bar"><b>PROTOTYPE ZERO · PHASE '+boss.phase+'</b><div><i style="width:'+clampPercent(boss.hp/boss.maxHP)+'"></i></div><small>'+Math.ceil(boss.hp)+' / '+Math.ceil(boss.maxHP)+'</small></div>':d.phase==='combat'?'WAVE '+d.wave+' · 다음 웨이브 '+d.pendingWaves:'';
 let gauge='';if(p.agent==='bane')gauge=(p.transformed?'그린 몬스터':'배인 · 분노')+' '+Math.floor(p.rage)+'/100';if(p.agent==='arc')gauge='원자 보호막 '+Math.ceil(p.shieldHP);if(p.agent==='vision')gauge=(p.phased>0?'투명화 '+p.phased.toFixed(1)+'초 · ':'')+'비행 '+Math.floor(p.flightGauge)+' / 치유 '+Math.floor(p.healGauge);if(p.agent==='panther')gauge='저장 에너지 '+Math.floor(p.energy);if(p.agent==='ant')gauge=(p.sizeMode==='large'?'대형':p.sizeMode==='small'?'소형':'일반')+' '+Math.ceil(p.sizeTime)+'초';$('#agent-gauge').textContent=gauge;
 $('#spectator-label').textContent=p.dead?'팀원 관전 · 좌/우클릭으로 변경 · 헤라 궁극기로 부활 가능':'';
 const c=g.mapCtx,to=x=>(x/52+.5)*220;c.fillStyle='#08151c';c.fillRect(0,0,220,220);c.fillStyle='#3a525d';for(const b of g.physics.solids)if(b.active)c.fillRect(to(b.p.x-b.h.x),to(b.p.z-b.h.z),b.h.x*2/52*220,b.h.z*2/52*220);c.fillStyle='#020408';for(const h of g.world.spec.holes)c.fillRect(to(h.x-h.w/2),to(h.z-h.d/2),h.w/52*220,h.d/52*220);for(const m of s.monsters){c.fillStyle=m.kind==='boss'?'#f3a1dd':'#d88c8c';c.beginPath();c.arc(to(m.pos[0]),to(m.pos[2]),m.kind==='boss'?5:2.5,0,Math.PI*2);c.fill();}for(const a of s.players)if(!a.dead){c.save();c.translate(to(a.pos[0]),to(a.pos[2]));c.rotate(a.id===p.id?g.yaw:a.yaw);c.fillStyle=a.id===p.id?'#fae7b2':'#8bdaec';c.beginPath();c.moveTo(0,-6);c.lineTo(-4,4);c.lineTo(4,4);c.fill();c.restore();}
}
function clampPercent(v){return Math.max(0,Math.min(100,v*100))+'%';}
export function dungeonOverlay(net){
 const s=net.state,d=s.dungeon,p=net.me,el=$('#net-overlay');if(!el)return;
 const store=net.g.profile;let saveError='';try{if(store&&p.progress)store.record(d.runId,p.progress);}catch(e){saveError=e.message;}
 const key=JSON.stringify([d.phase,d.stage,d.ready,d.votes,p.offer,p.rerolls,p.unlocked,saveError,net.paused,p.dead,s.players.map(p=>p.offer?.left)]);if(net.dungeonOverlayKey===key)return;net.dungeonOverlayKey=key;
 let html='';
 if(d.phase==='ready')html=`<div class="eyebrow">STAGE ${d.stage} / 12</div><h1>${esc(d.title)}</h1><p>제한 시간 ${d.limit}초 · 준비 완료 후 전투 시작</p><p>${d.stage===12?'최종 보스: 3단계 변이 · 바닥 표식을 피하고 충격파는 점프로 넘으세요.':'몬스터를 모두 처치하면 보상 선택으로 이동합니다.'}</p><p class="small">노란 경계는 낙사 구멍입니다. 붉은 바닥 표시는 공격 예고입니다.<br>요원 궁극기 포인트는 스테이지 클리어로만 얻습니다.</p>${s.players.filter(x=>!x.dead).map(a=>'<p>'+esc(a.name)+' · '+(d.ready.includes(a.id)?'준비 완료':'준비 중')+'</p>').join('')}<button id="d-ready" class="primary" ${p.dead||d.ready.includes(p.id)?'disabled':''}>준비 완료 · 진입</button><button id="d-leave">도전 종료</button>`;
 else if(d.phase==='victory')html='<div class="dungeon-victory" role="status" aria-live="polite"><span>STAGE '+String(d.stage).padStart(2,'0')+' CLEAR</span><h1>승리</h1><p>'+(d.stage===12?'최종 격리 성공 · 해금 보상을 준비합니다':'구역 확보 · 강화 선택을 준비합니다')+'</p><div class="victory-progress"><i></i></div></div>';
 else if(['reward','bonus'].includes(d.phase)){const o=p.offer;html=`<div class="eyebrow">${d.phase==='bonus'?'FINAL PREPARATION':'STAGE CLEAR'}</div><h1>${d.phase==='bonus'?'마지막 두 가지 선택':'요원의 다음 진화'}</h1><p>${d.phase==='bonus'?'미획득 공통 버프와 요원 강화 전체에서 2개를 선택하세요.':'무작위 세 항목 중 하나. 다음 스테이지부터 적용됩니다.'}</p><p>남은 선택 ${o?.left||0}개 · 내 새로고침 ${p.rerolls}회</p><div class="dungeon-rewards">${o?.left>0?o.ids.map(id=>{const b=byId(id);return `<button data-dpick="${id}" class="reward-card ${b.kind}"><small>${b.kind==='upgrade'?'SKILL EVOLUTION':'COMMON AUGMENT'}</small><h3>${b.name}</h3><p>${b.description}</p></button>`;}).join(''):'<p>다른 생존 플레이어의 선택을 기다립니다.</p>'}</div>${d.phase==='reward'&&o?.left>0?'<button id="d-reroll" '+(p.rerolls?'':'disabled')+'>선택지 새로고침</button>':''}<button id="d-leave">도전 종료</button>`;}
 else if(d.phase==='branch')html=`<div class="eyebrow">STAGE 06 / RISK SELECTION</div><h1>어느 격리구역으로 갈까요?</h1><p>한 방만 선택합니다. 협동은 투표 · 동률이면 방장 선택 우선.</p><div class="dungeon-rewards">${[['easy','보관실','낮은 위험 · 110초','공통 버프 3개 중 1개'],['medium','격리 병동','중간 위험 · 145초','공통 버프 2개 + 스킬 강화 1개 중 1개'],['hard','반응로','높은 위험 · 170초','전용 스킬 강화 3개 중 1개']].map(([id,n,r,reward])=>`<button data-dvote="${id}" class="reward-card ${id==='hard'?'upgrade':''}" ${p.dead?'disabled':''}><small>${r}</small><h2>${n}</h2><p>${reward}</p><strong>${d.votes[p.id]===id?'내 선택':''}</strong></button>`).join('')}</div><p>${s.players.filter(a=>!a.dead).map(a=>esc(a.name)+' '+(d.votes[a.id]?'선택 완료':'선택 중')).join(' · ')}</p><button id="d-leave">도전 종료</button>`;
 else if(d.phase==='done'){
  html=`<div class="eyebrow">${d.won?'CONTAINMENT SUCCESS':'RUN ENDED'}</div><h1>${d.won?'격리 성공':'도전 종료'}</h1><p>${esc(d.reason)}</p><p>${d.stage}층 · ${Math.floor(d.elapsed/60)}분 ${Math.floor(d.elapsed%60)}초 · ${p.kills} 처치</p>`;
  html+='<p>보스 클리어 시 해금권 1개가 지급됩니다. 보너스 도달 보상과 별도로 누적됩니다.</p>';
  // Reward credits are recorded on the milestone, even if selection is deferred.
  html+='<button id="d-leave" class="primary">메인 화면으로</button>';
 }else if(net.paused){html=`<h1>${p.dead?'연구팀 관전':'던전 메뉴'}</h1><p>WASD 이동 · V 대시 · Space 점프 · Shift 걷기 · Ctrl 앉기<br>Q/E/C 스킬 · R 궁극기 · 1 기본 공격 · Tab 팀 현황</p><p class="warning">${net.lobby.localDungeon?'싱글플레이: 전투와 제한 시간이 일시정지되었습니다.':'협동: 메뉴를 열어도 몬스터와 제한 시간은 계속 진행됩니다.'}</p><details><summary>현재 빌드 (${p.build.length}개)</summary>${p.build.map(id=>{const b=byId(id);return '<p><b>'+b.name+'</b> · '+b.description+'</p>';}).join('')}</details><div class="settings"><label>시점 감도 <input id="d-sens" type="range" min=".5" max="4" step=".1" value="${net.g.sensitivity*1000}"></label><label>효과음 <input id="d-volume" type="range" min="0" max="1" step=".05" value="${net.g.audio.volume}"></label></div><button id="d-resume" class="primary">계속하기</button><button id="d-leave">도전 종료</button>`;}
 if(['bonus','done'].includes(d.phase)&&!saveError){try{html+=unlockRewardsHTML(store);}catch(e){saveError=e.message;}}
 if(saveError)html+='<p class="warning">'+esc(saveError)+' · 저장 공간을 확인한 뒤 이 화면에서 다시 시도하세요.</p>';
  el.innerHTML=html?'<div class="modal-back"><section class="panel dungeon-panel">'+html+'<p id="lan-error" role="status"></p></section></div>':'';
 if(html){net.keys={};document.exitPointerLock?.();}
 bindUnlockRewards(store,()=>{net.dungeonOverlayKey='';net.renderOverlay();},e=>net.lobby.error(e));
 const action=async ev=>{net.queue(ev);await net.flush();net.dungeonOverlayKey='';net.renderOverlay();};
 $('#d-ready')?.addEventListener('click',async()=>{net.g.audio.start();await action({type:'dungeonReady'});net.resume();});$('#d-resume')?.addEventListener('click',()=>net.resume());$('#d-leave')?.addEventListener('click',()=>net.lobby.leave());
 for(const b of document.querySelectorAll('[data-dpick]'))b.onclick=()=>action({type:'dungeonPick',value:b.dataset.dpick});for(const b of document.querySelectorAll('[data-dvote]'))b.onclick=()=>action({type:'dungeonVote',value:b.dataset.dvote});for(const b of document.querySelectorAll('[data-dunlock]'))b.onclick=()=>action({type:'dungeonUnlock',value:b.dataset.dunlock});$('#d-reroll')?.addEventListener('click',()=>action({type:'dungeonReroll'}));
 if($('#d-sens'))$('#d-sens').oninput=e=>{net.g.sensitivity=+e.target.value/1000;net.g.saveSettings();};if($('#d-volume'))$('#d-volume').oninput=e=>{net.g.audio.volume=+e.target.value;net.g.saveSettings();};
}
export function dungeonFrame(net,dt){for(const mesh of net.monsterMeshes?.values()||[])if(mesh.visible)poseMonster(mesh,mesh.userData.state,net.state.time);}
