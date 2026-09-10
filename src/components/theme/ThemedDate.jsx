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
   trap todayInput() in utils/core.js documents. */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parse = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null;
};
const toValue = (y, mo, d) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const label = (p) => new Date(p.y, p.mo, p.d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function ThemedDate({
  value,
  onChange,
  placeholder = 'Not captured',
  className = '',
  invalid = false,
  disabled = false,
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

  useEffect(() => {
    if (!open) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect(r);
    setFlipUp(window.innerHeight - r.bottom < 340 && r.top > 340);
    setMode('days');
    setView(parse(value) || today);
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

  const commit = (y, mo, d) => { onChange(toValue(y, mo, d)); setOpen(false); };
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
                    const isPicked = picked && picked.y === view.y && picked.mo === view.mo && picked.d === d;
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

          <div className="flex items-center justify-between px-2 py-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => commit(today.y, today.mo, today.d)}
              className="px-2 py-1 rounded-lg text-[11.5px] font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 "
              style={{ color: getThemeColor() }}
            >
              Today
            </button>
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
