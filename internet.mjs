import {createServer} from './server.mjs';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
export function tunnelURL(text){return text.match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b/)?.[0]||null;}
export function verify(bytes,hash){return createHash('sha256').update(bytes).digest('hex')===hash;}
async function main(){
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('이 인터넷 실행기는 Windows 64비트용입니다.');
 const dir=join(root,'runtime');await mkdir(dir,{recursive:true});
 const version='2026.9.1',hash='2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712';
 const exe=join(dir,'cloudflared-'+version+'.exe');let bytes;try{bytes=await readFile(exe);}catch{}
 if(!bytes||!verify(bytes,hash)){console.log('첫 실행: 공식 Cloudflare 연결 도구 다운로드 중...');const res=await fetch(`https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-windows-amd64.exe`,{signal:AbortSignal.timeout(180000)});if(!res.ok)throw Error('연결 도구 다운로드 실패: '+res.status);bytes=Buffer.from(await res.arrayBuffer());if(!verify(bytes,hash))throw Error('다운로드 검증 실패. 다시 실행하세요.');await writeFile(exe+'.tmp',bytes);await rename(exe+'.tmp',exe);}
 const app=createServer();await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 const port=app.server.address().port,config=join(dir,'tunnel-config.yml');await writeFile(config,'{}\n');
 console.log('인터넷 초대 주소 생성 중...');const child=spawn(exe,['tunnel','--config',config,'--url',`http://127.0.0.1:${port}`,'--protocol','http2','--no-autoupdate'],{cwd:dir,stdio:['ignore','pipe','pipe']});
 let shared=false,buffer='';const timeout=setTimeout(()=>{if(!shared){console.error('주소 생성 시간 초과. 인터넷 연결을 확인하고 다시 실행하세요.');stop();}},90000);
 const stop=()=>{clearTimeout(timeout);child.kill();app.server.closeAllConnections();app.server.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 const log=chunk=>{buffer=(buffer+chunk.toString()).slice(-12000);const url=tunnelURL(buffer);if(url&&!shared){shared=true;clearTimeout(timeout);app.setPublicOrigin(url);console.log('\n친구에게 보낼 주소:\n'+url+'\n\n사용자설정 → 방 만들기 → 친구에게 방 코드 전달\n친구는 Node.js 설치가 필요 없습니다.\n경기 동안 이 창을 켜 두세요. 종료: Ctrl+C\n');spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{stdio:'ignore'}).on('error',()=>{});}};
 child.stdout.on('data',log);child.stderr.on('data',log);child.on('error',e=>{console.error(e.message);stop();});child.on('exit',code=>{if(code)console.error('인터넷 연결이 종료되었습니다. 다시 실행하세요.');stop();});
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error('실행 실패:',e.message);process.exitCode=1;});
