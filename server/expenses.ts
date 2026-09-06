import { z } from 'zod';
import { bookingPool } from './postgres-bookings.js';
import { ledgerInput, type LedgerEntry } from '../shared/expenses.js';
import type { Actor } from '../shared/staff.js';
import { owner, requireRole, AccessError, hallAccess } from './staff-auth.js';

export const expenseSchema = `
CREATE TABLE IF NOT EXISTS shafi_expenses (
 id uuid PRIMARY KEY, body jsonb NOT NULL, booking uuid REFERENCES shafi_bookings(id),
 issue uuid REFERENCES shafi_expenses(id), created timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shafi_expense_issue ON shafi_expenses(issue);
CREATE INDEX IF NOT EXISTS shafi_expense_booking ON shafi_expenses(booking);
CREATE INDEX IF NOT EXISTS shafi_expense_date ON shafi_expenses((body->>'date'));
`;
export async function listExpenses(actor:Actor=owner):Promise<LedgerEntry[]> {
 return (await bookingPool().query("SELECT body FROM shafi_expenses WHERE ($1::text IS NULL OR body->>'ownerId'=$1 OR body->>'recipientId'=$1) ORDER BY created DESC,id",[actor.role==='Hall manager'?actor.id:null])).rows.map(r=>({...r.body,recipientId:r.body.recipientId||null,reviewStatus:r.body.reviewStatus||'Submitted',reviews:r.body.reviews||[]}));
}
export async function saveExpense(id:string,raw:unknown,actor:Actor=owner) {
 const input=ledgerInput.parse(raw);
 if(input.kind==='Cash issue')requireRole(actor,['Director','GM']);
 const c=await bookingPool().connect();
 try {
  await c.query('BEGIN');
  await c.query("SET LOCAL lock_timeout='8s'");
  await c.query('SELECT pg_advisory_xact_lock(7352420)');
  const existing=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[id])).rows[0]?.body;
  if(existing){
   if(actor.role==='Hall manager'&&existing.ownerId!==actor.id&&existing.recipientId!==actor.id)throw new AccessError('Entry unavailable.');
   if(Object.entries(input).some(([k,v])=>existing[k]!==v))throw new Error('This retry differs from the saved entry. Reload the ledger.');
   await c.query('COMMIT');return existing as LedgerEntry;
  }
  if(input.bookingId){const b=(await c.query('SELECT body FROM shafi_bookings WHERE id=$1',[input.bookingId])).rows[0]?.body;if(!b||!hallAccess(actor,b.hall))throw new AccessError('Booking unavailable for your hall.');}
  if(input.recipientId){const recipient=(await c.query('SELECT name FROM shafi_users WHERE id=$1 AND active=true',[input.recipientId])).rows[0];if(!recipient)throw new Error('Recipient account not found.');if(input.kind==='Cash issue'&&recipient.name!==input.person)throw new Error('Cash recipient name must match the selected account.');}
  if(input.issueId){
   const issue=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[input.issueId])).rows[0]?.body as LedgerEntry|undefined;
   if(!issue || issue.kind!=='Cash issue'||issue.voidedAt)throw new Error('Choose an active cash issue.');
   if(actor.role==='Hall manager'&&issue.recipientId!==actor.id)throw new AccessError('You can only settle cash issued to your account.');
   if(input.recipientId!==issue.recipientId&&!(input.recipientId===null&&!issue.recipientId))throw new Error('Recipient account must match the cash issue.');
   if(input.date<issue.date)throw new Error('Spending or return date cannot precede the cash issue.');
   if(input.person!==issue.person)throw new Error('The cash holder must match the original issue.');
   const settled=(await c.query("SELECT COALESCE(SUM((body->>'amount')::bigint),0) AS amount FROM shafi_expenses WHERE issue=$1 AND body->>'voidedAt' IS NULL",[input.issueId])).rows[0];
   if(input.amount>issue.amount-Number(settled.amount))throw new Error('Amount exceeds the unspent cash on this issue.');
  }
  if(actor.role==='Hall manager'&&!input.issueId&&input.recipientId&&input.recipientId!==actor.id)throw new AccessError('You cannot record cash for another account.');
  const entry:LedgerEntry={...input,id,created:new Date().toISOString(),actor:actor.name,ownerId:actor.id,reviewStatus:'Submitted',reviews:[],voidReason:null,voidedAt:null};
  await c.query('INSERT INTO shafi_expenses(id,body,booking,issue) VALUES($1,$2,$3,$4)',[id,JSON.stringify(entry),input.bookingId,input.issueId]);
  await c.query('COMMIT');return entry;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function voidExpense(id:string,raw:unknown,actor:Actor=owner){
 requireRole(actor,['Director']);
 const reason=z.string().trim().min(3).max(1000).parse(raw);
 const c=await bookingPool().connect();
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(7352420)');
  const entry=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[id])).rows[0]?.body as LedgerEntry|undefined;
  if(!entry)throw new Error('Entry not found.');
  if(entry.voidedAt){if(entry.voidReason!==reason)throw new Error('Entry was already voided with a different reason.');await c.query('COMMIT');return entry;}
  if((await c.query("SELECT id FROM shafi_expenses WHERE issue=$1 AND body->>'voidedAt' IS NULL LIMIT 1",[id])).rowCount)throw new Error('Void linked spending and cash returns before voiding this issue.');
  entry.voidedAt=new Date().toISOString();entry.voidReason=reason;
  entry.reviews=[...(entry.reviews||[]),{status:'Voided',note:reason,actor:actor.name,date:entry.voidedAt}];
  await c.query('UPDATE shafi_expenses SET body=$2 WHERE id=$1',[id,JSON.stringify(entry)]);
  await c.query('COMMIT');return entry;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function reviewExpense(actor:Actor,id:string,raw:unknown){
 const input=z.object({status:z.enum(['Verified','Approved','Rejected']),note:z.string().trim().min(3).max(1000)}).parse(raw);
 requireRole(actor,input.status==='Approved'?['Director','GM']:['Director','GM','Accountant']);
 const c=await bookingPool().connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(7352420)');const entry=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[id])).rows[0]?.body as LedgerEntry|undefined;
 if(!entry||entry.voidedAt)throw new Error('Choose an active ledger entry.');
 if(entry.reviewStatus==='Approved'||entry.reviewStatus==='Rejected')throw new Error('This review is already closed. Corrections require a Director to void the entry.');
 if(input.status==='Approved'&&entry.reviewStatus!=='Verified')throw new Error('Verify this entry before approval.');
 if(actor.role!=='Director'&&entry.ownerId===actor.id)throw new AccessError('Another authorised person must review your own entry.');
 entry.reviewStatus=input.status;entry.reviews=[...(entry.reviews||[]),{...input,actor:actor.name,date:new Date().toISOString()}];await c.query('UPDATE shafi_expenses SET body=$2 WHERE id=$1',[id,JSON.stringify(entry)]);await c.query('COMMIT');return entry;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
