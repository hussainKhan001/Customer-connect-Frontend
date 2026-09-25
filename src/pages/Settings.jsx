/* The Settings hub — one sidebar entry consolidating what used to be
   three separate pages (User Management, Master Data, Access &
   Governance). An Overview grid of cards (mirrors a typical SaaS
   settings landing page: one card per section, each showing a live
   status line) plus a left sub-nav for jumping straight to a section —
   both drive the same `section` state, kept in the URL
   (/settings/:section) so a direct link (see UserMenu.jsx) or a
   refresh lands back on the right one.

   Master Data and Access & Governance are embedded unchanged (they
   already render standalone with no page chrome of their own beyond
   their own permission gate) — only the old User Management page's
   three tabs (Users/Roles/company settings) were actually split apart,
   into components/settings/*Section.jsx, since those three shared one
   page's internal tab switcher that this hub's sub-nav now replaces. */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Users as UsersIcon, KeyRound, ShieldCheck, Database, ChevronRight, LayoutGrid } from 'lucide-react';
import { EmptyState } from '../components/Ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useRoles } from '../hooks/useRoles.js';
import { apiFetch } from '../utils/api.js';
import UsersSection from '../components/settings/UsersSection.jsx';
import RolesSection from '../components/settings/RolesSection.jsx';
import CompanyProfileSection from '../components/settings/CompanyProfileSection.jsx';
import MasterData from './MasterData.tsx';
import AccessGovernance from './AccessGovernance.jsx';

const MANAGE_USERS_MODULE = 'Module: User management';

/* one row per section — `group` decides which sub-nav header it sits
   under, `capability` decides whether it shows at all (each section
   still enforces the same capability itself server-side; this is only
   the same UX-convenience layer every other page's Module row already
   is — see PermissionGate's own comment in Ui.jsx). */
const SECTION_DEFS = [
  { key: 'company', label: 'Company profile', group: 'Account', Icon: Building2, capability: MANAGE_USERS_MODULE },
  { key: 'users', label: 'Users', group: 'Team & access', Icon: UsersIcon, capability: MANAGE_USERS_MODULE },
  { key: 'roles', label: 'Roles', group: 'Team & access', Icon: KeyRound, capability: MANAGE_USERS_MODULE },
  { key: 'governance', label: 'Access & governance', group: 'Team & access', Icon: ShieldCheck, capability: 'Module: Access & governance' },
  { key: 'masterdata', label: 'Master data', group: 'Workspace', Icon: Database, capability: 'Module: Master data' },
];

const navBtnCls = (active) =>
  `w-full flex items-center gap-2.5 text-left rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
    active
      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/25 dark:text-primary-300'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
  }`;

export default function SettingsPage() {
  const { can } = useAuth();
  const { settings, masterData } = useApp();
  const { roles, error: rolesError, reload: reloadRoles } = useRoles();
  const [users, setUsers] = useState(null);
  const [usersError, setUsersError] = useState(null);
  const navigate = useNavigate();
  const { section } = useParams();

  const loadUsers = () => {
    apiFetch('/api/users')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(res.status === 403 ? 'Your role does not have access to user management.' : body.error || 'Could not load users.');
        }
        return res.json();
      })
      .then((data) => { setUsers(data); setUsersError(null); })
      .catch((err) => setUsersError(err.message));
  };
  useEffect(loadUsers, []);

  const sections = useMemo(() => SECTION_DEFS.filter((s) => can(s.capability)), [can]);
  const groups = useMemo(() => [...new Set(sections.map((s) => s.group))], [sections]);
  const activeKey = section && sections.some((s) => s.key === section) ? section : 'overview';
  const goTo = (key) => navigate(key === 'overview' ? '/settings' : `/settings/${key}`);

  if (!sections.length) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="You don't have access to Settings"
        hint="Ask an admin to grant a Settings capability (User management, Master data or Access & governance) if you need this."
      />
    );
  }

  const STATUS = {
    company: settings?.companyName || 'Not set yet',
    users: users ? `${users.length} account${users.length === 1 ? '' : 's'}` : 'Loading…',
    roles: roles ? `${roles.length} role${roles.length === 1 ? '' : 's'}` : 'Loading…',
    governance: 'Live permission matrix',
    masterdata: `${masterData.projects.length} projects · ${masterData.occupations.length} occupations`,
  };

  const SECTION_BODY = {
    company: <CompanyProfileSection />,
    users: <UsersSection users={users} setUsers={setUsers} loadError={usersError} roles={roles} reloadRoles={reloadRoles} />,
    roles: <RolesSection roles={roles} rolesError={rolesError} reloadRoles={reloadRoles} reloadUsers={loadUsers} />,
    governance: <AccessGovernance />,
    masterdata: <MasterData />,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
      <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-4 space-y-4">
        <button onClick={() => goTo('overview')} className={navBtnCls(activeKey === 'overview')}>
          <LayoutGrid className="w-4 h-4 flex-shrink-0" /> Overview
        </button>
        {groups.map((group) => (
          <div key={group}>
            <div className="px-3 mb-1 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {group}
            </div>
            <div className="space-y-0.5">
              {sections.filter((s) => s.group === group).map((s) => (
                <button key={s.key} onClick={() => goTo(s.key)} className={navBtnCls(activeKey === s.key)}>
                  <s.Icon className="w-4 h-4 flex-shrink-0" /> {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        {activeKey === 'overview' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => goTo(s.key)}
                className="group text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                  <s.Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{s.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{STATUS[s.key]}</div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors" />
              </button>
            ))}
          </div>
        ) : SECTION_BODY[activeKey]}
      </div>
    </div>
  );
}
