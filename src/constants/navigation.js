/* =====================================================================
   NAVIGATION — one entry per page: its route path, Sidebar grouping/
   icon/label, and header title/description. Single source of truth
   consumed by both App.jsx (to build <Routes> and the header) and
   Sidebar.jsx (to render nav links) — previously duplicated as
   App.jsx's META/VIEWS and Sidebar.jsx's own NAV array.
   ===================================================================== */
import { lazy } from 'react';
import {
  LayoutDashboard, Users, IdCard, CalendarClock, GitBranch, Send,
  Inbox, ClipboardList, LogOut, SlidersHorizontal, BookOpen, FileWarning, CalendarDays, History, Settings as SettingsIcon, UserPlus,
} from 'lucide-react';

/* Route-level code splitting — each page ships as its own chunk,
   fetched on first visit rather than all 15+ up front. App.jsx wraps
   the <Routes> tree in a single <Suspense>, so this is the only
   change needed here; PAGES' `Component` field is unaffected — still
   just a component reference, now a lazy one. (This comment used to
   describe this as already done — it wasn't; every import below was
   still static, so the whole app shipped as one ~900KB bundle and
   Suspense/PageSkeleton in App.jsx never actually had anything to
   suspend on.) */
const CommandCentre = lazy(() => import('../pages/CommandCentre.jsx'));
const OwnerBase = lazy(() => import('../pages/OwnerBase.jsx'));
const CustomerMaster = lazy(() => import('../pages/CustomerMaster.jsx'));
const TriggerCalendar = lazy(() => import('../pages/TriggerCalendar.jsx'));
const ReferralTree = lazy(() => import('../pages/ReferralTree.jsx'));
const Events = lazy(() => import('../pages/Events.jsx'));
const Leads = lazy(() => import('../pages/Leads.jsx'));
const SendLog = lazy(() => import('../pages/SendLog.jsx'));
const Intake = lazy(() => import('../pages/Intake.jsx'));
const IncompleteRecords = lazy(() => import('../pages/IncompleteRecords.jsx'));
const ValuationRegister = lazy(() => import('../pages/ValuationRegister.jsx'));
const ExitRegister = lazy(() => import('../pages/ExitRegister.jsx'));
const ScoringEngine = lazy(() => import('../pages/ScoringEngine.jsx'));
const FieldDictionary = lazy(() => import('../pages/FieldDictionary.jsx'));
const AuditLog = lazy(() => import('../pages/AuditLog.jsx'));
const Settings = lazy(() => import('../pages/Settings.jsx'));

/* `path` is always the first URL segment for that page — master/statement
   additionally accept /:id and /:id/:tab, wired directly in App.jsx's
   <Routes> since that shape doesn't fit this flat one-row-per-page list. */
export const PAGES = [
  { id: 'command', path: 'command', group: 'Read', label: 'Dashboard', Icon: LayoutDashboard,
    Component: CommandCentre, capability: 'Module: Dashboard',
    title: 'Dashboard', desc: 'Neoteric Properties Store Intelligence & Re-Investment Overview' },
  { id: 'base', path: 'base', group: 'Read', label: 'Owner base', Icon: Users,
    Component: OwnerBase, capability: 'Module: Owner base',
    title: 'Owner Base', desc: 'Comprehensive Owner Directory & Financial Segmentation' },
  { id: 'master', path: 'master', group: 'Read', label: 'Customer master', Icon: IdCard,
    Component: CustomerMaster,
    title: 'Customer Master', desc: 'Complete Customer Profile & Financial Summary' },
  { id: 'triggers', path: 'triggers', group: 'Act', label: 'Trigger calendar', Icon: CalendarClock,
    Component: TriggerCalendar, capability: 'Module: Trigger calendar',
    title: 'Trigger Calendar', desc: 'Scheduled Outbound Communication & Re-Investment Events' },
  { id: 'referrals', path: 'referrals', group: 'Act', label: 'Referral tree', Icon: GitBranch,
    Component: ReferralTree, capability: 'Module: Referral tree',
    title: 'Referral Tree', desc: 'Organic Customer Network & Multi-Tier Analytics' },
  { id: 'events', path: 'events', group: 'Act', label: 'Events', Icon: CalendarDays,
    Component: Events, capability: 'Module: Events',
    title: 'Events', desc: 'Event Calendar & Owner Invite Lists' },
  { id: 'leads', path: 'leads', group: 'Act', label: 'Leads', Icon: UserPlus,
    Component: Leads, capability: 'Module: Leads',
    title: 'Leads', desc: 'Website & Referral Inquiries, Plus Unmatched External Complaints' },
  { id: 'sendlog', path: 'sendlog', group: 'Act', label: 'Statement send log', Icon: Send,
    Component: SendLog, capability: 'Module: Statement send log',
    title: 'Statement Send Log', desc: 'Complete History of Sent Statements & Customer Engagement' },
  { id: 'intake', path: 'intake', group: 'Data', label: 'Intake & exceptions', Icon: Inbox,
    Component: Intake, capability: 'Module: Intake & exceptions',
    title: 'Intake & Exceptions', desc: 'Data Import Pipeline & Validation Exceptions Queue' },
  { id: 'incomplete', path: 'incomplete', group: 'Data', label: 'Incomplete records', Icon: FileWarning,
    Component: IncompleteRecords, capability: 'Module: Incomplete records',
    title: 'Incomplete Records', desc: 'Pending Profile Verification & Financial Completeness' },
  { id: 'valuation', path: 'valuation', group: 'Data', label: 'Valuation register', Icon: ClipboardList,
    Component: ValuationRegister, capability: 'Module: Valuation register',
    title: 'Valuation Register', desc: 'Verified Monthly Project Valuations & Property Appreciation' },
  { id: 'exits', path: 'exits', group: 'Data', label: 'Exit register', Icon: LogOut,
    Component: ExitRegister, capability: 'Module: Exit register',
    title: 'Exit Register', desc: 'Secondary Market Property Sales & Exit Analytics' },
  { id: 'engine', path: 'engine', group: 'Build', label: 'Scoring engine', Icon: SlidersHorizontal,
    Component: ScoringEngine, capability: 'Module: Scoring engine',
    title: 'Scoring Engine', desc: 'Segment Weight Configuration & Scoring Parameters' },
  { id: 'dict', path: 'dict', group: 'Build', label: 'Field dictionary', Icon: BookOpen,
    Component: FieldDictionary, capability: 'Module: Field dictionary',
    title: 'Field Dictionary', desc: 'Data Fields Schema & Governance Responsibilities' },
  { id: 'auditlog', path: 'auditlog', group: 'Build', label: 'Audit log', Icon: History,
    Component: AuditLog, capability: 'Module: Audit log',
    title: 'Audit Log', desc: 'Every Create, Update & Delete Across the System, by Who and When' },
  /* consolidates what used to be three separate pages (User management,
     Master data, Access & governance) into one hub — see Settings.jsx.
     Gated on the same capability User management always was; each
     section inside additionally checks its own specific one (a role
     with e.g. Master data but not User management still only sees that
     one section once inside, same layered enforcement every other
     Module row already has). Deliberately excluded from App.jsx's
     generic per-page <Route>, same as 'master' below — it needs a
     second, nested route for /settings/:section. */
  { id: 'settings', path: 'settings', group: 'Build', label: 'Settings', Icon: SettingsIcon,
    Component: Settings, capability: 'Module: User management',
    title: 'Settings', desc: 'Company Profile, Users, Roles, Access & Master Data — All in One Place' },
];

export const pageById = (id) => PAGES.find((p) => p.id === id);
