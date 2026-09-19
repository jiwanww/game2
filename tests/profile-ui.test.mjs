import test from 'node:test';import assert from 'node:assert/strict';
import {ProfileStore,unlockedAgents,rewardCount} from '../src/profile.js';
import {profileScreen} from '../src/profile-ui.js';
const nodes=new Map();let elements=[];
function render(html){
 nodes.clear();elements=[];
 for(const [tag] of html.matchAll(/<(?:button|input)\b[^>]*>/g)){
  const attrs=Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  const node={...attrs,disabled:/\sdisabled(?:\s|>)/.test(tag),value:'',dataset:{},addEventListener(type,fn){this['on'+type]=fn;}};
  for(const [key,value] of Object.entries(attrs))if(key.startsWith('data-'))node.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  elements.push(node);if(node.id)nodes.set('#'+node.id,node);
 }
}
globalThis.document={querySelector:s=>nodes.get(s)||null,querySelectorAll:s=>elements.filter(n=>s.startsWith('[data-')&&Object.hasOwn(n,s.slice(1,-1)))};
function setup(){
 const saved=new Map(),store=new ProfileStore({getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}),errors=[];
 const lobby={g:{profile:store},selection:'spidey',wentHome:0,html:'',shell(html){this.html=html;render(html);},bind(id,fn){const node=nodes.get(id);if(node)node.onclick=async()=>{try{await fn();}catch(e){this.error(e);}};},error(e){errors.push(e.message);},home(){this.wentHome++;}};
 return {store,lobby,errors};
}
test('first-choice UI previews any agent and requires explicit free confirmation',async()=>{
 const {lobby,store}=setup();profileScreen(lobby,{first:true});assert(lobby.html.includes('첫 요원을 골라 주세요'));assert.equal(unlockedAgents(store.read()).length,0);assert.equal(elements.filter(n=>n.dataset.profileAgent).length,11);assert(!nodes.has('#starter-confirm'));
 elements.find(n=>n.dataset.profileAgent==='hera').onclick();assert(lobby.html.includes('영혼 흡수'));assert.equal(unlockedAgents(store.read()).length,0);
 await nodes.get('#starter-confirm').onclick();assert.equal(store.read().starter,'hera');assert.equal(lobby.selection,'hera');assert.equal(lobby.wentHome,1);
});
test('collection UI spends exactly one pending credit and excludes already-owned heroes',()=>{
 const {lobby,store}=setup();store.starter('cap');store.record('first',{bonus:true});store.record('second',{bonus:true});profileScreen(lobby);
 assert(!elements.some(n=>n.dataset.profileUnlock==='cap'));assert.equal(elements.filter(n=>n.dataset.profileUnlock).length,10);
 elements.find(n=>n.dataset.profileUnlock==='ant').onclick();assert(store.owns('ant'));assert.equal(rewardCount(store.read()),0);assert.equal(elements.filter(n=>n.dataset.profileUnlock).length,0);
});
test('code UI never renders the verifier or expected code, clears submitted input on failure',async()=>{
 const {lobby,errors}=setup();profileScreen(lobby,{first:true});assert.equal(nodes.get('#owner-code').type,'password');assert(!lobby.html.includes('4bbd75c8'));nodes.get('#owner-code').value='invalidcode';await nodes.get('#owner-redeem').onclick();assert.equal(nodes.get('#owner-code').value,'');assert.equal(errors.length,1);
});
test('Ctrl paste is allowed in the secret/address input; in-game crouch shortcuts remain blocked',async()=>{
 const {preventGameShortcuts}=await import('../src/visuals.js');let prevented=0;
 preventGameShortcuts({ctrlKey:true,code:'KeyV',target:{tagName:'INPUT'},preventDefault(){prevented++;}});assert.equal(prevented,0);
 preventGameShortcuts({ctrlKey:true,code:'KeyW',target:{tagName:'CANVAS'},preventDefault(){prevented++;}});assert.equal(prevented,1);
});
