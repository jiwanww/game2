const {app,BrowserWindow,Menu,dialog,ipcMain,session,clipboard}=require('electron');
const {join}=require('node:path');const {pathToFileURL}=require('node:url');
const {autoUpdater}=require('electron-updater');const {UpdateManager}=require('./update-manager.cjs');const config=require('../release-config.json');
let win,server,updates,tunnel,inviteURL='',closing=false,origin='http://127.0.0.1:8787';
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{win?.show();win?.focus();});
 app.whenReady().then(async()=>{
  const game=app.isPackaged?join(process.resourcesPath,'game'):join(__dirname,'..','desktop-game');
  const {createServer}=await import(pathToFileURL(join(game,'server.mjs')).href);const hosted=createServer();server=hosted.server;
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(8787,'0.0.0.0',resolve);});}catch(error){dialog.showErrorBox('게임을 열 수 없습니다','기존 START-WINDOWS.bat 서버를 종료한 뒤 다시 실행하세요.\n'+error.message);app.quit();return;}
  win=new BrowserWindow({width:1440,height:900,minWidth:800,minHeight:500,backgroundColor:'#0a151e',title:'능력전선',webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const trusted=contents=>{try{return new URL(contents.getURL()).origin===origin;}catch{return false;}};
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(trusted(contents)&&['fullscreen','pointerLock','keyboardLock'].includes(permission)));
  session.defaultSession.setPermissionCheckHandler((contents,permission)=>trusted(contents)&&['fullscreen','pointerLock','keyboardLock'].includes(permission));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin)event.preventDefault();});
  updates=new UpdateManager(autoUpdater,{enabled:app.isPackaged&&!!config.updateUrl,feed:config.updateUrl,onInstall:()=>{closing=true;server?.close();}});
  updates.on('status',s=>{if(win&&!win.isDestroyed())win.webContents.send('update:status',s);});
  const checkSender=event=>{if(event.sender!==win.webContents||event.senderFrame?.url&&!event.senderFrame.url.startsWith(origin+'/'))throw Error('Untrusted sender');};
  ipcMain.handle('update:status',event=>{checkSender(event);return updates.status;});
  ipcMain.handle('update:install',async event=>{checkSender(event);if(updates.status.state!=='ready')return false;const r=await dialog.showMessageBox(win,{type:'question',message:'업데이트를 적용할까요?',detail:'게임과 이 PC에서 연 멀티 서버가 종료되고 앱이 다시 시작됩니다.',buttons:['적용','취소'],defaultId:1,cancelId:1});return r.response===0&&updates.install();});
  const startInternetHost=async()=>{if(inviteURL){clipboard.writeText(inviteURL);await dialog.showMessageBox(win,{type:'info',message:'초대 주소를 복사했습니다.',detail:inviteURL+'\n\n친구에게 이 주소와 방 코드를 보내세요.'});return;}const answer=await dialog.showMessageBox(win,{type:'question',message:'인터넷 멀티 방장을 시작할까요?',detail:'처음 한 번은 HTTPS 초대 주소 생성 도구를 내려받습니다. 주소는 이번 게임 실행 동안만 유지됩니다.',buttons:['시작','취소'],defaultId:1,cancelId:1});if(answer.response!==0)return;try{const {startTunnel}=await import(pathToFileURL(join(game,'internet.mjs')).href);tunnel=await startTunnel({port:8787,setPublicOrigin:hosted.setPublicOrigin,runtimeDir:join(app.getPath('userData'),'tunnel'),onURL:url=>{inviteURL=url;clipboard.writeText(url);}});inviteURL=tunnel.url;clipboard.writeText(inviteURL);await dialog.showMessageBox(win,{type:'info',message:'인터넷 초대 주소를 복사했습니다.',detail:inviteURL+'\n\n사용자설정에서 방을 만들고, 친구에게 주소와 방 코드를 보내세요.'});}catch(error){dialog.showErrorBox('인터넷 멀티 시작 실패',error.message);}};
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'능력전선',submenu:[{label:'인터넷 멀티 방장 시작 / 주소 복사',click:startInternetHost},{label:'업데이트 확인',click:async()=>{const state=await updates.check();if(state.state==='unconfigured')dialog.showMessageBox(win,{message:'배포 주소가 아직 연결되지 않은 테스트 빌드입니다.'});else if(state.state==='current')dialog.showMessageBox(win,{message:'최신 버전입니다.'});}},{label:'버전 정보',click:()=>dialog.showMessageBox(win,{message:'능력전선 '+app.getVersion(),detail:'싱글 플레이 · 로컬 및 인터넷 멀티 서버 내장'})},{type:'separator'},{role:'quit',label:'종료'}]},{label:'화면',submenu:[{role:'togglefullscreen',label:'전체 화면'}]}]));
  await win.loadURL(origin);updates.check();const timer=setInterval(()=>updates.check(),6*60*60*1000);timer.unref();
  win.on('close',async event=>{if(closing)return;event.preventDefault();const r=await dialog.showMessageBox(win,{message:'게임을 종료할까요?',detail:'이 PC의 멀티 서버도 함께 종료됩니다.',buttons:['종료','취소'],defaultId:1,cancelId:1});if(r.response===0){closing=true;tunnel?.stop();app.quit();}});
 }).catch(error=>{dialog.showErrorBox('실행 오류',error.message);app.quit();});
 app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>{closing=true;tunnel?.stop();server?.close();});
}
