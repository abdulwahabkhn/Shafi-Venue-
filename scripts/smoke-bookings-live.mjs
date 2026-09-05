import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const origin='https://shafi-venue.vercel.app';
const id='ecc99331-9477-4e31-9063-150916104679';
const marker='Disposable live API verification 20260905';
const env=parseEnv(readFileSync('.cms-local/booking-production.env','utf8'));
const connection=new URL(env.DATABASE_URL_UNPOOLED||env.DATABASE_URL);connection.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:connection.toString(),max:1});
async function cleanup(){
 const c=await pool.connect();try{await c.query('BEGIN');const existing=(await c.query('SELECT body FROM shafi_bookings WHERE id=$1 FOR UPDATE',[id])).rows[0]?.body;
 if(existing){assert.equal(existing.notes,marker,'Refusing to remove a non-test record');await c.query('DELETE FROM shafi_booking_audit WHERE booking=$1',[id]);await c.query('DELETE FROM shafi_booking_payments WHERE booking=$1',[id]);await c.query('DELETE FROM shafi_bookings WHERE id=$1',[id]);}
 await c.query('COMMIT');console.log('Removed only the identified synthetic booking and its test payment/history.');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
try{
 if(process.argv.includes('--cleanup'))await cleanup();
 else{
  assert.equal((await pool.query('SELECT id FROM shafi_bookings WHERE id=$1',[id])).rowCount,0,'Test ID already exists; inspect before rerunning');
  const credentials=parseEnv(readFileSync('.cms-local/production-credentials.txt','utf8'));
  const login=await fetch(origin+'/api/cms?action=login',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify({password:credentials.CMS_ADMIN_PASSWORD})});assert.equal(login.status,200,'Live admin login');
  const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
  async function api(data){const response=await fetch(origin+'/api/bookings',{method:data?'POST':'GET',headers:{cookie,origin,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const result=await response.json();assert.equal(response.status,200,result.error||'Live API request');return result;}
  const booking={customer:'SYSTEM TEST — disposable',phone:'00000000000',date:'2027-12-30',start:'18:00',end:'22:00',hall:'Hall 1',event:'Other',guests:10,total:10000,manager:'',notes:marker,status:'Enquiry'};
  const b=await api({action:'save',id,booking});assert.equal(b.id,id);
  assert.ok((await api()).some(row=>row.id===id),'Booking survives another HTTP request');
  const payment={key:'531f4c13-cd12-46f5-abf5-fc27a8ab6911',amount:1000,method:'Cash',reference:'Synthetic test',kind:'Receipt',reason:'Test only'};
  assert.equal((await api({action:'payment',id,payment})).paid,1000);
  assert.equal((await api({action:'payment',id,payment})).paid,1000);
  console.log('PASS live login, booking creation, persistent reread, receipt and duplicate retry.');
  if(!process.argv.includes('--keep'))await cleanup();
 }
}finally{await pool.end();}
