import {createServer} from './server.mjs';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
export function tunnelURL(text){return text.match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b/)?.[0]||null;}
export function verify(bytes,hash){return createHash('sha256').update(bytes).digest('hex')===hash;}
export async function startTunnel({port,setPublicOrigin,onURL=()=>{},runtimeDir=join(root,'runtime')}={}){
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('인터넷 초대 기능은 Windows 64비트에서 사용할 수 있습니다.');
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('게임 서버 포트를 확인할 수 없습니다.');
 await mkdir(runtimeDir,{recursive:true});
 const version='2026.9.1',hash='2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712';
 const exe=join(runtimeDir,'cloudflared-'+version+'.exe');let bytes;try{bytes=await readFile(exe);}catch{}
 if(!bytes||!verify(bytes,hash)){const res=await fetch(`https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-windows-amd64.exe`,{signal:AbortSignal.timeout(180000)});if(!res.ok)throw Error('인터넷 연결 도구 다운로드 실패: '+res.status);bytes=Buffer.from(await res.arrayBuffer());if(!verify(bytes,hash))throw Error('다운로드 검증 실패. 다시 실행하세요.');await writeFile(exe+'.tmp',bytes);await rename(exe+'.tmp',exe);}
 const config=join(runtimeDir,'tunnel-config.yml');await writeFile(config,'{}\n');
 const child=spawn(exe,['tunnel','--config',config,'--url',`http://127.0.0.1:${port}`,'--protocol','http2','--no-autoupdate'],{cwd:runtimeDir,stdio:['ignore','pipe','pipe']});
 let settled=false,buffer='';let timer;const stop=()=>{clearTimeout(timer);child.kill();};
 return await new Promise((resolve,reject)=>{const fail=error=>{if(!settled){settled=true;stop();reject(error);}};timer=setTimeout(()=>fail(Error('초대 주소 생성 시간이 초과되었습니다. 인터넷 연결을 확인하세요.')),90000);const log=chunk=>{buffer=(buffer+chunk.toString()).slice(-12000);const url=tunnelURL(buffer);if(url&&!settled){settled=true;clearTimeout(timer);try{setPublicOrigin(url);onURL(url);resolve({url,stop});}catch(error){stop();reject(error);}}};child.stdout.on('data',log);child.stderr.on('data',log);child.on('error',fail);child.on('exit',code=>{if(!settled)fail(Error('인터넷 연결이 종료되었습니다.'+(code?' 코드 '+code:'')));});});
}
async function main(){
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('이 인터넷 실행기는 Windows 64비트용입니다.');
 const app=createServer();await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 console.log('인터넷 초대 주소 생성 중...');const port=app.server.address().port;const tunnel=await startTunnel({port,setPublicOrigin:url=>app.setPublicOrigin(url),onURL:url=>console.log('\n친구에게 보낼 주소:\n'+url+'\n\n사용자설정 → 방 만들기 → 친구에게 방 코드 전달\n친구는 Node.js 설치가 필요 없습니다.\n경기 동안 이 창을 켜 두세요. 종료: Ctrl+C\n')});
 const stop=()=>{tunnel.stop();app.server.closeAllConnections();app.server.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);spawn('rundll32.exe',['url.dll,FileProtocolHandler',tunnel.url],{stdio:'ignore'}).on('error',()=>{});
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error('실행 실패:',e.message);process.exitCode=1;});
