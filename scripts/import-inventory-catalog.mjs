// Explicit owner-requested catalogue import. Dry run unless --apply is provided.
// Uses the existing authenticated API; never overwrites stock or seeds quantities.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const catalog=JSON.parse(readFileSync(new URL('../shared/inventory-catalog.json',import.meta.url),'utf8'));
const origin=process.env.INVENTORY_ORIGIN;
if(!origin||!process.env.INVENTORY_USERNAME||!process.env.INVENTORY_PASSWORD)throw Error('Set INVENTORY_ORIGIN, INVENTORY_USERNAME and INVENTORY_PASSWORD.');
let cookie;
async function api(resource,data){const r=await fetch(origin+'/api/staff?resource='+resource,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const result=await r.json();if(!r.ok)throw Error(resource+' '+r.status+' '+JSON.stringify(result));if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return result;}
const normalize=s=>s.trim().replace(/\s+/g,' ').toLowerCase();
function idFor(name){const h=createHash('sha256').update('shafi-owner-inventory-2026-09:'+normalize(name)).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
try{
 const actor=await api('login',{username:process.env.INVENTORY_USERNAME,password:process.env.INVENTORY_PASSWORD});if(actor.role!=='GM')throw Error('Import requires GM.');
 const before=await api('inventory-register');const existing=new Set(before.items.map(i=>normalize(i.name)));let added=0,skipped=0;
 for(const item of catalog){if(existing.has(normalize(item.name))){skipped++;continue;}
  if(process.argv.includes('--apply'))await api('inventory-register',{id:idFor(item.name),action:'add',entry:{...item,notes:item.notes||'',quantity:null,unit:'units'}});
  added++;console.log((process.argv.includes('--apply')?'Added ':'Would add ')+item.category+' / '+item.name);
 }
 console.log(JSON.stringify({added,skipped,totalCatalog:catalog.length,applied:process.argv.includes('--apply')}));
 if(process.argv.includes('--apply')){const after=await api('inventory-register');for(const item of catalog){if(!after.items.some(i=>normalize(i.name)===normalize(item.name)))throw Error('Missing '+item.name);}console.log('All catalogue names verified; existing records preserved.');}
}finally{if(cookie)await api('logout',{});}
