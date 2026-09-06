import { z } from 'zod';

export const expenseCategories = ['Staff food','Rental waiters','Crockery rental','Furniture rental','Fan rental','Hall supplies','Cleaning','Decoration','Electrical','Gas / cylinders','Batteries','Dishwashing','Agriculture','Maintenance','Court expense','Government taxes','Other'] as const;
export const ledgerInput = z.object({
  kind: z.enum(['Cash issue','Expense','Cash return']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Choose a valid date'),
  amount: z.number().int().positive().max(1000000000),
  person: z.string().trim().min(2).max(120),
  issuer: z.string().trim().max(120).default(''),
  category: z.enum(expenseCategories).default('Other'),
  method: z.enum(['Cash','Bank transfer']).default('Cash'),
  reference: z.string().trim().max(160).default(''),
  description: z.string().trim().min(3).max(2000),
  bookingId: z.string().uuid().nullable().default(null),
  issueId: z.string().uuid().nullable().default(null),
  recipientId: z.string().uuid().nullable().default(null),
}).superRefine((v,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(v.kind==='Cash issue' && !v.issuer) fail('Enter who issued the cash.');
  if(v.kind==='Cash issue' && v.issueId) fail('A cash issue cannot use another cash issue.');
  if(v.kind==='Cash return' && !v.issueId) fail('Select the original cash issue.');
  if((v.kind!=='Expense'||v.issueId) && v.method!=='Cash') fail('Cash issues and their settlements use cash.');
  if(v.method==='Bank transfer'&&!v.reference) fail('Enter the bank transfer reference.');
});
export type LedgerInput = z.infer<typeof ledgerInput>;
export type LedgerEntry = LedgerInput & {id:string;created:string;actor:string;voidReason:string|null;voidedAt:string|null;ownerId?:string;reviewStatus?:'Submitted'|'Verified'|'Approved'|'Rejected';reviews?:{status:string;note:string;actor:string;date:string}[];acknowledgedAt?:string|null;acknowledgedBy?:string|null};
export function issueRemaining(issue:LedgerEntry,entries:LedgerEntry[]) {
  return issue.amount-entries.filter(e=>e.issueId===issue.id&&!e.voidedAt).reduce((sum,e)=>sum+e.amount,0);
}
