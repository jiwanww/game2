import {readFile,writeFile,access} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {dirname,join} from 'node:path';
import './prepare.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'../..'),platform=process.argv[2];
if(!['android','ios'].includes(platform))throw Error('Choose android or ios');
const config=JSON.parse(await readFile(join(root,'apps/release-config.json'),'utf8')),pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const cap=args=>{const r=spawnSync(process.execPath,[join(root,'node_modules/@capacitor/cli/bin/capacitor'),...args],{cwd:root,stdio:'inherit'});if(r.status!==0)throw Error('Capacitor failed');};
let exists=true;try{await access(join(root,platform));}catch{exists=false;}
if(!exists)cap(['add',platform,...(platform==='ios'?['--packagemanager','SPM']:[])]);
if(platform==='android'){
 const path=join(root,'android/app/build.gradle');let gradle=await readFile(path,'utf8');
 const oldId=gradle.match(/applicationId\s+"([^"]+)"/)?.[1];if(oldId!==config.appId)throw Error('Existing Android applicationId differs; do not change an already published app identity.');
 gradle=gradle.replace(/versionCode\s+\d+/,`versionCode ${config.buildNumber}`).replace(/versionName\s+"[^"]+"/,`versionName "${pkg.version}"`);
 if(!gradle.includes('ability-signing.gradle'))gradle+='\napply from: "../../apps/ability-signing.gradle"\n';await writeFile(path,gradle);
 const manifest=join(root,'android/app/src/main/AndroidManifest.xml');let xml=await readFile(manifest,'utf8');if(!xml.includes('android:screenOrientation='))xml=xml.replace('<activity','<activity\n            android:screenOrientation="sensorLandscape"');await writeFile(manifest,xml);
}else{
 const project=join(root,'ios/App/App.xcodeproj/project.pbxproj');let p=await readFile(project,'utf8');if(!p.includes('PRODUCT_BUNDLE_IDENTIFIER = '+config.appId+';'))throw Error('Existing iOS bundle identifier differs.');
 p=p.replace(/CURRENT_PROJECT_VERSION = \d+;/g,`CURRENT_PROJECT_VERSION = ${config.buildNumber};`).replace(/MARKETING_VERSION = [^;]+;/g,`MARKETING_VERSION = ${pkg.version.split('-')[0]};`);await writeFile(project,p);
 const plist=join(root,'ios/App/App/Info.plist');let xml=await readFile(plist,'utf8');xml=xml.replace(/\s*<string>UIInterfaceOrientationPortrait(?:UpsideDown)?<\/string>/g,'');if(!xml.includes('UIRequiresFullScreen'))xml=xml.replace('<key>UIViewControllerBasedStatusBarAppearance</key>','<key>UIRequiresFullScreen</key><true/>\n\t<key>UIViewControllerBasedStatusBarAppearance</key>');await writeFile(plist,xml);
}
cap(['sync',platform]);console.log(platform+' project prepared. Store signing and upload remain separate.');
