import { createContext, useContext, useEffect, useState, useRef, type FormEvent, type ReactNode } from 'react';
import type { Actor, StaffUser, AccountantPermissionKey, AccountantPermissions } from '../../shared/staff';
import { accountantPermissionGroups, accountantPermissionKeys, permissionEnabled, isBuiltInRole } from '../../shared/staff';
import { staffApi } from './staff-api';
import './bookings.css';
import './account-permissions.css';
const Context=createContext<Actor|null>(null);
export const useActor=()=>useContext(Context)!;
export function StaffAccess({children}:{children:ReactNode}){
 const [actor,setActor]=useState<Actor|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const refresh=()=>{setLoading(true);setError('');staffApi<Actor>('session').then(setActor).catch(e=>{if(e.status!==401)setError(e.message);}).finally(()=>setLoading(false));};
 useEffect(refresh,[]);
 async function login(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setError('');try{setActor(await staffApi('login',{username:data.get('username'),password:data.get('password')}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(loading)return <p className="staff-loading" role="status">Opening staff portal…</p>;
 if(!actor)return <main className="staff-login booking-workspace"><h1>Staff portal</h1><p>Shafi Complex & Marquee</p>{error&&<p className="booking-error" role="alert">{error}</p>}<form onSubmit={login}><label>Username<input required name="username" autoComplete="username" maxLength={60}/></label><label>Password<input required name="password" type="password" autoComplete="current-password" maxLength={128}/></label><button className="ops-button ops-button--gold" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form><p><a href="/admin/login" onClick={e=>{e.preventDefault();void staffApi('logout',{}).then(()=>window.location.assign('/admin/login')).catch(e=>setError(e.message));}}>Director / existing owner sign-in</a></p><button className="ops-button ops-button--quiet" onClick={refresh}>Check existing sign-in</button></main>;
 return <Context.Provider value={actor}>{children}</Context.Provider>;
}
export async function logoutStaff(){
 await staffApi('logout',{});
 await fetch('/api/cms?action=logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 window.location.assign('/management');
}
const permissionLabels:Record<AccountantPermissionKey,string>={
 booking:'View, add and edit bookings',bookingReceipt:'Record receipts',bookingRefund:'Record refunds',
 inventoryView:'View inventory',inventoryAdd:'Add items and quantities',inventoryRemove:'Remove items and quantities',inventoryDamage:'Record damage',inventoryReplace:'Record replacements',
 expenseView:'View expense sheet',expenseAdd:'Add expenses',expenseRemove:'Remove expenses',
 employeeView:'View employees',employeeAdd:'Add and edit employees',employeeRemove:'Change employment status',
 employeeSalary:'Record salary and wages',employeeAdvance:'Record advances and repayments',
 attendanceView:'View attendance',attendanceEdit:'Mark and edit attendance',
 overviewView:'View monthly overview',reportsView:'View and print reports',websiteManage:'Manage website content',staffManage:'Manage subordinate accounts'
};
const parentPermission:Partial<Record<AccountantPermissionKey,AccountantPermissionKey>>={
 bookingReceipt:'booking',bookingRefund:'booking',
 inventoryAdd:'inventoryView',inventoryRemove:'inventoryView',inventoryDamage:'inventoryView',inventoryReplace:'inventoryView',
 expenseAdd:'expenseView',expenseRemove:'expenseView',
 employeeAdd:'employeeView',employeeRemove:'employeeView',employeeSalary:'employeeView',employeeAdvance:'employeeView',attendanceEdit:'attendanceView'
};
function permissionDefaults(role:string,permissions?:AccountantPermissions):AccountantPermissions{
 return Object.fromEntries(accountantPermissionKeys.map(key=>[key,permissionEnabled({role,permissions},key as AccountantPermissionKey)]));
}
export function AccountsWorkspace(){
 const actor=useActor(),key=useRef<string>(crypto.randomUUID());
 const [rows,setRows]=useState<StaffUser[]>([]),[loading,setLoading]=useState(true),[editing,setEditing]=useState(false),[selected,setSelected]=useState<StaffUser|null>(null);
 const [roleChoice,setRoleChoice]=useState('Accountant'),[customRole,setCustomRole]=useState(''),[permissions,setPermissions]=useState<AccountantPermissions>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const canManage=permissionEnabled(actor,'staffManage'),director=actor.role==='Director';
 const load=async()=>{setLoading(true);try{setRows(await staffApi<StaffUser[]>('users'));}catch(e){setError((e as Error).message);}finally{setLoading(false);}};
 useEffect(()=>{if(canManage)void load();else setLoading(false);},[canManage]);
 useEffect(()=>{const guard=(e:Event)=>{if(busy||(editing&&!window.confirm('Discard this unsaved account form?')))e.preventDefault();};window.addEventListener('operations:navigate',guard);return()=>window.removeEventListener('operations:navigate',guard);},[editing,busy]);
 const restrictGrant=(value:AccountantPermissions)=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k,!!v&&permissionEnabled(actor,k as AccountantPermissionKey)]));
 function begin(user:StaffUser|null){
  key.current=user?.id||crypto.randomUUID();setSelected(user);
  const role=user?.role||'Accountant';setRoleChoice(isBuiltInRole(role)?role:'__new__');setCustomRole(isBuiltInRole(role)?'':role);
  setPermissions(restrictGrant(permissionDefaults(role,user?.permissions)));setError('');setMessage('');setEditing(true);
 }
 function changeRole(role:string){setRoleChoice(role);setPermissions(restrictGrant(permissionDefaults(role==='__new__'?'Custom role':role)));}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget),role=roleChoice==='__new__'?customRole.trim():roleChoice;
  if(roleChoice==='__new__'&&isBuiltInRole(role)){setError('Choose a built-in role from the role list instead.');return;}
  setBusy(true);setError('');
  try{
   await staffApi('users',{id:key.current,entry:{name:f.get('name'),username:f.get('username'),role,hall:null,active:f.get('active')==='on',permissions:role==='Director'?{}:permissions,...(f.get('password')?{password:f.get('password')}:{})}});
   setEditing(false);setMessage('Access saved. This account must sign in again to use its updated permissions.');
   if(selected?.id===actor.id){window.location.reload();return;}await load();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 if(!canManage)return <p role="alert">Permission center access is not enabled for this account.</p>;
 return <div className="booking-workspace">
  <div className="ops-page-heading"><div><h1>Permission center</h1><p>{director?'You have full access. Control GM, Accountant and custom-role accounts here.':'Manage Accountant and custom-role access within the permissions the Director has given you.'}</p></div><button className="ops-button ops-button--gold" disabled={busy||editing||loading} onClick={()=>begin(null)}>Add account</button></div>
  {error&&<p role="alert" className="booking-error">{error}</p>}{message&&<p role="status" className="booking-success">{message}</p>}
  {editing&&<section className="ops-panel"><h2>{selected?'Edit '+selected.name:'Add account'}</h2>
   <form onSubmit={save} className="booking-fields" key={key.current}><fieldset disabled={busy}>
    <label>Full name<input name="name" required minLength={2} maxLength={120} defaultValue={selected?.name}/></label>
    <label>Username<input name="username" required pattern="[a-z0-9._-]{3,60}" maxLength={60} defaultValue={selected?.username} autoComplete="off"/></label>
    <label>Role<select value={roleChoice} disabled={selected?.id===actor.id} onChange={e=>changeRole(e.currentTarget.value)}><option>Accountant</option>{director&&<><option>GM</option><option>Director</option></>}<option value="__new__">Add new role…</option></select></label>
    {roleChoice==='__new__'&&<label>New role name<input required minLength={2} maxLength={60} value={customRole} onChange={e=>setCustomRole(e.currentTarget.value)} placeholder="e.g. Operations assistant"/></label>}
    <label>{selected?'New password (leave empty to keep)':'Password'}<input name="password" type="password" required={!selected} minLength={8} maxLength={128} autoComplete="new-password"/></label>
    <label className="account-active"><input type="checkbox" name="active" defaultChecked={selected?.active??true} onChange={e=>{if(selected?.id===actor.id&&!e.currentTarget.checked){e.currentTarget.checked=true;setError('You cannot disable your own account.');}}}/>Account active</label>
    {roleChoice==='Director'?<p className="booking-success">Director has full access to every module and the permission center. These permissions cannot be switched off.</p>:<PermissionMatrix role={roleChoice} permissions={permissions} onChange={setPermissions} actor={actor}/>}
   </fieldset><div className="booking-actions"><button className="ops-button ops-button--gold" disabled={busy}>{busy?'Saving access…':'Save account'}</button><button type="button" className="ops-button ops-button--quiet" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button></div></form>
  </section>}
  {loading?<p role="status">Loading staff accounts…</p>:<section className="ops-panel"><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Access</th></tr></thead><tbody>{rows.filter(u=>u.role!=='Hall manager').map(u=><tr key={u.id}><td>{u.name}</td><td>{u.username}</td><td>{u.role}</td><td>{u.active?'Active':'Disabled'}</td><td>{director||!['Director','GM'].includes(u.role)?<button className="ops-button ops-button--quiet" disabled={busy||editing} onClick={()=>begin(u)}>Edit access</button>:<span>Director controlled</span>}</td></tr>)}</tbody></table></div>{!rows.length&&<p>No staff accounts yet. Add an account to assign access.</p>}</section>}
 </div>;
}
function PermissionMatrix({role,permissions,onChange,actor}:{role:string;permissions:AccountantPermissions;onChange:(v:AccountantPermissions)=>void;actor:Actor}){
 function toggle(keys:readonly AccountantPermissionKey[],checked:boolean){
  const next={...permissions};
  for(const key of keys){
   if(!permissionEnabled(actor,key))continue;
   next[key]=checked;
   if(checked&&parentPermission[key])next[parentPermission[key]!]=true;
   if(!checked)for(const [child,parent] of Object.entries(parentPermission))if(parent===key)next[child as AccountantPermissionKey]=false;
  }
  onChange(next);
 }
 return <div className="account-permissions"><strong>{role==='GM'?'GM':'Account'} permissions</strong><p>Select All for a category, or choose individual actions. Editing actions also enable the viewing access they need. Voiding employee payments requires both salary and advance access.</p>
 {Object.entries(accountantPermissionGroups).map(([group,groupKeys])=>{
  const keys=groupKeys.filter(k=>k!=='staffManage'||role==='GM');
  if(!keys.length)return null;
  const available=keys.filter(k=>permissionEnabled(actor,k)),all=keys.every(k=>permissions[k]),some=keys.some(k=>permissions[k]);
  return <fieldset key={group} className="permission-group"><legend>{group}</legend>
   <label className="permission-all"><input type="checkbox" aria-label={'All '+group+' permissions'} checked={all} ref={el=>{if(el)el.indeterminate=some&&!all;}} disabled={!available.length} onChange={e=>toggle(available,e.currentTarget.checked)}/>All</label>
   {keys.map(k=><label key={k}><input type="checkbox" checked={!!permissions[k]} disabled={!permissionEnabled(actor,k)} onChange={e=>toggle([k],e.currentTarget.checked)}/>{permissionLabels[k]}</label>)}
  </fieldset>;
 })}
 </div>;
}
