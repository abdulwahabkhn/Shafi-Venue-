import { z } from 'zod';
import { dateInput } from './staff.js';
export type CashHolder={key:string;name:string;expected:number;issued:number;spent:number;returned:number;unacknowledged:number;fingerprint:string};
export const cashCountInput=z.object({date:dateInput,holderKey:z.string().min(1).max(160),counted:z.number().int().min(0).max(10000000000),fingerprint:z.string().regex(/^[a-f0-9]{64}$/),note:z.string().trim().min(3).max(1000)});
export type CashCount=z.infer<typeof cashCountInput>&{id:string;name:string;expected:number;variance:number;actor:string;created:string;changed?:boolean};
export type CashReconciliationData={date:string;holders:CashHolder[];counts:CashCount[]};
