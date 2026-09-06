import { z } from 'zod';
import { createHash } from 'node:crypto';
import { bookingPool } from './postgres-bookings.js';
import { listExpenses } from './expenses.js';
import { AccessError } from './staff-auth.js';
import type { Actor } from '../shared/staff.js';
export const attachmentSchema=`CREATE TABLE IF NOT EXISTS shafi_expense_files(id uuid PRIMARY KEY,expense uuid NOT NULL REFERENCES shafi_expenses(id),name text NOT NULL,mime text NOT NULL,content bytea NOT NULL,digest text NOT NULL,created timestamptz NOT NULL DEFAULT now()); CREATE INDEX IF NOT EXISTS shafi_file_expense ON shafi_expense_files(expense);`;
export async function expenseFiles(actor:Actor,expense:string){if(!(await listExpenses(actor)).some(e=>e.id===expense))throw new AccessError('Expense unavailable.');return (await bookingPool().query('SELECT id,name,mime,octet_length(content) AS size,created FROM shafi_expense_files WHERE expense=$1 ORDER BY created',[expense])).rows;}
export async function saveFile(actor:Actor,id:string,raw:unknown){
 const input=z.object({expenseId:z.string().uuid(),name:z.string().min(1).max(180),base64:z.string().max(2800000).regex(/^[A-Za-z0-9+/]*={0,2}$/)}).parse(raw);
 const entry=(await listExpenses(actor)).find(e=>e.id===input.expenseId);
 if(!entry||entry.voidedAt)throw new AccessError('Expense unavailable.');
 if(entry.reviewStatus!=='Submitted')throw new Error('Attach bills before the expense is reviewed.');
 const bytes=Buffer.from(input.base64,'base64');if(!bytes.length||bytes.length>2*1024*1024)throw new Error('Choose a file no larger than 2 MB.');
 const signature=bytes.subarray(0,8).toString('hex');const mime=signature==='89504e470d0a1a0a'?'image/png':signature.startsWith('ffd8ff')?'image/jpeg':bytes.subarray(0,5).toString()==='%PDF-'?'application/pdf':null;
 if(!mime)throw new Error('Only JPG, PNG and PDF bills are supported.');
 const name=input.name.replace(/[^a-zA-Z0-9._ -]/g,'_');const digest=createHash('sha256').update(bytes).digest('hex');
 const c=await bookingPool().connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(7352420)');
 const current=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[input.expenseId])).rows[0]?.body;
 if(!current||current.voidedAt||!['Submitted',undefined].includes(current.reviewStatus))throw new Error('Expense changed. Reload before attaching a bill.');
 const duplicate=(await c.query('SELECT expense,digest FROM shafi_expense_files WHERE id=$1',[id])).rows[0];if(duplicate){if(duplicate.expense!==input.expenseId||duplicate.digest!==digest)throw new Error('Attachment retry differs from the original.');await c.query('COMMIT');return {id};}
 if(Number((await c.query('SELECT count(*) FROM shafi_expense_files WHERE expense=$1',[input.expenseId])).rows[0].count)>=5)throw new Error('A maximum of five bills can be attached per entry.');
 await c.query('INSERT INTO shafi_expense_files(id,expense,name,mime,content,digest) VALUES($1,$2,$3,$4,$5,$6)',[id,input.expenseId,name,mime,bytes,digest]);await c.query('COMMIT');return {id};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function downloadFile(actor:Actor,id:string){const row=(await bookingPool().query('SELECT * FROM shafi_expense_files WHERE id=$1',[id])).rows[0];if(!row||!(await listExpenses(actor)).some(e=>e.id===row.expense))throw new AccessError('Attachment unavailable.');return new Response(row.content,{headers:{'Content-Type':row.mime,'Content-Disposition':`attachment; filename="${row.name}"`,'Content-Length':String(row.content.length),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});}
