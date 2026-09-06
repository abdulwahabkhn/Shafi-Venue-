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
for(const [file,key] of [['staff-auth','staffSchema'],['expenses','expenseSchema'],['employees','employeeSchema'],['attachments','attachmentSchema'],['inventory','inventorySchema']]){const module=await loader.ssrLoadModule('/server/'+file+'.ts');await store.bookingPool().query(module[key]);}
const auth=await loader.ssrLoadModule('/server/staff-auth.ts');await auth.saveUser(auth.owner,randomUUID(),{name:'QA Director',username:'qa-director',role:'Director',password:'ui-test-only-password'});
const server=await createServer({server:{host:'127.0.0.1',port:5175,strictPort:true}});await server.listen();console.log('Isolated UI test ready at http://127.0.0.1:5175/management. Press Enter to stop and remove its test schema.');
process.stdin.resume();process.stdin.once('data',async()=>{await server.close();await store.bookingPool().end();await loader.close();await root.query(`DROP SCHEMA ${schema} CASCADE`);await root.end();console.log('Isolated UI schema removed.');process.exit(0);});
