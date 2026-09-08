import type { Attendance, Employee } from '../../shared/staff';
import { pkToday } from '../../shared/staff';

export default function AttendanceList({employees,records,day,busy,canEdit,onDay,onMark,onDetails}:{employees:Employee[];records:Attendance[];day:string;busy:boolean;canEdit:boolean;onDay:(day:string)=>void;onMark:(employee:Employee,status:'Present'|'Absent')=>void;onDetails:(id:string)=>void}){
 const byEmployee=new Map(records.filter(a=>a.date===day).map(a=>[a.employeeId,a]));
 const eligible=employees.filter(e=>e.joined<=day&&(!e.exited||e.exited>=day));
 return <section className="ops-panel"><h2>Daily attendance</h2><p>Select Present or Absent to save immediately. Unmarked employees are not counted as absent. Salary is not deducted automatically.</p>
  <label>Attendance date<input type="date" required max={pkToday()} value={day} disabled={busy} onInput={e=>{if(e.currentTarget.value&&e.currentTarget.validity.valid)onDay(e.currentTarget.value);}}/></label>
  <p>{eligible.filter(e=>byEmployee.get(e.id)?.status==='Present').length} present · {eligible.filter(e=>byEmployee.get(e.id)?.status==='Absent').length} absent · {eligible.filter(e=>!byEmployee.has(e.id)).length} unmarked</p>
  <ul className="attendance-list" aria-label="Employee attendance">{eligible.map(e=>{const record=byEmployee.get(e.id);return <li key={e.id} className="attendance-row">
   <div><strong>{e.name}</strong><span>{e.sector} · {e.title}</span><span>{record?.status||'Not marked'}{record?` · ${record.actor}`:''}</span></div>
   <div className="attendance-actions" role="group" aria-label={`Attendance for ${e.name}`}>
    {canEdit&&(['Present','Absent'] as const).map(status=><button key={status} type="button" aria-pressed={record?.status===status} disabled={busy||record?.status===status} className={`ops-button ${record?.status===status?'ops-button--gold':'ops-button--quiet'}`} onClick={()=>onMark(e,status)}>{status}</button>)}
    <button type="button" className="ops-button ops-button--quiet" disabled={busy} onClick={()=>onDetails(e.id)}>Details</button>
   </div>
  </li>;})}</ul>
  {!eligible.length&&<p>No employees for this date. Add employees in the Directory to start recording attendance.</p>}
 </section>;
}
