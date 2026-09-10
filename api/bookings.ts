import { z } from 'zod';
import { header, requestUrl, sameOrigin, sessionValid, type RuntimeRequest } from '../server/auth.js';
import { listBookings, bookingHistory, saveBooking, recordPayment } from '../server/postgres-bookings.js';
import { listExpenses, saveExpense, voidExpense, reviewExpense, acknowledgeCashIssue } from '../server/expenses.js';
import { actorFor, hallAccess, requireRole, AccessError } from '../server/staff-auth.js';
const send=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleBookings(request:RuntimeRequest):Promise<Response>{
 try{
  const actor=await actorFor(request);
  if(!actor)return send({error:'Sign in to access bookings.'},401);
  if(actor.role==='Hall manager')return send({error:'Booking access is unavailable for this role.'},403);
  const accountant=actor.role==='Accountant';
  if(accountant&&!actor.permissions?.booking)return send({error:'Your Accountant account has no booking access.'},403);
  if(request.method!=='GET'&&actor.role!=='GM'&&!accountant)return send({error:'Only GM can change operational records.'},403);
  if(!process.env.DATABASE_URL)return send({error:'Private booking database setup is still in progress.'},503);
  const url=requestUrl(request);
  const expenses=url.searchParams.get('resource')==='expenses';
  if(request.method==='GET'&&expenses)return send(await listExpenses(actor));
  if(request.method==='GET'){const id=url.searchParams.get('id');const available=(await listBookings()).filter(b=>hallAccess(actor,b.hall));if(id&&!available.some(b=>b.id===id))throw new AccessError('Booking unavailable for your hall.');return send(id?await bookingHistory(z.string().uuid().parse(id)):available);}
  if(request.method!=='POST')return send({error:'Method not allowed.'},405);
  if(!sameOrigin(request))return send({error:'Request must come from this website.'},403);
  if(Number(header(request,'content-length')||0)>32000)return send({error:'Request too large.'},413);
  let text:string;
  if(typeof request.text==='function') text=await request.text();
  else if(request.body!==undefined)text=Buffer.isBuffer(request.body)?request.body.toString():typeof request.body==='string'?request.body:JSON.stringify(request.body);
  else {const chunks:Buffer[]=[];let size=0;for await(const chunk of request as unknown as AsyncIterable<Buffer>){size+=chunk.length;if(size>32000)return send({error:'Request too large.'},413);chunks.push(chunk);}text=Buffer.concat(chunks).toString();}
  if(Buffer.byteLength(text)>32000)return send({error:'Request too large.'},413);
  const data=JSON.parse(text);const id=z.string().uuid().parse(data.id);
  if(expenses){
    if(data.action==='save')return send(await saveExpense(id,data.entry,actor));
    if(data.action==='void')return send(await voidExpense(id,data.reason,actor));
    if(data.action==='review')return send(await reviewExpense(actor,id,data.entry));
    if(data.action==='acknowledge')return send(await acknowledgeCashIssue(actor,id));
    return send({error:'Unknown ledger action.'},400);
  }
  const existing=(await listBookings()).find(b=>b.id===id);
  if(existing&&!hallAccess(actor,existing.hall))throw new AccessError('Booking unavailable for your hall.');
  if(data.action==='payment'){if(accountant&&!actor.permissions?.bookingReceipt&&!actor.permissions?.bookingRefund)return send({error:'Your account has no receipt or refund access.'},403);const kind=data.payment?.kind;if(accountant&&kind==='Refund'&&!actor.permissions?.bookingRefund)return send({error:'Refund access is not enabled for this account.'},403);if(accountant&&kind!=='Refund'&&!actor.permissions?.bookingReceipt)return send({error:'Receipt access is not enabled for this account.'},403);if(!accountant)requireRole(actor,['GM']);return send(await recordPayment(id,data.payment,actor.name));}
  if(data.action!=='save')return send({error:'Unknown booking action.'},400);
  const version=data.version===undefined?undefined:z.number().int().positive().parse(data.version);
  if(!accountant)requireRole(actor,['GM']);
  return send(await saveBooking(data.booking,id,version,actor.name));
 }catch(e){if(e instanceof z.ZodError)return send({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},400);
  if(e instanceof SyntaxError)return send({error:'Invalid request.'},400);
  const err=e as Error & {code?:string};
  if(err.code){console.error('Booking storage failure',err.code);return send({error:'Booking storage is temporarily unavailable. Your form is still here; retry shortly.'},503);}
  return send({error:err.message || 'Unable to process booking.'},e instanceof AccessError?403:409);
 }
}
export default async function handler(req:RuntimeRequest,res:{statusCode:number;setHeader:(k:string,v:string)=>void;end:(b:Uint8Array)=>void}){const response=await handleBookings(req);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(new Uint8Array(await response.arrayBuffer()));}
