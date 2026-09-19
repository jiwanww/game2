import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import {join,dirname} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..');
const config=JSON.parse(await readFile(join(root,'apps/release-config.json'),'utf8'));
if(!/^([a-z][a-z0-9_]*\.){2,}[a-z][a-z0-9_]*$/i.test(config.appId))throw Error('appId must be a reverse-domain identifier');
if(!Number.isSafeInteger(config.buildNumber)||config.buildNumber<1)throw Error('Invalid buildNumber');
if(config.updateUrl){const u=new URL(config.updateUrl);if(u.protocol!=='https:'||u.username||u.password)throw Error('updateUrl must be HTTPS');}
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https: http://*:8787; media-src 'self' blob:; object-src 'none'; base-uri 'self'";
const index=(await readFile(join(root,'index.html'),'utf8')).replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">');
for(const target of ['apps/mobile-web','apps/desktop-game']){const out=join(root,target);await mkdir(out,{recursive:true});await cp(join(root,'src'),join(out,'src'),{recursive:true});await writeFile(join(out,'index.html'),index);}
for(const name of ['server.mjs','simulation.mjs','round-system.mjs','internet.mjs','package.json'])await cp(join(root,name),join(root,'apps/desktop-game',name));
const cap=JSON.parse(await readFile(join(root,'capacitor.config.json'),'utf8'));cap.appId=config.appId;cap.appName=config.appName;await writeFile(join(root,'capacitor.config.json'),JSON.stringify(cap,null,2)+'\n');
console.log('Prepared desktop and mobile assets. '+(config.updateUrl?'Windows update feed configured: '+config.updateUrl:'Windows update feed not yet configured (preview build).'));
