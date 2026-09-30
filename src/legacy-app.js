import {Game} from './game.js';
import {installClient} from './lan-client.js';
import {TouchControls,touchEnabled} from './touch-controls.js';
import {installUpdateBanner} from './platform.js';
import {installTouchEditor} from './touch-editor.js';
const game=new Game();window.abilityFront=game;if(touchEnabled()){new TouchControls(game);installTouchEditor(game.touchControls);}installClient(game);installUpdateBanner(game);
const back=document.createElement('button');back.className='legacy-dimension-back';back.textContent='← 2D / 3D 선택';back.onclick=()=>{location.href=new URL('./index.html',location.href).href;};document.body.append(back);
