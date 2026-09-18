export function nativeMobile(){return !!globalThis.Capacitor?.isNativePlatform?.();}
export function serverOrigin(value,{allowLocal=!nativeMobile()}={}){
 if(!String(value||'').trim())return '';
 const u=new URL(String(value).trim());
 const local=/^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(u.hostname);
 if(u.username||u.password||u.protocol!=='https:'&&!(allowLocal&&local&&u.protocol==='http:'))throw Error('친구 서버의 HTTPS 주소를 입력하세요.');
 return u.origin;
}
export function savedServer(){try{return serverOrigin(localStorage.getItem('af-game-server')||'');}catch{return '';}}
export function installUpdateBanner(game){
 const bridge=globalThis.abilityApp;if(!bridge)return;
 const el=document.createElement('div');el.className='app-update';el.setAttribute('role','status');document.body.append(el);let status={};
 const render=()=>{el.hidden=game.mode!=='home';el.replaceChildren();if(status.state==='ready'){el.append(document.createTextNode('새 버전이 준비됐어요.'));const b=document.createElement('button');b.textContent='재시작하여 적용';b.onclick=()=>bridge.installUpdate();el.append(b);}else if(status.state==='downloading')el.textContent='업데이트 다운로드 '+Math.round(status.percent||0)+'%';else if(status.state==='error')el.textContent='업데이트 확인 실패 · 현재 버전으로 플레이할 수 있어요.';};
 bridge.onUpdate(s=>{status=s;render();});bridge.getUpdate().then(s=>{status=s;render();});setInterval(render,1000);
}
