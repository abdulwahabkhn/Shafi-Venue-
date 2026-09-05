import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Command,
  FileBarChart,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import logo from "../../public/media/shafi-marquee-logo.jpg";
import "./management.css";
import LiveOperations from './LiveOperations';
import ExpensesWorkspace from './ExpensesWorkspace';

type ViewId =
  | "overview"
  | "bookings"
  | "calendar"
  | "inventory"
  | "expenses"
  | "employees"
  | "reports"
  | "website";

const navItems: { id: ViewId; label: string; icon: typeof LayoutDashboard; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: ClipboardList },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "inventory", label: "Inventory", icon: Warehouse, badge: "03" },
  { id: "expenses", label: "Cash & expenses", icon: ReceiptText },
  { id: "employees", label: "Employees", icon: Users },
  { id: "reports", label: "Reports", icon: FileBarChart },
];

const bookingRows = [
  { id: "SM-2409", event: "Ayesha & Hamza", type: "Walima", hall: "Hall 1", date: "Sep 18, 2026", guests: "320", status: "Confirmed", tone: "confirmed" },
  { id: "SM-2410", event: "Khan family", type: "Mehndi", hall: "Hall 2", date: "Sep 20, 2026", guests: "180", status: "Awaiting deposit", tone: "pending" },
  { id: "SM-2411", event: "Siddiqui gathering", type: "Private gathering", hall: "Hall 1", date: "Sep 23, 2026", guests: "240", status: "Enquiry", tone: "enquiry" },
  { id: "SM-2412", event: "Naveed & Maryam", type: "Barat", hall: "Hall 2", date: "Sep 27, 2026", guests: "450", status: "Confirmed", tone: "confirmed" },
  { id: "SM-2413", event: "Awan family", type: "Nikkah", hall: "Hall 1", date: "Oct 02, 2026", guests: "120", status: "Draft", tone: "draft" },
];

const inventoryRows = [
  { item: "Banquet chairs", category: "Furniture", stock: "480", reserved: "320", status: "Healthy", tone: "healthy" },
  { item: "Round dining tables", category: "Furniture", stock: "42", reserved: "38", status: "Watch", tone: "watch" },
  { item: "Gold charger plates", category: "Crockery", stock: "360", reserved: "320", status: "Healthy", tone: "healthy" },
  { item: "Warm uplights", category: "Lighting", stock: "24", reserved: "22", status: "Low stock", tone: "alert" },
  { item: "Ivory napkins", category: "Dining", stock: "760", reserved: "450", status: "Healthy", tone: "healthy" },
];

const employeeRows = [
  { name: "Sana Khalid", role: "Event coordinator", shift: "09:00 – 18:00", status: "On site", initials: "SK" },
  { name: "Usman Raza", role: "Floor lead", shift: "12:00 – 22:00", status: "On site", initials: "UR" },
  { name: "Maham Iqbal", role: "Guest experience", shift: "14:00 – 23:00", status: "Scheduled", initials: "MI" },
  { name: "Bilal Ahmed", role: "Inventory steward", shift: "08:00 – 17:00", status: "Break", initials: "BA" },
];

const expenseRows = [
  { description: "Hall 1 floral installation", category: "Décor", booking: "SM-2409 · Ayesha & Hamza", date: "Sep 03, 2026", amount: "PKR 185,000", status: "Approved", tone: "confirmed" },
  { description: "Catering produce advance", category: "Catering", booking: "SM-2412 · Naveed & Maryam", date: "Sep 02, 2026", amount: "PKR 96,500", status: "Pending review", tone: "pending" },
  { description: "Uplight cable replacement", category: "Maintenance", booking: "Operations", date: "Sep 01, 2026", amount: "PKR 18,750", status: "Approved", tone: "confirmed" },
  { description: "Guest welcome stationery", category: "Guest experience", booking: "SM-2410 · Khan family", date: "Aug 30, 2026", amount: "PKR 12,400", status: "Awaiting receipt", tone: "enquiry" },
  { description: "Delivery and loading", category: "Logistics", booking: "SM-2411 · Siddiqui gathering", date: "Aug 28, 2026", amount: "PKR 24,000", status: "Approved", tone: "confirmed" },
];

function StatusPill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`ops-status ops-status--${tone}`}>{children}</span>;
}

function SectionTitle({ title, description, action, onAction }: { title: string; description?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="ops-section-title">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <button className="ops-text-button" onClick={onAction}>{action}<ArrowRight aria-hidden="true" /></button>}
    </div>
  );
}

function Overview({ onNavigate, onToast }: { onNavigate: (view: ViewId) => void; onToast: (message: string) => void }) {
  return (
    <>
      <div className="ops-page-heading">
        <div>
          <p className="ops-eyebrow">Friday, 04 September 2026 · Jaranwala</p>
          <h1>Good morning, team.</h1>
          <p className="ops-heading-copy">A clear view of the venue, the people, and the details keeping every celebration on course.</p>
        </div>
        <div className="ops-heading-actions">
          <button className="ops-button ops-button--quiet" onClick={() => onToast("Calendar export will connect to your workspace in the next phase.")}><FileBarChart aria-hidden="true" />Export view</button>
          <button className="ops-button ops-button--gold" onClick={() => onNavigate("bookings")}><Plus aria-hidden="true" />New booking</button>
        </div>
      </div>
      <div className="ops-prototype-note"><Sparkles aria-hidden="true" /><span><strong>Interface preview</strong> — sample operational data is shown here while the live booking and stock connections are being wired.</span></div>
      <section className="ops-metric-grid" aria-label="Venue snapshot">
        <article className="ops-metric"><div className="ops-metric-icon"><CalendarDays aria-hidden="true" /></div><div><span>Upcoming events</span><strong>08</strong><small><b>+2</b> this week</small></div></article>
        <article className="ops-metric"><div className="ops-metric-icon"><Clock3 aria-hidden="true" /></div><div><span>Pending enquiries</span><strong>14</strong><small><b>04</b> need a reply today</small></div></article>
        <article className="ops-metric ops-metric--alert"><div className="ops-metric-icon"><Package aria-hidden="true" /></div><div><span>Inventory alerts</span><strong>03</strong><small><b>02</b> items need attention</small></div></article>
        <article className="ops-metric"><div className="ops-metric-icon"><Users aria-hidden="true" /></div><div><span>Team on shift</span><strong>18</strong><small><b>06</b> assigned today</small></div></article>
      </section>
      <div className="ops-focus-grid">
        <section className="ops-panel ops-timeline-panel">
          <SectionTitle title="Today at the venue" description="One shared view for the floor, front desk, and coordination team." action="Open calendar" onAction={() => onNavigate("calendar")} />
          <div className="ops-day-line"><span>FRI</span><strong>04</strong><span>SEP</span><i /></div>
          <div className="ops-timeline">
            <div className="ops-timeline-row"><time>09:00</time><div className="ops-timeline-dot ops-timeline-dot--green" /><div className="ops-timeline-card"><div><strong>Venue walkthrough</strong><span>Hall 1 · Ayesha & Hamza</span></div><StatusPill tone="confirmed">Confirmed</StatusPill></div></div>
            <div className="ops-timeline-row"><time>12:30</time><div className="ops-timeline-dot ops-timeline-dot--gold" /><div className="ops-timeline-card"><div><strong>Vendor handover</strong><span>Hall 2 · décor team arrival</span></div><StatusPill tone="pending">In progress</StatusPill></div></div>
            <div className="ops-timeline-row"><time>18:00</time><div className="ops-timeline-dot ops-timeline-dot--ink" /><div className="ops-timeline-card"><div><strong>Walima reception</strong><span>Hall 1 · guest arrival from 18:30</span></div><StatusPill tone="enquiry">Tonight</StatusPill></div></div>
          </div>
        </section>
        <section className="ops-panel ops-attention-panel">
          <SectionTitle title="Needs attention" description="Small decisions that keep the day moving." />
          <div className="ops-attention-list">
            <button onClick={() => onNavigate("bookings")}><span className="ops-attention-mark ops-attention-mark--gold"><ClipboardList aria-hidden="true" /></span><span><strong>04 enquiries awaiting a reply</strong><small>Oldest received yesterday at 16:40</small></span><ArrowRight aria-hidden="true" /></button>
            <button onClick={() => onNavigate("inventory")}><span className="ops-attention-mark ops-attention-mark--red"><AlertTriangle aria-hidden="true" /></span><span><strong>Warm uplights below reserve level</strong><small>22 of 24 units are reserved this week</small></span><ArrowRight aria-hidden="true" /></button>
            <button onClick={() => onNavigate("employees")}><span className="ops-attention-mark ops-attention-mark--green"><Users aria-hidden="true" /></span><span><strong>06 team members assigned today</strong><small>Review the Hall 1 floor plan</small></span><ArrowRight aria-hidden="true" /></button>
          </div>
          <div className="ops-connection-card"><div className="ops-connection-heading"><Activity aria-hidden="true" /><strong>Event connection</strong></div><p>Every booking can carry its own people plan and reserved inventory.</p><div className="ops-connection-flow"><span>Booking brief</span><i /><span>Stock hold</span><i /><span>Team plan</span></div><button onClick={() => onNavigate("bookings")}>Open a booking <ArrowRight aria-hidden="true" /></button></div>
        </section>
      </div>
      <div className="ops-lower-grid">
        <section className="ops-panel">
          <SectionTitle title="Upcoming bookings" description="The next confirmed and active conversations." action="View all bookings" onAction={() => onNavigate("bookings")} />
          <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Event</th><th>Date</th><th>Hall</th><th>Status</th><th><span className="ops-sr-only">Open</span></th></tr></thead><tbody>{bookingRows.slice(0, 4).map((booking) => <tr key={booking.id}><td><strong>{booking.event}</strong><span>{booking.id} · {booking.type}</span></td><td>{booking.date}</td><td>{booking.hall}</td><td><StatusPill tone={booking.tone}>{booking.status}</StatusPill></td><td><button className="ops-row-action" aria-label={`Open ${booking.event}`} onClick={() => onToast(`${booking.event} opened in the booking workspace.`)}><ArrowRight aria-hidden="true" /></button></td></tr>)}</tbody></table></div>
        </section>
        <section className="ops-panel ops-inventory-panel">
          <SectionTitle title="Inventory pulse" description="Reserved against upcoming events." action="Manage inventory" onAction={() => onNavigate("inventory")} />
          <div className="ops-inventory-list">{inventoryRows.slice(0, 4).map((item) => <div className="ops-inventory-row" key={item.item}><div><strong>{item.item}</strong><span>{item.category}</span></div><div className="ops-inventory-bar"><span style={{ width: `${Math.min(100, (Number(item.reserved) / Number(item.stock)) * 100)}%` }} /></div><div><strong>{item.reserved}</strong><span>/{item.stock}</span></div><StatusPill tone={item.tone}>{item.status}</StatusPill></div>)}</div>
        </section>
      </div>
    </>
  );
}

function DemoBookingsView({ onToast }: { onToast: (message: string) => void }) {
  const [filter, setFilter] = useState("All bookings");
  const filters = ["All bookings", "Confirmed", "Awaiting deposit", "Enquiry"];
  const rows = filter === "All bookings" ? bookingRows : bookingRows.filter((row) => row.status === filter);
  return <ViewShell title="Bookings" description="Enquiries, confirmed events, and the details your team needs to follow through." action="New booking" onAction={() => onToast("Booking form is ready for the live booking connection.")}><div className="ops-toolbar"><div className="ops-filter-tabs">{filters.map((item) => <button className={filter === item ? "is-active" : ""} key={item} onClick={() => setFilter(item)}>{item}{item !== "All bookings" && <span>{bookingRows.filter((row) => row.status === item).length}</span>}</button>)}</div><button className="ops-button ops-button--quiet" onClick={() => onToast("Booking filters saved for this workspace.")}>Save view <Check aria-hidden="true" /></button></div><div className="ops-panel ops-table-panel"><div className="ops-table-wrap"><table className="ops-table ops-table--wide"><thead><tr><th>Booking</th><th>Date</th><th>Hall</th><th>Guests</th><th>Status</th><th><span className="ops-sr-only">Open</span></th></tr></thead><tbody>{rows.map((booking) => <tr key={booking.id}><td><strong>{booking.event}</strong><span>{booking.id} · {booking.type}</span></td><td>{booking.date}</td><td>{booking.hall}</td><td>{booking.guests}</td><td><StatusPill tone={booking.tone}>{booking.status}</StatusPill></td><td><button className="ops-row-action" onClick={() => onToast(`${booking.event} opened in the booking workspace.`)} aria-label={`Open ${booking.event}`}><ArrowRight aria-hidden="true" /></button></td></tr>)}</tbody></table></div></div></ViewShell>;
}

function InventoryView({ onToast }: { onToast: (message: string) => void }) {
  return <ViewShell title="Inventory" description="Know what is available, what is reserved, and what needs replenishing before event day." action="Add inventory item" onAction={() => onToast("Inventory item creation will connect to the stock database.")}><div className="ops-inventory-summary"><div><span>Total tracked items</span><strong>128</strong><small>Across furniture, crockery, dining, and lighting</small></div><div><span>Reserved this month</span><strong>74%</strong><small>Based on current booking holds</small></div><div className="is-alert"><span>Below reserve level</span><strong>03</strong><small>Review before accepting new holds</small></div></div><div className="ops-panel ops-table-panel"><div className="ops-table-wrap"><table className="ops-table ops-table--wide"><thead><tr><th>Item</th><th>Category</th><th>Available</th><th>Reserved</th><th>Status</th><th><span className="ops-sr-only">Open</span></th></tr></thead><tbody>{inventoryRows.map((item) => <tr key={item.item}><td><strong>{item.item}</strong></td><td>{item.category}</td><td>{item.stock}</td><td>{item.reserved}</td><td><StatusPill tone={item.tone}>{item.status}</StatusPill></td><td><button className="ops-row-action" onClick={() => onToast(`${item.item} opened for stock details.`)} aria-label={`Open ${item.item}`}><ArrowRight aria-hidden="true" /></button></td></tr>)}</tbody></table></div></div></ViewShell>;
}

function EmployeesView({ onToast }: { onToast: (message: string) => void }) {
  return <ViewShell title="Employees" description="Keep the right people informed, assigned, and visible across every event." action="Add employee" onAction={() => onToast("Employee records will connect to the staff directory.")}><div className="ops-panel ops-table-panel"><div className="ops-table-wrap"><table className="ops-table ops-table--wide"><thead><tr><th>Team member</th><th>Role</th><th>Shift</th><th>Today</th><th><span className="ops-sr-only">Open</span></th></tr></thead><tbody>{employeeRows.map((employee) => <tr key={employee.name}><td><div className="ops-person"><span>{employee.initials}</span><strong>{employee.name}</strong></div></td><td>{employee.role}</td><td>{employee.shift}</td><td><StatusPill tone={employee.status === "On site" ? "confirmed" : "pending"}>{employee.status}</StatusPill></td><td><button className="ops-row-action" onClick={() => onToast(`${employee.name}'s employee record opened.`)} aria-label={`Open ${employee.name}`}><ArrowRight aria-hidden="true" /></button></td></tr>)}</tbody></table></div></div><div className="ops-team-note"><ShieldCheck aria-hidden="true" /><div><strong>Roles and permissions stay deliberate.</strong><p>Admin, manager, coordinator, inventory, and view-only access can be configured when the identity layer is connected.</p></div></div></ViewShell>;
}

function ExpensesView({ onToast }: { onToast: (message: string) => void }) {
  return <ViewShell title="Expenses" description="Record every cost against the right event, supplier, or venue operation so margins stay visible." action="Record expense" onAction={() => onToast("The expense form will connect to approvals and receipts in the next phase.")}><div className="ops-inventory-summary ops-expense-summary"><div><span>This month</span><strong>PKR 1.24m</strong><small>Across 42 recorded transactions</small></div><div><span>Awaiting review</span><strong>06</strong><small>Receipts or approvals still open</small></div><div className="is-alert"><span>Linked to bookings</span><strong>82%</strong><small>Costs connected to an event record</small></div></div><div className="ops-expense-note"><ReceiptText aria-hidden="true" /><div><strong>Keep costs attached to the occasion.</strong><p>When an expense is linked to a booking, its team, inventory holds, and final event margin can be reviewed together.</p></div></div><div className="ops-panel ops-table-panel"><div className="ops-table-wrap"><table className="ops-table ops-table--wide"><thead><tr><th>Expense</th><th>Linked record</th><th>Date</th><th>Amount</th><th>Status</th><th><span className="ops-sr-only">Open</span></th></tr></thead><tbody>{expenseRows.map((expense) => <tr key={`${expense.description}-${expense.date}`}><td><strong>{expense.description}</strong><span>{expense.category}</span></td><td>{expense.booking}</td><td>{expense.date}</td><td><strong>{expense.amount}</strong></td><td><StatusPill tone={expense.tone}>{expense.status}</StatusPill></td><td><button className="ops-row-action" onClick={() => onToast(`${expense.description} opened for expense details.`)} aria-label={`Open ${expense.description}`}><ArrowRight aria-hidden="true" /></button></td></tr>)}</tbody></table></div></div></ViewShell>;
}

function CalendarView({ onToast }: { onToast: (message: string) => void }) {
  return <ViewShell title="Calendar" description="A shared rhythm for venue holds, walkthroughs, setup windows, and celebrations." action="Add calendar block" onAction={() => onToast("Calendar blocks will sync with the booking record.")}><div className="ops-calendar-head"><button aria-label="Previous month" onClick={() => onToast("Month navigation is ready for calendar data.")}>‹</button><strong>September 2026</strong><button aria-label="Next month" onClick={() => onToast("Month navigation is ready for calendar data.")}>›</button><span><i className="ops-calendar-key ops-calendar-key--gold" />Booking <i className="ops-calendar-key ops-calendar-key--green" />Operations</span></div><div className="ops-calendar-grid">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span className="ops-calendar-weekday" key={day}>{day}</span>)}{Array.from({ length: 30 }, (_, index) => { const day = index + 1; const event = day === 4 ? "today" : [8, 18, 20, 23, 27].includes(day) ? "booking" : [5, 12, 19, 26].includes(day) ? "ops" : ""; return <button className={`ops-calendar-day ${event ? `ops-calendar-day--${event}` : ""}`} key={day} onClick={() => onToast(`September ${day} selected.`)}><span>{day}</span>{event && <i />}</button> })}</div></ViewShell>;
}

function ReportsView({ onToast }: { onToast: (message: string) => void }) {
  return <ViewShell title="Reports" description="A calm place for the patterns behind your bookings, stock, and team planning." action="Export report" onAction={() => onToast("Report export will connect to live data in the next phase.")}><div className="ops-report-grid"><div className="ops-panel ops-report-chart"><SectionTitle title="Enquiries to bookings" description="Illustrative 30-day view" /><div className="ops-chart"><div className="ops-chart-axis"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="ops-chart-bars">{[44, 61, 52, 74, 68, 86, 78, 92, 64, 82, 70, 96].map((height, index) => <div key={index}><span style={{ height: `${height}%` }} /><small>{["W1", "", "W2", "", "W3", "", "W4", "", "W5", "", "W6", ""][index]}</small></div>)}</div></div></div><div className="ops-panel ops-report-breakdown"><SectionTitle title="Operations mix" description="Current sample workload" /><div className="ops-breakdown-list"><div><span className="ops-breakdown-dot ops-breakdown-dot--gold" /><strong>Weddings & Walima</strong><b>58%</b></div><div><span className="ops-breakdown-dot ops-breakdown-dot--green" /><strong>Private gatherings</strong><b>24%</b></div><div><span className="ops-breakdown-dot ops-breakdown-dot--ink" /><strong>Corporate events</strong><b>18%</b></div></div></div></div></ViewShell>;
}

function WebsiteView({ onToast }: { onToast: (message: string) => void }) {
  return <ViewShell title="Website manager" description="Keep the public venue story current, from halls and services to gallery imagery." action="Open CMS" onAction={() => { window.location.href = "/admin"; }}><div className="ops-website-bridge"><div className="ops-website-bridge-mark"><Sparkles aria-hidden="true" /></div><div><p className="ops-eyebrow">Connected surface</p><h2>Public website content</h2><p>Website edits remain in the existing secure CMS. This operations portal will eventually share availability, booking status, and approved content without duplicating work.</p><button className="ops-button ops-button--gold" onClick={() => { window.location.href = "/admin"; }}>Open website CMS <ArrowRight aria-hidden="true" /></button></div></div><div className="ops-website-links"><button onClick={() => onToast("Website preview opened in a new tab.")}><LayoutDashboard aria-hidden="true" /><span><strong>View public website</strong><small>See the visitor experience</small></span><ArrowRight aria-hidden="true" /></button><button onClick={() => onToast("Booking form preview opened in a new tab.")}><ClipboardList aria-hidden="true" /><span><strong>Review booking form</strong><small>Check the enquiry handoff</small></span><ArrowRight aria-hidden="true" /></button></div></ViewShell>;
}

function ViewShell({ title, description, action, onAction, children }: { title: string; description: string; action: string; onAction: () => void; children: React.ReactNode }) {
  return <><div className="ops-page-heading"><div><p className="ops-eyebrow">Operations workspace</p><h1>{title}</h1><p className="ops-heading-copy">{description}</p></div><button className="ops-button ops-button--gold" onClick={onAction}><Plus aria-hidden="true" />{action}</button></div><div className="ops-view-content">{children}</div></>;
}

export default function ManagementApp() {
  const [view, setView] = useState<ViewId>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => { document.title = "Venue operations | Shafi Complex & Marquee"; }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3200); return () => window.clearTimeout(timer); }, [toast]);
  const activeLabel = useMemo(() => navItems.find((item) => item.id === view)?.label ?? "Overview", [view]);
  const navigate = (next: ViewId) => { if(next!==view&&!window.dispatchEvent(new Event('operations:navigate',{cancelable:true})))return; setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="ops-app">
    <header className="ops-topbar"><button className="ops-mobile-menu" aria-label={mobileNav ? "Close navigation" : "Open navigation"} aria-expanded={mobileNav} onClick={() => setMobileNav((value) => !value)}>{mobileNav ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button><a className="ops-brand" href="/management"><img src={logo} width="46" height="46" alt="" /><span>Shafi Complex <small>Venue operations</small></span></a><div className="ops-top-actions"><div className="ops-avatar" aria-label="Administration">SC</div><button className="ops-profile" onClick={() => window.location.assign("/admin/login")}>Admin portal <ChevronDown aria-hidden="true" /></button></div></header>
    <aside className={`ops-sidebar ${mobileNav ? "is-open" : ""}`}><div className="ops-sidebar-context"><span className="ops-live-dot" />Jaranwala venue <ChevronDown aria-hidden="true" /></div><nav aria-label="Operations sections"><p>Workspace</p>{navItems.map(({ id, label, icon: Icon, badge }) => <button key={id} className={view === id ? "is-active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}><Icon aria-hidden="true" /><span>{label}</span>{badge && <b>{badge}</b>}</button>)}</nav><div className="ops-sidebar-divider" /><nav aria-label="Connected tools"><p>Connected tools</p><button className={view === "website" ? "is-active" : ""} aria-current={view === "website" ? "page" : undefined} onClick={() => navigate("website")}><Sparkles aria-hidden="true" /><span>Website manager</span></button><button onClick={() => setToast("Settings will be connected to venue permissions.")}><Settings2 aria-hidden="true" /><span>Settings</span></button></nav><div className="ops-sidebar-footer"><div className="ops-sidebar-footer-icon"><Warehouse aria-hidden="true" /></div><strong>Keep the details close.</strong><p>One source of truth for every event.</p><a href="/">Back to public website <ArrowRight aria-hidden="true" /></a></div></aside>
    {mobileNav && <button className="ops-sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="ops-main"><div className="ops-breadcrumb"><span>Shafi Complex & Marquee</span><ArrowRight aria-hidden="true" /><strong>{activeLabel}</strong>{query && <em>Searching “{query}”</em>}</div>{view === "overview" && <LiveOperations view="overview" />}{view === "bookings" && <LiveOperations view="bookings" />}{view === "calendar" && <LiveOperations view="calendar" />}{["inventory","employees","reports"].includes(view) && <p className="booking-note">Preview only — this module is not connected to saved operational records yet.</p>}{view === "inventory" && <InventoryView onToast={setToast} />}{view === "expenses" && <ExpensesWorkspace />}{view === "employees" && <EmployeesView onToast={setToast} />}{view === "reports" && <ReportsView onToast={setToast} />}{view === "website" && <WebsiteView onToast={setToast} />}</main>
    {toast && <div className="ops-toast" role="status"><Check aria-hidden="true" />{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><X aria-hidden="true" /></button></div>}
  </div>;
}
