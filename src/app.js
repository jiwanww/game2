import {Game} from './game.js';
import {installClient} from './lan-client.js';
import {TouchControls,touchEnabled} from './touch-controls.js';
import {installUpdateBanner} from './platform.js';
try{const game=new Game();window.abilityFront=game;if(touchEnabled())new TouchControls(game);installClient(game);installUpdateBanner(game);}catch(error){console.error(error);document.querySelector('#ui').innerHTML='<main class="error"><h1>게임을 시작하지 못했습니다.</h1><p>기기의 WebGL 지원을 확인하고 앱이나 브라우저를 다시 열어주세요.</p><button onclick="location.reload()">다시 시도</button></main>';}
