import { expenseSheet,addExpenseRow,removeExpenseRow,inventoryRegister,addInventoryItem,inventoryAction,monthlySummary } from '../server/registers.js';
import { z } from 'zod';
import { requestUrl, type RuntimeRequest } from '../server/auth.js';
import { actorFor, staffLogin, staffLogout, users, saveUser, hasPermission } from '../server/staff-auth.js';
import { attendanceData, employeeData, employeeDirectory, saveEmployee, saveAttendance, recordEmployeePayment, voidEmployeePayment } from '../server/employees.js';
import { body, json, failure, deliver, type NodeResponse } from '../server/http.js';
import { expenseFiles, saveFile, downloadFile } from '../server/attachments.js';
import { dailyReport } from '../server/reports.js';
import { inventoryData,saveStockItem,moveStock,transferStock } from '../server/inventory.js';
import { rentalData,receiveRental,recordRentalEvent } from '../server/rentals.js';
import { cashReconciliation,recordCashCount } from '../server/cash-reconciliation.js';

export async function handleStaff(request:RuntimeRequest){try{
 const resource=requestUrl(request).searchParams.get('resource')||'session';
 if(request.method==='POST'&&resource==='login'){const result=await staffLogin(request,await body(request));const response=json(result.actor);response.headers.set('Set-Cookie',result.cookie);return response;}
 if(request.method==='POST'&&resource==='logout'){await body(request);const response=json({ok:true});response.headers.set('Set-Cookie',await staffLogout(request));return response;}
 const actor=await actorFor(request);if(!actor)return json({error:'Sign in to the staff portal.'},401);
 if(actor.role==='Accountant'&&!['session','expense-sheet','inventory-register','attendance'].includes(resource))return json({error:'Accountant access is limited to the expense sheet, inventory and attendance.'},403);
 if(request.method!=='GET'&&actor.role==='Director')return json({error:'Director access is monitoring only.'},403);
 if(request.method==='GET'){
  if(resource==='expense-sheet')return json(await expenseSheet(actor,requestUrl(request).searchParams.get('date')));
  if(resource==='inventory-register')return json(await inventoryRegister(actor));
  if(resource==='monthly-summary')return json(await monthlySummary(actor,requestUrl(request).searchParams.get('month')));
  if(resource==='session')return json(actor);
  if(resource==='users')return json(await users(actor));
  if(resource==='attendance')return json(await attendanceData(actor));
  if(resource==='employees')return json(actor.role==='Accountant'&&!hasPermission(actor,'employeeSalary')&&!hasPermission(actor,'employeeAdvance')?await employeeDirectory(actor):await employeeData(actor));
  if(resource==='inventory')return json(await inventoryData(actor));
  if(resource==='rentals')return json(await rentalData(actor));
  if(resource==='cash-reconciliation')return json(await cashReconciliation(actor,requestUrl(request).searchParams.get('date')));
  if(resource==='report')return json(await dailyReport(actor,requestUrl(request).searchParams.get('date')));
  if(resource==='files')return json(await expenseFiles(actor,z.string().uuid().parse(requestUrl(request).searchParams.get('expense'))));
  if(resource==='download')return downloadFile(actor,z.string().uuid().parse(requestUrl(request).searchParams.get('id')));
 }
 if(request.method!=='POST')return json({error:'Unknown operation.'},400);
 const data=await body(request,resource==='files'?3000000:32000);const id=z.string().uuid().parse(data.id);
 if(resource==='expense-sheet'){if(actor.role==='Accountant'&&!hasPermission(actor,data.action==='remove'?'expenseRemove':'expenseAdd'))return json({error:'That expense action is not enabled for this account.'},403);return json(data.action==='remove'?await removeExpenseRow(actor,id,data.reason):await addExpenseRow(actor,id,data.entry));}
 if(resource==='inventory-register'){if(actor.role==='Accountant'){const key=data.action==='add'?'inventoryAdd':['Damaged','Write off damage'].includes(data.entry?.action)?'inventoryDamage':['Replaced'].includes(data.entry?.action)?'inventoryReplace':['Remove quantity','Archive'].includes(data.entry?.action)?'inventoryRemove':'inventoryAdd';if(!hasPermission(actor,key))return json({error:'That inventory action is not enabled for this account.'},403);}return json(data.action==='add'?await addInventoryItem(actor,id,data.entry):await inventoryAction(actor,id,data.entry));}
 if(resource==='files')return json(await saveFile(actor,id,data.entry));
 const version=data.version===undefined?undefined:z.number().int().positive().parse(data.version);
 if(resource==='users')return json(await saveUser(actor,id,data.entry));
 if(resource==='employees'){if(actor.role==='Accountant'&&!hasPermission(actor,data.entry?.status&&data.entry.status!=='Active'?'employeeRemove':'employeeAdd'))return json({error:'That employee action is not enabled for this account.'},403);return json(await saveEmployee(actor,id,data.entry,version));}
 if(resource==='stock-item')return json(await saveStockItem(actor,id,data.entry));
 if(resource==='stock-movement')return json(await moveStock(actor,id,data.entry));
 if(resource==='stock-transfer')return json(await transferStock(actor,id,data.entry));
 if(resource==='rentals')return json(await receiveRental(actor,id,data.entry));
 if(resource==='rental-event')return json(await recordRentalEvent(actor,id,data.entry));
 if(resource==='cash-count')return json(await recordCashCount(actor,id,data.entry));
 if(resource==='attendance')return json(await saveAttendance(actor,id,data.entry,version));
 if(resource==='payment'){if(actor.role==='Accountant'&&!hasPermission(actor,data.entry?.kind==='Advance'||data.entry?.kind==='Advance repayment'?'employeeAdvance':'employeeSalary'))return json({error:'That employee payment action is not enabled for this account.'},403);return json(await recordEmployeePayment(actor,id,data.entry));}
 if(resource==='void-payment')return json(await voidEmployeePayment(actor,id,data.reason));
 return json({error:'Unknown operation.'},400);
}catch(e){return failure(e);}}
export default async function handler(req:RuntimeRequest,res:NodeResponse){await deliver(await handleStaff(req),res);}
