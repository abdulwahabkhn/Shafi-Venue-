import { useEffect,useState } from 'react';
import { pkToday } from '../../shared/staff';
import type { MonthSummary } from '../../shared/registers';
import { staffApi } from './staff-api';
import { money } from './BookingsWorkspace';
export default function MonthlyDashboard() {
 const [month,setMonth]=useState(pkToday().slice(0,7)),[data,setData]=useState<MonthSummary>();
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let active=true;setLoading(true);setError('');setData(undefined);
  staffApi<MonthSummary>('monthly-summary',undefined,{month})
   .then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[month,refresh]);
 return <div className="booking-workspace">
  <div className="ops-page-heading"><div><h1>Monthly overview</h1><p>Booking income, daily spending and employee leave records.</p></div><button className="ops-button ops-button--quiet" disabled={loading} onClick={()=>setRefresh(v=>v+1)}>Refresh</button></div>
  <label>Month<input type="month" value={month} max={pkToday().slice(0,7)} onInput={e=>{if(e.currentTarget.value)setMonth(e.currentTarget.value);}}/></label>
  {error&&<p className="booking-error" role="alert">Could not load {month}. {error} Use Refresh to try again.</p>}
  {loading?<p role="status">Loading monthly totals…</p>:!error&&data?.month===month&&<>
   <div className="booking-stats"><div><span>Booking receipts</span><strong>{money(data.receipts)}</strong></div><div><span>Refunds</span><strong>{money(data.refunds)}</strong></div><div><span>Net booking income</span><strong>{money(data.netReceipts)}</strong></div><div><span>Bookings in {month}</span><strong>{data.bookings}</strong></div></div>
   <section className="ops-panel"><h2>Expense report</h2><p>Selected month ({month}): <strong>{money(data.expenses)}</strong></p><p>Previous month ({data.previousMonth}): {money(data.previousExpenses)}</p>
    <p>{data.changePercent===null?(data.expenses?'No percentage comparison: previous month had no expenses.':'No expenses in either month.'):data.changePercent===0?'No change':`${Math.abs(data.changePercent)}% ${data.changePercent>0?'more':'less'} than the previous month`}</p>
    <p>{month===pkToday().slice(0,7)?'Spending so far this month is compared with the whole previous month.':'Recorded spending is compared across these two complete months.'} Employee payments are recorded separately.</p>
   </section>
   <section className="ops-panel"><h2>Employees above four monthly leaves</h2><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Employee</th><th>Leaves</th><th>Above allowance</th></tr></thead><tbody>{data.leaves.map(e=><tr key={e.id}><td>{e.name}</td><td>{e.leaves}</td><td>{e.excess}</td></tr>)}</tbody></table></div>
    {!data.leaves.length&&<p>No employees have more than four recorded leaves in {month}.</p>}<p>Only attendance marked Leave counts here. No salary is deducted automatically.</p>
   </section><p>Booking income means money received in the selected month, less refunds. Unpaid booking balances are excluded.</p>
  </>}
 </div>;
}
