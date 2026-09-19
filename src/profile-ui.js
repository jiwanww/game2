import {AGENTS} from './agents.js';
import {isAgentUnlocked,rewardCount,unlockedAgents} from './profile.js';
const $=s=>document.querySelector(s);
export function unlockRewardsHTML(store){
 if(!store)return '';
 const p=store.read(),count=rewardCount(p),locked=AGENTS.filter(a=>!isAgentUnlocked(p,a.id));
 return `<section class="unlock-rewards"><h2>요원 해금 보상 · ${count}개</h2><p>보너스 도달 ${p.bonusRuns.length}회 · 다음 해금권까지 ${2-p.bonusRuns.length%2}회 / 보스 클리어 ${p.wins.length}회</p><p class="small">해금권은 자동 저장됩니다. 지금 또는 메인 화면의 요원 관리에서 사용하세요. 현재 도전 중인 요원은 바뀌지 않습니다.</p>${count&&locked.length?'<div class="lan-agent-list">'+locked.map(a=>`<button data-profile-unlock="${a.id}">${a.name} 해금</button>`).join('')+'</div>':!locked.length?'<p>모든 요원을 해금했습니다.</p>':''}</section>`;
}
export function bindUnlockRewards(store,refresh,onError){for(const b of document.querySelectorAll('[data-profile-unlock]'))b.onclick=()=>{try{store.unlock(b.dataset.profileUnlock);refresh();}catch(e){onError(e);}};}
export function profileScreen(lobby,{first=false,selected=null}={}){
 const store=lobby.g.profile,p=store.read(),agent=AGENTS.find(a=>a.id===selected),owned=unlockedAgents(p);
 lobby.shell(`<section class="lan-config profile-screen"><div class="eyebrow">AGENT COLLECTION / LOCAL SAVE</div><div class="lan-heading"><h1>${first?'첫 요원을 골라 주세요':'요원 관리'}</h1>${first?'':'<button id="profile-back">← 모드 선택</button>'}</div><p>${first?'11명 중 원하는 한 명을 무료로 해금합니다. 확정한 첫 요원은 변경할 수 없습니다.':'해금한 요원 '+owned.length+' / '+AGENTS.length}</p><div class="lan-agent-list">${AGENTS.map(a=>`<button data-profile-agent="${a.id}" class="${agent?.id===a.id?'active':''}" style="--agent:${a.color}"><b>${a.name}</b><span>${a.role} · ${isAgentUnlocked(p,a.id)?'해금됨':'잠금'}</span></button>`).join('')}</div>${agent?`<div class="lan-agent-info"><div><h2>${agent.name}</h2><p>${agent.desc}</p><p>${agent.passive}</p></div><div>${agent.skills.map(s=>`<p><b>${s[0]} · ${s[1]}</b><br>${s[2]}</p>`).join('')}</div></div>${first?`<button id="starter-confirm" class="primary">${agent.name}을 첫 요원으로 확정 · 무료 해금</button>`:''}`:'<p>요원을 눌러 스킬 설명을 확인하세요.</p>'}${first?'':unlockRewardsHTML(store)}<details class="secret-code"><summary>비밀코드 입력</summary><p>전용 코드를 입력하면 이 기기의 모든 요원이 해금됩니다.</p><input id="owner-code" type="password" autocomplete="off" spellcheck="false" maxlength="96" placeholder="비밀코드"><button id="owner-redeem">코드 적용</button></details><p class="small">이 PC / 이 앱에 자동 저장됩니다. 계정·클라우드 동기화는 아직 없습니다. 앱 데이터 삭제 시 기록이 지워집니다.</p></section>`);
 for(const b of document.querySelectorAll('[data-profile-agent]'))b.onclick=()=>profileScreen(lobby,{first,selected:b.dataset.profileAgent});
 lobby.bind('#profile-back',()=>lobby.home());
 lobby.bind('#starter-confirm',()=>{store.starter(agent.id);lobby.selection=agent.id;lobby.home();});
 lobby.bind('#owner-redeem',async()=>{const input=$('#owner-code'),code=input.value;input.value='';await store.redeem(code);lobby.home();});
 bindUnlockRewards(store,()=>profileScreen(lobby,{first,selected}),e=>lobby.error(e));
}
