// Keep Three.js and WebGL out of the 2D mobile startup path.
if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
try{if(new URLSearchParams(location.search).has('legacy'))await import('./legacy-app.js');else {const {ArenaLobby}=await import('./arena-lobby.js');new ArenaLobby();}}catch(error){console.error(error);document.querySelector('#ui').textContent='게임을 시작하지 못했습니다. '+error.message+' · 저장 데이터를 삭제하지 말고 새로고침해 주세요.';}
