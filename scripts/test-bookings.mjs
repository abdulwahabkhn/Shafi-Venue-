import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({configFile:false,server:{middlewareMode:true}});
const {bookingStore} = await vite.ssrLoadModule('/server/bookings.ts');
const store = bookingStore(':memory:');
const input={customer:'Test customer',phone:'03001234567',hall:'Hall 1',event:'Walima',date:'2026-10-20',start:'18:00',end:'22:00',guests:100,total:10000,manager:'',notes:'',status:'Confirmed'};
try {
 const b=store.save(input);
 assert.equal(store.list().length,1);
 assert.throws(()=>store.save(input),/already has/);
 store.save({...input,hall:'Hall 2'});
 assert.throws(()=>store.save({...input,date:'2026-02-30'}));
 assert.throws(()=>store.save(input,b.id,0),/changed/);
 const payment={amount:2000,method:'Cash',reference:'test',key:crypto.randomUUID()};
 assert.equal(store.payment(b.id,payment).paid,2000);
 assert.equal(store.payment(b.id,payment).paid,2000);
 assert.equal(store.history(b.id).payments.length,1);
 assert.throws(()=>store.payment(b.id,{...payment,key:crypto.randomUUID(),amount:9000}),/exceeds/);
 assert.throws(()=>store.save({...input,total:1000},b.id,2),/lower/);
 assert.equal(store.history(b.id).audit.length,2);
 console.log('Booking checks passed: creation, hall conflicts, separate halls, dates, stale edits, idempotent payments, overpayment, totals and audit.');
} finally {store.close();await vite.close();}
