import { z } from 'zod';
import { dateInput, halls } from './staff.js';

export const rentalInput=z.object({
 supplier:z.string().trim().min(2).max(160),phone:z.string().trim().max(30).default(''),
 item:z.string().trim().min(2).max(160),unit:z.string().trim().min(1).max(30),
 quantity:z.number().int().positive().max(1000000),hall:z.enum(halls),
 bookingId:z.string().uuid().nullable().default(null),received:dateInput,due:dateInput,
 reference:z.string().trim().min(2).max(160),note:z.string().trim().max(1000).default(''),
}).refine(v=>v.due>=v.received,'Return due date cannot precede receipt.');
export const rentalEventInput=z.object({
 rentalId:z.string().uuid(),kind:z.enum(['Return','Damage','Loss','Repair','Recover','Supplier settlement']),
 sourceId:z.string().uuid().nullable().default(null),quantity:z.number().int().positive().max(1000000),
 date:dateInput,reference:z.string().trim().max(160).default(''),note:z.string().trim().min(3).max(1000),
});
export type Rental=z.infer<typeof rentalInput>&{id:string;created:string;actor:string;bookingReference:string};
export type RentalEvent=z.infer<typeof rentalEventInput>&{id:string;created:string;actor:string};
export function rentalBalance(rental:Rental,events:RentalEvent[]){
 const balance={usable:rental.quantity,damaged:0,missing:0,returned:0,settled:0};
 const own=events.filter(e=>e.rentalId===rental.id);
 for(const e of own){
  if(e.kind==='Damage'){balance.usable-=e.quantity;balance.damaged+=e.quantity;}
  if(e.kind==='Loss'){balance.usable-=e.quantity;balance.missing+=e.quantity;}
  if(e.kind==='Repair'){balance.damaged-=e.quantity;balance.usable+=e.quantity;}
  if(e.kind==='Recover'){balance.missing-=e.quantity;balance.usable+=e.quantity;}
  if(e.kind==='Return'){if(e.sourceId)balance.damaged-=e.quantity;else balance.usable-=e.quantity;balance.returned+=e.quantity;}
  if(e.kind==='Supplier settlement'){
   if(own.find(s=>s.id===e.sourceId)?.kind==='Damage')balance.damaged-=e.quantity;else balance.missing-=e.quantity;
   balance.settled+=e.quantity;
  }
 }
 return {...balance,outstanding:balance.usable+balance.damaged+balance.missing};
}
export function rentalSourceRemaining(event:RentalEvent,events:RentalEvent[]){return event.quantity-events.filter(e=>e.sourceId===event.id).reduce((s,e)=>s+e.quantity,0);}
export type RentalData={rentals:Rental[];events:RentalEvent[]};
