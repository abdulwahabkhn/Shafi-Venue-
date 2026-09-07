import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, Check, ClipboardList, FileBarChart, LayoutDashboard, Menu, Package, ReceiptText, Settings2, ShieldCheck, Sparkles, Users, Warehouse, X } from 'lucide-react';
import './management.css';
import './bookings.css';
import { StaffAccess, AccountsWorkspace, useActor, logoutStaff } from './StaffAccess';

const LiveOperations=lazy(()=>import('./LiveOperations'));
const ExpensesWorkspace=lazy(()=>import('./ExpensesWorkspace'));
const EmployeesWorkspace=lazy(()=>import('./EmployeesWorkspace'));
const ReportsWorkspace=lazy(()=>import('./ReportsWorkspace'));
const InventoryWorkspace=lazy(()=>import('./InventoryWorkspace'));
const RentalsWorkspace=lazy(()=>import('./RentalsWorkspace'));
const CashReconciliation=lazy(()=>import('./CashReconciliation'));

class WorkspaceBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section className="booking-workspace ops-panel"><h1>Unable to open this workspace</h1><p role="alert">Check your connection and reload the portal. Saved records remain available.</p><button className="ops-button ops-button--gold" onClick={()=>window.location.reload()}>Reload portal</button></section>:this.props.children;}
}

type ViewId='overview'|'bookings'|'calendar'|'inventory'|'rentals'|'expenses'|'reconciliation'|'employees'|'reports'|'accounts'|'website';
const navItems:{id:ViewId;label:string;icon:typeof LayoutDashboard}[]=[
 {id:'overview',label:'Overview',icon:LayoutDashboard},
 {id:'bookings',label:'Bookings',icon:ClipboardList},
 {id:'calendar',label:'Calendar',icon:CalendarDays},
 {id:'inventory',label:'Inventory',icon:Warehouse},
 {id:'rentals',label:'Supplier rentals',icon:Package},
 {id:'expenses',label:'Cash & expenses',icon:ReceiptText},
 {id:'reconciliation',label:'Cash reconciliation',icon:Check},
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
 const [view,setView]=useState<ViewId>('overview'),[mobileNav,setMobileNav]=useState(false),[toast,setToast]=useState('');
 useEffect(()=>{document.title='Venue operations | Shafi Complex & Marquee';},[]);
 useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),5000);return()=>window.clearTimeout(timer);},[toast]);
 useEffect(()=>{if(!mobileNav)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileNav(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[mobileNav]);
 const activeLabel=navItems.find(item=>item.id===view)?.label||(view==='accounts'?(actor.role==='GM'?'Hall managers':'Staff accounts'):'Website manager');
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
   <nav aria-label="Operations sections"><p>Workspace</p>{navItems.filter(item=>actor.role!=='Hall manager'||!['reports','reconciliation'].includes(item.id)).map(({id,label,icon:Icon})=><button key={id} className={view===id?'is-active':''} aria-current={view===id?'page':undefined} onClick={()=>navigate(id)}><Icon aria-hidden="true"/><span>{label}</span></button>)}</nav>
   <div className="ops-sidebar-divider"/>
   <nav aria-label="Connected tools"><p>Connected tools</p>
    {actor.role==='Director'&&<><button className={view==='website'?'is-active':''} aria-current={view==='website'?'page':undefined} onClick={()=>navigate('website')}><Sparkles aria-hidden="true"/><span>Website manager</span></button><button className={view==='accounts'?'is-active':''} aria-current={view==='accounts'?'page':undefined} onClick={()=>navigate('accounts')}><Settings2 aria-hidden="true"/><span>Staff accounts</span></button></>}
    {actor.role==='GM'&&<button className={view==='accounts'?'is-active':''} aria-current={view==='accounts'?'page':undefined} onClick={()=>navigate('accounts')}><Settings2 aria-hidden="true"/><span>Hall managers</span></button>}
    <button onClick={signOut}><ShieldCheck aria-hidden="true"/><span>Sign out</span></button>
   </nav>
   <div className="ops-sidebar-footer"><div className="ops-sidebar-footer-icon"><Warehouse aria-hidden="true"/></div><strong>Keep the details close.</strong><p>One source of truth for every event.</p><a href="/" onClick={e=>{if(!canNavigate())e.preventDefault();}}>Back to public website <ArrowRight aria-hidden="true"/></a></div>
  </aside>
  {mobileNav&&<button className="ops-sidebar-scrim" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}
  <main className="ops-main" id="operations-main" tabIndex={-1}>
   <div className="ops-breadcrumb"><span>Shafi Complex & Marquee</span><ArrowRight aria-hidden="true"/><strong>{activeLabel}</strong></div>
   <WorkspaceBoundary key={view}><Suspense fallback={<p className="booking-workspace" role="status">Opening {activeLabel.toLowerCase()}…</p>}>
    {view==='overview'&&<LiveOperations view="overview"/>}{view==='bookings'&&<LiveOperations view="bookings"/>}{view==='calendar'&&<LiveOperations view="calendar"/>}
    {view==='inventory'&&<InventoryWorkspace/>}{view==='rentals'&&<RentalsWorkspace/>}{view==='expenses'&&<ExpensesWorkspace/>}
    {view==='reconciliation'&&actor.role!=='Hall manager'&&<div className="booking-workspace"><h1>Cash reconciliation</h1><CashReconciliation/></div>}
    {view==='employees'&&<EmployeesWorkspace/>}{view==='reports'&&actor.role!=='Hall manager'&&<ReportsWorkspace/>}
    {view==='accounts'&&['Director','GM'].includes(actor.role)&&<AccountsWorkspace/>}{view==='website'&&actor.role==='Director'&&<WebsiteView/>}
   </Suspense></WorkspaceBoundary>
  </main>
  {toast&&<div className="ops-toast" role="status"><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X aria-hidden="true"/></button></div>}
 </div>;
}
