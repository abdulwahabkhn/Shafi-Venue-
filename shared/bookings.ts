import { z } from 'zod';
import { bookingHallOptions, sharesHall } from './halls.js';

export const bookingAdditionalServices = ['Stage','Floors','Fireworks','Flower machine','Focus lights','Sufi entry','Violin entry','Balloon entry','Ground decor'] as const;

const bookingAmount = z.number().int().min(0).max(1000000000);

const bookingInputShape = z.object({
  customer: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[+\d ()-]{7,25}$/).refine(v => v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number'),
  hall: z.enum(bookingHallOptions),
  event: z.enum(['Barat', 'Walima', 'Mehndi', 'Nikkah', 'Corporate', 'Other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Choose a valid date'),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  guests: z.number().int().min(1).max(100000),
  // `total` remains optional on input so records created before the amount
  // breakdown was introduced continue to load. New records always receive a
  // computed total from the three amount fields below.
  total: bookingAmount.optional(),
  hallAmount: bookingAmount.default(0),
  stageAmount: bookingAmount.default(0),
  additionalServicesAmount: bookingAmount.default(0),
  advanceAmount: bookingAmount.default(0),
  advanceMethod: z.enum(['Cash', 'Bank transfer']).default('Cash'),
  advanceReference: z.string().trim().max(120).default(''),
  manager: z.string().trim().max(120),
  notes: z.string().trim().max(4000),
  packageName: z.string().trim().max(160).default(''),
  additionalServices: z.array(z.enum(bookingAdditionalServices)).max(20).default([]),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  holdUntil: z.string().datetime().nullable().default(null),
  cancellationReason: z.string().trim().max(1000).default(''),
  status: z.enum(['Enquiry', 'Hold', 'Confirmed', 'Completed', 'Cancelled']),
});

export const bookingInput = bookingInputShape.transform(v => {
  const breakdownTotal = v.hallAmount + v.stageAmount + v.additionalServicesAmount;
  // Legacy payloads only have `total`; preserve it when no breakdown was
  // supplied. Any new breakdown (including a zero total) becomes authoritative.
  const total = breakdownTotal > 0 || v.total === undefined ? breakdownTotal : v.total;
  return { ...v, total };
}).refine(v => !v.endDate || (!Number.isNaN(Date.parse(v.endDate)) && new Date(v.endDate).toISOString().slice(0,10) === v.endDate), 'Choose a valid end date')
  .refine(v => `${v.endDate || v.date}T${v.end}` > `${v.date}T${v.start}`, 'End date/time must be after start date/time')
  .refine(v => v.status !== 'Hold' || !!v.holdUntil, 'A tentative hold needs an expiry time')
  .refine(v => v.status !== 'Cancelled' || v.cancellationReason.length > 2, 'Give a cancellation reason')
  .refine(v => v.advanceAmount <= v.total, 'Advance cannot exceed the total booking amount')
  .refine(v => v.advanceMethod !== 'Bank transfer' || !v.advanceAmount || !!v.advanceReference, 'Enter the bank reference for the advance');
export type BookingInput = z.infer<typeof bookingInput>;
export type Booking = BookingInput & { id: string; version: number; paid: number; createdAt: string; reference?: string };
export const paymentInput = z.object({ amount: z.number().int().positive().max(1000000000), method: z.enum(['Cash', 'Bank transfer']), reference: z.string().trim().max(120), key: z.string().uuid() });
export const transactionInput = paymentInput.extend({ kind: z.enum(['Receipt', 'Refund']).default('Receipt'), reason: z.string().trim().max(1000).default('') });
export type Payment = z.infer<typeof transactionInput> & { id: string; booking: string; created: string };
export type BookingHistory = { payments: Payment[]; audit: {id:string; action:string; created:string; actor:string}[] };
export function holdsSlot(b: BookingInput, now = Date.now()) { return b.status === 'Confirmed' || b.status === 'Completed' || (b.status === 'Hold' && !!b.holdUntil && Date.parse(b.holdUntil) > now); }
export function overlap(a: BookingInput,b: BookingInput) { return sharesHall(a.hall, b.hall) && `${a.date}T${a.start}` < `${b.endDate || b.date}T${b.end}` && `${a.endDate || a.date}T${a.end}` > `${b.date}T${b.start}`; }
