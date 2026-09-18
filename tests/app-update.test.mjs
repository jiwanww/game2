import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {UpdateManager} from '../apps/desktop/update-manager.cjs';
import {serverOrigin} from '../src/platform.js';import {stickKeys} from '../src/touch-controls.js';import {createServer} from '../server.mjs';
test('updater requires an explicit HTTPS feed, downloads in background and only installs after user action',async()=>{
 const updater=new EventEmitter();let checked=0,installed=0;updater.setFeedURL=u=>{updater.feed=u;};updater.checkForUpdates=async()=>{checked++;};updater.quitAndInstall=()=>installed++;
 const off=new UpdateManager(updater);await off.check();assert.equal(checked,0);assert.equal(off.status.state,'unconfigured');assert(!off.install());
 assert.throws(()=>new UpdateManager(updater,{enabled:true,feed:'http://example.org'}));
 const m=new UpdateManager(updater,{enabled:true,feed:'https://updates.example.org/abilityfront/'});await m.check();assert.equal(checked,1);assert.equal(updater.autoInstallOnAppQuit,false);assert.equal(updater.allowDowngrade,false);
 updater.emit('download-progress',{percent:51});assert.deepEqual(m.status,{state:'downloading',percent:51});assert(!m.install());updater.emit('update-downloaded',{version:'0.7.1-beta.2'});assert.equal(installed,0);assert(m.install());assert.equal(installed,1);
 updater.emit('error',new Error('offline'));assert.equal(m.status.state,'error');assert(!m.install());
});
test('mobile server connections reject unsafe URLs and joystick has a deadzone and diagonal input',()=>{
 assert.equal(serverOrigin('https://play.example.com/?room=ABCDEF'),'https://play.example.com');assert.throws(()=>serverOrigin('javascript:alert(1)'));assert.throws(()=>serverOrigin('https://user:password@example.com'));assert.throws(()=>serverOrigin('http://example.com'));assert.throws(()=>serverOrigin('http://192.168.1.2:8787',{allowLocal:false}));assert.equal(serverOrigin('http://192.168.1.2:8787',{allowLocal:true}),'http://192.168.1.2:8787');
 assert(Object.values(stickKeys(.1,.1)).every(x=>!x));assert(stickKeys(.7,-.8).KeyW&&stickKeys(.7,-.8).KeyD);assert(!stickKeys(.7,-.8).KeyS);
});
test('native mobile origins can preflight and create sessions while unrelated origins are denied',async()=>{
 const {server}=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{for(const origin of ['capacitor://localhost','https://localhost']){const r=await fetch(base+'/api/create',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Headers':'authorization, content-type'}});assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);const c=await fetch(base+'/api/create',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Phone',options:{mode:'dungeon'}})});assert.equal(c.status,200);}
 const bad=await fetch(base+'/api/create',{method:'OPTIONS',headers:{Origin:'https://unrelated.example'}});assert.equal(bad.status,403);
 }finally{await new Promise(r=>server.close(r));}
});
