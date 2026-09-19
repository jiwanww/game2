import {AGENTS} from './agents.js';
import {OWNER_CODE_HASH} from './unlock-config.js';

export const PROFILE_KEY='af-dungeon-profile';
const agentIds=AGENTS.map(a=>a.id);
const validAgent=id=>agentIds.includes(id);
const list=value=>Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string'&&x.length>0&&x.length<=128))]:[];
export function normalizeProfile(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('요원 저장 데이터 형식을 확인할 수 없습니다. 기존 기록은 그대로 보존했습니다.');
 if(value.schema>2)throw Error('더 최신 버전에서 저장한 기록입니다. 게임을 업데이트하세요.');
 const wins=list(value.wins),legacy=value.schema!==2;
 return {schema:2,starter:validAgent(value.starter)?value.starter:null,
  unlocked:list(value.unlocked).filter(validAgent),wins,bonusRuns:list(value.bonusRuns),
  legacyWins:legacy?[...wins]:list(value.legacyWins).filter(id=>wins.includes(id)),
  spentRewards:Number.isSafeInteger(value.spentRewards)&&value.spentRewards>=0?value.spentRewards:0,
  allUnlocked:value.allUnlocked===true};
}
export function unlockedAgents(value){const p=normalizeProfile(value);return p.allUnlocked?[...agentIds]:[...new Set([...p.unlocked,...(p.starter?[p.starter]:[])])];}
export function isAgentUnlocked(value,id){return unlockedAgents(value).includes(id);}
export function rewardCount(value){const p=normalizeProfile(value);return Math.max(0,p.wins.length-p.legacyWins.length+Math.floor(p.bonusRuns.length/2)-p.spentRewards);}
export function chooseStarter(value,id){const p=normalizeProfile(value);if(p.starter)throw Error('첫 요원은 이미 선택했습니다.');if(!validAgent(id))throw Error('요원을 선택하세요.');return {...p,starter:id,unlocked:[...new Set([...p.unlocked,id])]};}
export function recordMilestones(value,runId,{bonus=false,boss=false}={}){
 const p=normalizeProfile(value);if(typeof runId!=='string'||!runId.length||runId.length>128)return p;
 if(bonus&&!p.bonusRuns.includes(runId))p.bonusRuns.push(runId);
 if(boss&&!p.wins.includes(runId))p.wins.push(runId);
 return p;
}
export function spendReward(value,id){const p=normalizeProfile(value);if(!validAgent(id))throw Error('요원을 선택하세요.');if(isAgentUnlocked(p,id))throw Error('이미 해금한 요원입니다.');if(rewardCount(p)<1)throw Error('요원 해금권이 없습니다.');return {...p,spentRewards:p.spentRewards+1,unlocked:[...p.unlocked,id]};}
export async function verifyOwnerCode(code,{digest=OWNER_CODE_HASH,subtle=globalThis.crypto?.subtle}={}){
 if(!subtle)throw Error('비밀코드 입력은 Windows 앱 또는 HTTPS 접속에서 사용할 수 있습니다.');
 const normalized=String(code||'').trim().toUpperCase().replace(/[\s-]/g,'');
 if(!/^[A-Z0-9]{8,96}$/.test(normalized))return false;
 const bytes=await subtle.digest('SHA-256',new TextEncoder().encode(normalized));
 const actual=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
 return actual===digest;
}
export class ProfileStore {
 constructor(storage=globalThis.localStorage){this.storage=storage;this.lastMilestone='';this.read();}
 read(){
  if(!this.storage)throw Error('이 기기에서 저장 공간을 사용할 수 없습니다.');
  let raw;try{raw=this.storage.getItem(PROFILE_KEY);}catch{throw Error('요원 기록을 읽을 수 없습니다. 저장 공간 접근을 허용하세요.');}
  let parsed={};try{if(raw)parsed=JSON.parse(raw);}catch{throw Error('요원 기록이 손상되어 읽을 수 없습니다. 기존 데이터는 덮어쓰지 않았습니다.');}
  return normalizeProfile(parsed);
 }
 write(profile){const p=normalizeProfile(profile);try{this.storage.setItem(PROFILE_KEY,JSON.stringify(p));}catch{throw Error('해금 기록을 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도하세요.');}return p;}
 starter(id){return this.write(chooseStarter(this.read(),id));}
 unlock(id){return this.write(spendReward(this.read(),id));}
 owns(id){return isAgentUnlocked(this.read(),id);}
 record(runId,milestones){
  const key=JSON.stringify([runId,!!milestones?.bonus,!!milestones?.boss]);
  if(key===this.lastMilestone)return;
  const current=this.read(),next=recordMilestones(current,runId,milestones);
  if(JSON.stringify(current)!==JSON.stringify(next))this.write(next);
  this.lastMilestone=key;
 }
 async redeem(code,options){if(!await verifyOwnerCode(code,options))throw Error('비밀코드가 일치하지 않습니다.');return this.write({...this.read(),allUnlocked:true});}
}
