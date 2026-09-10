import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

/* Custom dropdown — never a native <select>, per the Nexora style guide.
   Trigger + portal-rendered popup positioned via getBoundingClientRect()
   so it's never clipped by a scrolling ancestor. */
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
    setFlipUp(window.innerHeight - r.bottom < 250 && r.top > 250);
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
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 h-9 border ${pill ? 'rounded-full' : 'rounded-xl'} shadow-2xs hover:shadow-xs text-xs font-medium bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700/80 transition-all duration-150 ${
          open ? 'ring-2 ring-primary-500/30 border-primary-500' : ''
        }`}
      >
        <span className={`truncate ${selected ? 'font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && rect && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[10050] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-2xl shadow-xl overflow-hidden animate-fade-in-down"
          style={{
            left: rect.left,
            width: rect.width,
            ...(flipUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
          }}
        >
          {showSearch && (
            <div className="relative p-2 border-b border-gray-100 dark:border-gray-700/80">
              <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-2 py-1 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No matches</div>
            )}
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 "
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="w-3.5 h-3.5 flex-shrink-0 text-primary-500" />}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
