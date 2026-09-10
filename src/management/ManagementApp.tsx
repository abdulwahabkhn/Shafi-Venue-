import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, ClipboardList, FileBarChart, LayoutDashboard, Menu, ReceiptText, Settings2, ShieldCheck, Sparkles, Users, Warehouse, X } from 'lucide-react';
import './management.css';
import './bookings.css';
import { StaffAccess, AccountsWorkspace, useActor, logoutStaff } from './StaffAccess';
import { isAccountantLike, permissionEnabled } from '../../shared/staff';

const AttendanceWorkspace=lazy(()=>import('./AttendanceWorkspace'));
const LiveOperations=lazy(()=>import('./LiveOperations'));
const ExpensesWorkspace=lazy(()=>import('./DailyExpenseSheet'));
const MonthlyDashboard=lazy(()=>import('./MonthlyDashboard'));
const EmployeesWorkspace=lazy(()=>import('./EmployeesWorkspace'));
const ReportsWorkspace=lazy(()=>import('./ReportsWorkspace'));
const InventoryWorkspace=lazy(()=>import('./InventoryRegister'));



class WorkspaceBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section className="booking-workspace ops-panel"><h1>Unable to open this workspace</h1><p role="alert">Check your connection and reload the portal. Saved records remain available.</p><button className="ops-button ops-button--gold" onClick={()=>window.location.reload()}>Reload portal</button></section>:this.props.children;}
}

type ViewId='attendance'|'overview'|'bookings'|'calendar'|'inventory'|'rentals'|'expenses'|'reconciliation'|'employees'|'reports'|'accounts'|'website';
const navItems:{id:ViewId;label:string;icon:typeof LayoutDashboard}[]=[
 {id:'overview',label:'Overview',icon:LayoutDashboard},
 {id:'bookings',label:'Bookings',icon:ClipboardList},
 {id:'calendar',label:'Calendar',icon:CalendarDays},
 {id:'inventory',label:'Inventory',icon:Warehouse},

 {id:'expenses',label:'Expense sheet',icon:ReceiptText},

 {id:'attendance',label:'Attendance',icon:Users},
 {id:'employees',label:'Employees',icon:Users},
 {id:'reports',label:'Reports',icon:FileBarChart},
];
function WebsiteView(){
 return <div className="booking-workspace">
  <div className="ops-page-heading"><div><h1>Website manager</h1><p>Manage public content and check the visitor experience.</p></div><a className="ops-button ops-button--gold" href="/admin">Open website CMS <ArrowRight aria-hidden="true"/></a></div>
  <section className="ops-panel"><h2>Public website</h2><p>Update halls, services, packages and gallery images through the existing CMS. Website enquiries currently open WhatsApp for the venue team.</p>
   <div className="booking-actions"><a className="ops-button ops-button--quiet" href="/" target="_blank" rel="noreferrer">View public website</a><a className="ops-button ops-button--quiet" href="/#booking" target="_blank" rel="noreferrer">Review enquiry form</a></div>
  </section>
 </div>;
}
export default function ManagementApp(){return <StaffAccess><ManagementShell/></StaffAccess>;}
function ManagementShell(){
 const actor=useActor();
 const limited=isAccountantLike(actor);
 const limitedNavAccess=(id:ViewId)=>id==='bookings'||id==='calendar'?permissionEnabled(actor,'booking'):id==='inventory'?permissionEnabled(actor,'inventoryView'):id==='expenses'?permissionEnabled(actor,'expenseView'):id==='attendance'?permissionEnabled(actor,'attendanceView'):id==='employees'?permissionEnabled(actor,'employeeView'):id==='reports'?permissionEnabled(actor,'reportsView'):false;
 const firstLimitedView=(['expenses','inventory','attendance','employees','bookings','calendar','reports'] as ViewId[]).find(limitedNavAccess)||'expenses';
 const [view,setView]=useState<ViewId>(limited?firstLimitedView:'overview'),[mobileNav,setMobileNav]=useState(false),[toast,setToast]=useState('');
 useEffect(()=>{document.title='Venue operations | Shafi Complex & Marquee';},[]);
 useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),5000);return()=>window.clearTimeout(timer);},[toast]);
 useEffect(()=>{if(!mobileNav)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileNav(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[mobileNav]);
 const activeLabel=navItems.find(item=>item.id===view)?.label||(view==='accounts'?'Staff accounts':'Website manager');
 const canNavigate=()=>window.dispatchEvent(new Event('operations:navigate',{cancelable:true}));
 function navigate(next:ViewId){if(next!==view&&!canNavigate())return;setView(next);setMobileNav(false);window.scrollTo({top:0,behavior:'instant'});}
 function signOut(){if(canNavigate())void logoutStaff().catch(e=>setToast(e.message));}
 return <div className="ops-app">
  <a href="#operations-main" className="ops-skip-link">Skip to workspace</a>
  <header className="ops-topbar">
   <button className="ops-mobile-menu" aria-label={mobileNav?'Close navigation':'Open navigation'} aria-expanded={mobileNav} aria-controls="operations-sidebar" onClick={()=>setMobileNav(value=>!value)}>{mobileNav?<X aria-hidden="true"/>:<Menu aria-hidden="true"/>}</button>
   <a className="ops-brand" href="/management" aria-label="Shafi Complex venue operations" onClick={e=>{if(!canNavigate())e.preventDefault();}}><img src="/media/shafi-marquee-logo.jpg" width="46" height="46" alt=""/><span>Shafi Complex <small>Venue operations</small></span></a>
   <div className="ops-top-actions"><div className="ops-avatar" aria-hidden="true">SC</div><button className="ops-profile" onClick={signOut} title="Sign out">{actor.name} · {actor.role}</button></div>
  </header>
  <aside id="operations-sidebar" className={`ops-sidebar ${mobileNav?'is-open':''}`}>
   <div className="ops-sidebar-context"><span className="ops-live-dot"/>Jaranwala venue</div>
   <nav aria-label="Operations sections"><p>Workspace</p>{navItems.filter(item=>!limited||limitedNavAccess(item.id)).map(({id,label,icon:Icon})=><button key={id} className={view===id?'is-active':''} aria-current={view===id?'page':undefined} onClick={()=>navigate(id)}><Icon aria-hidden="true"/><span>{label}</span></button>)}</nav>
   <div className="ops-sidebar-divider"/>
   <nav aria-label="Connected tools"><p>Connected tools</p>
    {actor.role==='GM'&&<><button className={view==='website'?'is-active':''} aria-current={view==='website'?'page':undefined} onClick={()=>navigate('website')}><Sparkles aria-hidden="true"/><span>Website manager</span></button><button className={view==='accounts'?'is-active':''} aria-current={view==='accounts'?'page':undefined} onClick={()=>navigate('accounts')}><Settings2 aria-hidden="true"/><span>Staff accounts</span></button></>}

    <button onClick={signOut}><ShieldCheck aria-hidden="true"/><span>Sign out</span></button>
   </nav>
   <div className="ops-sidebar-footer"><div className="ops-sidebar-footer-icon"><Warehouse aria-hidden="true"/></div><strong>Keep the details close.</strong><p>One source of truth for every event.</p><a href="/" onClick={e=>{if(!canNavigate())e.preventDefault();}}>Back to public website <ArrowRight aria-hidden="true"/></a></div>
  </aside>
  {mobileNav&&<button className="ops-sidebar-scrim" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}
  <main className="ops-main" id="operations-main" tabIndex={-1}>
   <div className="ops-breadcrumb"><span>Shafi Complex & Marquee</span><ArrowRight aria-hidden="true"/><strong>{activeLabel}</strong></div>
   <WorkspaceBoundary key={view}><Suspense fallback={<p className="booking-workspace" role="status">Opening {activeLabel.toLowerCase()}…</p>}>
    {view==='overview'&&<MonthlyDashboard/>}{view==='bookings'&&<LiveOperations view="bookings"/>}{view==='calendar'&&<LiveOperations view="calendar"/>}
    {view==='inventory'&&<InventoryWorkspace/>}{view==='expenses'&&<ExpensesWorkspace/>}

    {view==='attendance'&&<AttendanceWorkspace/>}{view==='employees'&&<EmployeesWorkspace/>}{view==='reports'&&(!limited||permissionEnabled(actor,'reportsView'))&&<ReportsWorkspace/>}
    {view==='accounts'&&actor.role==='GM'&&<AccountsWorkspace/>}{view==='website'&&actor.role==='GM'&&<WebsiteView/>}
   </Suspense></WorkspaceBoundary>
  </main>
  {toast&&<div className="ops-toast" role="status"><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X aria-hidden="true"/></button></div>}
 </div>;
}
