import { useEffect, useState } from 'react';
import { holdsSlot, type Booking } from '../../shared/bookings';
import BookingsWorkspace, { money } from './BookingsWorkspace';
import { bookingApi } from './booking-api';
const pakistanDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function LiveOperations({view}:{view:'overview'|'bookings'|'calendar'}){
 const [rows,setRows]=useState<Booking[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[id,setId]=useState<string>();
 const [month,setMonth]=useState(()=>pakistanDay().slice(0,7));
 async function refresh(){setError('');try{setRows(await bookingApi());}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 useEffect(()=>{setId(undefined);void refresh();},[view]);
 if(loading)return <p role="status">Loading saved bookings…</p>;
 if(error)return <div className="booking-workspace ops-panel"><h1>Booking workspace</h1><p role="alert">{error}</p><a className="ops-button ops-button--gold" href="/admin/login" target="_blank" rel="noreferrer">Sign in</a> <button className="ops-button ops-button--quiet" onClick={refresh}>Retry connection</button></div>;
 const change=(b:Booking)=>setRows(all=>[b,...all.filter(r=>r.id!==b.id)].sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)));
 if(view==='bookings'||id)return <BookingsWorkspace rows={rows} onChange={change} initialId={id} onClose={()=>setId(undefined)} />;
 const today=pakistanDay();const active=rows.filter(b=>b.status!=='Cancelled');const upcoming=active.filter(b=>b.date>=today&&holdsSlot(b));
 const selected=view==='calendar'?rows.filter(b=>b.date.startsWith(month)||b.endDate?.startsWith(month)):rows;
 return <div className="booking-workspace"><div className="ops-page-heading"><div><h1>{view==='calendar'?'Booking calendar':'Venue overview'}</h1><p>Saved booking records · Pakistan time · {today}</p></div><button className="ops-button ops-button--quiet" onClick={refresh}>Refresh</button></div>{view==='overview'?<div className="booking-stats"><div><span>Upcoming reservations</span><strong>{upcoming.length}</strong></div><div><span>Open enquiries</span><strong>{rows.filter(b=>b.status==='Enquiry').length}</strong></div><div><span>Net received (all bookings)</span><strong>{money(rows.reduce((s,b)=>s+b.paid,0))}</strong></div><div><span>Outstanding (excluding cancelled)</span><strong>{money(active.reduce((s,b)=>s+b.total-b.paid,0))}</strong></div></div>:<label>Event month<input type="month" value={month} onChange={e=>setMonth(e.target.value)} /></label>}
 <section className="ops-panel"><h2>{view==='calendar'?'Scheduled events':'Booking register'}</h2><p>Enquiries do not reserve a hall. Expired holds release availability automatically.</p><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Date / time</th><th>Customer</th><th>Hall</th><th>Status</th><th>Net received</th><th>Details</th></tr></thead><tbody>{selected.map(b=><tr key={b.id}><td>{b.date}<br/>{b.start}–{b.end}{b.endDate&&b.endDate!==b.date?` (${b.endDate})`:''}</td><td><strong>{b.customer}</strong><span>{b.reference}</span></td><td>{b.hall}</td><td>{b.status==='Hold'&&!holdsSlot(b)?'Expired hold':b.status}</td><td>{money(b.paid)}</td><td><button className="ops-button ops-button--quiet" onClick={()=>setId(b.id)}>Open booking</button></td></tr>)}</tbody></table></div>{!selected.length&&<p>No bookings recorded{view==='calendar'?' for this month':''}. Create a record in Bookings.</p>}</section></div>;
}
