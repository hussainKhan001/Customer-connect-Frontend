import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { daysTo } from '../utils/core.js';
import { VAL_STALE_DAYS } from '../constants/seedData.js';
import { triggerList, dueTodayUnacked } from '../utils/derived.js';
import { exceptions } from '../utils/intake.js';
import { PAGES } from '../constants/navigation.js';
import { X } from 'lucide-react';

export default function Sidebar({ mobileOpen = false, onCloseMobile, collapsed = false }) {
  const { base, incompleteRecords, masterData } = useApp();
  const { can } = useAuth();
  const { getThemeColor } = useTheme();
  const location = useLocation();

  /* every one of these iterates the full owner base (and triggerList
     does real date math per row) — cheap once, but this component
     re-renders on EVERY navigation click purely because useLocation()
     changed, and recomputing all of it fresh each time is exactly the
     kind of per-click jank that makes switching sidebar tabs feel
     laggy even though nothing here actually changed. Recomputed only
     when the underlying data does. */
  const { counts, alerts, dueToday } = useMemo(() => {
    const ex = exceptions(base).length;
    const stale = masterData.projects.filter((p) => daysTo(p.noted) < -VAL_STALE_DAYS).length;
    const triggers = triggerList(base, incompleteRecords);
    return {
      dueToday: dueTodayUnacked(triggers).length,
      counts: {
        base: base.length,
        triggers: triggers.length,
        intake: ex || '',
        incomplete: incompleteRecords.length || '',
        valuation: stale || '',
        exits: base.filter((c) => c.status === 'EXITED').length,
      },
      alerts: { intake: !!ex, incomplete: !!incompleteRecords.length, valuation: !!stale },
    };
  }, [base, incompleteRecords, masterData.projects]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`print:hidden fixed lg:static inset-y-0 left-0 z-[9999] flex flex-col
          bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-xl lg:shadow-none
          border-r border-gray-200/70 dark:border-slate-800/90
          transition-[width,transform] duration-300 ease-in-out h-full
          w-72 max-w-[85vw] lg:max-w-none
          ${collapsed ? 'lg:w-16' : 'lg:w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`h-16 flex items-center gap-3 px-4 border-b border-gray-200/70 dark:border-slate-800/90 flex-shrink-0 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-200 hover:scale-105" style={{ backgroundColor: getThemeColor() }}>
            <span className="text-white text-xs font-black tracking-tighter">NC</span>
          </div>
          <div className={`min-w-0 transition-opacity duration-200 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">Neoteric Connect</div>
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-400 truncate">Owner Portfolio System</div>
          </div>
          <button onClick={onCloseMobile} className="ml-auto lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-3 px-2.5 space-y-1">
          {PAGES.filter((p) => p.id !== 'master' && (!p.capability || can(p.capability))).map((p) => {
            const Icon = p.Icon;
            return (
                <NavLink
                  key={p.id}
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
                    const active = isActive || (p.id === 'base' && (location.pathname === '/master' || location.pathname.startsWith('/master/')));
                    return `flex items-center gap-3 text-left rounded-lg h-10 px-4 text-[13px] transition-all duration-150 ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
                      active
                        ? 'font-bold bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20 dark:border-orange-500/30 shadow-2xs'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-slate-800/60 hover:text-gray-900 dark:hover:text-white'
                    }`;
                  }}
                >
                  <span className="relative flex-shrink-0">
                    <Icon className="w-[18px] h-[18px] transition-transform duration-200" />
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
            );
          })}
        </nav>
      </aside>
    </>
  );
}
