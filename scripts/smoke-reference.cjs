'use strict';
// DOM stubs verify initialization and render functions only. This is NOT a visual or Electron test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const element=()=>({innerHTML:'',textContent:'',hidden:true,style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},focus(){}});
const elements=new Map(),get=s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s)};
const sandbox={console,Intl,Date,Math,JSON,Set,Map,Number,String,Array,Object,crypto:crypto.webcrypto,URL,TextDecoder,Uint8Array,DataView,setTimeout(){},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},location:{hash:'#home'},document:{querySelector:get,body:element(),addEventListener(){},title:''},window:{addEventListener(){},scrollTo(){}}};vm.createContext(sandbox);
for(const name of ['data.js','import.js','app.js','dashboard.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../prototype',name),'utf8'),sandbox,{filename:name});
vm.runInContext(`for(const page of ['home','today','focus','planner','calendar','resources','curriculum','uworld','anki','weakness','catchup','systems','assessments','weekly','analytics','phases','milestones','settings','guide','howto','sources','profile']){state.page=page;render();if(!document.querySelector('#main').innerHTML)throw Error('Empty page: '+page);console.log('RENDER '+page);}`,sandbox);
console.log('PASS: source initialization and route render smoke checks. Browser interactions, visual parity, persistence and Windows builds remain untested by this script.');
