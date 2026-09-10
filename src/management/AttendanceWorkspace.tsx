import { useEffect, useRef, useState, type FormEvent } from 'react';
import { effectiveRole, isAccountantLike, permissionEnabled, pkToday, type Attendance } from '../../shared/staff';
import AttendanceList, { type AttendanceEmployee } from './AttendanceList';
import { staffApi } from './staff-api';
import { useActor } from './StaffAccess';

type Records={employees:AttendanceEmployee[];attendance:Attendance[]};
export default function AttendanceWorkspace(){
 const actor=useActor();
 const editable=effectiveRole(actor.role)==='GM'||isAccountantLike(actor)&&permissionEnabled(actor,'attendanceEdit');
 const [data,setData]=useState<Records>({employees:[],attendance:[]}),[day,setDay]=useState(pkToday()),[selected,setSelected]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const lock=useRef(false);
 const [tab,setTab]=useState<'Attendance'|'Employee list'>('Attendance');
 async function load(){setLoading(true);setError('');try{setData(await staffApi<Records>('attendance'));}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 const existing=data.attendance.find(a=>a.employeeId===selected&&a.date===day);
 async function mark(employeeId:string,status:Attendance['status'],note?:string){
  if(lock.current||!editable)return;lock.current=true;setBusy(true);setError('');setMessage('');
  const old=data.attendance.find(a=>a.employeeId===employeeId&&a.date===day);
  try{const saved=await staffApi<Attendance>('attendance',{id:old?.id||crypto.randomUUID(),version:old?.version,entry:{employeeId,date:day,status,note:note??old?.note??'',bookingId:old?.bookingId||null}});
   setData(d=>({...d,attendance:[...d.attendance.filter(a=>!(a.employeeId===employeeId&&a.date===day)),saved]}));setMessage('Attendance saved. No salary deduction was applied.');
  }catch(e){setError((e as Error).message+' Refresh before retrying.');}finally{lock.current=false;setBusy(false);}
 }
 function details(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);void mark(selected,f.get('status') as Attendance['status'],String(f.get('note')||''));}
 return <div className="booking-workspace"><div className="ops-page-heading"><div><h1>Attendance</h1><p>Record daily employee attendance. Four leaves are allowed per calendar month; deductions remain the GM’s decision.</p></div><button className="ops-button ops-button--quiet" disabled={busy||loading} onClick={load}>Refresh</button></div>
 {error&&<p role="alert" className="booking-error">{error}</p>}{message&&<p role="status" className="booking-success">{message}</p>}
 <div className="booking-actions" role="group" aria-label="Employee attendance sections">{(['Attendance','Employee list'] as const).map(t=><button key={t} type="button" className={`ops-button ${tab===t?'ops-button--gold':'ops-button--quiet'}`} aria-pressed={tab===t} disabled={busy} onClick={()=>{setTab(t);setSelected('');}}>{t}</button>)}</div>
 {loading?<p role="status">Loading attendance…</p>:tab==='Employee list'?<section className="ops-panel"><h2>Employee list</h2><p>Employee records are maintained by the GM. Select Attendance to mark daily presence.</p><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Name</th><th>Sector</th><th>Job title</th><th>Joined</th><th>Exited</th></tr></thead><tbody>{data.employees.map(e=><tr key={e.id}><td>{e.name}</td><td>{e.sector}</td><td>{e.title}</td><td>{e.joined}</td><td>{e.exited||'—'}</td></tr>)}</tbody></table></div>{!data.employees.length&&<p>No employees yet. Ask the GM to add employees.</p>}</section>:<AttendanceList employees={data.employees} records={data.attendance} day={day} busy={busy} canEdit={editable&&!error} onDay={d=>{setDay(d);setSelected('');setMessage('');}} onMark={(employee,status)=>void mark(employee.id,status)} onDetails={setSelected}/>}
 {selected&&!loading&&<section className="ops-panel"><h2>{data.employees.find(e=>e.id===selected)?.name} — {day}</h2><form key={selected+day+existing?.version} onSubmit={details} className="booking-fields"><fieldset disabled={busy||!editable||!!error}><label>Status<select name="status" defaultValue={existing?.status||'Present'}>{['Present','Absent','Leave','Half day'].map(s=><option key={s}>{s}</option>)}</select></label><label>Note<input name="note" maxLength={500} defaultValue={existing?.note||''}/></label></fieldset><div className="booking-actions">{editable&&<button className="ops-button ops-button--gold" disabled={busy||!!error}>Save attendance</button>}<button type="button" className="ops-button ops-button--quiet" disabled={busy} onClick={()=>setSelected('')}>Close</button></div></form></section>}
 </div>;
}
