import pg from 'pg';
import { randomUUID } from 'node:crypto';
import type { Booking, BookingHistory } from '../shared/bookings.js';
import { transactionInput } from '../shared/bookings.js';
import { validateBooking, validatePayment } from './booking-domain.js';

let pool:pg.Pool|undefined;
export function bookingPool(){
  if(!process.env.DATABASE_URL) throw new Error('Booking database is not configured.');
  const connection=new URL(process.env.DATABASE_URL);connection.searchParams.set('sslmode','verify-full');
  return pool ??= new pg.Pool({connectionString:connection.toString(),max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000,allowExitOnIdle:true});
}
export const schema = `
CREATE TABLE IF NOT EXISTS shafi_bookings (id uuid PRIMARY KEY, body jsonb NOT NULL, version integer NOT NULL CHECK(version>0), created timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS shafi_booking_date ON shafi_bookings ((body->>'date'));
CREATE INDEX IF NOT EXISTS shafi_booking_hall ON shafi_bookings ((body->>'hall'));
CREATE TABLE IF NOT EXISTS shafi_booking_payments (id uuid PRIMARY KEY, booking uuid NOT NULL REFERENCES shafi_bookings(id), body jsonb NOT NULL, created timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS shafi_payment_booking ON shafi_booking_payments(booking);
CREATE TABLE IF NOT EXISTS shafi_booking_audit (id uuid PRIMARY KEY, booking uuid NOT NULL REFERENCES shafi_bookings(id), action text NOT NULL, snapshot jsonb NOT NULL, actor text NOT NULL, created timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS shafi_audit_booking ON shafi_booking_audit(booking);
`;
export async function migrateBookings(){await bookingPool().query(schema);}
export async function listBookings():Promise<Booking[]> {return (await bookingPool().query('SELECT body FROM shafi_bookings ORDER BY body->>\'date\', body->>\'start\'')).rows.map(r=>r.body);}
export async function bookingHistory(id:string):Promise<BookingHistory>{
  const exists=await bookingPool().query('SELECT id FROM shafi_bookings WHERE id=$1',[id]); if(!exists.rowCount) throw new Error('Booking not found.');
  const [payments,audit]=await Promise.all([bookingPool().query('SELECT body FROM shafi_booking_payments WHERE booking=$1 ORDER BY created,id',[id]),bookingPool().query('SELECT id,action,actor,created FROM shafi_booking_audit WHERE booking=$1 ORDER BY created,id',[id])]);
  return {payments:payments.rows.map(r=>r.body),audit:audit.rows};
}
// One transaction-scoped lock serializes mutations across all serverless instances.
// Reads stay concurrent. This is intentionally simple for one venue, with short writes.
async function write<T>(fn:(c:pg.PoolClient)=>Promise<T>):Promise<T>{
 const c=await bookingPool().connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='8s'");await c.query('SELECT pg_advisory_xact_lock(7352419)');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
async function audit(c:pg.PoolClient,b:Booking,action:string){await c.query('INSERT INTO shafi_booking_audit(id,booking,action,snapshot,actor) VALUES($1,$2,$3,$4,$5)',[randomUUID(),b.id,action,JSON.stringify(b),'Shared administrator']);}
export async function saveBooking(raw:unknown,id:string,version?:number){return write(async c=>{
 const existing=(await c.query('SELECT body FROM shafi_bookings WHERE id=$1',[id])).rows[0]?.body as Booking|undefined;
 if(existing && version===undefined) {const {bookingInput}=await import('../shared/bookings.js');const normalized=bookingInput.parse(raw); if(Object.entries(normalized).every(([k,v])=>JSON.stringify(existing[k as keyof Booking])===JSON.stringify(v))) return existing;throw new Error('This create request was already used. Reload bookings.');}
 if(version!==undefined && (!existing || existing.version!==version)) throw new Error('Record changed. Reload the booking before saving.');
 const occupied=(await c.query("SELECT body FROM shafi_bookings WHERE body->>'status' IN ('Hold','Confirmed','Completed')")).rows.map(r=>r.body);
 const input=validateBooking(raw,existing,occupied);
 const b:Booking={...input,id,version:(existing?.version??0)+1,paid:existing?.paid??0,createdAt:existing?.createdAt??new Date().toISOString(),reference:existing?.reference??`SM-${new Date().getUTCFullYear()}-${id.slice(0,8).toUpperCase()}`};
 await c.query('INSERT INTO shafi_bookings(id,body,version) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET body=EXCLUDED.body,version=EXCLUDED.version',[id,JSON.stringify(b),b.version]);
 await audit(c,b,existing?`Booking updated: ${existing.status} → ${b.status}`:'Booking created');return b;
});}
export async function recordPayment(id:string,raw:unknown){return write(async c=>{
 const b=(await c.query('SELECT body FROM shafi_bookings WHERE id=$1',[id])).rows[0]?.body as Booking|undefined;
 if(!b) throw new Error('Booking not found.');
 const input=transactionInput.parse(raw);
 const duplicate=(await c.query('SELECT body FROM shafi_booking_payments WHERE id=$1',[input.key])).rows[0]?.body;
 if(duplicate){if(duplicate.booking!==id || Object.entries(input).some(([k,v])=>duplicate[k]!==v))throw new Error('Payment retry does not match the original record.');return b;}
 const p=validatePayment(input,b);
 const payment={...p,id:p.key,booking:id,created:new Date().toISOString()};
 b.paid+=p.kind==='Refund'?-p.amount:p.amount;b.version++;
 await c.query('INSERT INTO shafi_booking_payments(id,booking,body) VALUES($1,$2,$3)',[p.key,id,JSON.stringify(payment)]);
 await c.query('UPDATE shafi_bookings SET body=$2,version=$3 WHERE id=$1',[id,JSON.stringify(b),b.version]);
 await audit(c,b,`${p.kind}: PKR ${p.amount} (${p.method})${p.reason?` — ${p.reason}`:''}`);return b;
});}
