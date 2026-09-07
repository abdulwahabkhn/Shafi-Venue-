import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { bookingPool } from './postgres-bookings.js';
import { requireRole } from './staff-auth.js';
import { dateInput,pkToday,type Actor } from '../shared/staff.js';
import type { LedgerEntry } from '../shared/expenses.js';
import { cashCountInput,type CashCount,type CashHolder,type CashReconciliationData } from '../shared/cash-reconciliation.js';

export const cashReconciliationSchema=`CREATE TABLE IF NOT EXISTS shafi_cash_counts(id uuid PRIMARY KEY,date date NOT NULL,holder text NOT NULL,body jsonb NOT NULL); CREATE INDEX IF NOT EXISTS shafi_cash_count_date ON shafi_cash_counts(date);`;
async function holders(c:PoolClient,date:string):Promise<CashHolder[]>{
 const entries=(await c.query("SELECT body FROM shafi_expenses WHERE body->>'date'<=$1 ORDER BY id",[date])).rows.map(r=>r.body as LedgerEntry);
 const groups=new Map<string,LedgerEntry[]>();
 for(const entry of entries.filter(e=>e.kind==='Cash issue'&&!e.voidedAt)){
  const key=entry.recipientId?`account:${entry.recipientId}`:`name:${entry.person}`;
  groups.set(key,[...(groups.get(key)||[]),entry]);
 }
 return [...groups].map(([key,issues])=>{
  const ids=new Set(issues.map(i=>i.id)),settlements=entries.filter(e=>e.issueId&&ids.has(e.issueId)&&!e.voidedAt);
  const issued=issues.reduce((s,e)=>s+e.amount,0),spent=settlements.filter(e=>e.kind==='Expense').reduce((s,e)=>s+e.amount,0),returned=settlements.filter(e=>e.kind==='Cash return').reduce((s,e)=>s+e.amount,0);
  const fingerprint=createHash('sha256').update(JSON.stringify([...issues,...settlements].sort((a,b)=>a.id.localeCompare(b.id)).map(e=>[e.id,e.amount,e.date,e.kind,e.issueId,e.recipientId]))).digest('hex');
  return {key,name:issues[0].person,issued,spent,returned,expected:issued-spent-returned,unacknowledged:issues.filter(e=>e.recipientId&&!e.acknowledgedAt).length,fingerprint};
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
export async function cashReconciliation(actor:Actor,raw:string|null):Promise<CashReconciliationData>{
 requireRole(actor,['Director','GM','Accountant']);const date=dateInput.parse(raw||pkToday());if(date>pkToday())throw Error('Choose today or an earlier reconciliation date.');
 const c=await bookingPool().connect();try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const current=await holders(c,date);
  const counts=(await c.query('SELECT body FROM shafi_cash_counts WHERE date=$1 ORDER BY body->>\'created\' DESC,id',[date])).rows.map(r=>r.body as CashCount);
  await c.query('COMMIT');return {date,holders:current,counts:counts.map(count=>({...count,changed:current.find(h=>h.key===count.holderKey)?.fingerprint!==count.fingerprint}))};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function recordCashCount(actor:Actor,id:string,raw:unknown){
 requireRole(actor,['Director','GM','Accountant']);const input=cashCountInput.parse(raw);
 const c=await bookingPool().connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='8s'");await c.query('SELECT pg_advisory_xact_lock(7352420)');
  const previous=(await c.query('SELECT body FROM shafi_cash_counts WHERE id=$1',[id])).rows[0]?.body;
  if(previous){if(Object.entries(input).some(([k,v])=>previous[k]!==v))throw Error('This retry differs from the saved count. Reload reconciliation.');await c.query('COMMIT');return previous as CashCount;}
  if(input.date>pkToday())throw Error('Choose today or an earlier reconciliation date.');
  const holder=(await holders(c,input.date)).find(h=>h.key===input.holderKey);
  if(!holder||holder.fingerprint!==input.fingerprint)throw Error('The cash ledger changed. Refresh and check the expected balance before recording this count.');
  const count:CashCount={...input,id,name:holder.name,expected:holder.expected,variance:input.counted-holder.expected,actor:`${actor.name} (${actor.role})`,created:new Date().toISOString()};
  await c.query('INSERT INTO shafi_cash_counts(id,date,holder,body) VALUES($1,$2,$3,$4)',[id,input.date,input.holderKey,JSON.stringify(count)]);await c.query('COMMIT');return count;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
