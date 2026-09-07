// Isolated browser QA only. Never seeds the production schema.
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createServer} from 'vite';
Object.assign(process.env,parseEnv(readFileSync('.cms-local/booking-production.env','utf8')));
const root=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});const schema='ui_test_'+randomUUID().replaceAll('-','');await root.query(`CREATE SCHEMA ${schema}`);
const url=new URL(process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.DATABASE_URL);url.hostname=url.hostname.replace('-pooler.','.');url.searchParams.set('options',`-c search_path=${schema}`);process.env.DATABASE_URL=url.toString();
process.env.CMS_ADMIN_PASSWORD='ui-test-only-password';process.env.CMS_SESSION_SECRET=randomUUID()+randomUUID();delete process.env.BLOB_READ_WRITE_TOKEN;
const loader=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]}});const store=await loader.ssrLoadModule('/server/postgres-bookings.ts');await store.migrateBookings();
for(const [file,key] of [['staff-auth','staffSchema'],['expenses','expenseSchema'],['employees','employeeSchema'],['attachments','attachmentSchema'],['inventory','inventorySchema'],['rentals','rentalSchema'],['cash-reconciliation','cashReconciliationSchema']]){const module=await loader.ssrLoadModule('/server/'+file+'.ts');await store.bookingPool().query(module[key]);}
const auth=await loader.ssrLoadModule('/server/staff-auth.ts');const bootstrapGM={id:randomUUID(),name:'QA GM',role:'GM',hall:null};
for(const role of ['GM','Director','Accountant'])await auth.saveUser(bootstrapGM,role==='GM'?bootstrapGM.id:randomUUID(),{name:'QA '+role,username:'qa-'+role.toLowerCase(),role,password:'ui-test-only-password'});
if(process.argv.includes('--fixtures')){
 const inventory=await loader.ssrLoadModule('/server/inventory.ts'),expenses=await loader.ssrLoadModule('/server/expenses.ts'),{pkToday}=await loader.ssrLoadModule('/shared/staff.ts');const day=pkToday(),source=randomUUID();
 await inventory.saveStockItem(auth.owner,source,{sku:'QA-PLATE-STORE',name:'QA white plate',category:'Crockery',location:'Store',unit:'pieces',minimum:0});
 await inventory.saveStockItem(auth.owner,randomUUID(),{sku:'QA-PLATE-H1',name:'QA white plate',category:'Crockery',location:'Hall 1',unit:'pieces',minimum:0});
 await inventory.moveStock(auth.owner,randomUUID(),{itemId:source,kind:'Opening',quantity:100,date:day,note:'Disposable QA stock'});
 await expenses.saveExpense(randomUUID(),{kind:'Cash issue',date:day,amount:10000,person:'QA cash holder',issuer:'QA Director',description:'Disposable QA cash handover'},auth.owner);
 console.log('Disposable stock and cash fixtures created only in the UI test schema.');
}
const server=await createServer({server:{host:'127.0.0.1',port:5175,strictPort:true}});await server.listen();console.log('Isolated UI test ready at http://127.0.0.1:5175/management. Press Enter to stop and remove its test schema.');
process.stdin.resume();process.stdin.once('data',async()=>{await server.close();await store.bookingPool().end();await loader.close();await root.query(`DROP SCHEMA ${schema} CASCADE`);await root.end();console.log('Isolated UI schema removed.');process.exit(0);});
