import { useEffect, useState } from 'react';
import type { FundingSummary } from '../../shared/funding';
import { isAccountantLike, permissionEnabled } from '../../shared/staff';
import { useActor } from './StaffAccess';
import { staffApi } from './staff-api';

export default function FundingBalance(){
 const actor=useActor(),allowed=permissionEnabled(actor,'expenseView');
 const [data,setData]=useState<FundingSummary>(),[error,setError]=useState(false);
 useEffect(()=>{
  if(!allowed)return;
  let disposed=false,version=0;
  async function load(){const current=++version;try{const next=await staffApi<FundingSummary>('funding');if(!disposed&&version===current){setData(next);setError(false);}}catch{if(!disposed&&version===current){setData(undefined);setError(true);}}}
  const visible=()=>{if(document.visibilityState==='visible')void load();};
  void load();window.addEventListener('operations:funding-changed',visible);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  const timer=window.setInterval(visible,60000);
  return()=>{disposed=true;window.clearInterval(timer);window.removeEventListener('operations:funding-changed',visible);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[allowed,actor.id]);
 if(!allowed)return null;
 const accountant=isAccountantLike(actor),amount=data&&(accountant?data.remaining:data.totalIssued);
 const format=(value:number)=>`${value<0?'- ':''}PKR ${Math.abs(value).toLocaleString('en-PK')}`;
 return <div className="ops-funding-summary"><div className="ops-funding-balance"><span>{accountant?'Amount to be spent':'Amount issued'}</span>{error?<span role="status">Balance unavailable. Refresh to retry.</span>:amount===undefined?<span>Loading balance…</span>:<><strong>{format(amount)}</strong><small>{accountant?(amount<0?'Shortfall carried forward':'Available across cash and bank'):'Total issued across cash and bank'}</small></>}</div><div className="ops-funding-balance"><span>Total expense</span>{error||data===undefined?<span>{error?'Balance unavailable. Refresh to retry.':'Loading total…'}</span>:<><strong>{format(data.totalExpense)}</strong><small>All saved expenses through today</small></>}</div></div>;
}
