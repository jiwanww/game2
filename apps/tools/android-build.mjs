import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..'),mode=process.argv[2];if(!['debug','release'].includes(mode))throw Error('Choose debug or release');
if(mode==='release')for(const key of ['AF_ANDROID_KEYSTORE','AF_ANDROID_STORE_PASSWORD','AF_ANDROID_KEY_ALIAS','AF_ANDROID_KEY_PASSWORD'])if(!process.env[key])throw Error('Release signing is not configured: '+key+'. Android Studio can also generate a signed bundle.');
const run=(command,args,opts={})=>{const r=spawnSync(command,args,{cwd:root,stdio:'inherit',...opts});if(r.status!==0)throw Error('Build failed; see the tool output above.');};
run(process.execPath,['apps/tools/mobile.mjs','android']);
if(process.platform==='win32')run('cmd.exe',['/d','/c','gradlew.bat',mode==='release'?'bundleRelease':'assembleDebug'],{cwd:join(root,'android')});
else run('sh',['gradlew',mode==='release'?'bundleRelease':'assembleDebug'],{cwd:join(root,'android')});
