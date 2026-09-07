// Read-only production data checks. This script creates no operational records.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const origin='https://shafi-venue.vercel.app';
const credentials=parseEnv(readFileSync('.cms-local/production-credentials.txt','utf8'));
const login=await fetch(origin+'/api/cms?action=login',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify({password:credentials.CMS_ADMIN_PASSWORD})});
assert.equal(login.status,200,'Owner login failed');
const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
for(const resource of ['inventory','rentals','cash-reconciliation','employees']){
 const url=origin+'/api/staff?resource='+resource;
 assert.equal((await fetch(url)).status,401,resource+' anonymous access');
 const response=await fetch(url,{headers:{cookie}});assert.equal(response.status,200,resource+' authenticated access');
 const data=await response.json();assert.equal(typeof data,'object');
 const required=resource==='inventory'?['items','movements']:resource==='rentals'?['rentals','events']:resource==='cash-reconciliation'?['holders','counts']:['employees','attendance','payments'];
 for(const key of required)assert.ok(Array.isArray(data[key]),resource+' '+key);
 console.log('PASS live '+resource+': authenticated data reads and anonymous access denied');
}
console.log('Production operations smoke checks passed; no business records created.');
