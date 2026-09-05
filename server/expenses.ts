import { z } from 'zod';
import { bookingPool } from './postgres-bookings.js';
import { ledgerInput, type LedgerEntry } from '../shared/expenses.js';

export const expenseSchema = `
CREATE TABLE IF NOT EXISTS shafi_expenses (
 id uuid PRIMARY KEY, body jsonb NOT NULL, booking uuid REFERENCES shafi_bookings(id),
 issue uuid REFERENCES shafi_expenses(id), created timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shafi_expense_issue ON shafi_expenses(issue);
CREATE INDEX IF NOT EXISTS shafi_expense_booking ON shafi_expenses(booking);
CREATE INDEX IF NOT EXISTS shafi_expense_date ON shafi_expenses((body->>'date'));
`;
export async function listExpenses():Promise<LedgerEntry[]> {
 return (await bookingPool().query('SELECT body FROM shafi_expenses ORDER BY created DESC,id')).rows.map(r=>r.body);
}
export async function saveExpense(id:string,raw:unknown) {
 const input=ledgerInput.parse(raw);
 const c=await bookingPool().connect();
 try {
  await c.query('BEGIN');
  await c.query("SET LOCAL lock_timeout='8s'");
  await c.query('SELECT pg_advisory_xact_lock(7352420)');
  const existing=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[id])).rows[0]?.body;
  if(existing){
   if(Object.entries(input).some(([k,v])=>existing[k]!==v))throw new Error('This retry differs from the saved entry. Reload the ledger.');
   await c.query('COMMIT');return existing as LedgerEntry;
  }
  if(input.bookingId && !(await c.query('SELECT id FROM shafi_bookings WHERE id=$1',[input.bookingId])).rowCount)throw new Error('Booking not found.');
  if(input.issueId){
   const issue=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[input.issueId])).rows[0]?.body as LedgerEntry|undefined;
   if(!issue || issue.kind!=='Cash issue'||issue.voidedAt)throw new Error('Choose an active cash issue.');
   if(input.date<issue.date)throw new Error('Spending or return date cannot precede the cash issue.');
   if(input.person!==issue.person)throw new Error('The cash holder must match the original issue.');
   const settled=(await c.query("SELECT COALESCE(SUM((body->>'amount')::bigint),0) AS amount FROM shafi_expenses WHERE issue=$1 AND body->>'voidedAt' IS NULL",[input.issueId])).rows[0];
   if(input.amount>issue.amount-Number(settled.amount))throw new Error('Amount exceeds the unspent cash on this issue.');
  }
  const entry:LedgerEntry={...input,id,created:new Date().toISOString(),actor:'Shared administrator',voidReason:null,voidedAt:null};
  await c.query('INSERT INTO shafi_expenses(id,body,booking,issue) VALUES($1,$2,$3,$4)',[id,JSON.stringify(entry),input.bookingId,input.issueId]);
  await c.query('COMMIT');return entry;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function voidExpense(id:string,raw:unknown){
 const reason=z.string().trim().min(3).max(1000).parse(raw);
 const c=await bookingPool().connect();
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(7352420)');
  const entry=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[id])).rows[0]?.body as LedgerEntry|undefined;
  if(!entry)throw new Error('Entry not found.');
  if(entry.voidedAt){if(entry.voidReason!==reason)throw new Error('Entry was already voided with a different reason.');await c.query('COMMIT');return entry;}
  if((await c.query("SELECT id FROM shafi_expenses WHERE issue=$1 AND body->>'voidedAt' IS NULL LIMIT 1",[id])).rowCount)throw new Error('Void linked spending and cash returns before voiding this issue.');
  entry.voidedAt=new Date().toISOString();entry.voidReason=reason;
  await c.query('UPDATE shafi_expenses SET body=$2 WHERE id=$1',[id,JSON.stringify(entry)]);
  await c.query('COMMIT');return entry;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
