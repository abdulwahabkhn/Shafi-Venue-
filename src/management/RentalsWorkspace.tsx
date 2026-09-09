import { useEffect,useRef,useState,type FormEvent } from 'react';
import { rentalBalance,rentalSourceRemaining,type RentalData,type RentalEvent } from '../../shared/rentals';
import { halls,pkToday } from '../../shared/staff';
import { reservedHalls } from '../../shared/halls';
import type { Booking } from '../../shared/bookings';
import { staffApi } from './staff-api';
import { bookingApi } from './booking-api';
import { useActor } from './StaffAccess';
import './bookings.css';

export default function RentalsWorkspace(){
 const actor=useActor(),canWrite=actor.role!=='Accountant',canResolve=['Director','GM'].includes(actor.role);
 const [data,setData]=useState<RentalData>({rentals:[],events:[]}),[bookings,setBookings]=useState<Booking[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [query,setQuery]=useState(''),[openOnly,setOpenOnly]=useState(true),[adding,setAdding]=useState(false),[selected,setSelected]=useState(''),[moving,setMoving]=useState(false);
 const [hall,setHall]=useState(actor.hall||'Hall 1'),[kind,setKind]=useState<RentalEvent['kind']>('Return'),[sourceId,setSourceId]=useState('');
 const key=useRef(crypto.randomUUID()),pending=useRef<unknown>(null),heading=useRef<HTMLHeadingElement>(null);
 const rental=data.rentals.find(r=>r.id===selected),dirty=adding||moving;
 async function load(){
  setError('');try{const [records,events]=await Promise.all([staffApi<RentalData>('rentals'),bookingApi()]);setData(records);setBookings(events);}
  catch(e){setError((e as Error).message);}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 useEffect(()=>{if(dirty)heading.current?.focus();},[adding,moving]);
 useEffect(()=>{
  const guard=(e:Event)=>{if(busy||(dirty&&!window.confirm('Discard the unsaved rental record?')))e.preventDefault();};
  const unload=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};
  window.addEventListener('operations:navigate',guard);window.addEventListener('beforeunload',unload);
  return()=>{window.removeEventListener('operations:navigate',guard);window.removeEventListener('beforeunload',unload);};
 },[dirty,busy]);
 function begin(id?:string){key.current=crypto.randomUUID();pending.current=null;setError('');setMessage('');setSourceId('');setKind('Return');setSelected(id||'');setAdding(!id);setMoving(!!id);}
 function cancel(){if(window.confirm('Discard the unsaved rental record?')){setAdding(false);setMoving(false);pending.current=null;}}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');const f=new FormData(e.currentTarget);
  pending.current??={id:key.current,entry:adding?{supplier:f.get('supplier'),phone:f.get('phone'),item:f.get('item'),unit:f.get('unit'),quantity:Number(f.get('quantity')),hall,bookingId:f.get('bookingId')||null,received:f.get('received'),due:f.get('due'),reference:f.get('reference'),note:f.get('note')}:{rentalId:selected,kind,sourceId:sourceId||null,quantity:Number(f.get('quantity')),date:f.get('date'),reference:f.get('reference'),note:f.get('note')}};
  try{await staffApi(adding?'rentals':'rental-event',pending.current);pending.current=null;setAdding(false);setMoving(false);setMessage('Rental record saved.');await load();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const sources=data.events.filter(e=>e.rentalId===selected&&rentalSourceRemaining(e,data.events)>0&&(kind==='Return'||kind==='Repair'?e.kind==='Damage':kind==='Recover'?e.kind==='Loss':['Damage','Loss'].includes(e.kind)));
 const needsSource=['Repair','Recover','Supplier settlement'].includes(kind);
 const rows=data.rentals.map(r=>({...r,...rentalBalance(r,data.events)})).filter(r=>(!openOnly||r.outstanding>0)&&`${r.supplier} ${r.item} ${r.hall} ${r.reference} ${r.bookingReference}`.toLowerCase().includes(query.toLowerCase()));
 if(loading)return <p role="status">Loading rental records…</p>;
 return <div className="booking-workspace">
  <div className="ops-page-heading"><div><h1>Supplier rentals</h1><p>Track hired crockery, furniture and equipment from arrival to supplier return.</p></div><button className="ops-button ops-button--quiet" disabled={busy||dirty} onClick={load}>Refresh</button></div>
  {error&&<p role="alert" className="booking-error">{error}</p>}{message&&<p role="status" className="booking-success">{message}</p>}
  {!dirty&&<div className="booking-actions">{canWrite&&<button className="ops-button ops-button--gold" onClick={()=>begin()}>Receive rental items</button>}<button className="ops-button ops-button--quiet" onClick={()=>window.print()}>Print rental register</button><label>Find rental<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Supplier, item or booking"/></label><label>Show<select value={openOnly?'open':'all'} onChange={e=>setOpenOnly(e.target.value==='open')}><option value="open">Outstanding items</option><option value="all">All rentals</option></select></label></div>}
  {dirty&&<section className="ops-panel"><h2 ref={heading} tabIndex={-1}>{adding?'Receive rental items':`Record return or incident — ${rental?.item}`}</h2>
   {adding?<p>Enter one item type per receipt. Use the same supplier slip reference for related items.</p>:<p>{rental?.supplier} · {rental?.hall} · {rental?.reference}</p>}
   <form key={key.current} onSubmit={save} className="booking-fields"><fieldset disabled={busy||!!pending.current}>
    {adding?<>
     <label>Supplier name<input name="supplier" required minLength={2} maxLength={160}/></label><label>Supplier phone (optional)<input name="phone" type="tel" maxLength={30}/></label>
     <label>Item description<input name="item" required minLength={2} maxLength={160} placeholder="White dinner plates"/></label><label>Unit<input name="unit" required maxLength={30} defaultValue="pieces"/></label>
     <label>Receiving hall<select value={hall} onChange={e=>setHall(e.target.value as typeof hall)} disabled={actor.role==='Hall manager'}>{halls.map(h=><option key={h}>{h}</option>)}</select></label>
     <label>Booking (optional)<select key={hall} name="bookingId"><option value="">General hall use</option>{bookings.filter(b=>reservedHalls(b.hall).includes(hall)&&b.status!=='Cancelled').map(b=><option key={b.id} value={b.id}>{b.reference} · {b.customer} · {b.date}</option>)}</select></label>
     <label>Date received<input name="received" type="date" required max={pkToday()} defaultValue={pkToday()}/></label><label>Return due date<input name="due" type="date" required defaultValue={pkToday()}/></label>
    </>:<>
     <label>Movement<select value={kind} onChange={e=>{setKind(e.target.value as RentalEvent['kind']);setSourceId('');}}>{(['Return','Damage','Loss',...(canResolve?['Repair','Recover','Supplier settlement']:[])] as RentalEvent['kind'][]).map(k=><option key={k}>{k}</option>)}</select></label>
     <label>Actual date<input name="date" type="date" required min={rental?.received} max={pkToday()} defaultValue={pkToday()}/></label>
     {(needsSource||kind==='Return')&&<label>{kind==='Return'?'Items being returned':'Original incident'}<select required={needsSource} value={sourceId} onChange={e=>setSourceId(e.target.value)}><option value="">{kind==='Return'?'Usable items':'Choose incident'}</option>{sources.map(s=><option key={s.id} value={s.id}>{s.kind} · {s.date} · {rentalSourceRemaining(s,data.events)} unresolved · {s.id.slice(0,8)}</option>)}</select></label>}
    </>}
    <label>Quantity<input name="quantity" type="number" required min="1" max="1000000" step="1"/></label>
    <label>Supplier slip / gate pass reference{!adding&&!['Return','Supplier settlement'].includes(kind)?' (optional)':''}<input name="reference" required={adding||['Return','Supplier settlement'].includes(kind)} minLength={adding?2:undefined} maxLength={160}/></label>
    <label>Details{adding?' (optional)':''}<textarea name="note" required={!adding} minLength={adding?undefined:3} maxLength={1000}/></label>
   </fieldset>
   {kind==='Supplier settlement'&&!adding&&<p>Record the supplier’s agreed resolution for damaged or missing items. Include the agreement in the details and record any actual payment in Cash & expenses.</p>}
   <div className="booking-actions"><button className="ops-button ops-button--gold" disabled={busy}>{busy?'Saving…':pending.current?'Retry same record':adding?'Save receipt':'Save movement'}</button><button className="ops-button ops-button--quiet" type="button" disabled={busy} onClick={cancel}>Cancel</button></div>
   {!!pending.current&&<p>Your entry is retained for retry. Check saved records before cancelling an uncertain save.</p>}
   </form></section>}
  <section className="ops-panel"><h2>Rental register</h2><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Supplier / item</th><th>Hall / booking</th><th>Received / due</th><th>Held usable</th><th>Damaged / missing</th><th>Returned / settled</th><th>Action</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>
   <td><strong>{r.supplier}</strong><span>{r.item} · {r.quantity} {r.unit}</span><span>{r.reference}</span>{r.phone&&<span>{r.phone}</span>}</td><td>{r.hall}<span>{r.bookingReference||'General use'}</span></td>
   <td>{r.received}<span>Due {r.due}</span>{r.outstanding>0&&r.due<pkToday()&&<strong>Overdue</strong>}{r.outstanding===0&&<span>Resolved</span>}</td><td>{r.usable}</td><td>{r.damaged} damaged<span>{r.missing} missing</span></td><td>{r.returned} returned<span>{r.settled} settled</span></td>
   <td><button className="ops-text-button" disabled={dirty} onClick={()=>setSelected(r.id)}>View history</button>{canWrite&&r.outstanding>0&&<button className="ops-button ops-button--quiet" disabled={dirty||busy} onClick={()=>begin(r.id)}>Return / incident</button>}</td>
  </tr>)}</tbody></table></div>{!rows.length&&<p>{data.rentals.length?'No rentals match the current filters.':'No hired items recorded yet. Start with “Receive rental items” when goods arrive.'}</p>}</section>
  {rental&&<section className="ops-panel"><h2>{rental.item} — history</h2><p>{rental.note||'No receipt notes.'} Received by {rental.actor}.</p><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Date</th><th>Movement</th><th>Quantity</th><th>Details / reference</th><th>Recorded by</th></tr></thead><tbody>{data.events.filter(e=>e.rentalId===selected).map(e=><tr key={e.id}><td>{e.date}</td><td>{e.kind}</td><td>{e.quantity}</td><td>{e.note}<span>{e.reference}</span></td><td>{e.actor}</td></tr>)}</tbody></table></div>{!data.events.some(e=>e.rentalId===selected)&&<p>No returns or incidents recorded for this receipt.</p>}</section>}
  <p className="booking-note">Record rental costs and bills in Cash & expenses. Hired items remain in this register until returned or settled with the supplier. Rental waiters are recorded under Employees.</p>
 </div>;
}
