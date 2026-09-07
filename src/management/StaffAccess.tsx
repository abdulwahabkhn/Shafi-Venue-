import { createContext, useContext, useEffect, useState, useRef, type FormEvent, type ReactNode } from 'react';
import type { Actor, StaffUser } from '../../shared/staff';
import { roles, halls } from '../../shared/staff';
import { staffApi } from './staff-api';
import './bookings.css';
const Context=createContext<Actor|null>(null);
export const useActor=()=>useContext(Context)!;
export function StaffAccess({children}:{children:ReactNode}){
 const [actor,setActor]=useState<Actor|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const refresh=()=>{setLoading(true);staffApi<Actor>('session').then(setActor).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
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
export function AccountsWorkspace(){
 const actor=useActor(),isGM=actor.role==='GM';
 const accountId=useRef(crypto.randomUUID());
 const [rows,setRows]=useState<StaffUser[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[selected,setSelected]=useState<StaffUser|null>(null),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[role,setRole]=useState<Actor['role']>('Hall manager');
 const load=()=>staffApi<StaffUser[]>('users').then(setRows).catch(e=>setError(e.message));useEffect(()=>{void load();},[]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const d=new FormData(e.currentTarget);try{await staffApi('users',{id:selected?.id||accountId.current,entry:{name:d.get('name'),username:d.get('username'),role,hall:role==='Hall manager'?d.get('hall'):null,active:isGM||d.get('active')==='on',...(d.get('password')?{password:d.get('password')}: {})}});setEditing(false);setMessage('Account saved. Existing sessions for this account were signed out.');await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="booking-workspace"><div className="ops-page-heading"><div><h1>{isGM?'Hall managers':'Staff accounts'}</h1><p>{isGM?'Add Hall managers and select the hall each person can access. Existing account changes remain with the Director.':'Set each person’s access. Employee records and login accounts are separate.'}</p></div><button className="ops-button ops-button--gold" onClick={()=>{accountId.current=crypto.randomUUID();setSelected(null);setRole('Hall manager');setEditing(true);}}>{isGM?'Add hall manager':'Add account'}</button></div>{error&&<p className="booking-error" role="alert">{error}</p>}{message&&<p className="booking-success" role="status">{message}</p>}
 {editing&&<section className="ops-panel"><h2>{selected?'Edit account':'New account'}</h2><form key={selected?.id||'new'} onSubmit={save} className="booking-fields"><fieldset disabled={busy}><label>Full name<input required name="name" defaultValue={selected?.name} maxLength={120}/></label><label>Username<input required name="username" pattern="[a-z0-9._-]{3,60}" defaultValue={selected?.username}/></label><label>Role<select disabled={isGM} value={role} onChange={e=>setRole(e.target.value as Actor['role'])}>{(isGM?['Hall manager']:roles).map(r=><option key={r}>{r}</option>)}</select></label>{role==='Hall manager'&&<label>Assigned hall<select name="hall" defaultValue={selected?.hall||'Hall 1'}>{halls.map(h=><option key={h}>{h}</option>)}</select></label>}<label>{selected?'New password (leave empty to keep)':'Password'}<input name="password" type="password" required={!selected} minLength={12} maxLength={128} autoComplete="new-password"/></label><label className="staff-check"><input type="checkbox" name="active" disabled={isGM} defaultChecked={selected?.active??true}/>Account active</label></fieldset><div className="booking-actions"><button className="ops-button ops-button--gold" disabled={busy}>Save account</button><button type="button" className="ops-button ops-button--quiet" onClick={()=>setEditing(false)}>Cancel</button></div></form></section>}
 <section className="ops-panel"><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Name</th><th>Username</th><th>Role / hall</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.filter(u=>!isGM||u.role==='Hall manager').map(u=><tr key={u.id}><td>{u.name}</td><td>{u.username}</td><td>{u.role}<span>{u.hall}</span></td><td>{u.active?'Active':'Disabled'}</td><td>{!isGM&&<button className="ops-button ops-button--quiet" onClick={()=>{setSelected(u);setRole(u.role);setEditing(true);}}>Edit</button>}</td></tr>)}</tbody></table></div>{!rows.length&&<p>No accounts to show.</p>}</section></div>;
}
