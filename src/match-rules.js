export class MatchRules {
 constructor(options,sites){this.options=options;this.sites=sites;this.awards=[];this.round=0;this.score={A:0,B:0};this.phase='buy';this.nextRound();}
 role(team){if(this.soloTeam)return team===this.soloTeam?'attack':'defend';const attack=this.round<=Math.ceil(this.options.rounds/2)?'A':'B';return team===attack?'attack':'defend';}
 nextRound(){this.round++;this.phase='buy';this.time=12;this.spike={state:'idle',site:-1,remaining:45,progress:0,half:false,actor:null,carrier:null,dropped:null,position:null,dropTimer:0,lastCarrier:null};this.result=null;}
 finish(team,reason){if(this.phase==='result'||this.phase==='done')return;this.result={team,reason};if(team)this.score[team]++;this.phase='result';this.time=5;}
 step(dt,players){
 if(this.phase==='done')return;
 if(this.phase==='result'){this.time-=dt;if(this.time<=0){if(this.round>=this.options.rounds)this.phase='done';else{this.nextRound();return 'round';}}return;}
 if(this.phase==='buy'){this.time-=dt;if(this.time<=0){this.phase='live';this.time=100;}return;}
 const attackers=players.filter(p=>p.alive&&this.role(p.team)==='attack'),defenders=players.filter(p=>p.alive&&this.role(p.team)==='defend');
 if(this.soloTeam&&!players.some(p=>p.alive)){this.finish(null,'혼자 연습 · 라운드 종료');return;}
 if(!this.soloTeam&&!defenders.length){this.finish(attackers.length||this.spike.state==='planted'?this.attackTeam():null,attackers.length||this.spike.state==='planted'?'수비팀 전멸':'동시 전멸 · 무승부');return;}
 if(!this.soloTeam&&!attackers.length&&this.spike.state!=='planted'){this.finish(this.defendTeam(),'설치 전 공격팀 전멸');return;}
 const s=this.spike;
 if(s.state==='idle'){
 s.dropTimer=Math.max(0,s.dropTimer-dt);
 if(s.carrier&&!attackers.some(p=>p.id===s.carrier)){const fallen=players.find(p=>p.id===s.carrier);s.dropped=fallen?{x:fallen.x,z:fallen.z}:this.sites[0];s.carrier=null;s.actor=null;s.progress=0;}
 
 if(s.dropped){const picker=attackers.find(p=>p.grounded&&!p.phased&&(p.id!==s.lastCarrier||s.dropTimer<=0)&&Math.hypot(p.x-s.dropped.x,p.z-s.dropped.z)<=1.2);if(picker){s.carrier=picker.id;s.dropped=null;}}

 this.time-=dt;if(this.time<=0){this.finish(this.defendTeam(),'설치 제한 시간 종료');return;}
 const candidate=attackers.find(p=>p.id===s.carrier&&p.interact&&p.grounded&&this.sites.some(t=>Math.hypot(p.x-t.x,p.z-t.z)<=t.r));
 if(candidate){const site=this.sites.findIndex(t=>Math.hypot(candidate.x-t.x,candidate.z-t.z)<=t.r);if(s.actor!==candidate.id||s.site!==site)s.progress=0;s.actor=candidate.id;s.site=site;s.progress+=dt;if(s.progress>=4){this.awards.push({id:candidate.id,reason:'설치'});s.state='planted';s.position={x:candidate.x,z:candidate.z};s.carrier=null;s.progress=0;s.actor=null;s.remaining=45;}}
 else{s.progress=0;s.actor=null;}
 }else{
 s.remaining-=dt;if(s.remaining<=0){this.finish(this.attackTeam(),'설치 폭탄 폭발');return;}
 const site=s.position||this.sites[s.site],candidate=(this.soloTeam?players.filter(p=>p.alive):defenders).find(p=>p.interact&&p.grounded&&Math.hypot(p.x-site.x,p.z-site.z)<=2.6);
 if(candidate){if(s.actor!==candidate.id)s.progress=s.half?3.5:0;s.actor=candidate.id;s.progress+=dt;if(s.progress>=3.5)s.half=true;if(s.progress>=7){this.awards.push({id:candidate.id,reason:'해체'});s.state='defused';this.finish(this.soloTeam||this.defendTeam(),this.soloTeam?'혼자 연습 · 설치 폭탄 해체':'설치 폭탄 해체');}}
 else{s.progress=s.half?3.5:0;s.actor=null;}
 }
 }
 attackTeam(){return this.role('A')==='attack'?'A':'B';}defendTeam(){return this.attackTeam()==='A'?'B':'A';}
 snapshot(){return {solo:!!this.soloTeam,round:this.round,total:this.options.rounds,score:this.score,phase:this.phase,time:this.time,spike:{...this.spike},result:this.result,attackTeam:this.attackTeam()};}
}
