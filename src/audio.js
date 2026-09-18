export class AudioFX {
 constructor(){this.ctx=null;this.volume=.35;this.muted=false;this.cueAt=new Map();this.cueVoices=0;}
 dungeonCue(type,power,pan){
  const scores={
   monsterSpawn:[[0,95,260,.32,'sine',.6],[.12,180,72,.4,'triangle',.45]],
   bossSpawn:[[0,44,34,.85,'triangle',.8],[.15,88,66,.7,'sawtooth',.25],[.45,132,65,.6,'sine',.3]],
   monsterAttack:[[0,155,48,.19,'sawtooth',.5],[.045,440,90,.12,'triangle',.45]],
   bossAttack:[[0,65,35,.42,'sawtooth',.5],[.06,190,70,.3,'triangle',.5]],
   monsterDefeat:[[0,320,520,.12,'triangle',.5],[.1,520,780,.19,'sine',.5],[.19,780,390,.22,'sine',.35]],
   roomClear:[[0,392,392,.55,'sine',.65],[.16,494,494,.55,'sine',.6],[.32,587,587,.6,'sine',.6],[.52,784,784,1.1,'sine',.6],[.52,392,392,1.1,'triangle',.25]]
  };
  const notes=scores[type];if(!notes)return false;
  const c=this.ctx,t=c.currentTime,interval=type==='roomClear'?.8:type.includes('Spawn')?.11:.055;
  if(t<(this.cueAt.get(type)??-1)+interval||this.cueVoices>28&&type!=='roomClear')return true;
  this.cueAt.set(type,t);this.master.gain.value=this.volume;
  const p=c.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));p.connect(this.master);let left=notes.length;
  for(const [delay,f,end,d,w,gain] of notes){const o=c.createOscillator(),g=c.createGain(),at=t+delay;o.type=w;o.frequency.setValueAtTime(f,at);o.frequency.exponentialRampToValueAtTime(end,at+d);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.001,.18*power*gain),at+.018);g.gain.exponentialRampToValueAtTime(.0001,at+d);o.connect(g);g.connect(p);this.cueVoices++;o.onended=()=>{o.disconnect();g.disconnect();this.cueVoices--;if(--left===0)p.disconnect();};o.start(at);o.stop(at+d+.02);}
  return true;
 }
 start(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);}this.ctx.resume();}
 play(type='hit',power=1,pan=0){if(!this.ctx||this.muted)return;if(this.dungeonCue(type,power,pan))return;const c=this.ctx,t=c.currentTime;this.master.gain.value=this.volume;const presets={monster:[72,.35,'triangle'],boss:[43,.8,'sawtooth'],dungeonGate:[95,.75,'sine'],roomClear:[440,.6,'sine'],step:[90,.055,'triangle'],jump:[250,.16,'sine'],land:[65,.16,'triangle'],hit:[125,.15,'sawtooth'],punch:[170,.12,'triangle'],web:[650,.26,'sine'],beam:[800,.3,'sawtooth'],shield:[500,.25,'sine'],charge:[180,.4,'sine'],launch:[240,.25,'sawtooth'],explode:[55,.55,'sawtooth'],electric:[950,.25,'square'],ult:[120,1.1,'sawtooth'],buy:[650,.12,'sine'],kill:[850,.4,'sine'],beep:[1200,.09,'sine'],flight:[120,.14,'triangle']};const [f,d,w]=presets[type]||presets.hit;const o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type=w;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(type==='jump'||type==='kill'?f*2.1:f*.25,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,.18*power),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);p.pan.value=Math.max(-1,Math.min(1,pan));o.connect(g);g.connect(p);p.connect(this.master);o.start(t);o.stop(t+d+.02);
 if(['hit','land','explode','web','punch'].includes(type)){const b=c.createBuffer(1,c.sampleRate*d,c.sampleRate);const data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);const n=c.createBufferSource(),ng=c.createGain(),filter=c.createBiquadFilter();n.buffer=b;filter.type='lowpass';filter.frequency.value=type==='web'?4500:1200;ng.gain.value=.16*power;n.connect(filter);filter.connect(ng);ng.connect(p);n.start(t);}
 }
}
