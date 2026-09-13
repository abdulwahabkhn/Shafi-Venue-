import { z } from 'zod';
import type { PoolClient } from 'pg';
import { bookingPool } from './postgres-bookings.js';
import { requirePermission } from './staff-auth.js';
import { pkToday, dateInput, type Actor } from '../shared/staff.js';
import { fundingInput, summarizeFunding, type FundingEntry } from '../shared/funding.js';

export async function fundingSummary(actor:Actor, raw:string|null, client:Pick<PoolClient,'query'>=bookingPool()) {
  requirePermission(actor,'expenseView');
  const date=dateInput.parse(raw||pkToday());
  const {rows}=await client.query(`SELECT body->>'kind' AS kind, body->>'method' AS method,
    SUM((body->>'amount')::numeric) AS amount,
    SUM(CASE WHEN body->>'date'<$1 THEN (body->>'amount')::numeric ELSE 0 END) AS prior
    FROM shafi_expenses WHERE body->>'date'<=$1 AND body->>'voidedAt' IS NULL
    AND body->>'kind' IN ('Cash issue','Expense','Cash return') GROUP BY 1,2`,[date]);
  return summarizeFunding(date,rows);
}
export async function fundingEntries(date:string, client:Pick<PoolClient,'query'>):Promise<FundingEntry[]> {
  const {rows}=await client.query("SELECT body FROM shafi_expenses WHERE body->>'kind'='Cash issue' AND body->>'date'=$1 ORDER BY created,id",[date]);
  return rows.map(({body:r})=>({id:r.id,date:r.date,amount:r.amount,method:r.method,purpose:r.purpose||r.description,reference:r.reference||'',actor:r.actor,removed:!!r.voidedAt,canRemove:r.fundScope==='expense-sheet'}));
}
export async function recordFunding(actor:Actor,id:string,raw:unknown,action?:string) {
  requirePermission(actor,'expenseView');requirePermission(actor,'expenseIssue');
  if(action!==undefined&&action!=='remove')throw Error('Unknown funds action.');
  const input=action==='remove'?null:fundingInput.parse(raw);
  const reason=action==='remove'?z.string().trim().min(3).max(1000).parse(raw):null;
  const c=await bookingPool().connect();
  try {
    await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='8s'");
    await c.query('SELECT pg_advisory_xact_lock(7352420)');
    const old=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[id])).rows[0]?.body;
    if(action==='remove') {
      if(!old||old.kind!=='Cash issue'||old.fundScope!=='expense-sheet')throw Error('Choose a funds issue from this expense sheet.');
      if(!old.voidedAt){old.voidedAt=new Date().toISOString();old.voidReason=reason;old.voidedBy=actor.name;await c.query('UPDATE shafi_expenses SET body=$2 WHERE id=$1',[id,JSON.stringify(old)]);}
      else if(old.voidReason!==reason)throw Error('This issue was already removed with a different reason.');
      await c.query('COMMIT');return old;
    }
    if(old){
      if(old.fundScope!=='expense-sheet'||old.ownerId!==actor.id||Object.entries(input!).some(([key,value])=>old[key]!==value))throw Error('This retry differs from the saved funds issue. Refresh the sheet.');
      await c.query('COMMIT');return old;
    }
    const row={...input,id,kind:'Cash issue',date:pkToday(),fundScope:'expense-sheet',person:'Shared expense fund',issuer:actor.name,actor:actor.name,ownerId:actor.id,description:input!.purpose,created:new Date().toISOString(),voidedAt:null,voidReason:null,bookingId:null,issueId:null,recipientId:null};
    await c.query('INSERT INTO shafi_expenses(id,body) VALUES($1,$2)',[id,JSON.stringify(row)]);
    await c.query('COMMIT');return row;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
