import {Game} from './game.js';
import {NetMatch} from './lan-client.js';
import {ProfileStore} from './profile.js';
import {TouchControls,touchEnabled} from './touch-controls.js';
import {installTouchEditor} from './touch-editor.js';
import {MODES,AGENT_BY_ID} from './arena-data.js';
import * as T from './three.module.js';

export class ArenaThreeView {
 constructor(id,snapshot,{input,exit}){this.id=id;this.g=new Game();window.abilityFront=this.g;this.g.profile=new ProfileStore();if(touchEnabled()){new TouchControls(this.g);installTouchEditor(this.g.touchControls);}this.lobby={g:this.g,identity:{id},room:{owner:'host'},api:async(path,data)=>{if(path==='input')input(data);else if(path==='lobby')exit();return {};},accept:()=>{},leave:exit,renderRoom:exit,error:e=>this.g.notify(e.message)};this.network=new NetMatch(this.lobby,snapshot);this.lobby.network=this.network;
  this.ballMesh=new T.Mesh(new T.IcosahedronGeometry(.4,2),new T.MeshStandardMaterial({color:'#fff0c7',emissive:'#8bdfff',emissiveIntensity:.5,roughness:.4}));this.g.scene.add(this.ballMesh);this.goals=[];if(snapshot.options.mode==='ball')for(const team of ['A','B']){const color=team==='A'?'#72caff':'#ff738e',z=(team==='A'?-1:1)*this.g.world.map.spawn;for(const [x,y,w,h] of [[-7,2,.18,4],[7,2,.18,4],[0,4,14,.18]]){const mesh=new T.Mesh(new T.BoxGeometry(w,h,.25),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4}));mesh.position.set(x,y,z);this.g.scene.add(mesh);this.goals.push(mesh);}}
  const frame=this.network.frame.bind(this.network);this.network.frame=dt=>{frame(dt);this.drawArcade();};const overlay=this.network.renderOverlay.bind(this.network);this.network.renderOverlay=()=>{overlay();const panel=document.querySelector('#net-overlay .panel');if(panel&&this.g.touchControls&&!panel.querySelector('[data-hud-edit]')){const b=document.createElement('button');b.dataset.hudEdit='';b.textContent='터치 UI 크기 · 위치 편집';b.onclick=()=>this.g.touchControls.editHUD();panel.append(b);}};this.network.overlayKey='';this.network.renderOverlay();this.drawArcade();
 }
 receive(snapshot){this.network.receive(snapshot);}
 drawArcade(){const n=this.network,s=n.state,arc=s.arcade;if(!arc)return;const ball=arc.ball;this.ballMesh.visible=!!ball;if(ball){const holder=s.players.find(p=>p.id===ball.holder);this.ballMesh.position.fromArray(holder?[holder.pos[0],holder.pos[1]+.4,holder.pos[2]]:ball.pos);this.ballMesh.material.emissive.set(AGENT_BY_ID[ball.power]?.color||'#8bdfff');}
  const mode=s.options.mode;if(mode!=='standard'){n.spikeMesh.visible=false;const timer=document.querySelector('#timer'),zone=document.querySelector('#zone'),target=document.querySelector('#target');if(timer)timer.textContent=s.match.phase==='buy'?'준비 '+Math.ceil(s.match.time):s.match.overtime?'연장전 · 초당 1 HP 감소':Math.max(0,Math.ceil(s.match.time))+'초';if(zone)zone.textContent=MODES[mode].name+' · A '+s.match.score.A+' : '+s.match.score.B+' B';if(target)target.textContent=n.me.dead&&n.me.respawnAt?'부활까지 '+Math.max(0,Math.ceil(n.me.respawnAt-s.time))+'초':mode==='ball'?(ball.holder===this.id?'공 소지 · 좌클릭으로 슛 / 패스':'상대 골대에 2골을 넣으세요'):mode==='big'?(arc.bossId===this.id?'빅 에이전트 · 시간 종료까지 생존하세요':'빅 에이전트를 처치하세요'):'상대 팀을 전멸시키세요';}
  const me=n.me;for(const [id,b] of n.remotes){const p=b.state;if(!p||p.team===me.team||p.dead)continue;const hidden=this.g.world.map.bushes?.some(r=>Math.abs(p.pos[0]-r.x)<r.w/2&&Math.abs(p.pos[2]-r.z)<r.d/2);if(hidden&&Math.hypot(p.pos[0]-me.pos[0],p.pos[2]-me.pos[2])>5)b.mesh.visible=false;}
 }
 dispose(){this.network.dispose();this.g.mode='home';for(const m of [this.ballMesh,...this.goals]){this.g.scene.remove(m);m.geometry.dispose();m.material.dispose();}}
}
