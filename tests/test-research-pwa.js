'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={},stores=new Map(),visited=[];
const origin='https://scholarflow.example/site/';
const normalized=x=>new URL(typeof x==='string'?x:x.url,origin).href;
const caches={
 async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async put(req,res){map.set(normalized(req),res)},async match(req){return map.get(normalized(req))}}},
 async keys(){return [...stores.keys()]},async delete(key){return stores.delete(key)},
 async match(req){for(const map of stores.values()){const value=map.get(normalized(req));if(value)return value}return undefined}
};
const ctx={URL,Promise,caches,self:{location:{origin:'https://scholarflow.example'},registration:{scope:'https://scholarflow.example/site/'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{},clients:{claim:()=>Promise.resolve()}},fetch:async req=>{visited.push(normalized(req));return {ok:true,type:'basic',clone(){return this},text:async()=>'<html>ScholarFlow</html>'}},Response:{error:()=>({ok:false})}};
vm.runInNewContext(fs.readFileSync('sw.js','utf8'),ctx,{filename:'sw.js'});
async function run(){
 const wait=async fn=>{let promise;fn({waitUntil:p=>promise=p});await promise};
 await wait(handlers.install);
 assert.equal(stores.size,1);
 assert(visited.some(u=>u.endsWith('/site/research-suite.js')));
 assert(visited.some(u=>u.endsWith('/site/cloud-sync.js')));
 let answer;const shellReq={method:'GET',url:'https://scholarflow.example/site/index.html',headers:{has:()=>false},mode:'navigate'};
 handlers.fetch({request:shellReq,respondWith:p=>answer=p});assert((await answer).ok);
 const previous=visited.length;
 handlers.fetch({request:{...shellReq,method:'POST'},respondWith:()=>{throw Error('POST intercepted')}});
 handlers.fetch({request:{...shellReq,url:'https://example.net/secret'},respondWith:()=>{throw Error('cross-origin intercepted')}});
 handlers.fetch({request:{...shellReq,url:'https://scholarflow.example/site/api/secret'},respondWith:()=>{throw Error('API intercepted')}});
 handlers.fetch({request:{...shellReq,url:'https://scholarflow.example/site/private/index.html'},respondWith:()=>{throw Error('non-shell intercepted')}});
 assert.equal(visited.length,previous);
 console.log('PASS 6 service-worker cache/security assertions');
}
run().catch(e=>{console.error(e);process.exit(1)});
