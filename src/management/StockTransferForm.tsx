import { useEffect,useRef,useState,type FormEvent } from 'react';
import type { InventoryData } from '../../shared/inventory';
import { pkToday } from '../../shared/staff';
import { staffApi } from './staff-api';

export default function StockTransferForm({items,onSaved,onCancel}:{items:InventoryData['items'];onSaved:()=>void;onCancel:()=>void}){
 const [fromId,setFromId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const key=useRef(crypto.randomUUID()),pending=useRef<unknown>(null),heading=useRef<HTMLHeadingElement>(null);
 const from=items.find(i=>i.id===fromId);
 const destinations=items.filter(i=>from&&i.location!==from.location&&i.name.trim().toLowerCase()===from.name.trim().toLowerCase()&&i.category===from.category&&i.unit.trim().toLowerCase()===from.unit.trim().toLowerCase());
 useEffect(()=>{
  heading.current?.focus();const guard=(e:Event)=>{if(busy||!window.confirm('Discard the unsaved transfer?'))e.preventDefault();};
  const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
  window.addEventListener('operations:navigate',guard);window.addEventListener('beforeunload',unload);
  return()=>{window.removeEventListener('operations:navigate',guard);window.removeEventListener('beforeunload',unload);};
 },[busy]);
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');const f=new FormData(e.currentTarget);
  pending.current??={id:key.current,entry:{itemId:fromId,destinationId:f.get('destination'),quantity:Number(f.get('quantity')),date:f.get('date'),reference:f.get('reference'),note:f.get('note')}};
  try{await staffApi('stock-transfer',pending.current);onSaved();}catch(e){setError((e as Error).message);setBusy(false);}
 }
 return <section className="ops-panel"><h2 ref={heading} tabIndex={-1}>Transfer stock</h2><p>Record items physically moved between locations. Both stock counts update together.</p>
  {error&&<p role="alert" className="booking-error">{error}</p>}
  <form onSubmit={save} className="booking-fields"><fieldset disabled={busy||!!pending.current}>
   <label>From item / location<select required value={fromId} onChange={e=>setFromId(e.target.value)}><option value="">Choose source stock</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} · {i.location} · {i.available} usable</option>)}</select></label>
   <label>To item / location<select name="destination" key={fromId} required><option value="">Choose destination stock</option>{destinations.map(i=><option key={i.id} value={i.id}>{i.name} · {i.location} · {i.sku}</option>)}</select></label>
   <label>Quantity<input name="quantity" required type="number" min="1" max={from?.available||1000000} step="1"/></label>
   <label>Actual transfer date<input name="date" required type="date" max={pkToday()} defaultValue={pkToday()}/></label>
   <label>Paper slip / gate pass (optional)<input name="reference" maxLength={160}/></label><label>Reason / details<textarea name="note" required minLength={3} maxLength={1000}/></label>
  </fieldset>{from&&!destinations.length&&<p>Add an item at the destination with the same name, category and unit, then return here.</p>}
  <div className="booking-actions"><button className="ops-button ops-button--gold" disabled={busy}>{busy?'Saving…':pending.current?'Retry same transfer':'Save transfer'}</button><button className="ops-button ops-button--quiet" type="button" disabled={busy} onClick={()=>{if(window.confirm('Discard the unsaved transfer?'))onCancel();}}>Cancel</button></div>
  {!!pending.current&&<p>Your transfer is retained for retry. Check saved history before starting a replacement.</p>}
  </form></section>;
}
