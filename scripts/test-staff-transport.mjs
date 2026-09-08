// Exercise the frontend's request builder. No network requests or business writes.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]}});
const realFetch=globalThis.fetch;
let calls=[];
try {
 const {staffApi}=await vite.ssrLoadModule('/src/management/staff-api.ts');
 globalThis.fetch=async(url,options)=>{calls.push({url:new URL(url,'https://test.invalid'),options});return Response.json({ok:true});};
 const resources=['session','login','logout','expense-sheet','employees','attendance','payment','void-payment','inventory-register','monthly-summary','report','users'];
 for(const resource of resources){
  await staffApi(resource);
  const call=calls.at(-1);
  assert.equal(call.url.pathname,'/api/staff');
  assert.deepEqual(call.url.searchParams.getAll('resource'),[resource]);
  assert.equal(call.options.method,'GET');
  assert.equal(call.options.cache,'no-store');
 }
 await staffApi('expense-sheet',undefined,{date:'2026-09-08'});
 assert.equal(calls.at(-1).url.searchParams.get('date'),'2026-09-08');
 assert.equal(calls.at(-1).url.searchParams.get('resource'),'expense-sheet');
 await staffApi('monthly-summary',undefined,{month:'2026-09',resource:'login'});
 assert.equal(calls.at(-1).url.searchParams.get('resource'),'monthly-summary');
 assert.equal(calls.at(-1).url.searchParams.get('month'),'2026-09');
 const entry={id:'test-only',entry:{name:'Supplies',quantity:2,price:100}};
 await staffApi('expense-sheet',entry);
 assert.equal(calls.at(-1).options.method,'POST');
 assert.deepEqual(JSON.parse(calls.at(-1).options.body),entry);
 assert.equal(calls.at(-1).options.headers['Content-Type'],'application/json');
 globalThis.fetch=async()=>Response.json({error:'Sign in required'},{status:401});
 await assert.rejects(staffApi('session'),error=>error.status===401&&error.message==='Sign in required');
 globalThis.fetch=async()=>new Response('<html>Unavailable</html>',{status:503,headers:{'Content-Type':'text/html'}});
 await assert.rejects(staffApi('employees'),/staff service is unavailable/);
 console.log('PASS staff transport: 12 resource routes, date/month parameters, POST payload, 401 status and unavailable-service handling. No network requests made.');
} finally {globalThis.fetch=realFetch;await vite.close();}
