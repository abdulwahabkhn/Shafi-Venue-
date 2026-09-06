import { bookingPool } from './postgres-bookings.js';
import { AccessError, hallAccess, requireRole } from './staff-auth.js';
import { pkToday, type Actor } from '../shared/staff.js';
import { itemInput,movementInput,stockTotals,unsettled,type StockItem,type StockMovement,type InventoryData } from '../shared/inventory.js';
import type { PoolClient } from 'pg';
export const inventorySchema=`
CREATE TABLE IF NOT EXISTS shafi_stock_items(id uuid PRIMARY KEY,sku text UNIQUE NOT NULL,body jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS shafi_stock_movements(id uuid PRIMARY KEY,item uuid NOT NULL REFERENCES shafi_stock_items(id),source uuid REFERENCES shafi_stock_movements(id),booking uuid REFERENCES shafi_bookings(id),employee uuid REFERENCES shafi_employees(id),expense uuid REFERENCES shafi_expenses(id),body jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS shafi_stock_item_moves ON shafi_stock_movements(item);
CREATE INDEX IF NOT EXISTS shafi_stock_source ON shafi_stock_movements(source);
CREATE INDEX IF NOT EXISTS shafi_stock_booking ON shafi_stock_movements(booking);
`;
const itemAccess=(a:Actor,item:StockItem)=>a.role!=='Hall manager'||item.location==='Store'||item.location===a.hall;
async function write<T>(run:(c:PoolClient)=>Promise<T>){const c=await bookingPool().connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='8s'");await c.query('SELECT pg_advisory_xact_lock(7352419)');await c.query('SELECT pg_advisory_xact_lock(7352422)');await c.query('SELECT pg_advisory_xact_lock(7352423)');const result=await run(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function inventoryData(actor:Actor):Promise<InventoryData>{
 const c=await bookingPool().connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const items=(await c.query('SELECT body FROM shafi_stock_items ORDER BY sku')).rows.map(r=>r.body as StockItem).filter(i=>itemAccess(actor,i));const ids=items.map(i=>i.id);const moves=(await c.query('SELECT body FROM shafi_stock_movements WHERE item=ANY($1::uuid[]) ORDER BY body->>\'created\' DESC,id',[ids])).rows.map(r=>r.body as StockMovement);await c.query('COMMIT');return {items:items.map(item=>({...item,...stockTotals(moves.filter(m=>m.itemId===item.id))})),movements:moves.filter(m=>actor.role!=='Hall manager'||m.hall===actor.hall)};}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function saveStockItem(actor:Actor,id:string,raw:unknown){requireRole(actor,['Director','GM']);const input=itemInput.parse(raw);return write(async c=>{const old=(await c.query('SELECT body FROM shafi_stock_items WHERE id=$1',[id])).rows[0]?.body;if(old){if(Object.entries(input).some(([k,v])=>old[k]!==v))throw Error('Item already exists. This retry has different details.');return old;}const item={...input,id,created:new Date().toISOString()};await c.query('INSERT INTO shafi_stock_items(id,sku,body) VALUES($1,$2,$3)',[id,input.sku,JSON.stringify(item)]);return item;});}
export async function moveStock(actor:Actor,id:string,raw:unknown){
 requireRole(actor,['Director','GM','Hall manager']);const input=movementInput.parse(raw);
 if(['Opening','Write-off'].includes(input.kind))requireRole(actor,['Director']);
 if(['Purchase','Repair','Recover'].includes(input.kind))requireRole(actor,['Director','GM']);
 return write(async c=>{
 const old=(await c.query('SELECT body FROM shafi_stock_movements WHERE id=$1',[id])).rows[0]?.body as StockMovement|undefined;
 if(old){if(actor.role==='Hall manager'&&old.hall!==actor.hall)throw new AccessError('Movement unavailable for your hall.');if(Object.entries(input).some(([k,v])=>old[k as keyof StockMovement]!==v))throw Error('Retry differs from the saved movement. Reload inventory.');return old;}
 const item=(await c.query('SELECT body FROM shafi_stock_items WHERE id=$1',[input.itemId])).rows[0]?.body as StockItem|undefined;
 if(!item||!itemAccess(actor,item))throw new AccessError('Item unavailable for your hall.');
 if(input.date>pkToday())throw Error('Record actual movements only, not future reservations.');
 const moves=(await c.query('SELECT body FROM shafi_stock_movements WHERE item=$1',[item.id])).rows.map(r=>r.body as StockMovement);
 const totals=stockTotals(moves);let hall:string|null=null,employeeName='',bookingReference='';
 const requiresSource=['Return','Damage','Loss','Repair','Recover','Write-off'].includes(input.kind);
 if(requiresSource!==!!input.sourceId)throw Error(requiresSource?'Select the original issue or incident.':'This movement cannot have a source record.');
 if(input.kind==='Issue'){
  if(!input.bookingId||!input.employeeId)throw Error('Select a booking and the employee receiving the items.');
  const booking=(await c.query('SELECT body FROM shafi_bookings WHERE id=$1',[input.bookingId])).rows[0]?.body;
  const employee=(await c.query('SELECT body FROM shafi_employees WHERE id=$1',[input.employeeId])).rows[0]?.body;
  if(!booking||!hallAccess(actor,booking.hall)||!['Confirmed','Hold'].includes(booking.status)||booking.status==='Hold'&&Date.parse(booking.holdUntil||'')<=Date.now())throw Error('Choose a confirmed booking or an unexpired hold for your hall.');
  if(!employee||employee.status!=='Active'||actor.role==='Hall manager'&&!hallAccess(actor,employee.hall))throw Error('Choose an active employee available to your hall.');
  if(item.location!=='Store'&&item.location!==booking.hall)throw Error('This item belongs to another hall. Use that hall’s inventory record.');
  if(input.quantity>totals.available)throw Error(`Only ${totals.available} usable ${item.unit} available.`);
  hall=booking.hall;employeeName=employee.name;bookingReference=booking.reference;
 }else if(requiresSource){
  const source=moves.find(m=>m.id===input.sourceId);if(!source||actor.role==='Hall manager'&&source.hall!==actor.hall)throw new AccessError('Source movement unavailable.');
  const expected=['Return','Damage','Loss'].includes(input.kind)?['Issue']:input.kind==='Repair'?['Damage']:input.kind==='Recover'?['Loss']:['Damage','Loss'];
  if(!expected.includes(source.kind))throw Error('Select the correct source issue or damage/loss incident.');
  if(input.date<source.date)throw Error('Movement date cannot precede its source.');
  if(input.quantity>unsettled(source,moves))throw Error('Quantity exceeds the remaining amount on this source.');
  if(input.bookingId!==source.bookingId||input.employeeId!==source.employeeId)throw Error('Booking and employee must match the source.');
  hall=source.hall;employeeName=source.employeeName;bookingReference=source.bookingReference;
 }else if(input.bookingId||input.employeeId)throw Error('Opening stock and purchases are venue receipts, not employee issues.');
 if(input.kind==='Opening'&&moves.length)throw Error('Opening stock can only be the first movement for an item.');
 if(input.expenseId){if(input.kind!=='Purchase')throw Error('Expense links belong to purchases.');const expense=(await c.query('SELECT body FROM shafi_expenses WHERE id=$1',[input.expenseId])).rows[0]?.body;if(!expense||expense.kind!=='Expense'||expense.voidedAt)throw Error('Choose an active expense record.');}
 if(input.kind==='Purchase'&&!input.reference)throw Error('Enter a supplier / purchase bill reference.');
 const movement:StockMovement={...input,id,hall,employeeName,bookingReference,itemName:item.name,actor:`${actor.name} (${actor.role})`,created:new Date().toISOString()};
 await c.query('INSERT INTO shafi_stock_movements(id,item,source,booking,employee,expense,body) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,item.id,input.sourceId,input.bookingId,input.employeeId,input.expenseId,JSON.stringify(movement)]);return movement;
 });
}
