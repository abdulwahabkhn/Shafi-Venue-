import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createServer} from 'vite';
Object.assign(process.env,parseEnv(readFileSync('.cms-local/booking-production.env','utf8')));
process.env.DATABASE_URL=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.DATABASE_URL;
const server=await createServer({configFile:false,server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]}});
try{const storage=await server.ssrLoadModule('/server/postgres-bookings.ts');await storage.migrateBookings();const expenses=await server.ssrLoadModule('/server/expenses.ts');await storage.bookingPool().query(expenses.expenseSchema);console.log('Private booking and expense tables ready.');await storage.bookingPool().end();}finally{await server.close();}
