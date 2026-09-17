/* =====================================================================
   NAVIGATION — one entry per page: its route path, Sidebar grouping/
   icon/label, and header title/description. Single source of truth
   consumed by both App.jsx (to build <Routes> and the header) and
   Sidebar.jsx (to render nav links) — previously duplicated as
   App.jsx's META/VIEWS and Sidebar.jsx's own NAV array.
   ===================================================================== */
import {
  LayoutDashboard, Users, IdCard, CalendarClock, GitBranch, FileText, Send,
  Inbox, ClipboardList, LogOut, SlidersHorizontal, BookOpen, ShieldCheck, UserCog, FileWarning, Database,
} from 'lucide-react';

/* Route-level code splitting — each page ships as its own chunk,
   fetched on first visit rather than all 15 up front. App.jsx wraps
   the <Routes> tree in a single <Suspense>, so this is the only
   change needed here; PAGES' `Component` field is unaffected — still
   just a component reference, now a lazy one. */
import CommandCentre from '../pages/CommandCentre.jsx';
import OwnerBase from '../pages/OwnerBase.jsx';
import CustomerMaster from '../pages/CustomerMaster.jsx';
import TriggerCalendar from '../pages/TriggerCalendar.jsx';
import ReferralTree from '../pages/ReferralTree.jsx';
import PortfolioStatement from '../pages/PortfolioStatement.jsx';
import SendLog from '../pages/SendLog.jsx';
import Intake from '../pages/Intake.jsx';
import IncompleteRecords from '../pages/IncompleteRecords.jsx';
import ValuationRegister from '../pages/ValuationRegister.jsx';
import ExitRegister from '../pages/ExitRegister.jsx';
import ScoringEngine from '../pages/ScoringEngine.jsx';
import FieldDictionary from '../pages/FieldDictionary.jsx';
import AccessGovernance from '../pages/AccessGovernance.jsx';
import UserManagement from '../pages/UserManagement.jsx';
import MasterData from '../pages/MasterData.jsx';

/* `path` is always the first URL segment for that page — master/statement
   additionally accept /:id and /:id/:tab, wired directly in App.jsx's
   <Routes> since that shape doesn't fit this flat one-row-per-page list. */
export const PAGES = [
  { id: 'command', path: 'command', group: 'Read', label: 'Dashboard', Icon: LayoutDashboard,
    Component: CommandCentre,
    title: 'Dashboard', desc: 'Neoteric Properties Store Intelligence & Re-Investment Overview' },
  { id: 'base', path: 'base', group: 'Read', label: 'Owner base', Icon: Users,
    Component: OwnerBase,
    title: 'Owner Base', desc: 'Comprehensive Owner Directory & Financial Segmentation' },
  { id: 'master', path: 'master', group: 'Read', label: 'Customer master', Icon: IdCard,
    Component: CustomerMaster,
    title: 'Customer Master', desc: 'Complete Customer Profile & Financial Summary' },
  { id: 'triggers', path: 'triggers', group: 'Act', label: 'Trigger calendar', Icon: CalendarClock,
    Component: TriggerCalendar,
    title: 'Trigger Calendar', desc: 'Scheduled Outbound Communication & Re-Investment Events' },
  { id: 'referrals', path: 'referrals', group: 'Act', label: 'Referral tree', Icon: GitBranch,
    Component: ReferralTree,
    title: 'Referral Tree', desc: 'Organic Customer Network & Multi-Tier Analytics' },
  { id: 'statement', path: 'statement', group: 'Act', label: 'Portfolio statement', Icon: FileText,
    Component: PortfolioStatement,
    title: 'Portfolio Statement', desc: 'Customer Portfolio Statement & Financial Summary' },
  { id: 'sendlog', path: 'sendlog', group: 'Act', label: 'Statement send log', Icon: Send,
    Component: SendLog,
    title: 'Statement Send Log', desc: 'Complete History of Sent Statements & Customer Engagement' },
  { id: 'intake', path: 'intake', group: 'Data', label: 'Intake & exceptions', Icon: Inbox,
    Component: Intake,
    title: 'Intake & Exceptions', desc: 'Data Import Pipeline & Validation Exceptions Queue' },
  { id: 'incomplete', path: 'incomplete', group: 'Data', label: 'Incomplete records', Icon: FileWarning,
    Component: IncompleteRecords,
    title: 'Incomplete Records', desc: 'Pending Profile Verification & Financial Completeness' },
  { id: 'valuation', path: 'valuation', group: 'Data', label: 'Valuation register', Icon: ClipboardList,
    Component: ValuationRegister,
    title: 'Valuation Register', desc: 'Verified Monthly Project Valuations & Property Appreciation' },
  { id: 'exits', path: 'exits', group: 'Data', label: 'Exit register', Icon: LogOut,
    Component: ExitRegister,
    title: 'Exit Register', desc: 'Secondary Market Property Sales & Exit Analytics' },
  { id: 'engine', path: 'engine', group: 'Build', label: 'Scoring engine', Icon: SlidersHorizontal,
    Component: ScoringEngine,
    title: 'Scoring Engine', desc: 'Segment Weight Configuration & Scoring Parameters' },
  { id: 'dict', path: 'dict', group: 'Build', label: 'Field dictionary', Icon: BookOpen,
    Component: FieldDictionary,
    title: 'Field Dictionary', desc: 'Data Fields Schema & Governance Responsibilities' },
  { id: 'access', path: 'access', group: 'Build', label: 'Access & governance', Icon: ShieldCheck,
    Component: AccessGovernance,
    title: 'Access & Governance', desc: 'Data Privacy Rules, PII Controls & Governance Policies' },
  { id: 'users', path: 'users', group: 'Build', label: 'User management', Icon: UserCog,
    Component: UserManagement,
    title: 'User Management', desc: 'System Roles, Capabilities & User Access Controls' },
  { id: 'masterdata', path: 'masterdata', group: 'Build', label: 'Master data', Icon: Database,
    Component: MasterData,
    title: 'Master Data', desc: 'Projects, Occupations & Every Dropdown Option List' },
];

export const pageById = (id) => PAGES.find((p) => p.id === id);
