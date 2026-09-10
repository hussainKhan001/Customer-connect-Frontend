/* Header notification bell — surfaces the same triggerList() data
   TriggerCalendar.jsx already renders as a full page and Sidebar.jsx
   already counts for its nav badge, just at header level: a badge
   count of what's due in the next 7 days, and a popover listing them,
   click-to-open like every other trigger row in the app. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { Chip, Avatar } from './Ui.jsx';
import { triggerList, dueTodayUnacked } from '../utils/derived.js';
import { fmtDM, addD, TODAY, todayInput } from '../utils/core.js';

const kindTone = (k) => (k === 'money' ? 'g' : k === 'personal' ? 'm' : 'w');

export default function NotificationBell() {
  const { base, incompleteRecords, mutateCustomer } = useApp();
  const { openCustomer } = useAppNavigation();
  const { getThemeColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const soon = triggerList(base, incompleteRecords).filter((t) => t.days <= 7);
  const dueToday = dueTodayUnacked(soon).length;

  const ack = (t) => (e) => {
    e.stopPropagation();
    mutateCustomer(`/api/customers/${t.c.id}/trigger-acks`, { label: t.label, date: todayInput() }, 'POST').catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    setRect(triggerRef.current.getBoundingClientRect());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 sm:w-9 h-8 sm:h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
        title="Upcoming triggers — next 7 days"
      >
        <Bell className="w-4 h-4" />
        {!!soon.length && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-red-500 shadow-xs"
          >
            {soon.length > 99 ? '99+' : soon.length}
          </span>
        )}
      </button>

      {open && rect && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[10050] w-80 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl animate-fade-in-down "
          style={{ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) }}
        >
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-100">Next 7 days</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{soon.length} due</span>
          </div>
          {soon.length ? (
            <ul className="list-none m-0 p-0">
              {soon.slice(0, 10).map((t, i) => {
                const isDueToday = t.days === 0 && !t.acked;
                return (
                <li key={i}
                    className={`flex items-start gap-2.5 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer ${isDueToday ? 'bg-red-50/60 dark:bg-red-500/10' : ''}`}
                    onClick={() => { setOpen(false); openCustomer(t.c.id); }}
                >
                  <span className="relative flex-shrink-0">
                    <Avatar name={t.c.name} size="xs" />
                    {isDueToday && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-white dark:ring-gray-800" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[12.5px] text-gray-900 dark:text-white truncate">{t.c.name}</span>
                      <Chip cls={kindTone(t.kind)}>{t.kind}</Chip>
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300">{t.label}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {t.days === 0 ? 'Today' : `in ${t.days}d`} · {fmtDM(addD(TODAY, t.days))}
                    </div>
                  </div>
                  {isDueToday && (
                    <button
                      onClick={ack(t)}
                      title="Mark as handled"
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 "
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-6 text-[12.5px] text-gray-500 dark:text-gray-400 text-center">
              Nothing dated in the next 7 days.
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
