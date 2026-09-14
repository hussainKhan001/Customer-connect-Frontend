import { Fragment } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { daysTo } from '../utils/core.js';
import { PROJECTS } from '../constants/projects.js';
import { VAL_STALE_DAYS } from '../constants/seedData.js';
import { triggerList, dueTodayUnacked } from '../utils/derived.js';
import { exceptions } from '../utils/intake.js';
import { PAGES } from '../constants/navigation.js';
import { X } from 'lucide-react';

export default function Sidebar({ mobileOpen = false, onCloseMobile, collapsed = false }) {
  const { base, incompleteRecords } = useApp();
  const { getThemeColor } = useTheme();
  const location = useLocation();

  const ex = exceptions(base).length;
  const stale = PROJECTS.filter((p) => daysTo(p.noted) < -VAL_STALE_DAYS).length;
  const dueToday = dueTodayUnacked(triggerList(base, incompleteRecords)).length;
  const counts = {
    base: base.length,
    triggers: triggerList(base, incompleteRecords).length,
    intake: ex || '',
    incomplete: incompleteRecords.length || '',
    valuation: stale || '',
    exits: base.filter((c) => c.status === 'EXITED').length,
  };
  const alerts = { intake: !!ex, incomplete: !!incompleteRecords.length, valuation: !!stale };

  let lastGroup = null;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`print:hidden fixed lg:static inset-y-0 left-0 z-[9999] flex flex-col
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-xl lg:shadow-none
          border-r border-gray-200/70 dark:border-gray-800/80
          transition-[width,transform] duration-300 ease-in-out h-full
          w-72 max-w-[85vw] lg:max-w-none
          ${collapsed ? 'lg:w-16' : 'lg:w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`h-16 flex items-center gap-3 px-4 border-b border-gray-200/70 dark:border-gray-800/80 flex-shrink-0 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-200 hover:scale-105" style={{ backgroundColor: getThemeColor() }}>
            <span className="text-white text-xs font-black tracking-tighter">NC</span>
          </div>
          <div className={`min-w-0 transition-opacity duration-200 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">Neoteric Connect</div>
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 truncate">Owner Portfolio System</div>
          </div>
          <button onClick={onCloseMobile} className="ml-auto lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 ">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-3 px-2 space-y-0.5">
          {PAGES.filter((p) => p.id !== 'master').map((p) => {
            const head = p.group !== lastGroup ? p.group : null;
            lastGroup = p.group;
            const Icon = p.Icon;
            return (
              <Fragment key={p.id}>
                {head && (
                  <div className={`px-3 pt-3.5 pb-1 text-[9.5px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pointer-events-none ${collapsed ? 'lg:hidden' : ''}`}>
                    {head}
                  </div>
                )}
                <NavLink
                  to={`/${p.path}`}
                  title={collapsed ? p.label : undefined}
                  onClick={() => onCloseMobile?.()}
                  className={({ isActive }) => {
                    /* Customer Master isn't a sidebar destination of its
                       own (see the filter above) — it's only ever
                       reached by drilling into an owner from Owner
                       Base, so while it's open, Owner Base stays the
                       active item rather than the sidebar showing
                       nothing selected. */
                    const active = isActive || (p.id === 'base' && location.pathname.startsWith('/master'));
                    return `flex items-center gap-3 text-left rounded-xl px-3.5 py-2.5 text-[13px] ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
                      active
                        ? 'font-bold bg-[#FFF0E6] dark:bg-[#34241D] text-[#F96302] dark:text-[#FF7A28] shadow-2xs'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                    }`;
                  }}
                >
                  <span className="relative flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 transition-transform duration-200" />
                    {p.id === 'triggers' && !!dueToday && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-white dark:ring-gray-900"
                        title={`${dueToday} trigger${dueToday > 1 ? 's' : ''} due today`}
                      />
                    )}
                  </span>
                  <span className={collapsed ? 'lg:hidden' : 'flex-1 min-w-0 truncate'}>{p.label}</span>
                  <span
                    className={`flex-shrink-0 whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded-full ${
                      alerts[p.id] ? 'font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'text-gray-400 dark:text-gray-500'
                    } ${collapsed ? 'lg:hidden' : ''}`}
                  >
                    {counts[p.id] ?? ''}
                  </span>
                </NavLink>
              </Fragment>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
