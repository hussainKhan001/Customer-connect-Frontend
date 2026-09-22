/* Date-grouped history feed — same visual language as Nexora's own
   Lead Detail "Timeline" tab (orange dot + date header, one thin
   vertical line per day with a dot per entry riding on it, a
   circular icon badge, then title + "by <name>"). Adapted, not
   copied verbatim: Nexora's entries carry a precise timestamp (so it
   shows a clock time per row); activityFor()'s entries are mostly
   calendar dates with no real time-of-day (a booking date, a
   registry date), so a per-row time column would just print a
   meaningless "12:00 AM" on everything — left out rather than faked. */
import { Calendar, Plus, ShieldCheck, Star, AlertTriangle, Users, Phone, FileText, User as UserIcon, Banknote, Info } from 'lucide-react';
import { Card } from '../../components/Ui.jsx';
import { fmtD } from '../../utils/core.js';
import { activityFor } from '../../utils/derived.js';

/* one icon + one tint per activityFor() category ('w') — purely
   cosmetic grouping, same as the old Chip tone() this replaces. */
const TYPE = {
  Sales: { Icon: Plus, cls: 'text-green-600 dark:text-green-400' },
  Legal: { Icon: ShieldCheck, cls: 'text-blue-600 dark:text-blue-400' },
  Finance: { Icon: Banknote, cls: 'text-green-600 dark:text-green-400' },
  System: { Icon: AlertTriangle, cls: 'text-red-600 dark:text-red-400' },
  Consent: { Icon: ShieldCheck, cls: 'text-blue-600 dark:text-blue-400' },
  Survey: { Icon: Star, cls: 'text-amber-600 dark:text-amber-400' },
  Service: { Icon: AlertTriangle, cls: 'text-red-600 dark:text-red-400' },
  Referral: { Icon: Users, cls: 'text-purple-600 dark:text-purple-400' },
  Event: { Icon: Calendar, cls: 'text-indigo-600 dark:text-indigo-400' },
  Call: { Icon: Phone, cls: 'text-blue-600 dark:text-blue-400' },
  Statement: { Icon: FileText, cls: 'text-orange-600 dark:text-orange-400' },
  Customer: { Icon: UserIcon, cls: 'text-gray-500 dark:text-gray-400' },
};

const dateHeader = (d) => {
  const day = new Date(d);
  const today = new Date();
  if (day.toDateString() === today.toDateString()) return 'TODAY';
  return day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
};

export default function MActivity({ c }) {
  const rows = activityFor(c);

  /* newest date-group first (activityFor() already returns newest
     entry first, and object key insertion order preserves that for
     the group headers); within a group, entries stay in the same
     newest-first order they arrived in. */
  const groups = [];
  const byDate = new Map();
  rows.forEach((a) => {
    const key = new Date(a.d).toDateString();
    if (!byDate.has(key)) { byDate.set(key, []); groups.push(key); }
    byDate.get(key).push(a);
  });

  return (
    <Card title="Activity log" hint="every touch, by name">
      {!rows.length && (
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed py-4 text-center">
          No activity recorded yet.
        </div>
      )}
      {groups.map((key) => (
        <div key={key} className="mb-6 last:mb-0">
          <div className="flex items-center mb-3">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm flex-shrink-0" />
            <h3 className="ml-2.5 text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-wide">{dateHeader(byDate.get(key)[0].d)}</h3>
          </div>
          <div className="relative ml-[5px]">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            {byDate.get(key).map((a, i) => {
              const { Icon, cls } = TYPE[a.w] || { Icon: Info, cls: 'text-gray-400 dark:text-gray-500' };
              return (
                <div key={i} className="relative pb-5 last:pb-0">
                  <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
                  <div className="flex gap-3 ml-4">
                    <div className={`w-7 h-7 flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm ${cls}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mb-0.5">
                        {fmtD(a.d)}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white break-words">{a.t}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">by {a.by}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60">
        This log is the only thing that will ever let you re-fit the four weights against real second
        purchases. Until you have two quarters of outcomes here, 40/25/20/15 is a written, testable guess
        and nothing more.
      </div>
    </Card>
  );
}
