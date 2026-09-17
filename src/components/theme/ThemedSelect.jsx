import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

/* Custom dropdown — never a native <select>, per the Nexora style guide.
   Trigger + portal-rendered popup positioned via getBoundingClientRect()
   so it's never clipped by a scrolling ancestor. */

/* The nearest ancestor that actually scrolls — a Modal's own
   max-h-[65vh] overflow-y-auto body, most often. Flip-up space is
   measured against ITS bottom edge, not the full window: the browser
   viewport routinely has plenty of room below a trigger sitting inside
   a shorter modal card, so a check against window.innerHeight alone
   never flips and the popup spills out past the modal's own rounded
   corners into the dimmed backdrop instead of just opening upward. */
function getScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}
export default function ThemedSelect({
  value,
  onChange,
  options, // [{ value, label }]
  placeholder = 'Select…',
  className = '',
  alwaysShowSearch = false,
  pill = false,
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [flipUp, setFlipUp] = useState(false);
  const [maxPopupHeight, setMaxPopupHeight] = useState(240);
  const [q, setQ] = useState('');
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const showSearch = alwaysShowSearch || options.length > 8;
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect(r);
    const boundary = getScrollParent(triggerRef.current)?.getBoundingClientRect()
      || { top: 0, bottom: window.innerHeight };
    const spaceBelow = boundary.bottom - r.bottom;
    const spaceAbove = r.top - boundary.top;
    const flip = spaceBelow < 250 && spaceAbove > spaceBelow;
    setFlipUp(flip);
    setMaxPopupHeight(Math.max(120, Math.min(240, (flip ? spaceAbove : spaceBelow) - 12)));
    setQ('');
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
    <div className={className}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 h-9 border ${pill ? 'rounded-full' : 'rounded-xl'} shadow-2xs hover:shadow-xs text-xs font-medium bg-white dark:bg-[#131C2E] text-gray-900 dark:text-white border-gray-200 dark:border-slate-700/80 transition-all duration-150 ${
          open ? 'ring-2 ring-orange-500/30 border-orange-500' : ''
        }`}
      >
        <span className={`truncate ${selected ? 'font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && rect && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[10050] bg-white/95 dark:bg-[#131C2E]/95 backdrop-blur-xl border border-gray-200/80 dark:border-slate-700/80 rounded-2xl shadow-xl overflow-hidden animate-fade-in-down"
          style={{
            left: rect.left,
            width: rect.width,
            maxHeight: maxPopupHeight,
            display: 'flex',
            flexDirection: 'column',
            ...(flipUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
          }}
        >
          {showSearch && (
            <div className="relative p-2 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-2 py-1 text-xs border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          )}
          <div className="overflow-y-auto overflow-x-hidden custom-scrollbar py-1 min-h-0">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">No matches</div>
            )}
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left ${
                  o.value === value
                    ? 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 font-semibold'
                    : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
