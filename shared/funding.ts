import { z } from 'zod';

export const fundingInput = z.object({
  amount: z.number().int().positive().max(1000000000),
  method: z.enum(['Cash', 'Bank transfer']),
  purpose: z.string().trim().min(2).max(1000),
  reference: z.string().trim().max(160).default(''),
}).refine(v => v.method !== 'Bank transfer' || !!v.reference, 'Enter the bank transfer reference.');
export type FundingEntry = {id:string;date:string;amount:number;method:string;purpose:string;reference:string;actor:string;removed:boolean;canRemove:boolean};
export type FundingSummary = {
  date:string; issuedCash:number; issuedBank:number; issued:number;
  totalIssued:number; opening:number; remaining:number; remainingCash:number; remainingBank:number;
  spent:number; returned:number; totalExpense:number;
};
export type FundingBucket = {kind:string;method:string;amount:number|string;prior:number|string};

/** A shared expense fund, never clamped to zero. New issues naturally settle a deficit. */
export function summarizeFunding(date:string, buckets:FundingBucket[]):FundingSummary {
  const sum=(kind:string,method?:string,prior=false)=>buckets.filter(r=>r.kind===kind&&(!method||r.method===method)).reduce((s,r)=>s+Number(prior?r.prior:r.amount),0);
  const balance=(method?:string,prior=false)=>{
    const issued=sum('Cash issue',method,prior);
    // A ledger with no issued fund has no cash shortfall. This prevents legacy
    // expenses (or an expense entered before the first handover) displaying a
    // misleading negative balance; once funds are issued, true overspending is retained.
    return issued===0?0:issued-sum('Expense',method,prior)-sum('Cash return',method,prior);
  };
  const issuedCash=sum('Cash issue','Cash')-sum('Cash issue','Cash',true);
  const issuedBank=sum('Cash issue','Bank transfer')-sum('Cash issue','Bank transfer',true);
  return {date,issuedCash,issuedBank,issued:issuedCash+issuedBank,totalIssued:sum('Cash issue'),opening:balance(undefined,true),remaining:balance(),remainingCash:balance('Cash'),remainingBank:balance('Bank transfer'),spent:sum('Expense'),returned:sum('Cash return'),totalExpense:0};
}
