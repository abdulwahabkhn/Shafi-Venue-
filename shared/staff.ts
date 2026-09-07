import { z } from 'zod';

export const roles = ['Director', 'GM', 'Accountant', 'Hall manager'] as const;
export const halls = ['Hall 1', 'Hall 2'] as const;
export type Actor = { id: string; name: string; role: typeof roles[number]; hall: typeof halls[number] | null };
export type StaffUser = Actor & { username: string; active: boolean };
export const userInput = z.object({
  name: z.string().trim().min(2).max(120), username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,60}$/),
  role: z.enum(roles), hall: z.enum(halls).nullable().default(null), active: z.boolean().default(true),
  password: z.string().min(12).max(128).optional(),
}).refine(v => v.role !== 'Hall manager' || v.hall, 'Assign a hall to this manager');
export const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Choose a valid date');
export const pkToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const sectors = ['Office', 'Service', 'Kitchen', 'Decoration', 'Cleaning', 'Security', 'Gardening', 'Agriculture', 'Farmhouse', 'Maintenance', 'Other'] as const;
export const employeeInput = z.object({
  name: z.string().trim().min(2).max(120), phone: z.string().trim().max(25).default(''),
  sector: z.enum(sectors), title: z.string().trim().min(2).max(120),
  hall: z.enum(halls).nullable().default(null), employment: z.enum(['Permanent', 'Rental', 'Daily wage']),
  joined: dateInput, status: z.enum(['Active', 'Resigned', 'Terminated', 'Retired']),
  exited: dateInput.nullable().default(null), exitReason: z.string().trim().max(1000).default(''),
  salary: z.number().int().min(0).max(100000000), salaryEffective: dateInput,
  notes: z.string().trim().max(2000).default(''),
}).superRefine((v, ctx) => {
  if (v.status !== 'Active' && (!v.exited || !v.exitReason)) ctx.addIssue({ code: 'custom', message: 'Record the exit date and reason.' });
  if (v.exited && v.exited < v.joined) ctx.addIssue({ code: 'custom', message: 'Exit cannot precede recruitment.' });
  if (v.status === 'Active' && v.exited) ctx.addIssue({ code: 'custom', message: 'Clear the exit date when marking an employee active.' });
  if (v.salaryEffective < v.joined) ctx.addIssue({ code: 'custom', message: 'Salary effective date cannot precede recruitment.' });
});
export type Employee = z.infer<typeof employeeInput> & { id: string; version: number; created: string };
export const attendanceInput = z.object({ employeeId: z.string().uuid(), date: dateInput, status: z.enum(['Present', 'Absent', 'Leave', 'Half day']), note: z.string().trim().max(500).default(''), bookingId: z.string().uuid().nullable().default(null) });
export type Attendance = z.infer<typeof attendanceInput> & { id: string; actor: string; version: number };
export const employeePaymentInput = z.object({
  deductionRate: z.number().int().min(0).max(100000000).default(0),
  deductionDays: z.number().int().min(0).max(31).default(0),
  employeeId: z.string().uuid(), kind: z.enum(['Salary', 'Advance', 'Advance repayment', 'Rental wage']),
  amount: z.number().int().positive().max(100000000), date: dateInput,
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  method: z.enum(['Cash', 'Bank transfer']), reference: z.string().trim().max(160).default(''),
  note: z.string().trim().max(1000).default(''), bookingId: z.string().uuid().nullable().default(null),
}).superRefine((v,ctx)=>{
  if(v.kind==='Salary'&&!v.period)ctx.addIssue({code:'custom',message:'Select the salary month.'});
  if(v.kind!=='Salary'&&(v.deductionRate||v.deductionDays))ctx.addIssue({code:'custom',message:'Leave deductions belong to salary records only.'});
  if(v.method==='Bank transfer'&&!v.reference)ctx.addIssue({code:'custom',message:'Enter a bank transfer reference.'});
});
export type EmployeePayment = z.infer<typeof employeePaymentInput> & {id:string; employeeName:string; actor:string; created:string; voidedAt:string|null; voidReason:string|null; agreedSalary:number};
export type EmployeeData = { employees: Employee[]; attendance: Attendance[]; payments: EmployeePayment[]; audit: {id:string;entity:string;action:string;actor:string;created:string}[] };
