import { bookingInput, transactionInput, holdsSlot, overlap, type Booking } from '../shared/bookings.js';

export function validateBooking(raw:unknown, previous:Booking|undefined, occupied:Booking[], now=Date.now()) {
  const input=bookingInput.parse(raw);
  if (previous?.status==='Completed' || previous?.status==='Cancelled') throw new Error('Closed bookings cannot be edited. Payment refunds remain available.');
  if (input.total < (previous?.paid ?? 0)) throw new Error('Total cannot be lower than net payments. Record an agreed refund first.');
  if (input.status==='Hold' && Date.parse(input.holdUntil!)<=now) throw new Error('Hold expiry must be in the future.');
  if (input.status==='Completed' && (!previous || previous.status!=='Confirmed')) throw new Error('Only confirmed bookings can be completed.');
  if (input.status==='Completed' && Date.parse(`${input.endDate||input.date}T${input.end}:00+05:00`)>now) throw new Error('The event has not ended yet.');
  if (holdsSlot(input,now) && occupied.some(b=>b.id!==previous?.id && holdsSlot(b,now) && overlap(input,b))) throw new Error('This hall already has a booking or active hold during that time.');
  return input;
}
export function validatePayment(raw:unknown,b:Booking) {
  const p=transactionInput.parse(raw);
  if(p.method==='Bank transfer' && !p.reference) throw new Error('Enter the bank transfer reference.');
  if(p.kind==='Receipt' && b.status==='Cancelled') throw new Error('Cancelled bookings cannot receive new payments.');
  if(p.kind==='Receipt' && p.amount>b.total-b.paid) throw new Error('Payment exceeds the outstanding balance.');
  if(p.kind==='Refund' && p.amount>b.paid) throw new Error('Refund exceeds the net amount received.');
  return p;
}
