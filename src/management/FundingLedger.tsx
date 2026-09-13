import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { FundingEntry } from '../../shared/funding';
import { permissionEnabled, pkToday } from '../../shared/staff';
import { useActor } from './StaffAccess';
import { staffApi } from './staff-api';
import { money } from './BookingsWorkspace';

export default function FundingLedger({date,rows,onSaved,disabled,onEditingChange}:{date:string;rows:FundingEntry[];onSaved:()=>void;disabled:boolean;onEditingChange:(editing:boolean)=>void}) {
 const canIssue=permissionEnabled(useActor(),'expenseIssue');
 const [form,setForm]=useState<'issue'|FundingEntry|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[method,setMethod]=useState('Cash');
 const pending=useRef<unknown>(null),inFlight=useRef(false);
 useEffect(()=>{onEditingChange(!!form);return()=>onEditingChange(false);},[form,onEditingChange]);
 useEffect(()=>{setForm(null);setMessage('');setError('');pending.current=null;},[date]);
 useEffect(()=>{
  const guard=(e:Event)=>{if(busy||(form&&!window.confirm('Discard the unsaved funds form?')))e.preventDefault();};
  const unload=(e:BeforeUnloadEvent)=>{if(form){e.preventDefault();e.returnValue='';}};
  window.addEventListener('operations:navigate',guard);window.addEventListener('beforeunload',unload);
  return()=>{window.removeEventListener('operations:navigate',guard);window.removeEventListener('beforeunload',unload);};
 },[form,busy]);
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(inFlight.current||!form)return;
  const f=new FormData(e.currentTarget);
  pending.current??=form==='issue'?{id:crypto.randomUUID(),entry:{amount:Number(f.get('amount')),method:f.get('method'),purpose:f.get('purpose'),reference:f.get('reference')||''}}:{id:form.id,action:'remove',reason:f.get('reason')};
  inFlight.current=true;setBusy(true);setError('');
  try{await staffApi('funding',pending.current);pending.current=null;setForm(null);setMessage('Issued funds saved. The remaining balance has been recalculated.');onSaved();}
  catch(e){setError((e as Error).message);}finally{inFlight.current=false;setBusy(false);}
 }
 return <section className="ops-panel funding-ledger"><div className="ops-page-heading"><div><h2>Issued funds</h2><p>Shared expense funds for {date}. Issuing funds is not an expense or booking income.</p></div>{canIssue&&date===pkToday()&&!form&&<button className="ops-button ops-button--gold" disabled={disabled} onClick={()=>{pending.current=null;setMethod('Cash');setError('');setMessage('');setForm('issue');}}>Issue funds</button>}</div>
  {error&&<p role="alert" className="booking-error">{error}</p>}{message&&<p role="status" className="booking-success">{message}</p>}
  {form&&<form className="booking-fields" onSubmit={save}><h3>{form==='issue'?'Record funds issued':'Remove issued funds'}</h3><fieldset disabled={busy||!!pending.current}>{form==='issue'?<>
   <label>Amount issued (whole PKR)<input name="amount" type="number" min="1" max="1000000000" step="1" required/></label>
   <label>Issued by method<select name="method" value={method} onChange={e=>setMethod(e.target.value)}><option value="Cash">Petty cash</option><option value="Bank transfer">Bank transfer</option></select></label>
   <label>Purpose<input name="purpose" required minLength={2} maxLength={1000}/></label>
   <label>{method==='Bank transfer'?'Bank transfer reference':'Reference (optional)'}<input name="reference" required={method==='Bank transfer'} maxLength={160}/></label>
  </>:<><p>Remove {money(form.amount)} issued by {form.actor}. This reduces the available balance; the original record stays in history.</p><label>Reason for removal<input name="reason" required minLength={3} maxLength={1000}/></label></>}</fieldset><div className="booking-actions"><button className="ops-button ops-button--gold" disabled={busy}>{busy?'Saving…':pending.current?'Retry same entry':form==='issue'?'Record funds issued':'Confirm removal'}</button><button type="button" className="ops-button ops-button--quiet" disabled={busy} onClick={()=>{if(pending.current&&!window.confirm('The last request may have saved. Close and refresh before recording it again?'))return;pending.current=null;setForm(null);}}>Cancel</button></div></form>}
  {rows.length?<div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Issued by</th><th>Method</th><th>Amount</th><th>Purpose / reference</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.actor}</td><td>{r.method==='Cash'?'Petty cash':r.method}</td><td>{money(r.amount)}</td><td>{r.purpose}<span>{r.reference}</span></td><td>{r.removed?'Removed':canIssue&&r.canRemove?<button className="ops-button ops-button--quiet" disabled={!!form||busy||disabled} onClick={()=>{pending.current=null;setError('');setMessage('');setForm(r);}}>Remove issue</button>:'Recorded'}</td></tr>)}</tbody></table></div>:<p>No funds issued on this day.</p>}
 </section>;
}
