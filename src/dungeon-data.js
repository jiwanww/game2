// Dungeon-only rules. PvP ability prices, charges and display settings are untouched.
export const DUNGEON_VERSION='0.7.2-beta.1';
export const COOLDOWNS={spidey:[8,30,16],arc:[20,20,12],bane:[10,20,14],cap:[6,2,16],thor:[7,24,14],widow:[8,15,10],pigeon:[6,18,10],ant:[12,40,18],hera:[6,10,24],panther:[8,20,14],vision:[22,0,20]};
const entry=(id,name,description,kind='buff')=>({id,name,description,kind});
export const BUFFS=[
 ['execution','처형인의 날인','체력 30% 이하의 적에게 주는 피해 +40%.'],
 ['vampire','흡혈 귀걸이','일반 적을 처치한 마지막 타격, 또는 엘리트·보스에게 실제 가한 피해의 5% 회복.'],
 ['phoenix','불사조의 깃털','방 입장 후 5초 동안 피해 무효. 낙사와 시간 초과는 막지 못함.'],
 ['overclock','오버클럭 칩','일반 스킬 재사용 대기시간 -20%. 사용 시 최대 체력 2% 소모(최소 체력 1 유지).'],
 ['haste','가속의 룬','처치마다 4초 동안 이동·공격 속도 +10%. 최대 5중첩.'],
 ['boots','충격파 장화','V 대시 종료 지점 반경 3m의 적을 밀어내고 2초 감속.'],
 ['opportunity','기회의 포착','기절·구속·감속 중인 적에게 피해 +30%.'],
 ['reflect','반사 장막','실제 받은 피해 25%를 반경 5m의 적에게 반사. 반사 피해로 재발동하지 않음.'],
 ['giant','거인의 힘','최대 체력 +50, 근접 피해 +20%.'],
 ['wind','바람의 걸음','4초 동안 주고받은 피해가 없으면 이동 +30%, 다음 첫 타격 확정 치명타.'],
 ['mana','마력의 샘','던전 전용: 궁극기 직접 피해 +15%, 시간제 궁극기 지속 시간 +15%. 포인트는 방 클리어로만 획득.'],
 ['poison','독성 연막','피격 시 반경 3m에 3초간 초당 6의 독구름 생성. 발동 간격 3초.'],
 ['steel','강철 장갑','방어구 +25(방 입장 때 보충), 범위 공격 피해 -15%.'],
 ['critical','급쇄의 칼날','치명타 확률 +15%. 치명타가 적 방어력 20%를 3초 동안 무시하게 함. 기본 치명타 피해 1.5배.'],
 ['escape','긴급 탈출','체력 20% 이하에서 2초간 표적 지정 불가, 이동 +50%. 60초 대기. 무적은 아님.'],
 ['chain','연쇄 번개','직접 공격 시 10% 확률로 대상과 주변 두 적에게 번개 피해 12. 재발동 간격 0.4초.'],
 ['precision','정밀 사격','투사체 속도 +40%, 원거리 공격 사거리 +25%.'],
 ['reroll','재화의 섭리','이번 도전의 일반 보상 선택지 새로고침 횟수 +2. 보너스 전체 목록에는 사용 불가.'],
 ['resolve','영혼 결의','체력이 최대치 이상일 때 주는 피해 +20%.'],
 ['gravity','중력 결계','적 넉백 거리 2배. 밀려난 적이 벽에 충돌하면 1.5초 기절.'],
 ['flame','화염 자국','대시 경로에 3초간 초당 8 피해의 불길을 남김.'],
 ['focus','정신 집중','3초 동안 피격되지 않으면 다음 공격 스킬 피해 +50%. 한 번 소모 후 3초간 재충전.'],
 ['will','불굴의 의지','받는 기절·구속·감속 지속 시간 -50%.']
].map(x=>entry(...x));
const U={
 spidey:[['regen','초감각 재생','기본 회복 초당 3, 체력 30% 이하는 초당 9.'],['vortex','점성 연쇄 폭발','거미줄 폭탄이 적에 닿아 폭발하고 반경 4m의 적을 중앙으로 당김.'],['acid','산성 거미줄','거미줄 지대 4초 생성. 초당 8 피해, 적 방어력 40% 감소.'],['meteor','하이퍼 메테오 점프','슈퍼 점프로 주변 적을 띄우고 착지 반경 4m에 피해 35.'],['rebound','그래비티 리바운드','E 기본 대기시간 30초 → 15초.'],['anchor','앵커 그랩','C 우클릭으로 끌어온 대상 주변 3m의 소형 적도 당김.'],['venom','베놈 스파이더','변신 중 초당 10 회복. 펀치가 3초간 초당 8의 독 피해를 추가.'],['wave','충격 파동 펀치','변신 펀치가 10m 거미줄 충격파를 함께 발사(피해 20).']],
 arc:[['repulsor','오버차지 리펄서','우클릭 빔이 몬스터를 관통하여 3연사. 벽은 관통하지 않음.'],['punch','파워 펀치 콤보','펀치가 적 보호막과 방어력을 무시.'],['reflect','원자 반사막','원자 보호막 정면 투사체를 반사.'],['shield','장막 과충전','보호막 내구도 150. 파괴 시 반경 4m 적을 밀어냄.'],['flight','초음속 비행','활공 이동 속도 2배. 충돌한 적을 밀어내며 20 피해(대상당 1초 간격).'],['splash','마이크로 헬파이어','유도탄 적중 시 반경 2.5m 추가 폭발 피해 30.'],['buster','벙커 버스터','유도탄의 엘리트·보스 피해 2배.'],['snap','퀀텀 타임 재설정','R의 3초 시전 시간 삭제, 체력·방어구·일반 스킬 대기시간 즉시 복원.']],
 bane:[['rage','분노 폭주','피격 분노 2배. 변신 요구량 100 → 70.'],['beast','야수성','변신 상태 이동 속도 감소 제거.'],['skin','가죽 강화','변신 시 최대 체력 350, 방어구 +30.'],['circle','지진파 썬더클랩','Q가 전방 부채꼴 대신 전방위 360도로 방출.'],['sonic','음파 파괴','Q가 2초 기절과 3초 동안 적 공격력 -30% 적용.'],['instant','대기 파쇄','Q 준비 시간 삭제, 사거리 2배.'],['grip','맹수 격파','C 공격이 피격되어도 중단되지 않음.'],['quake','대지 지진','R 착지 지점에 5초간 초당 12 피해와 감속의 지진 지대 생성.']],
 cap:[['punch','비브라늄 펀치','펀치 피해 +30%, 넉백 추가.'],['speed','선봉장','이동 속도 +25%, 이동 중 원거리 투사체 회피 확률 20%.'],['bounce','바운스 방패','던진 방패가 다른 적 최대 3명에게 튕긴 후 자동 귀환.'],['shred','방패 파쇄','충전 방패에 맞은 적의 방어력 50%를 5초간 무시.'],['guard','과충전 방어','방패로 50 피해를 막으면 정면 반경 4m 적이 1초 기절.'],['reflect','반사 에너지','C 반사 피해가 3배.'],['spin','회전 결계','C 지속 시간 +2초. 회전 중 주변 적을 바깥으로 밀어냄.'],['return','영웅의 방패','방패 귀환·회수 시 3초간 최대 체력 20%의 임시 보호막.']],
 thor:[['hammer','천둥 휘두르기','우클릭 대기시간 삭제, 근접 명중 시 전방 번개 피해 12 추가.'],['strike','낙뢰 충돌','Q 망치 적중 시 피해 20의 벼락 추가.'],['landing','뇌신 착지','E 착지 번개 최대 표적 3 → 7, 탐색 범위 2배.'],['glide','천상 활공','E 비행 +3초. 1초마다 아래의 적에게 소형 번개 10.'],['wide','뇌전의 폭풍','C 번개 폭 2배, 기본 대기시간 14 → 10초.'],['shock','심판의 벼락','C 번개가 3초간 초당 6 감전 피해, 이동 속도 -80% 적용.'],['grace','뇌신의 가호','R 사용 시 최대 체력으로 회복, 지속 중 받는 피해 -30%.'],['spread','감전 전파','감전된 적 처치 시 반경 4m 추가 번개 피해 20.']],
 widow:[['combo','암살자의 콤보','펀치 5번째 명중마다 피해 3배.'],['pierce','관통 탄창','Q 총탄이 몬스터 관통, 머리 명중 배율 2.5. 벽은 관통하지 않음.'],['magazine','아킴보 사격','탄창 8 → 16발. 소진 후 8초 재충전, 자동으로 펀치 전환.'],['voltage','고압 전류','E 기절 시간 2배. 기절한 대상이 받는 피해 +40%.'],['net','광역 그물망','E 그물이 적중하면 다른 두 적에게 추가 전기 그물 발사.'],['trap','부비트랩','C 최대 3충전. 접근 경고 지연 없이 즉시 폭발.'],['master','완벽한 마스터리','R 복제 스킬 효과 70% → 140%.'],['reset','스킬 쿨다운 리셋','R 사용 시 Q/E/C가 즉시 완충.']],
 pigeon:[['switch','무영각','활을 내린 뒤 펀치 전환 0.7초 지연 제거.'],['pierce','관통 화살','완충 화살이 모든 적과 파괴 가능한 벽을 관통.'],['charge','오토 차지','활 충전 속도 +50%.'],['wind','풍압 요란','완충 화살 적중 시 반경 4m 적을 중앙으로 모음.'],['recover','완벽한 회수','E 회수 시 체력 30 회복, 5초간 이동 속도 +25%.'],['double','이중 재장전','E 최대 충전량 1 → 2.'],['triple','멀티 플래시','특수 화살을 부채꼴로 3발 동시 발사.'],['night','질풍의 궁수','R 활 충전 4배. 처치마다 R 지속 시간 1.5초 연장.']],
 ant:[['virus','다운사이징 바이러스','Q로 축소된 일반·엘리트 몬스터의 공격력을 1로 고정. 보스에는 공격력 -30%.'],['spread','전염되는 약화','축소된 적 처치 시 주변 두 몬스터도 5초 축소.'],['triple','멀티 슈터','Q 체인지 슈터 3연사.'],['stomp','거대 신의 짓밟기','거대화 중 0.8초마다 발밑 소형 일반 적 즉시 처치, 엘리트·보스 피해 25.'],['debris','콜로서스 파괴','거대화로 구조물 파괴 시 반경 4m 파편 피해 35.'],['switch','양자 스위칭','크기 변경 중 E를 다시 누르면 대형/소형 전환. 1키로 원래 크기 복귀.'],['duration','영구 유지','크기 변경 지속 시간 20 → 40초.'],['army','개미 대군 군단','개미 70 → 150마리. 적에게 1초간 특수 공격 봉쇄.']],
 hera:[['aura','죽음의 아우라','처치 후 5초 동안 초당 3 회복.'],['knife','영혼의 단도','칼 속도 2배. 명중할 때 Q 재충전 대기시간 50% 감소.'],['triple','3연속 단도','Q 칼을 세 방향으로 동시 발사, 몬스터 관통.'],['blast','영혼 폭발','E 흡수 시 무작위 적 위치에 반경 3m 추가 영혼 피해 35.'],['auto','구슬 유도 흡수','E가 준비되면 유효한 영혼 구슬 하나를 자동 흡수.'],['double','죽음의 춤','Q 칼로 처치하면 영혼 구슬 2개 생성.'],['wall','반사 가시 장벽','장벽 3 → 5칸, 적 투사체 반사.'],['stun','영혼 충격 장벽','장벽에 닿은 적은 2초 기절(대상당 3초 간격).']],
 panther:[['absorb','바이브레이늄 흡수력','피격 에너지 축적 비율 50% → 100%.'],['capacity','축적의 한계 돌파','에너지 저장 한도 200 → 400.'],['nail','나일 파쇄','Q 적중 시 방어력 80% 감소.'],['charge','에너지 충전 네일','Q 적중마다 저장 에너지 +20.'],['trail','허브 트레일','E 이동 속도 +80%, 불길 폭 2배.'],['duration','영혼의 신속','E 지속 시간 8 → 15초.'],['collision','운동 에너지 과부하','C로 밀려 벽에 닿은 적에게 피해 25와 2초 기절.'],['shield','충격 흡수 장막','C로 에너지 소모 시 최대 체력 25%의 보호막을 5초간 획득.']],
 vision:[['resonance','마인드 스톤의 공명','팀 조합과 관계없이 최대 체력 +20 적용(패시브와 중복 불가).'],['bomb','위상 실체화','투명화 중 통과한 적에게 표식, 투명화가 끝나면 피해 35.'],['safe','영구 위상차','투명화가 벽 안에서 끝나면 가까운 안전 공간으로 이동.'],['speed','고스트 스피드','투명화 중 이동 속도 2배, 독성 지대·레이저 함정 무시. 낙사는 막지 못함.'],['fuel','무중력 비행','비행 연료 소모 -50%, 비행 중 원거리 피해 +30%.'],['heal','마인드 치유 파동','치유 범위 2배, 회복 속도 2배. 던전에서는 자신도 회복.'],['collapse','공명 붕괴','치유 범위의 적에게 회복 속도와 동일한 지속 피해.'],['prism','프리즘 마인드 빔','R 명중 시 근처 다른 두 적에게 50% 피해의 분기 광선.']]
};
export const UPGRADES=Object.fromEntries(Object.entries(U).map(([agent,rows])=>[agent,rows.map(([id,n,d])=>entry(agent+':'+id,n,d,'upgrade'))]));
export const CATALOG=[...BUFFS,...Object.values(UPGRADES).flat()];
export const byId=id=>CATALOG.find(b=>b.id===id);
export function seeded(seed=1){let state=seed>>>0;return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function sample(pool,n,rng=Math.random){const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n);}
export function rewardPool(agent,picked,stage,difficulty='normal',rng=Math.random){
 const buffs=BUFFS.filter(b=>!picked.has(b.id)),skills=UPGRADES[agent].filter(b=>!picked.has(b.id));
 if(stage===12)return [...buffs,...skills];
 if(stage<6||stage===6&&difficulty==='easy')return sample(buffs,3,rng);
 if(stage===6&&difficulty==='medium')return [...sample(buffs,2,rng),...sample(skills,1,rng)];
 return sample(skills,3,rng);
}
export class DungeonBank {
 constructor(actor){this.actor=actor;this.base=[1,1,1];this.extra=[0,0,0];this.timers=[0,0,0];this.fill();}
 capacity(i){const a=this.actor,h=id=>a.build?.has(a.agent.id+':'+id);if(i===0&&['widow','pigeon','hera'].includes(a.agent.id))return a.agent.id==='widow'&&h('magazine')?16:8;if(a.agent.id==='widow'&&i===2&&h('trap'))return 3;if(a.agent.id==='pigeon'&&i===1&&h('double'))return 2;return 1;}
 cooldown(i){const a=this.actor;let n=COOLDOWNS[a.agent.id][i];if(a.build?.has('spidey:rebound')&&i===1)n=15;if(a.build?.has('thor:wide')&&i===2)n=10;return n*(a.build?.has('overclock')?.8:1);}
 count(i){return this.base[i];}
 use(i,infinite=false){if(infinite)return true;if(this.base[i]<=0)return false;this.base[i]--;if(!this.timers[i]&&(this.capacity(i)<8||this.base[i]===0))this.timers[i]=Math.max(.12,this.cooldown(i));return true;}
 tick(dt){for(let i=0;i<3;i++)if(this.timers[i]>0){this.timers[i]=Math.max(0,this.timers[i]-dt);if(!this.timers[i]){if(this.capacity(i)>=8)this.base[i]=this.capacity(i);else{this.base[i]=Math.min(this.capacity(i),this.base[i]+1);if(this.base[i]<this.capacity(i))this.timers[i]=this.cooldown(i);}}}}
 fill(){this.base=[0,1,2].map(i=>this.capacity(i));this.extra=[0,0,0];this.timers=[0,0,0];}
 buy(){return false;}canBuy(){return false;}
}
export function unlockProfile(profile,agent,runId){
 const p={schema:1,unlocked:[],wins:[],...profile};
 if(!runId||p.wins.includes(runId))return p;
 return {...p,unlocked:[...new Set([...p.unlocked,agent])],wins:[...p.wins,runId].slice(-200)};
}
