import { z } from 'zod';
import { header, requestUrl, sameOrigin, sessionValid, type RuntimeRequest } from '../server/auth.js';
import { listBookings, bookingHistory, saveBooking, recordPayment } from '../server/postgres-bookings.js';
import { listExpenses, saveExpense, voidExpense } from '../server/expenses.js';
const send=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleBookings(request:RuntimeRequest):Promise<Response>{
 try{
  if(!sessionValid(request))return send({error:'Sign in to access bookings.'},401);
  if(!process.env.DATABASE_URL)return send({error:'Private booking database setup is still in progress.'},503);
  const url=requestUrl(request);
  const expenses=url.searchParams.get('resource')==='expenses';
  if(request.method==='GET'&&expenses)return send(await listExpenses());
  if(request.method==='GET'){const id=url.searchParams.get('id');return send(id?await bookingHistory(z.string().uuid().parse(id)):await listBookings());}
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
    if(data.action==='save')return send(await saveExpense(id,data.entry));
    if(data.action==='void')return send(await voidExpense(id,data.reason));
    return send({error:'Unknown ledger action.'},400);
  }
  if(data.action==='payment')return send(await recordPayment(id,data.payment));
  if(data.action!=='save')return send({error:'Unknown booking action.'},400);
  const version=data.version===undefined?undefined:z.number().int().positive().parse(data.version);
  return send(await saveBooking(data.booking,id,version));
 }catch(e){if(e instanceof z.ZodError)return send({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},400);
  if(e instanceof SyntaxError)return send({error:'Invalid request.'},400);
  const err=e as Error & {code?:string};
  if(err.code){console.error('Booking storage failure',err.code);return send({error:'Booking storage is temporarily unavailable. Your form is still here; retry shortly.'},503);}
  return send({error:err.message || 'Unable to process booking.'},409);
 }
}
export default async function handler(req:RuntimeRequest,res:{statusCode:number;setHeader:(k:string,v:string)=>void;end:(b:Uint8Array)=>void}){const response=await handleBookings(req);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(new Uint8Array(await response.arrayBuffer()));}
