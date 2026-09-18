import {V} from './physics.js';

export function touchEnabled(){return !!globalThis.Capacitor?.isNativePlatform?.()||!!globalThis.matchMedia?.('(pointer: coarse)').matches;}
export function stickKeys(x,y,dead=.22){return {KeyA:x<-dead,KeyD:x>dead,KeyW:y<-dead,KeyS:y>dead};}

export class TouchControls {
 constructor(game){
  this.g=game;this.keys=new Set();this.pointers=new Map();game.touchControls=this;
  document.documentElement.classList.add('touch-game');
  this.root=document.createElement('div');this.root.id='touch-controls';this.root.hidden=true;
  this.root.innerHTML='<div class="touch-look" aria-label="드래그하여 시점 이동"></div><div class="touch-stick" aria-label="이동 스틱"><i></i></div><div class="touch-top"><button data-code="Escape">메뉴</button><button data-code="KeyB">상점</button><button data-code="Digit1">주먹</button><button data-code="Digit4">폭탄</button><button data-code="KeyG">내려놓기</button></div><div class="touch-skills">'+['Q','E','C','R'].map(k=>'<button data-code="Key'+k+'">'+k+'</button>').join('')+'</div><div class="touch-actions"><button data-attack="0" class="touch-attack">공격</button><button data-attack="2">보조 / 당기기</button><button data-code="Space">점프 / 상승</button><button data-code="KeyV">대시</button><button data-code="KeyF">상호작용</button><button data-code="ControlLeft">앉기</button><button data-code="ShiftLeft">걷기</button></div>';
  document.body.append(this.root);
  this.root.addEventListener('pointerdown',e=>this.down(e));this.root.addEventListener('pointermove',e=>this.move(e));
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.root.addEventListener(type,e=>this.up(e));
  window.addEventListener('blur',()=>this.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  this.update=()=>{const active=this.active();if(!active)this.clear();this.root.hidden=!active;requestAnimationFrame(this.update);};this.update();
 }
 active(){const n=this.g.net;return this.g.mode==='play'&&(!n||!n.paused&&!n.shopOpen&&!n.me?.menu&&(!n.dungeon||n.state?.dungeon.phase==='combat'));}
 key(code,down){if(down===this.keys.has(code))return;down?this.keys.add(code):this.keys.delete(code);window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,key:code,bubbles:true,cancelable:true}));}
 down(e){
  if(e.pointerType==='mouse'||!this.active())return;
  const target=e.target.closest('button,.touch-stick,.touch-look');if(!target)return;e.preventDefault();target.setPointerCapture(e.pointerId);
  const entry={target,x:e.clientX,y:e.clientY,code:target.dataset.code,attack:target.dataset.attack};this.pointers.set(e.pointerId,entry);
  if(entry.code)this.key(entry.code,true);
  if(entry.attack!==undefined){this.attack(+entry.attack);entry.timer=setInterval(()=>{if(this.active()&&+entry.attack===0)this.attack(0);},120);}
  if(target.classList.contains('touch-stick')){this.stick=e.pointerId;this.move(e);}
 }
 attack(button){const n=this.g.net;if(n){if(n.me?.dead)n.cycleSpectator(button===2?-1:1);else n.queue({type:'attack',button});}else if(!this.g.busy())this.g.attack(button);}
 move(e){const p=this.pointers.get(e.pointerId);if(!p)return;e.preventDefault();
  if(this.stick===e.pointerId){const r=p.target.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,scale=Math.max(1,Math.hypot(dx,dy)/(r.width*.35)),x=dx/scale,y=dy/scale;p.target.querySelector('i').style.transform='translate('+x+'px,'+y+'px)';for(const [key,v] of Object.entries(stickKeys(x/(r.width*.35),y/(r.height*.35))))this.key(key,v);}
  else if(p.target.classList.contains('touch-look')||p.attack!==undefined){this.look(e.clientX-p.x,e.clientY-p.y);}
  p.x=e.clientX;p.y=e.clientY;
 }
 look(dx,dy){const g=this.g,s=g.sensitivity*1.5;g.yaw-=dx*s;g.pitch=Math.max(-1.48,Math.min(1.48,g.pitch-dy*s));if(g.net){g.net.dragX=(g.net.dragX||0)+dx;g.net.dragY=(g.net.dragY||0)+dy;}else if(g.hold){g.dragAmount+=Math.abs(dx)+Math.abs(dy);g.dragVelocity.lerp(V(-dx*s*220,-dy*s*220,0).applyAxisAngle(V(0,1,0),g.yaw),.5);}}
 up(e){const p=this.pointers.get(e.pointerId);if(!p)return;clearInterval(p.timer);this.pointers.delete(e.pointerId);if(p.code&&!Array.from(this.pointers.values()).some(x=>x.code===p.code))this.key(p.code,false);if(p.attack==='2'){if(this.g.net)this.g.net.queue({type:'release'});else this.g.release(true);}if(this.stick===e.pointerId){this.stick=null;for(const k of ['KeyW','KeyA','KeyS','KeyD'])this.key(k,false);p.target.querySelector('i').style.transform='';}}
 clear(){for(const id of [...this.pointers.keys()])this.up({pointerId:id});for(const k of [...this.keys])this.key(k,false);}
}
