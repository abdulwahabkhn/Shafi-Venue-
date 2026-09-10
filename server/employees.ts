import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import { bookingPool } from './postgres-bookings.js';
import { attendanceInput, employeeInput, employeePaymentInput, pkToday, type Actor, type Employee, type EmployeeData, type EmployeePayment } from '../shared/staff.js';
import { hallAccess, requireRole, AccessError, hasPermission } from './staff-auth.js';

export const employeeSchema=`
CREATE TABLE IF NOT EXISTS shafi_employees(id uuid PRIMARY KEY,body jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS shafi_employee_hall ON shafi_employees((body->>'hall'));
CREATE TABLE IF NOT EXISTS shafi_attendance(id uuid PRIMARY KEY,employee uuid REFERENCES shafi_employees(id) NOT NULL,day date NOT NULL,body jsonb NOT NULL,UNIQUE(employee,day));
CREATE TABLE IF NOT EXISTS shafi_employee_payments(id uuid PRIMARY KEY,employee uuid REFERENCES shafi_employees(id) NOT NULL,body jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS shafi_employee_payment_employee ON shafi_employee_payments(employee);
CREATE UNIQUE INDEX IF NOT EXISTS shafi_salary_once ON shafi_employee_payments(employee,(body->>'period')) WHERE body->>'kind'='Salary' AND body->>'voidedAt' IS NULL;
`;
async function transaction<T>(run:(c:PoolClient)=>Promise<T>){const c=await bookingPool().connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='8s'");await c.query('SELECT pg_advisory_xact_lock(7352422)');const result=await run(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function audit(c:PoolClient,actor:Actor,entity:string,action:string,snapshot:unknown){await c.query('INSERT INTO shafi_staff_audit(id,entity,action,actor,snapshot) VALUES($1,$2,$3,$4,$5)',[randomUUID(),entity,action,`${actor.name} (${actor.role})`,JSON.stringify(snapshot)]);}
export async function employeeData(actor:Actor):Promise<EmployeeData>{
 const scope=actor.role==='Hall manager'?actor.hall:null;
 const [employees,attendance,payments,audits]=await Promise.all([
 bookingPool().query("SELECT body FROM shafi_employees WHERE ($1::text IS NULL OR body->>'hall'=$1) ORDER BY body->>'name'",[scope]),
 bookingPool().query("SELECT a.body FROM shafi_attendance a JOIN shafi_employees e ON e.id=a.employee WHERE ($1::text IS NULL OR e.body->>'hall'=$1) ORDER BY day DESC",[scope]),
 actor.role==='Hall manager'?Promise.resolve({rows:[]}):bookingPool().query('SELECT body FROM shafi_employee_payments ORDER BY body->>\'date\' DESC'),
 actor.role==='Hall manager'?Promise.resolve({rows:[]}):bookingPool().query("SELECT a.id,a.entity,a.action,a.actor,a.created FROM shafi_staff_audit a JOIN shafi_employees e ON e.id::text=a.entity ORDER BY created DESC LIMIT 200")]);
 return {employees:employees.rows.map(r=>actor.role==='Hall manager'?{...r.body,salary:0,phone:'',notes:'',exitReason:''}:r.body),attendance:attendance.rows.map(r=>r.body),payments:payments.rows.map(r=>r.body),audit:audits.rows};
}
export async function attendanceData(actor:Actor){
 requireRole(actor,['GM','Director','Accountant']);
 const [employees,attendance]=await Promise.all([
  bookingPool().query("SELECT id,body->>'name' AS name,body->>'sector' AS sector,body->>'title' AS title,body->>'joined' AS joined,body->>'exited' AS exited FROM shafi_employees ORDER BY body->>'name'"),
  bookingPool().query('SELECT body FROM shafi_attendance ORDER BY day DESC')
 ]);
 return {employees:employees.rows,attendance:attendance.rows.map(r=>r.body)};
}
export async function employeeDirectory(actor:Actor):Promise<EmployeeData>{
 requireRole(actor,['GM','Director','Accountant']);
 const rows=(await bookingPool().query("SELECT body FROM shafi_employees ORDER BY body->>'name'")).rows;
 return {employees:rows.map(r=>({...r.body,salary:0,phone:'',notes:'',exitReason:''})),attendance:[],payments:[],audit:[]};
}
export async function saveEmployee(actor:Actor,id:string,raw:unknown,version?:number){
 requireRole(actor,['GM','Accountant']);if(actor.role==='Accountant'&&!hasPermission(actor,'employeeAdd')&&!hasPermission(actor,'employeeRemove'))throw new AccessError('Employee editing is not enabled for this account.');const input=employeeInput.parse(raw);
 return transaction(async c=>{
 const existing=(await c.query('SELECT body FROM shafi_employees WHERE id=$1',[id])).rows[0]?.body as Employee|undefined;
 if(existing&&version===undefined){if(Object.entries(input).every(([k,v])=>existing[k as keyof Employee]===v))return existing;throw new Error('This employee already exists. Reload before editing.');}
 if(version!==undefined&&existing?.version!==version)throw new Error('Employee record changed. Reload before saving.');
 if(input.joined>pkToday()||input.exited&&input.exited>pkToday())throw new Error('Recruitment and exit dates cannot be in the future.');
 if(existing&&input.joined!==existing.joined&&!(existing.status!=='Active'&&input.status==='Active'&&input.joined>(existing.exited||existing.joined)))throw new Error('Keep the original recruitment date. To rehire, use a date after the previous exit.');
 const record:Employee={...input,id,version:(existing?.version||0)+1,created:existing?.created||new Date().toISOString()};
 await c.query('INSERT INTO shafi_employees(id,body) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET body=$2',[id,JSON.stringify(record)]);
 await audit(c,actor,id,existing?`Employee updated: ${existing.status} → ${record.status}`:'Employee recruited',record);return record;
 });
}
export async function saveAttendance(actor:Actor,id:string,raw:unknown,version?:number){
 requireRole(actor,['GM','Accountant']);const input=attendanceInput.parse(raw);
 return transaction(async c=>{
 const employee=(await c.query('SELECT body FROM shafi_employees WHERE id=$1',[input.employeeId])).rows[0]?.body as Employee|undefined;
 if(!employee||!hallAccess(actor,employee.hall))throw new AccessError('Employee unavailable for your hall.');
 if(input.date>pkToday()||input.date<employee.joined||employee.exited&&input.date>employee.exited)throw new Error('Attendance date must fall within employment and cannot be in the future.');
 if(input.bookingId){const b=(await c.query('SELECT body FROM shafi_bookings WHERE id=$1',[input.bookingId])).rows[0]?.body;if(!b||!hallAccess(actor,b.hall))throw new AccessError('Booking unavailable for your hall.');}
 const existing=(await c.query('SELECT body FROM shafi_attendance WHERE employee=$1 AND day=$2',[employee.id,input.date])).rows[0]?.body;
 if(existing&&version===undefined){if(existing.id===id&&Object.entries(input).every(([k,v])=>existing[k]===v))return existing;throw new Error('Attendance is already recorded for that day. Open it to correct the entry.');}
 if(version!==undefined&&existing?.version!==version)throw new Error('Attendance changed. Reload before editing.');
 const record={...input,id:existing?.id||id,version:(existing?.version||0)+1,actor:actor.name};
 await c.query('INSERT INTO shafi_attendance(id,employee,day,body) VALUES($1,$2,$3,$4) ON CONFLICT(employee,day) DO UPDATE SET body=$4',[record.id,employee.id,input.date,JSON.stringify(record)]);await audit(c,actor,employee.id,'Attendance recorded',record);return record;
 });
}
export async function recordEmployeePayment(actor:Actor,id:string,raw:unknown){
 requireRole(actor,['GM']);const input=employeePaymentInput.parse(raw);
 return transaction(async c=>{
 const existing=(await c.query('SELECT body FROM shafi_employee_payments WHERE id=$1',[id])).rows[0]?.body;
 if(existing){if(Object.entries(input).some(([k,v])=>existing[k]!==v))throw new Error('Payment retry differs from the saved payment.');return existing;}
 const employee=(await c.query('SELECT body FROM shafi_employees WHERE id=$1',[input.employeeId])).rows[0]?.body as Employee|undefined;if(!employee)throw new Error('Employee not found.');
 if(input.date>pkToday()||input.date<employee.joined)throw new Error('Record the actual payment date between recruitment and today.');
 if(input.bookingId&&!(await c.query('SELECT id FROM shafi_bookings WHERE id=$1',[input.bookingId])).rowCount)throw new Error('Booking not found.');
 const history=(await c.query('SELECT body FROM shafi_employee_payments WHERE employee=$1',[employee.id])).rows.map(r=>r.body as EmployeePayment).filter(p=>!p.voidedAt);
 if(input.kind==='Salary'){
  if(employee.employment!=='Permanent')throw new Error('Use Rental wage for rental or daily-wage staff.');
  if(input.period!<employee.joined.slice(0,7)||employee.exited&&input.period!>employee.exited.slice(0,7)||input.period!>pkToday().slice(0,7))throw new Error('Salary month must fall within employment and cannot be in the future.');
  if(history.some(p=>p.kind==='Salary'&&p.period===input.period))throw new Error('Salary is already marked paid for this employee and month.');
  if(input.deductionRate>0&&input.deductionDays>0){
   const leaves=Number((await c.query("SELECT COUNT(*) n FROM shafi_attendance WHERE employee=$1 AND to_char(day,'YYYY-MM')=$2 AND body->>'status'='Leave'",[employee.id,input.period])).rows[0].n);
   if(input.deductionDays>Math.max(0,leaves-4))throw new Error('Deducted days cannot exceed leaves above the four-day allowance.');
   if(input.amount!==employee.salary-input.deductionRate*input.deductionDays)throw new Error('Confirm the paid amount after applying the chosen leave deduction.');
  }
  if(input.amount!==employee.salary&&!input.note)throw new Error('Add a note explaining the paid amount if it differs from the agreed salary.');
 }
 if(input.kind==='Advance'&&employee.status!=='Active')throw new Error('Advances can only be recorded for active employees.');
 if(input.kind==='Advance repayment'){
  const balance=history.reduce((s,p)=>s+(p.kind==='Advance'?p.amount:p.kind==='Advance repayment'?-p.amount:0),0);
  if(input.amount>balance)throw new Error('Repayment exceeds the outstanding salary advance.');
 }
 const payment:EmployeePayment={...input,id,employeeName:employee.name,actor:actor.name,created:new Date().toISOString(),voidedAt:null,voidReason:null,agreedSalary:employee.salary};
 await c.query('INSERT INTO shafi_employee_payments(id,employee,body) VALUES($1,$2,$3)',[id,employee.id,JSON.stringify(payment)]);
 await audit(c,actor,employee.id,`${input.kind} recorded: PKR ${input.amount}`,payment);return payment;
 });
}
export async function voidEmployeePayment(actor:Actor,id:string,raw:unknown){
 requireRole(actor,['GM']);const reason=z.string().trim().min(3).max(1000).parse(raw);
 return transaction(async c=>{const payment=(await c.query('SELECT body FROM shafi_employee_payments WHERE id=$1',[id])).rows[0]?.body as EmployeePayment|undefined;if(!payment)throw new Error('Payment not found.');if(payment.voidedAt)return payment;
 if(payment.kind==='Advance'){const other=(await c.query('SELECT body FROM shafi_employee_payments WHERE employee=$1 AND id<>$2',[payment.employeeId,id])).rows.map(r=>r.body as EmployeePayment).filter(p=>!p.voidedAt);if(other.reduce((s,p)=>s+(p.kind==='Advance'?p.amount:p.kind==='Advance repayment'?-p.amount:0),0)<0)throw new Error('Reverse related advance repayments before voiding this advance.');}
 payment.voidedAt=new Date().toISOString();payment.voidReason=reason;await c.query('UPDATE shafi_employee_payments SET body=$2 WHERE id=$1',[id,JSON.stringify(payment)]);await audit(c,actor,payment.employeeId,'Payment voided',payment);return payment;});
}
