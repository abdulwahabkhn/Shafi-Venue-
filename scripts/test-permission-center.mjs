// No network or production data: exercise real auth/handlers with an in-memory SQL adapter.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

process.env.DATABASE_URL='postgres://test:test@127.0.0.1:1/permission_tests';
let uiHandler;
const vite=await createServer({configFile:false,plugins:[react(),{name:'test-fixture-api',configureServer(server){server.middlewares.use((req,res,next)=>uiHandler?uiHandler(req,res,next):next());}}],server:{host:'127.0.0.1',port:5180,strictPort:true},optimizeDeps:process.argv.includes('--ui')?{include:['react','react-dom/client','react/jsx-runtime','lucide-react','zod']}:{noDiscovery:true,include:[]}});
const store=await vite.ssrLoadModule('/server/postgres-bookings.ts');
const pool=store.bookingPool(),accounts=new Map(),sessions=new Map(),audits=[];
const tables=new Map();
const table=name=>{if(!tables.has(name))tables.set(name,new Map());return tables.get(name);};
let queryCount=0;
const result=rows=>({rows,rowCount:rows.length});
async function query(sql,values=[]){
 queryCount++;
 if(/^(BEGIN|COMMIT|ROLLBACK|SET |SELECT pg_advisory)/.test(sql))return result([]);
 if(sql.includes('FROM shafi_sessions s JOIN')){const id=sessions.get(values[0]);const user=accounts.get(id);return result(user?.active?[user]:[]);}
 if(sql.startsWith('INSERT INTO shafi_login_attempts'))return result([{count:1}]);
 if(sql.startsWith('INSERT INTO shafi_sessions')){sessions.set(values[0],values[1]);return result([]);}
 if(sql.startsWith('DELETE FROM shafi_sessions WHERE user_id')){for(const [token,id]of sessions)if(id===values[0])sessions.delete(token);return result([]);}
 if(sql.startsWith('DELETE FROM shafi_sessions WHERE token_hash')){sessions.delete(values[0]);return result([]);}
 if(sql.startsWith('INSERT INTO shafi_staff_audit')){audits.push(JSON.parse(values[4]));return result([]);}
 if(sql.startsWith('INSERT INTO shafi_users')){
  const [id,username,name,role,hall,active,password_hash,permissions]=values;
  accounts.set(id,{id,username,name,role,hall,active,password_hash:password_hash||accounts.get(id)?.password_hash,permissions:JSON.parse(permissions)});return result([]);
 }
 if(sql.includes('FROM shafi_users')){
  let rows=[...accounts.values()];
  if(sql.includes('username=$1'))rows=rows.filter(r=>r.username===values[0]);
  else if(sql.includes('id=$1'))rows=rows.filter(r=>r.id===values[0]);
  else if(sql.includes("role='Director'"))rows=rows.filter(r=>r.role==='Director'&&r.active&&r.id!==values[0]);
  return result(rows);
 }
 const insert=sql.match(/^INSERT INTO (shafi_\w+)\(([^)]+)\)/);
 if(insert){const columns=insert[2].split(',');const id=values[columns.indexOf('id')];const body=values[columns.indexOf('body')];if(body)table(insert[1]).set(id,JSON.parse(body));return result([]);}
 const update=sql.match(/^UPDATE (shafi_\w+) SET body=\$2 WHERE id=\$1/);
 if(update){table(update[1]).set(values[0],JSON.parse(values[1]));return result([]);}
 const select=sql.match(/FROM (shafi_\w+)/);
 if(select){let rows=[...table(select[1]).values()];if(sql.includes('WHERE id=$1'))rows=rows.filter(r=>r.id===values[0]);if(sql.includes('COUNT(*) total'))return result([{total:rows.length}]);return result(rows.map(body=>({id:body.id,body})));}
 throw Error('Unimplemented test SQL: '+sql);
}
pool.query=query;pool.connect=async()=>({query,release(){}});
const auth=await vite.ssrLoadModule('/server/staff-auth.ts');
const shared=await vite.ssrLoadModule('/shared/staff.ts');
const {handleStaff}=await vite.ssrLoadModule('/api/staff.ts');
const {handleBookings}=await vite.ssrLoadModule('/api/bookings.ts');
const {handleRequest:handleCms}=await vite.ssrLoadModule('/api/cms.ts');
const {expenseCategories,categoryForExpenseItem}=await vite.ssrLoadModule('/shared/expense-items.ts');
const director={id:randomUUID(),name:'Test Director',role:'Director',hall:null};
const gm={id:randomUUID(),name:'Test GM',role:'GM',hall:null};
const accountant={id:randomUUID(),name:'Test Accountant',role:'Accountant',hall:null};
const password='Local-test-only!';
const entry=(actor,permissions={})=>({...actor,username:actor.role.toLowerCase()+'-test',password,permissions});
const origin='http://127.0.0.1:5180';
const cookieFor=actor=>{const token=randomUUID().replaceAll('-','').repeat(2);sessions.set(createHash('sha256').update(token).digest('hex'),actor.id);return 'shafi_staff='+token;};
const request=(actor,resource,data)=>new Request(origin+'/api/staff?resource='+resource,{method:data?'POST':'GET',headers:{origin,cookie:cookieFor(actor),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
let count=0;
function ok(value,label){assert.ok(value,label);count++;console.log('PASS '+label);}
async function denied(p,label){await assert.rejects(p,e=>e.status===403);ok(true,label);}
try{
 for(const key of shared.accountantPermissionKeys){ok(shared.permissionEnabled({...director,permissions:{[key]:false}},key),'Director full access: '+key);}
 ok(shared.permissionEnabled(gm,'staffManage'),'Existing GM keeps default access');
 ok(!shared.permissionEnabled({...gm,permissions:{bookingRefund:false}},'bookingRefund'),'Explicit GM restriction overrides default');
 ok(!shared.permissionEnabled({...accountant,role:'Custom'},'expenseAdd'),'Custom roles start without inherited access');
 ok(expenseCategories.join('|')==='Marquee expense|Agriculture expense|Court and govt. expense','Daily expenses expose the three requested categories');
 ok(categoryForExpenseItem('Seeds')==='Agriculture expense'&&categoryForExpenseItem('Govt taxes')==='Court and govt. expense'&&categoryForExpenseItem('Staff food')==='Marquee expense','Existing item names map to their category');
 await auth.saveUser(director,director.id,entry(director));
 await auth.saveUser(director,gm.id,entry(gm,{booking:true,bookingRefund:false}));
 await auth.saveUser(director,accountant.id,entry(accountant,{expenseView:true,expenseAdd:true,expenseRemove:false}));
 ok(accounts.get(gm.id).permissions.bookingRefund===false,'Director persists GM permissions');
 ok(accounts.get(accountant.id).permissions.expenseRemove===false,'Director persists Accountant permissions');
 ok(audits.some(a=>a.permissions?.bookingRefund===false),'Permission change appears in audit');
 const logged=await auth.staffLogin(new Request(origin),{username:'gm-test',password});
 ok(logged.actor.permissions.bookingRefund===false,'Login returns current permissions immediately');
 const session=logged.cookie.split(';')[0];
 await auth.saveUser(director,gm.id,{...entry(gm),password:undefined,permissions:{booking:true,bookingRefund:false}});
 ok(await auth.actorFor(new Request(origin,{headers:{cookie:session}}))===null,'Permission changes revoke existing target sessions');
 await denied(auth.saveUser(gm,director.id,entry(director)),'GM cannot edit Director');
 await denied(auth.saveUser(gm,gm.id,entry(gm)),'GM cannot re-enable own permissions');
 await denied(auth.saveUser(gm,randomUUID(),entry({...director,name:'Other Director'})),'GM cannot create a Director');
 await denied(auth.saveUser({...gm,permissions:{expenseRemove:false}},accountant.id,entry(accountant,{expenseRemove:true})),'GM cannot delegate a denied permission');
 await denied(auth.saveUser(director,director.id,{...entry(director),active:false}),'Director cannot disable own account');
 await denied(auth.users({...gm,permissions:{staffManage:false}}),'Restricted GM cannot list staff accounts');
 const custom={id:randomUUID(),name:'Test Assistant',role:'Assistant',hall:null};
 await auth.saveUser(gm,custom.id,{...entry(custom),permissions:{booking:true,bookingRefund:false}});
 ok(accounts.get(custom.id).permissions.booking===true,'Custom-role grants survive saving');
 await denied(auth.saveUser(accountant,randomUUID(),entry(custom)),'Accountant cannot manage staff');
 const allDenied=Object.fromEntries(shared.accountantPermissionKeys.map(k=>[k,false]));
 for(const actor of [gm,accountant,custom]){
  accounts.get(actor.id).permissions=allDenied;
  for(const resource of ['users','expense-sheet','inventory-register','attendance','employees','report','monthly-summary','inventory','rentals','cash-reconciliation','files','download']){
   const response=await handleStaff(request(actor,resource));ok(response.status===403,actor.role+' denied '+resource);
  }
  for(const [resource,data] of Object.entries({users:{entry:entry(custom)},'expense-sheet':{entry:{}},'inventory-register':{action:'add',entry:{}},attendance:{entry:{}},employees:{entry:{}},payment:{entry:{kind:'Salary'}},'void-payment':{reason:'Test'},'stock-item':{entry:{}},'cash-count':{entry:{}}})){
   ok((await handleStaff(request(actor,resource,{id:randomUUID(),...data}))).status===403,actor.role+' write denied '+resource);
  }
  ok((await handleBookings(new Request(origin+'/api/bookings',{headers:{cookie:cookieFor(actor)}}))).status===403,actor.role+' bookings denied');
  const cms=await handleCms(new Request(origin+'/api/cms?action=session',{headers:{cookie:cookieFor(actor)}}));
  ok(!(await cms.json()).authenticated,actor.role+' CMS denied');
 }
 for(const actor of [gm,accountant]){
  accounts.get(actor.id).permissions={...allDenied,booking:true,bookingReceipt:true};
  const payment=kind=>handleBookings(new Request(origin+'/api/bookings',{method:'POST',headers:{origin,cookie:cookieFor(actor),'Content-Type':'application/json'},body:JSON.stringify({id:randomUUID(),action:'payment',payment:{kind}})}));
  ok((await payment('Refund')).status===403,actor.role+' refund denied while receipt enabled');
  ok((await payment('Receipt')).status!==403,actor.role+' receipt reaches validation');
 }
 for(const actor of [gm,accountant]){
  for(const [permission,resource,data] of [
   ['expenseAdd','expense-sheet',{entry:{}}],
   ['expenseRemove','expense-sheet',{action:'remove',reason:'test'}],
   ['inventoryAdd','inventory-register',{action:'add',entry:{}}],
   ['inventoryDamage','inventory-register',{entry:{action:'Damaged'}}],
   ['inventoryReplace','inventory-register',{entry:{action:'Replaced'}}],
   ['inventoryRemove','inventory-register',{entry:{action:'Archive'}}],
   ['employeeAdd','employees',{entry:{status:'Active'}}],
   ['employeeRemove','employees',{entry:{status:'Terminated'}}],
   ['attendanceEdit','attendance',{entry:{}}],
   ['employeeSalary','payment',{entry:{kind:'Salary'}}],
   ['employeeAdvance','payment',{entry:{kind:'Advance'}}]
  ]){
   accounts.get(actor.id).permissions={...Object.fromEntries(shared.accountantPermissionKeys.map(k=>[k,true])),[permission]:false};
   ok((await handleStaff(request(actor,resource,{id:randomUUID(),...data}))).status===403,actor.role+' individual action denied: '+permission);
  }
 }
 for(const resource of ['users','inventory-register','expense-sheet','attendance','employees','monthly-summary'])ok((await handleStaff(request(director,resource))).status===200,'Director can open '+resource);
 ok((await handleBookings(new Request(origin+'/api/bookings',{headers:{cookie:cookieFor(director)}}))).status===200,'Director booking read allowed');
 const expense=await handleStaff(request(director,'expense-sheet',{id:randomUUID(),entry:{name:'Local test tissue',purpose:'Test only',quantity:2,price:100,method:'Cash'}}));
 ok(expense.status===200,'Director can save an expense');
 const item=await handleStaff(request(director,'inventory-register',{id:randomUUID(),action:'add',entry:{name:'Local test chair',unit:'Pieces',quantity:0,category:'Hall items',notes:''}}));
 ok(item.status===200,'Director can add inventory');
 const employeeId=randomUUID();
 const employee={name:'Local test employee',phone:'',sector:'Office',title:'Assistant',hall:null,employment:'Permanent',joined:shared.pkToday(),status:'Active',exited:null,exitReason:'',salary:10000,salaryEffective:shared.pkToday(),notes:''};
 ok((await handleStaff(request(director,'employees',{id:employeeId,entry:employee}))).status===200,'Director can save employees');
 ok((await handleStaff(request(director,'attendance',{id:randomUUID(),entry:{employeeId,date:shared.pkToday(),status:'Present',note:'',bookingId:null}}))).status===200,'Director can save attendance');
 console.log(count+' permission checks passed; production database was not contacted.');
 if(process.argv.includes('--ui')){
  for(const actor of [gm,accountant])accounts.get(actor.id).permissions={};
  uiHandler=async(req,res,next)=>{
   if(!req.url?.startsWith('/api/'))return next();
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const incoming=new Request(origin+req.url,{method:req.method,headers:{...req.headers,origin,cookie:req.headers.cookie||cookieFor(director)},body:req.method==='POST'?Buffer.concat(chunks):undefined});
   const response=req.url.startsWith('/api/staff')?await handleStaff(incoming):req.url.startsWith('/api/bookings')?await handleBookings(incoming):await handleCms(incoming);
   res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await response.arrayBuffer()));
  };
  await vite.listen();console.log('Local fixture UI: '+origin+'/management');
 }else{await vite.close();await pool.end();}
}catch(e){await vite.close();await pool.end();throw e;}
