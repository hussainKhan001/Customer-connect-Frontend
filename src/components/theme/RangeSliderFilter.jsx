/* A pill trigger + portal-rendered popover, same chrome and positioning
   as ThemedSelect.jsx (flip-up against the nearest scrolling ancestor,
   outside-click/scroll to close) — but for picking a numeric 0–100
   range with a dual-thumb slider instead of picking one option from a
   list. Used by Owner Base's Data Confidence filter. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gauge } from 'lucide-react';

const POPUP_WIDTH = 256; // matches the popup's w-64

function getScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

export default function RangeSliderFilter({
  min, max, // '' means unset at that end
  onChange, // (min, max) => void, each either '' or a number
  label = 'Range',
  unit = '%',
  bounds = [0, 100],
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [flipUp, setFlipUp] = useState(false);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const [lo, hi] = bounds;
  const loVal = min === '' ? lo : Number(min);
  const hiVal = max === '' ? hi : Number(max);
  const isSet = min !== '' || max !== '';

  useEffect(() => {
    if (!open) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect(r);
    const boundary = getScrollParent(triggerRef.current)?.getBoundingClientRect()
      || { top: 0, bottom: window.innerHeight };
    setFlipUp(boundary.bottom - r.bottom < 220 && r.top - boundary.top > boundary.bottom - r.bottom);
  }, [open]);

  /* the popup has a FIXED width (unlike ThemedSelect's, which always
     matches its trigger's own width and so can never overflow) — on a
     narrow screen or a trigger sitting near the right edge, anchoring
     it to rect.left unconditionally pushed the slider's far/right half
     (the max thumb, the Done button) off-screen entirely, unreachable
     rather than just visually cramped. Clamped to stay fully within
     the viewport, with an 8px margin on both sides. */
  const popupLeft = rect
    ? Math.max(8, Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 8))
    : 0;

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

  const setLo = (v) => onChange(Math.min(Number(v), hiVal), max === '' ? '' : hiVal);
  const setHi = (v) => onChange(min === '' ? '' : loVal, Math.max(Number(v), loVal));
  const clear = () => { onChange('', ''); setOpen(false); };

  const trigLabel = !isSet
    ? `All ${label.toLowerCase()}`
    : min !== '' && max !== '' ? `${loVal}${unit} – ${hiVal}${unit}`
    : min !== '' ? `${loVal}${unit}+`
    : `Up to ${hiVal}${unit}`;

  return (
    <div className={className}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 h-11 border rounded-md shadow-2xs hover:shadow-xs text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-slate-700/80 transition-all duration-150 ${
          open ? 'ring-2 ring-orange-500/30 border-orange-500' : ''
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Gauge className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className={`truncate ${isSet ? 'font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>{trigLabel}</span>
        </span>
      </button>

      {open && rect && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[10050] w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/80 dark:border-slate-700/80 rounded-lg shadow-xl animate-fade-in-down p-4"
          style={{
            left: popupLeft,
            ...(flipUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
          }}
        >
          <div className="text-xs font-bold text-gray-900 dark:text-white mb-1">{label}</div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400 mb-4 tabular-nums">
            {loVal}{unit} – {hiVal}{unit}
          </div>

          <div className="relative h-1.5 mb-1">
            <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-slate-700" />
            <div
              className="absolute h-1.5 rounded-full theme-bg"
              style={{ left: `${((loVal - lo) / (hi - lo)) * 100}%`, right: `${100 - ((hiVal - lo) / (hi - lo)) * 100}%` }}
            />
            <input
              type="range" min={lo} max={hi} value={loVal}
              onChange={(e) => setLo(e.target.value)}
              className="range-thumb absolute inset-0 w-full appearance-none bg-transparent"
              style={{ zIndex: loVal > (lo + hi) / 2 ? 5 : 3 }}
            />
            <input
              type="range" min={lo} max={hi} value={hiVal}
              onChange={(e) => setHi(e.target.value)}
              className="range-thumb absolute inset-0 w-full appearance-none bg-transparent"
              style={{ zIndex: loVal > (lo + hi) / 2 ? 3 : 5 }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-500 mb-3">
            <span>{lo}{unit}</span>
            <span>{hi}{unit}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
            <button type="button" onClick={clear} className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400">
              Clear
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
