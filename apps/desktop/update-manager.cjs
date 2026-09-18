const {EventEmitter}=require('node:events');
class UpdateManager extends EventEmitter {
 constructor(updater,{enabled=false,feed='',onInstall=()=>{}}={}){
  super();this.updater=updater;this.enabled=enabled;this.onInstall=onInstall;this.status={state:enabled?'idle':'unconfigured'};
  if(!enabled)return;
  const u=new URL(feed);if(u.protocol!=='https:'||u.username||u.password)throw Error('Invalid HTTPS update feed');
  updater.autoDownload=true;updater.autoInstallOnAppQuit=false;updater.allowPrerelease=true;updater.allowDowngrade=false;
  updater.setFeedURL({provider:'generic',url:u.href,channel:'beta'});
  for(const [event,state]of [['checking-for-update','checking'],['update-not-available','current'],['update-available','available'],['update-downloaded','ready']])updater.on(event,info=>this.set({state,version:info?.version}));
  updater.on('download-progress',p=>this.set({state:'downloading',percent:p.percent}));
  updater.on('error',()=>this.set({state:'error'}));
 }
 set(s){this.status=s;this.emit('status',s);}
 async check(){if(!this.enabled)return this.status;try{await this.updater.checkForUpdates();}catch{this.set({state:'error'});}return this.status;}
 install(){if(this.status.state!=='ready')return false;this.onInstall();this.updater.quitAndInstall(false,true);return true;}
}
module.exports={UpdateManager};
