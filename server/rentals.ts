import { bookingPool } from './postgres-bookings.js';
import { AccessError, hallAccess, requireRole } from './staff-auth.js';
import { pkToday, type Actor } from '../shared/staff.js';
import { rentalInput,rentalEventInput,rentalBalance,rentalSourceRemaining,type Rental,type RentalEvent,type RentalData } from '../shared/rentals.js';
import type { PoolClient } from 'pg';

export const rentalSchema=`
CREATE TABLE IF NOT EXISTS shafi_rentals(id uuid PRIMARY KEY,booking uuid REFERENCES shafi_bookings(id),hall text NOT NULL,body jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS shafi_rental_events(id uuid PRIMARY KEY,rental uuid NOT NULL REFERENCES shafi_rentals(id),source uuid REFERENCES shafi_rental_events(id),body jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS shafi_rental_hall ON shafi_rentals(hall);
CREATE INDEX IF NOT EXISTS shafi_rental_booking ON shafi_rentals(booking);
CREATE INDEX IF NOT EXISTS shafi_rental_event_parent ON shafi_rental_events(rental);
`;
async function write<T>(run:(c:PoolClient)=>Promise<T>){
 const c=await bookingPool().connect();
 try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='8s'");await c.query('SELECT pg_advisory_xact_lock(7352419)');await c.query('SELECT pg_advisory_xact_lock(7352424)');const result=await run(c);await c.query('COMMIT');return result;}
 catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function rentalData(actor:Actor):Promise<RentalData>{
 const c=await bookingPool().connect();
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const rentals=(await c.query('SELECT body FROM shafi_rentals WHERE ($1::text IS NULL OR hall=$1) ORDER BY body->>\'received\' DESC,id',[actor.role==='Hall manager'?actor.hall:null])).rows.map(r=>r.body as Rental);
  const events=(await c.query('SELECT body FROM shafi_rental_events WHERE rental=ANY($1::uuid[]) ORDER BY body->>\'created\' DESC,id',[rentals.map(r=>r.id)])).rows.map(r=>r.body as RentalEvent);
  await c.query('COMMIT');return {rentals,events};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function receiveRental(actor:Actor,id:string,raw:unknown){
 requireRole(actor,['Director','GM','Hall manager']);const input=rentalInput.parse(raw);
 if(!hallAccess(actor,input.hall))throw new AccessError('Choose your assigned hall.');
 return write(async c=>{
  const previous=(await c.query('SELECT body FROM shafi_rentals WHERE id=$1',[id])).rows[0]?.body;
  if(previous){if(!hallAccess(actor,previous.hall))throw new AccessError('Rental unavailable for your hall.');if(Object.entries(input).some(([k,v])=>previous[k]!==v))throw Error('Retry differs from saved rental. Reload the register.');return previous as Rental;}
  if(input.received>pkToday())throw Error('Record items that have already arrived. Receipt date cannot be in the future.');
  let bookingReference='';
  if(input.bookingId){const booking=(await c.query('SELECT body FROM shafi_bookings WHERE id=$1',[input.bookingId])).rows[0]?.body;if(!booking||booking.hall!==input.hall)throw Error('Choose a booking in the receiving hall.');if(booking.status==='Cancelled')throw Error('Choose a booking that has not been cancelled.');bookingReference=booking.reference;}
  const rental:Rental={...input,id,bookingReference,created:new Date().toISOString(),actor:`${actor.name} (${actor.role})`};
  await c.query('INSERT INTO shafi_rentals(id,booking,hall,body) VALUES($1,$2,$3,$4)',[id,input.bookingId,input.hall,JSON.stringify(rental)]);return rental;
 });
}
export async function recordRentalEvent(actor:Actor,id:string,raw:unknown){
 requireRole(actor,['Director','GM','Hall manager']);const input=rentalEventInput.parse(raw);
 if(['Supplier settlement','Repair','Recover'].includes(input.kind))requireRole(actor,['Director','GM']);
 return write(async c=>{
  const rental=(await c.query('SELECT body FROM shafi_rentals WHERE id=$1',[input.rentalId])).rows[0]?.body as Rental|undefined;
  if(!rental||!hallAccess(actor,rental.hall))throw new AccessError('Rental unavailable for your hall.');
  const previous=(await c.query('SELECT body FROM shafi_rental_events WHERE id=$1',[id])).rows[0]?.body;
  if(previous){if(Object.entries(input).some(([k,v])=>previous[k]!==v))throw Error('Retry differs from saved rental movement. Reload the register.');return previous as RentalEvent;}
  if(input.date<rental.received||input.date>pkToday())throw Error('Movement date must be between receipt and today.');
  const events=(await c.query('SELECT body FROM shafi_rental_events WHERE rental=$1',[rental.id])).rows.map(r=>r.body as RentalEvent);
  const source=events.find(e=>e.id===input.sourceId);
  if(['Repair','Recover','Supplier settlement'].includes(input.kind)&&!source)throw Error('Choose the original damage or loss incident.');
  if(input.sourceId){
   const allowed=input.kind==='Return'||input.kind==='Repair'?['Damage']:input.kind==='Recover'?['Loss']:input.kind==='Supplier settlement'?['Damage','Loss']:[];
   if(!source||!allowed.includes(source.kind))throw Error('Choose the correct damage or loss incident.');
   if(input.date<source.date)throw Error('Movement date cannot precede its source incident.');
   if(input.quantity>rentalSourceRemaining(source,events))throw Error('Quantity exceeds the unresolved amount on this incident.');
  }else if(input.quantity>rentalBalance(rental,events).usable)throw Error('Quantity exceeds the usable rental items still held.');
  if(['Return','Supplier settlement'].includes(input.kind)&&!input.reference)throw Error('Enter the supplier receipt, gate pass or settlement reference.');
  const event:RentalEvent={...input,id,created:new Date().toISOString(),actor:`${actor.name} (${actor.role})`};
  await c.query('INSERT INTO shafi_rental_events(id,rental,source,body) VALUES($1,$2,$3,$4)',[id,input.rentalId,input.sourceId,JSON.stringify(event)]);return event;
 });
}
