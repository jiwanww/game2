import {serverOrigin} from './platform.js';

const PREFIX='AFI2.';
const textToBase64Url=text=>{
 const bytes=new TextEncoder().encode(text);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
};
const base64UrlToText=value=>{
 const padded=value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4);
 const binary=atob(padded),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes);
};
export function makeInviteCode({server,room}){
 const origin=serverOrigin(server);const code=String(room||'').trim().toUpperCase();
 if(!/^[A-F0-9]{6}$/.test(code))throw Error('방 코드를 확인하세요.');
 return PREFIX+textToBase64Url(JSON.stringify({v:2,s:origin,r:code}));
}
export function readInviteCode(value){
 const source=String(value||'').trim();if(!source.startsWith(PREFIX)||source.length>4096)throw Error('능력전선 초대 코드를 붙여넣으세요.');
 let data;try{data=JSON.parse(base64UrlToText(source.slice(PREFIX.length)));}catch{throw Error('초대 코드가 손상되었습니다. 방장에게 다시 받아 주세요.');}
 if(!data||data.v!==2||typeof data.s!=='string'||typeof data.r!=='string')throw Error('지원하지 않는 초대 코드입니다.');
 const server=serverOrigin(data.s),room=data.r.trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(room))throw Error('초대 코드의 방 정보를 확인할 수 없습니다.');
 return {server,room};
}
