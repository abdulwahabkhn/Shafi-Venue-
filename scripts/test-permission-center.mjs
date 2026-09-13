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
 if(sql.includes("SUM(CASE WHEN body->>'date'<$1")){
  const groups=new Map();for(const r of table('shafi_expenses').values()){
   if(r.voidedAt||r.date>values[0]||r.fundScope!=='expense-sheet'||!['Cash issue','Expense','Cash return'].includes(r.kind))continue;
   const key=r.kind+'|'+r.method,group=groups.get(key)||{kind:r.kind,method:r.method,amount:0,prior:0};group.amount+=r.amount;if(r.date<values[0])group.prior+=r.amount;groups.set(key,group);
  }return result([...groups.values()]);
 }
 if(sql.includes("SELECT DISTINCT body->>'name'"))return result([...table('shafi_expenses').values()].filter(r=>r.kind==='Expense'&&r.name).map(r=>({name:r.name})));
 if(sql.includes("FROM shafi_expenses WHERE body->>'kind'=")&&sql.includes("body->>'date'=$1")){
  const kind=sql.includes("='Cash issue'")?'Cash issue':'Expense';return result([...table('shafi_expenses').values()].filter(r=>r.kind===kind&&r.date===values[0]).map(body=>({body})));
 }
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
  for(const resource of ['funding','users','expense-sheet','inventory-register','attendance','employees','report','monthly-summary','inventory','rentals','cash-reconciliation','files','download']){
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
   ['expenseIssue','funding',{entry:{}}],
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
 // Funding uses a shared running ledger; all test records stay in memory.
 const expenseTable=table('shafi_expenses'),savedExpenses=new Map(expenseTable);expenseTable.clear();
 const today=shared.pkToday(),priorDate=new Date(today+'T00:00:00Z');priorDate.setUTCDate(priorDate.getUTCDate()-1);const yesterday=priorDate.toISOString().slice(0,10);
 const seed=(kind,amount,date,method='Cash',extra={})=>{const id=randomUUID();expenseTable.set(id,{id,kind,amount,date,method,actor:'Fixture',...extra});return id;};
 seed('Expense',1200,yesterday,'Cash',{fundScope:'expense-sheet'});seed('Expense',300,today,'Bank transfer',{fundScope:'expense-sheet'});
 seed('Cash issue',999999,'2099-01-01','Cash',{fundScope:'expense-sheet'});seed('Expense',99999,today,'Cash',{voidedAt:today,fundScope:'expense-sheet'});seed('Salary',88888,today);
 const funds=async actor=>{const response=await handleStaff(request(actor,'funding'));assert.equal(response.status,200);return response.json();};
 let balance=await funds(director);
 ok(balance.remaining===0&&balance.opening===0,'Unfunded spend stays at zero and future/voided entries are excluded');
 const cashIssueId=randomUUID(),cashIssue={amount:1000,method:'Cash',purpose:'Daily expenses',reference:''};
 const issueResponse=await handleStaff(request(director,'funding',{id:cashIssueId,entry:cashIssue}));ok(issueResponse.status===200,'Director can record petty cash issued');
 const issueCount=expenseTable.size;
 ok((await handleStaff(request(director,'funding',{id:cashIssueId,entry:cashIssue}))).status===200&&expenseTable.size===issueCount,'Retrying the same issue does not duplicate money');
 ok((await handleStaff(request(director,'funding',{id:cashIssueId,entry:{...cashIssue,amount:2000}}))).status!==200,'Changed retry cannot replace an issued amount');
 balance=await funds(director);ok(balance.remaining===-500,'Top-up partially clears negative balance');
 const bankId=randomUUID();ok((await handleStaff(request(director,'funding',{id:bankId,entry:{amount:2000,method:'Bank transfer',purpose:'Petty expense funds',reference:'TEST-ONLY'}}))).status===200,'Bank funds can be issued separately');
 balance=await funds(director);ok(balance.remaining===1500&&balance.issuedCash===1000&&balance.issuedBank===2000,'New bank funds first clear the deficit, then leave spendable funds');
 const returnId=seed('Cash return',100,today,'Cash',{fundScope:'expense-sheet'});balance=await funds(director);ok(balance.remaining===1400,'Recorded returns reduce the shared fund');expenseTable.delete(returnId);
 expenseTable.set(randomUUID(),{id:randomUUID(),kind:'Expense',amount:321510,date:yesterday,method:'Cash',actor:'Legacy'});
 ok((await funds(director)).remaining===1500,'Legacy expenses without a shared-fund tag do not create a false shortfall');
 const sheetResponse=await handleStaff(request(director,'expense-sheet&date='+today));const sheet=await sheetResponse.json();
 ok(sheet.total===300&&sheet.funding.remaining===1500&&sheet.issues.length===2,'Daily expense sheet separates daily expense/issuance from all-time balance');
 const historical=await handleStaff(request(director,'expense-sheet&date='+yesterday));const historic=await historical.json();ok(historic.total===322710&&historic.funding.remaining===0&&historic.funding.issued===0,'Historical sheet excludes later top-ups and keeps unfunded legacy spend at zero');
 ok((await handleStaff(request(director,'funding',{id:randomUUID(),entry:{...cashIssue,amount:0}}))).status!==200,'Zero funds are rejected');
 ok((await handleStaff(request(director,'funding',{id:randomUUID(),entry:{...cashIssue,method:'Bank transfer'}}))).status!==200,'Bank reference is validated');
 accounts.get(accountant.id).permissions={expenseView:true,expenseAdd:true};
 ok((await handleStaff(request(accountant,'funding',{id:randomUUID(),entry:cashIssue}))).status===403,'Expense entry access cannot issue funds');
 ok((await funds(accountant)).remaining===1500,'Accountant reads the same shared balance as Director');
 accounts.get(gm.id).permissions={expenseView:true,expenseIssue:true};
 ok((await handleStaff(request(gm,'funding',{id:randomUUID(),entry:{...cashIssue,amount:10}}))).status===200,'GM can issue funds with enabled permission');
 ok((await handleStaff(request(gm,'funding',{id:bankId,action:'remove',reason:'Incorrect transfer'}))).status===200,'Authorized removal corrects funds without deleting history');
 balance=await funds(director);ok(balance.remaining===-490&&expenseTable.get(bankId).voidedAt,'Removing an issue can expose a deficit and preserves the original record');
 const expId=[...expenseTable.values()].find(r=>r.kind==='Expense'&&r.date===today&&!r.voidedAt).id;
 ok((await handleStaff(request(director,'expense-sheet',{id:expId,action:'remove',reason:'Duplicate expense'}))).status===200,'Expense removal succeeds');
 ok((await funds(director)).remaining===-190,'Removing an expense restores its funds');
 expenseTable.clear();for(const [id,row]of savedExpenses)expenseTable.set(id,row);
 console.log(count+' permission and funding checks passed; production database was not contacted.');
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
