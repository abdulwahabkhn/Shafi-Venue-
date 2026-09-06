import { z } from 'zod';
import { requestUrl, type RuntimeRequest } from '../server/auth.js';
import { actorFor, staffLogin, staffLogout, users, saveUser } from '../server/staff-auth.js';
import { employeeData, saveEmployee, saveAttendance, recordEmployeePayment, voidEmployeePayment } from '../server/employees.js';
import { body, json, failure, deliver, type NodeResponse } from '../server/http.js';
import { expenseFiles, saveFile, downloadFile } from '../server/attachments.js';
import { dailyReport } from '../server/reports.js';

export async function handleStaff(request:RuntimeRequest){try{
 const resource=requestUrl(request).searchParams.get('resource')||'session';
 if(request.method==='POST'&&resource==='login'){const result=await staffLogin(request,await body(request));const response=json(result.actor);response.headers.set('Set-Cookie',result.cookie);return response;}
 if(request.method==='POST'&&resource==='logout'){await body(request);const response=json({ok:true});response.headers.set('Set-Cookie',await staffLogout(request));return response;}
 const actor=await actorFor(request);if(!actor)return json({error:'Sign in to the staff portal.'},401);
 if(request.method==='GET'){
  if(resource==='session')return json(actor);
  if(resource==='users')return json(await users(actor));
  if(resource==='employees')return json(await employeeData(actor));
  if(resource==='report')return json(await dailyReport(actor,requestUrl(request).searchParams.get('date')));
  if(resource==='files')return json(await expenseFiles(actor,z.string().uuid().parse(requestUrl(request).searchParams.get('expense'))));
  if(resource==='download')return downloadFile(actor,z.string().uuid().parse(requestUrl(request).searchParams.get('id')));
 }
 if(request.method!=='POST')return json({error:'Unknown operation.'},400);
 const data=await body(request,resource==='files'?3000000:32000);const id=z.string().uuid().parse(data.id);
 if(resource==='files')return json(await saveFile(actor,id,data.entry));
 const version=data.version===undefined?undefined:z.number().int().positive().parse(data.version);
 if(resource==='users')return json(await saveUser(actor,id,data.entry));
 if(resource==='employees')return json(await saveEmployee(actor,id,data.entry,version));
 if(resource==='attendance')return json(await saveAttendance(actor,id,data.entry,version));
 if(resource==='payment')return json(await recordEmployeePayment(actor,id,data.entry));
 if(resource==='void-payment')return json(await voidEmployeePayment(actor,id,data.reason));
 return json({error:'Unknown operation.'},400);
}catch(e){return failure(e);}}
export default async function handler(req:RuntimeRequest,res:NodeResponse){await deliver(await handleStaff(req),res);}
