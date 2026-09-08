import { bookingPool } from './postgres-bookings.js';
import { requireRole } from './staff-auth.js';
import { dateInput, type Actor } from '../shared/staff.js';
export async function dailyReport(actor:Actor,raw:string|null){
 requireRole(actor,['Director','GM','Accountant']);const date=dateInput.parse(raw);
 const [booking,expense,employee]=await Promise.all([
 bookingPool().query("SELECT p.body,b.body->>'customer' AS person FROM shafi_booking_payments p JOIN shafi_bookings b ON b.id=p.booking WHERE (p.created AT TIME ZONE 'Asia/Karachi')::date=$1::date",[date]),
 bookingPool().query("SELECT body FROM shafi_expenses WHERE body->>'date'=$1 AND body->>'voidedAt' IS NULL",[date]),
 bookingPool().query("SELECT body FROM shafi_employee_payments WHERE body->>'date'=$1 AND body->>'voidedAt' IS NULL",[date])]);
 const rows=[...booking.rows.map(r=>({id:r.body.id,kind:r.body.kind==='Refund'?'Customer refund':'Booking receipt',person:r.person,amount:r.body.amount,method:r.body.method,status:'Recorded'})),...expense.rows.map(r=>({id:r.body.id,kind:r.body.kind,person:r.body.person,item:r.body.name||r.body.category||'',purpose:r.body.purpose||r.body.description||'',quantity:r.body.quantity??1,price:r.body.price??r.body.amount,amount:r.body.amount,method:r.body.method,status:r.body.reviewStatus||'Submitted'})),...employee.rows.map(r=>({id:r.body.id,kind:r.body.kind,person:r.body.employeeName,amount:r.body.amount,method:r.body.method,status:'Recorded'}))];
 return {date,rows};
}
