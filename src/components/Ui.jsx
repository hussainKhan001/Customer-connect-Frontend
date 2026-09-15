/* =====================================================================
   UI PRIMITIVES — the small pieces every view is built from, restyled
   to the Tailwind/dark-mode design system (see UI_STYLE_GUIDE.md).
   Prop shapes are unchanged from the original so views keep working.
   ===================================================================== */
import { Children, forwardRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { initials } from '../utils/core.js';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { PAGE_SIZE_OPTIONS } from '../hooks/usePagination.js';

/* Chip tone → Tailwind status-badge pair. A–D are the owner segments,
   g/w/r/m/k are the shared semantic tones used everywhere else. */
const CHIP_TONE = {
  A: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  C: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  D: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  g: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  w: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  r: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  m: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  k: 'bg-gray-800 text-white dark:bg-gray-900 dark:text-gray-200',
};

export const Chip = ({ cls = 'm', children }) => (
  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${CHIP_TONE[cls] || CHIP_TONE.m}`}>
    {children}
  </span>
);

/* Initials avatar for list/row contexts (table rows, tree nodes, log
   lines) — every page that needed one before this (CustomerMaster's
   page-hero avatar, TriggerCalendar's row avatar, UserMenu's account
   avatar) hand-rolled its own slightly different version; this is the
   one everyone else should reuse. CustomerMaster's square, larger
   page-hero avatar stays bespoke on purpose — it's a different context
   (page identity, not a row in a list) — so this is deliberately
   circular, sized for rows. */
const AVATAR_SIZE = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-[13px]',
  lg: 'w-12 h-12 text-base',
};
export const Avatar = ({ name, size = 'sm', className = '' }) => {
  return (
    <div
      className={`${AVATAR_SIZE[size] || AVATAR_SIZE.sm} flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold bg-primary-600 shadow-sm ${className}`}
    >
      {initials(name)}
    </div>
  );
};

/* Pulsing placeholder block for loading states — sized entirely via
   `className` (e.g. "h-4 w-32", "h-10 w-10 rounded-full") so callers
   compose their own skeleton shells from it. */
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

export const ScoreBar = ({ n }) => (
  <div className="flex items-center gap-2">
    <span className="w-6 text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">{n}</span>
    <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <div
        className={`h-full rounded-full ${n < 50 ? 'bg-gray-400 dark:bg-gray-500' : 'bg-primary-500'}`}
        style={{ width: `${n}%` }}
      />
    </div>
  </div>
);

/* A key/value line. `v` may be any node; null or '' reads "not captured"
   so a gap is visible rather than silently blank. */
export const Row = ({ k, v, miss }) => (
  <div className="flex justify-between gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
    <span className="text-gray-500 dark:text-gray-400">{k}</span>
    <span className={`font-semibold text-right ${miss ? 'font-normal italic text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>
      {v == null || v === '' ? 'not captured' : v}
    </span>
  </div>
);

export const KV = ({ children }) => <div>{children}</div>;

export function Card({ title, hint, children, pad = true, className = '', style }) {
  return (
    <div className={`glass-card mb-4 overflow-hidden ${className}`.trim()} style={style}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-100/80 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight uppercase">{title}</h3>
          {hint != null && <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{hint}</span>}
        </div>
      )}
      {pad ? <div className="p-4">{children}</div> : children}
    </div>
  );
}

const BANNER_TONE = {
  block: 'bg-red-50/90 dark:bg-red-950/20 border-red-500 text-red-900 dark:text-red-300 shadow-xs',
  ok: 'bg-orange-50/90 dark:bg-orange-950/20 border-primary-500 text-orange-900 dark:text-orange-200 shadow-xs',
  info: 'bg-blue-50/90 dark:bg-blue-950/20 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs',
  warn: 'bg-amber-50/90 dark:bg-amber-950/20 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs',
  good: 'bg-green-50/90 dark:bg-green-950/20 border-green-500 text-green-900 dark:text-green-200 shadow-xs',
};

export const Banner = ({ kind = 'info', children, style }) => (
  <div className={`px-4 py-3 rounded-xl border-l-4 text-[13px] leading-relaxed mb-4 backdrop-blur-xs transition-all ${BANNER_TONE[kind] || BANNER_TONE.info}`} style={style}>
    {children}
  </div>
);

const METER_FILL = {
  o: 'bg-gradient-to-r from-orange-500 to-amber-500',
  g: 'bg-gradient-to-r from-emerald-500 to-green-500',
  r: 'bg-gradient-to-r from-red-500 to-rose-500',
  '': 'bg-gradient-to-r from-gray-600 to-gray-400 dark:from-gray-400 dark:to-gray-200',
};

export const Meter = ({ label, value, sub, cls, width }) => (
  <div className="mb-2.5">
    <div className="flex justify-between text-[13px] mb-1">
      <span className="text-gray-700 dark:text-gray-300">
        {label}
        {sub && <span className="text-[11px] text-gray-400 dark:text-gray-500"> · {sub}</span>}
      </span>
      <b className="tabular-nums text-gray-900 dark:text-white">{value}</b>
    </div>
    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden p-0.5">
      <div className={`h-full rounded-full transition-all duration-500 ${METER_FILL[cls] || METER_FILL['']}`} style={{ width: `${width}%` }} />
    </div>
  </div>
);

const KPI_TONE = {
  g: 'text-emerald-600 dark:text-emerald-400',
  o: 'text-primary-600 dark:text-primary-400',
  r: 'text-rose-600 dark:text-rose-400',
};

/* icon + its circular chip background, one tone per semantic colour */
const KPI_ICON_CHIP = {
  g: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  o: 'bg-primary-500/15 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400',
  r: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
  b: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
};
const KPI_ICON_CHIP_DEFAULT = 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500';

export const Kpi = ({ label, value, sub, tone, icon: Icon, active, highlight }) => (
  <div
    className={`relative bg-white/95 dark:bg-gray-900/95 rounded-2xl p-4 transition-all duration-300 border border-gray-100 dark:border-gray-800/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_25px_-4px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_25px_-4px_rgba(0,0,0,0.4)] ${
      active ? 'ring-2 ring-primary-500/50' : highlight ? 'ring-2 ring-blue-500/40 border-blue-400/60 dark:border-blue-500/50' : ''
    }`}
  >
    <div className="min-w-0 pr-8">
      <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">{label}</div>
      <div className={`text-2xl font-extrabold tabular-nums tracking-tight mt-1 ${KPI_TONE[tone] || 'text-gray-900 dark:text-white'}`}>{value}</div>
    </div>
    {Icon && (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center absolute right-4 bottom-4 transition-transform duration-200 hover:scale-105 ${KPI_ICON_CHIP[tone] || KPI_ICON_CHIP_DEFAULT}`}>
        <Icon className="w-5 h-5" strokeWidth={2.2} />
      </div>
    )}
    {sub != null && sub !== '' && <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-snug">{sub}</div>}
  </div>
);

const KPI_GRID = { 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4', 5: 'grid-cols-2 sm:grid-cols-5', 6: 'grid-cols-2 sm:grid-cols-6' };

export const Kpis = ({ children }) => (
  <div className={`grid ${KPI_GRID[Children.count(children)] || KPI_GRID[5]} gap-3 mb-4`}>{children}</div>
);

/* Column count -> Tailwind grid classes, as a literal map rather than
   built from the number at runtime — Tailwind's JIT scanner reads
   source text for class names, so `grid-cols-${n}` would compile to
   nothing. Extend this map (not a template string) if a screen ever
   needs more than 9 cards in one row. */
const STATS_GRID_COLS = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4', 5: 'grid-cols-2 sm:grid-cols-5', 6: 'grid-cols-2 sm:grid-cols-6',
  7: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7', 8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
  9: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-9',
};

/* Clickable "stat tile as filter shortcut" grid — Command Centre's
   segment tiles and Owner Base's project tiles both hand-rolled this
   same shape independently before this existed. One card:
   { label, value, sub, icon, iconColor, topBorderColor, filterValue,
   ringColor, title }. Becomes a real <button> (and shows the
   ring-highlight when `activeFilter` matches its `filterValue`) only
   when `onCardClick` is passed — a plain non-interactive <div>
   otherwise, for a screen that just wants the same tile look with
   nothing to click. Clicking the already-active card clears the
   filter (passes '' back), matching how every filter chip elsewhere
   in this app already toggles off. */
export function StatsCards({ cards, activeFilter, onCardClick, className = '' }) {
  const cols = STATS_GRID_COLS[cards.length] || STATS_GRID_COLS[4];
  return (
    <div className={`grid ${cols} gap-2.5 sm:gap-3.5 mb-4 sm:mb-5 ${className}`.trim()}>
      {cards.map((c) => {
        const clickable = !!onCardClick;
        const isSelected = clickable && activeFilter === c.filterValue;
        const Tag = clickable ? 'button' : 'div';
        const Icon = c.icon;
        return (
          <Tag
            key={c.filterValue ?? c.label}
            type={clickable ? 'button' : undefined}
            title={c.title}
            className={`relative rounded-xl sm:rounded-2xl p-2.5 sm:p-4 pr-8 sm:pr-11 text-left transition-shadow duration-150 border cursor-pointer overflow-hidden ${
              isSelected
                ? 'bg-primary-500/5 dark:bg-primary-500/10 border-primary-500 ring-2 ring-primary-500/50 shadow-md'
                : 'bg-white dark:bg-gray-900/90 border-gray-200/80 dark:border-gray-800 shadow-2xs hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
            }`}
            onClick={clickable ? () => onCardClick(isSelected ? '' : c.filterValue) : undefined}
          >
            <div className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate tracking-tight">{c.label}</div>
            <div className={`text-lg sm:text-2xl md:text-3xl font-bold tracking-tight tabular-nums mt-0.5 sm:mt-1 ${c.valueColor || 'text-gray-900 dark:text-white'}`}>
              {c.value}
            </div>
            {c.sub != null && c.sub !== '' && (
              <div className="text-[9px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 leading-tight sm:leading-snug">{c.sub}</div>
            )}
            {Icon && (
              <div className={`absolute right-2 sm:right-3.5 bottom-2 sm:bottom-3.5 p-0.5 sm:p-1 flex items-center justify-center ${c.iconColor || 'text-primary-500'}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
              </div>
            )}
          </Tag>
        );
      })}
    </div>
  );
}

/* Horizontally scrollable table shell — wide tables scroll inside the
   card rather than pushing the page sideways. */
/* `maxHeight` bounds the table's own vertical scroll (with a sticky
   `<thead>` — see OwnerBase's `th()`) instead of letting a long table
   push the whole page's scrollbar out — pass it on any table whose
   row count can get large enough that scrolling the page itself to
   read a bottom row stops feeling like a data grid. */
/* forwardRef so a page that scrolls its own row list back to where the
   user left it (see OwnerBase's scroll-restore-on-back) has something
   to read/set scrollTop on — plain children have no DOM node of their
   own to grab. */
export const TableWrap = forwardRef(({ children, maxHeight, ...rest }, ref) => (
  <div
    ref={ref}
    className={`overflow-x-auto custom-horizontal-scrollbar ${maxHeight ? 'overflow-y-auto custom-scrollbar' : ''}`}
    style={maxHeight ? { maxHeight } : undefined}
    {...rest}
  >
    {children}
  </div>
));

export const Timeline = ({ children }) => <ul className="list-none m-0 p-0">{children}</ul>;

/* Shared "nothing here yet" state — a screen with zero rows should
   explain what's missing and why it matters, not leave a bare table
   header floating over blank space (Referral Tree with no referrals
   yet, Exit Register with no exits recorded, Send Log before the
   first statement goes out). `action` is an optional node — usually
   a btnGhost link into the screen that would create the first row. */
export const EmptyState = ({ icon: Icon, title, hint, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-4">
    {Icon && <Icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />}
    <div className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</div>
    {hint && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm leading-relaxed">{hint}</div>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

const DOT_TONE = { g: 'bg-green-500', o: 'bg-primary-500', r: 'bg-red-500', '': 'bg-gray-400 dark:bg-gray-500' };

export const Dot = ({ tone = '' }) => <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${DOT_TONE[tone] || DOT_TONE['']}`} />;

/* Confidence percentages share one colour ramp across every view. */
export const confColor = (p) =>
  p >= 80 ? 'text-green-600 dark:text-green-400' : p >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
export const confMeterCls = (p) => (p >= 80 ? 'g' : p >= 60 ? 'o' : 'r');
export const healthMeterCls = (p) => (p >= 60 ? 'g' : p >= 40 ? 'o' : 'r');

/* Shared button classes — see UI_STYLE_GUIDE.md §7 */
export const btnBase = 'rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
export const btnGhost = `${btnBase} bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2`;

/* Shared field classes for every Modal-based form (label / input / error
   text / checkbox) — one definition so the growing set of operational
   edit modals (Status/Complaint/Loan/Valuation/Referral/Event/Exit)
   don't each redeclare the same Tailwind strings. Named distinctly from
   Intake.jsx's own separately-scoped local consts of similar names. */
export const formLabelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1';
export const formInputCls = (bad) =>
  `w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 ${bad ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`;
export const formErrorCls = 'text-xs text-red-500 mt-1';
export const formCheckCls = 'w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500';

/* Compact pill button for row-level actions inside tables/cards (Edit,
   Add, Close, Exit, +1 visit, etc.) — a real button (background, hover
   state) rather than a bare uppercase text link, so it reads as
   clickable at a glance instead of blending into surrounding labels. */
const ROW_ACTION_TONE = {
  primary: 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/30',
  green: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30',
  red: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30',
};
export const rowActionCls = (tone = 'primary') =>
  `inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full disabled:opacity-40 disabled:cursor-not-allowed ${ROW_ACTION_TONE[tone] || ROW_ACTION_TONE.primary}`;

/* Plain icon-only row action (Edit/Delete at the far right of a table
   row) — always visible, tinted by tone at rest with a soft hover
   background, no pill/label. Distinct from rowActionCls above, which
   is a labelled pill for actions like "+1 visit"/"Close"/"Exit". */
const TABLE_ICON_TONE = {
  primary: 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20',
  red: 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
};
export const tableIconBtnCls = (tone = 'primary') =>
  `p-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed ${TABLE_ICON_TONE[tone] || TABLE_ICON_TONE.primary}`;

export function BtnPrimary({ children, className = '', style, ...rest }) {
  return (
    <button
      className={`${btnBase} bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 shadow-sm hover:shadow-md ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}

/* 1, 2, …, current-1, current, current+1, …, last-1, last — beyond
   15 pages the full run of numbered buttons stops fitting the bar, so
   it collapses to this windowed set with "…" gaps instead. Below that
   threshold every page number shows, same as the reference design. */
function pageList(current, total) {
  if (total <= 15) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

/* Pairs with hooks/usePagination.js — every list table with more than
   a page-worth of rows renders this underneath instead of either
   dumping its whole filtered result into the DOM or silently
   truncating it. Hidden entirely at a single page, same as a table
   with nothing to page through. */
export function Pagination({ page, totalPages, onChange, total, pageSize, onPageSizeChange }) {
  /* still worth showing the rows-per-page picker even at a single page
     — someone might raise it and only then need to page through — but
     the page-number strip itself has nothing to do at totalPages <= 1 */
  if (totalPages <= 1 && !onPageSizeChange) return null;
  const navBtnCls = 'w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/60 text-xs">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-500 dark:text-gray-400">
          Showing page <b className="text-gray-800 dark:text-gray-200">{page}</b> of <b className="text-gray-800 dark:text-gray-200">{totalPages}</b> ({total} total result{total === 1 ? '' : 's'})
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            Rows per page
            <ThemedSelect
              className="w-20"
              pill
              value={String(pageSize)}
              onChange={(v) => onPageSizeChange(Number(v))}
              options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
            />
          </label>
        )}
      </div>
      {totalPages > 1 && (
      <div className="flex items-center gap-1 flex-wrap">
        <button type="button" className={navBtnCls} disabled={page <= 1} onClick={() => onChange(page - 1)} title="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pageList(page, totalPages).map((p, i) => (p === '…' ? (
          <span key={`gap-${i}`} className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-gray-400 dark:text-gray-500">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`min-w-8 h-8 px-2 flex-shrink-0 flex items-center justify-center rounded-lg font-semibold ${
              p === page ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {p}
          </button>
        )))}
        <button type="button" className={navBtnCls} disabled={page >= totalPages} onClick={() => onChange(page + 1)} title="Next page">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      )}
    </div>
  );
}
