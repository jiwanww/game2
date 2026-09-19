// A dead tunnel must not be reused; concurrent clicks share one startup.
class HostManager {
 constructor(start){this.startTunnel=start;this.tunnel=null;this.pending=null;this.generation=0;}
 get url(){return this.tunnel?.url||'';}
 start(){
  if(this.tunnel)return Promise.resolve(this.tunnel);
  if(this.pending)return this.pending;
  const generation=++this.generation,controller=new AbortController();this.controller=controller;
  const pending=Promise.resolve().then(()=>{controller.signal.throwIfAborted();return this.startTunnel({signal:controller.signal,onExit:()=>{if(this.generation===generation)this.tunnel=null;}});}).then(tunnel=>{
   if(this.generation!==generation){tunnel?.stop();throw Error('인터넷 초대가 취소되었습니다.');}
   this.tunnel=tunnel;return tunnel;
  }).finally(()=>{if(this.pending===pending)this.pending=null;});
  this.pending=pending;return pending;
 }
 stop(){this.generation++;this.controller?.abort();this.tunnel?.stop();this.tunnel=null;}
}
module.exports={HostManager};
