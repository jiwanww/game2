import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {HostManager} from '../apps/desktop/host-manager.cjs';import {waitForTunnel,tunnelURL} from '../internet.mjs';
function child(){const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr=new EventEmitter();c.killed=0;c.kill=()=>{c.killed++;};return c;}
test('internet host shares in-flight startup, reuses live tunnel, restarts on exit',async()=>{
 let starts=0,exit;const host=new HostManager(async({onExit})=>{starts++;exit=onExit;return {url:'https://test.trycloudflare.com',stop(){}};});
 const a=host.start(),b=host.start();assert.equal(a,b);await a;assert.equal(starts,1);await host.start();assert.equal(starts,1);
 exit();assert.equal(host.url,'');await host.start();assert.equal(starts,2);host.stop();assert.equal(host.url,'');
});
test('cancelled or failed internet startup can be retried',async()=>{
 let n=0;const host=new HostManager(async()=>{if(++n===1)throw Error('offline');if(n===2)return null;return {url:'https://new.trycloudflare.com',stop(){}};});
 await assert.rejects(host.start());assert.equal(await host.start(),null);assert((await host.start()).url);
});
test('only announce invite after connection registered; split output and exit handled',async()=>{
 const c=child();let announced='',exited=0;const promise=waitForTunnel(c,{setPublicOrigin:url=>announced=url,onExit:()=>exited++});
 c.stderr.emit('data',Buffer.from('https://test-'));c.stderr.emit('data',Buffer.from('room.trycloudflare.com\n'));assert.equal(announced,'');
 c.stderr.emit('data',Buffer.from('Registered tunnel connection'));const handle=await promise;assert.equal(handle.url,announced);
 c.emit('exit',1);assert.equal(exited,1);assert.equal(tunnelURL('https://test.trycloudflare.com.evil.test'),null);
});
test('startup failure and timeout stop child processes rather than leaving a hidden server',async()=>{
 const c=child(),p=waitForTunnel(c,{setPublicOrigin(){},timeoutMs:20});c.emit('error',Error('missing'));await assert.rejects(p);assert.equal(c.killed,1);
 const d=child();await assert.rejects(waitForTunnel(d,{setPublicOrigin(){},timeoutMs:10}));assert.equal(d.killed,1);
});
test('quitting during startup cancels the pending tunnel process',async()=>{
 const c=child(),host=new HostManager(({signal})=>waitForTunnel(c,{signal,setPublicOrigin(){}}));
 const pending=host.start();await Promise.resolve();host.stop();await assert.rejects(pending);assert.equal(c.killed,1);assert.equal(host.url,'');
});
