import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

/* Custom date picker — never a native <input type="date">, whose popup
   is drawn by the browser and ignores the app's theme entirely.
   Same shape as ThemedSelect: trigger + portal-rendered popup placed
   from getBoundingClientRect() so a scrolling ancestor can't clip it.

   Value in and out is the same "YYYY-MM-DD" string the native input
   used, so every existing draft/state/payload works unchanged, and
   onChange emits that string directly (not an event) to match
   ThemedSelect's onChange(value) convention.

   Dates are parsed/built from their Y/M/D parts rather than through
   new Date(string): a date-only string parses as UTC midnight, which
   renders as the previous day in any timezone behind UTC — the same
   trap todayInput() in utils/core.js documents.

   `withTime` extends the same themed popup with a time-of-day row —
   value becomes "YYYY-MM-DDTHH:mm" (what a native `datetime-local`
   input already produces, so a follow-up's dueAt round-trips exactly
   the same either way). Picking a day no longer closes the popup in
   this mode — there's a time still to set — so an explicit "Set"
   button commits both together; every date-only caller is unaffected
   since this prop defaults to false. */

/* Same scroll-ancestor-aware flip check as ThemedSelect — flipping
   only against window.innerHeight lets the popup spill past a shorter
   Modal's own bottom edge when there's still plenty of viewport room
   below the trigger but not much modal left. */
function getScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parse = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(s || ''));
  if (!m) return null;
  return { y: +m[1], mo: +m[2] - 1, d: +m[3], h: m[4] !== undefined ? +m[4] : null, min: m[5] !== undefined ? +m[5] : null };
};
const toValue = (y, mo, d, h, min) => {
  const datePart = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return h == null ? datePart : `${datePart}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};
const label = (p) => {
  const datePart = new Date(p.y, p.mo, p.d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (p.h == null) return datePart;
  const timePart = new Date(2000, 0, 1, p.h, p.min).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
};

export default function ThemedDate({
  value,
  onChange,
  placeholder = 'Not captured',
  className = '',
  invalid = false,
  disabled = false,
  withTime = false,
}) {
  const { getThemeColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [flipUp, setFlipUp] = useState(false);
  const [mode, setMode] = useState('days');
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const picked = parse(value);
  const today = useMemo(() => {
    const n = new Date();
    return { y: n.getFullYear(), mo: n.getMonth(), d: n.getDate() };
  }, []);
  const [view, setView] = useState(() => picked || today);
  /* the in-progress day+time selection while withTime's popup is still
     open — separate from `picked` (the committed value) so choosing a
     day and then a time are two steps that both land in one onChange. */
  const [pendingDay, setPendingDay] = useState(null);
  const [pendingTime, setPendingTime] = useState('12:00');

  useEffect(() => {
    if (!open) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect(r);
    const boundary = getScrollParent(triggerRef.current)?.getBoundingClientRect()
      || { top: 0, bottom: window.innerHeight };
    const spaceBelow = boundary.bottom - r.bottom;
    const spaceAbove = r.top - boundary.top;
    setFlipUp(spaceBelow < 400 && spaceAbove > spaceBelow);
    setMode('days');
    const p = parse(value);
    setView(p || today);
    setPendingDay(p ? { y: p.y, mo: p.mo, d: p.d } : null);
    setPendingTime(p && p.h != null ? `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}` : '12:00');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const commit = (y, mo, d) => {
    if (withTime) { setPendingDay({ y, mo, d }); return; }
    onChange(toValue(y, mo, d));
    setOpen(false);
  };
  const commitWithTime = () => {
    if (!pendingDay) return;
    const [h, min] = pendingTime.split(':').map(Number);
    onChange(toValue(pendingDay.y, pendingDay.mo, pendingDay.d, h, min));
    setOpen(false);
  };
  const shiftMonth = (n) => setView((v) => {
    const t = new Date(v.y, v.mo + n, 1);
    return { y: t.getFullYear(), mo: t.getMonth(), d: 1 };
  });

  /* leading blanks so the 1st lands under its weekday, then the days */
  const cells = useMemo(() => {
    const first = new Date(view.y, view.mo, 1).getDay();
    const days = new Date(view.y, view.mo + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [view.y, view.mo]);

  const decadeStart = Math.floor(view.y / 12) * 12;
  const cellBase = 'h-8 rounded-lg text-[12.5px] flex items-center justify-center ';

  return (
    <div className={className}>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 h-10 border rounded-full shadow-sm hover:shadow-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${invalid ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
        style={open ? { boxShadow: `0 0 0 2px ${getThemeColor()}` } : undefined}
      >
        <span className={picked ? '' : 'text-gray-400 dark:text-gray-500'}>
          {picked ? label(picked) : placeholder}
        </span>
        <CalendarDays className="w-4 h-4 flex-shrink-0 text-gray-400" />
      </button>

      {open && rect && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[10050] w-[268px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-lg shadow-lg overflow-hidden animate-fade-in-down"
          style={{
            left: Math.min(rect.left, window.innerWidth - 276),
            ...(flipUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
          }}
        >
          <div className="flex items-center justify-between px-2 py-2 border-b border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => (mode === 'days' ? shiftMonth(-1) : setView((v) => ({ ...v, y: v.y - 12 })))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 "
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMode((m) => (m === 'days' ? 'months' : m === 'months' ? 'years' : 'days'))}
              className="px-2 py-1 rounded-lg text-[12.5px] font-bold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 "
            >
              {mode === 'days' ? `${MONTHS[view.mo]} ${view.y}` : mode === 'months' ? view.y : `${decadeStart}–${decadeStart + 11}`}
            </button>
            <button
              type="button"
              onClick={() => (mode === 'days' ? shiftMonth(1) : setView((v) => ({ ...v, y: v.y + 12 })))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 "
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2">
            {mode === 'days' && (
              <>
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((w, i) => (
                    <div key={i} className="h-6 flex items-center justify-center text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500">{w}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((d, i) => {
                    if (d === null) return <div key={i} />;
                    const isPicked = withTime
                      ? pendingDay && pendingDay.y === view.y && pendingDay.mo === view.mo && pendingDay.d === d
                      : picked && picked.y === view.y && picked.mo === view.mo && picked.d === d;
                    const isToday = today.y === view.y && today.mo === view.mo && today.d === d;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => commit(view.y, view.mo, d)}
                        className={`${cellBase} ${isPicked ? 'text-white font-bold' : isToday ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'} ${isPicked ? '' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        style={isPicked ? { backgroundColor: getThemeColor() }
                          : isToday ? { boxShadow: `inset 0 0 0 1px ${getThemeColor()}` } : undefined}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {mode === 'months' && (
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setView((v) => ({ ...v, mo: i })); setMode('days'); }}
                    className={`${cellBase} ${view.mo === i ? 'text-white font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    style={view.mo === i ? { backgroundColor: getThemeColor() } : undefined}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {mode === 'years' && (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => decadeStart + i).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setView((v) => ({ ...v, y })); setMode('months'); }}
                    className={`${cellBase} ${view.y === y ? 'text-white font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    style={view.y === y ? { backgroundColor: getThemeColor() } : undefined}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>

          {withTime && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-[11.5px] font-semibold text-gray-600 dark:text-gray-300">Time</span>
              <input
                type="time"
                value={pendingTime}
                onChange={(e) => setPendingTime(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-[12.5px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div className="flex items-center justify-between px-2 py-2 border-t border-gray-100 dark:border-gray-700">
            {withTime ? (
              <button
                type="button"
                onClick={commitWithTime}
                disabled={!pendingDay}
                className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: getThemeColor() }}
              >
                Set
              </button>
            ) : (
              <button
                type="button"
                onClick={() => commit(today.y, today.mo, today.d)}
                className="px-2 py-1 rounded-lg text-[11.5px] font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 "
                style={{ color: getThemeColor() }}
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 "
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
