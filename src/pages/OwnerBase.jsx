import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2, Search, Building2, Home, Layers, Sparkles, Users } from 'lucide-react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext.jsx';
import EditProfileModal from '../components/EditProfileModal.jsx';
import UnitFinancialsModal from '../components/UnitFinancialsModal.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { useOwnerBaseFilters } from '../hooks/useOwnerBaseFilters.js';
import { usePagination } from '../hooks/usePagination.js';
import { Card, Chip, ScoreBar, TableWrap, confColor, Avatar, tableIconBtnCls, StatsCards, Pagination } from '../components/Ui.jsx';
import { cr, fmtD, inr, psf } from '../utils/core.js';
import { PROJECTS, ENTITIES } from '../constants/projects.js';
import { segDisplay } from '../utils/derived.js';
import { SEGLBL, STATUSLBL } from '../constants/segments.js';
import { toast, CONFIRM_COLOR } from '../utils/toast.js';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';

const COLS = [
  ['name', 'Owner'], ['_project', 'Project / unit'], ['_book', 'Booked', 1], ['_held', 'Held', 1],
  ['_rate', 'Rate paid', 1], ['_vrate', 'Value today', 1], ['_gain', 'Unrealised gain', 1],
  ['_paidPct', 'Paid', 1], ['_conf', 'Conf.', 1], ['_total', 'Score', 1], ['_seg', 'Segment'],
];

const PAGE_SIZE = 50;

const SEG_OPTS = [{ value: '', label: 'All segments' }, ...['A', 'B', 'C', 'D'].map((k) => ({ value: k, label: SEGLBL[k] }))];
const STATUS_OPTS = [{ value: '', label: 'All status' }, ...Object.keys(STATUSLBL).map((k) => ({ value: k, label: STATUSLBL[k] }))];
const ENT_OPTS = [{ value: '', label: 'All entities' }, ...ENTITIES.map((e) => ({ value: e, label: e }))];
const PROJ_OPTS = [{ value: '', label: 'All projects' }, ...PROJECTS.map((p) => ({ value: p.name, label: p.name }))];

const PROJ_META = {
  'Garden City': { icon: Building2, color: 'text-blue-500' },
  'Regal Garden': { icon: Home, color: 'text-emerald-500' },
  'Eden Garden': { icon: Layers, color: 'text-amber-500' },
  'Nature Park': { icon: Sparkles, color: 'text-purple-500' },
};

/* Unit numbers are text with digits in them ("A-26", "A-112"), so a
   plain string compare orders them A-112 before A-26 — digit by
   character. numeric:true compares the digit runs as numbers, which
   is the increasing order anyone actually means by "A-26, A-28,
   A-112". Used for both the filter's option order and the
   Project / unit column's sort. */
const natCmp = (a, b) =>
  String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });

/* A unit is only identified by its number *within* a project, so the
   filter keys on the pair — picking "301" can't quietly pull in the
   301 of two other projects. JSON, not a joined string, because no
   separator character is safely absent from a project name. */
const unitKey = (u) => JSON.stringify([u.project || '', u.unit || '']);

const th = (right) =>
  `sticky top-0 z-10 text-left text-[8.5px] sm:text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-2 sm:px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 ${right ? ' text-right' : ''}`;

const tdBase = 'px-2 sm:px-3 py-2 border-b border-gray-100 dark:border-gray-700/60 text-xs sm:text-sm whitespace-nowrap';
const tdTop = `${tdBase} align-top`;
const tdMidR = `${tdBase} align-middle text-right tabular-nums`;

export default function OwnerBase() {
  const { base, deleteCustomer } = useApp();
  const { openCustomer } = useAppNavigation();
  const { filters, setFilters, sort, toggleSort } = useOwnerBaseFilters();
  const [editing, setEditing] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const rows = useMemo(() => {
    const f = filters;
    return base
      .filter((c) =>
        (!f.seg || c._seg === f.seg) &&
        (!f.proj || c.units.some((u) => u.project === f.proj)) &&
        (!f.unit || c.units.some((u) => unitKey(u) === f.unit)) &&
        (!f.ent || c.units.some((u) => u.entity === f.ent)) &&
        (!f.status || c.status === f.status) &&
        (!f.q || (c.name + c.id + c._unit + c.city).toLowerCase().includes(f.q.toLowerCase())))
      .sort((a, b) => {
        /* one visible column, two fields: sorting "Project / unit"
           groups by project first, then orders units within it.
           Units that were never captured sort last in both
           directions — an absent unit number isn't a low one, and
           letting blanks head an ascending sort buries the ordering
           the sort was asked for. */
        if (sort.k === '_project') {
          const byProject = natCmp(a._project, b._project);
          if (byProject) return byProject * sort.dir;
          const aBlank = !String(a._unit ?? '').trim();
          const bBlank = !String(b._unit ?? '').trim();
          if (aBlank !== bBlank) return aBlank ? 1 : -1;
          return natCmp(a._unit, b._unit) * sort.dir;
        }
        let x = a[sort.k], y = b[sort.k];
        if (x instanceof Date) { x = +x; y = +y; }
        if (typeof x === 'string') return natCmp(x, y) * sort.dir;
        return (x - y) * sort.dir;
      });
  }, [base, filters.seg, filters.proj, filters.unit, filters.ent, filters.status, filters.q, sort.k, sort.dir]);

  const { page, setPage, totalPages, pageItems: pagedRows } = usePagination(rows, {
    pageSize: PAGE_SIZE, resetKey: filters, persistKey: 'ownerbase',
  });

  /* Opening an owner and clicking "Back to Owner Base" used to always
     land back at the very top — <Routes> unmounts this whole page on
     navigation, so the table's own scroll position (inside its
     max-h-[65vh] scroll well, not the page/window) was never kept
     anywhere. Restored once, after the current page's rows are in the
     DOM to scroll to; saved continuously while scrolling so a
     mid-session tab close/crash doesn't lose it either. */
  const tableScrollRef = useRef(null);
  const hasRestoredScroll = useRef(false);
  useEffect(() => {
    if (hasRestoredScroll.current) return;
    const el = tableScrollRef.current;
    if (!el || !pagedRows.length) return; // wait until there's real content to scroll into
    try {
      const saved = Number(sessionStorage.getItem('scrollTop:ownerbase'));
      if (saved > 0) el.scrollTop = saved;
    } catch { /* ignore */ }
    hasRestoredScroll.current = true;
  }, [pagedRows]);
  const saveTableScroll = () => {
    try { sessionStorage.setItem('scrollTop:ownerbase', String(tableScrollRef.current?.scrollTop || 0)); } catch { /* ignore */ }
  };

  /* project-wise breakdown, clickable straight into the Project
     filter — same "tile as filter shortcut" pattern as Command
     Centre's segment tiles. Built off every filter EXCEPT project/unit
     (not off `rows`) so all four projects keep showing real numbers
     to click into, rather than the other three collapsing to 0 the
     moment one is picked. Must stay in sync with `rows`' own filter
     clauses below, minus the project/unit ones. */
  const rowsForProjectStats = useMemo(() => {
    const f = filters;
    return base.filter((c) =>
      (!f.seg || c._seg === f.seg) &&
      (!f.ent || c.units.some((u) => u.entity === f.ent)) &&
      (!f.status || c.status === f.status) &&
      (!f.q || (c.name + c.id + c._unit + c.city).toLowerCase().includes(f.q.toLowerCase())));
  }, [base, filters.seg, filters.ent, filters.status, filters.q]);

  const PROJECT_STATS = useMemo(() => {
    const map = new Map(PROJECTS.map((p) => [p.name, { name: p.name, count: 0, gain: 0, blocked: 0 }]));
    rowsForProjectStats.forEach((c) => {
      const seenProj = new Set();
      c.units?.forEach((u) => {
        if (!u.project || seenProj.has(u.project)) return;
        seenProj.add(u.project);
        const stat = map.get(u.project);
        if (stat) {
          stat.count++;
          stat.gain += c._gain || 0;
          if (c._blocked) stat.blocked++;
        }
      });
    });
    return Array.from(map.values());
  }, [rowsForProjectStats]);

  /* the unit list narrows to the chosen project, and is ordered by
     unit number rather than by whatever order the owners came back in. */
  const UNIT_OPTS = useMemo(() => {
    const seen = new Map();
    base.forEach((c) => c.units.forEach((u) => {
      if (u.unit && (!filters.proj || u.project === filters.proj)) seen.set(unitKey(u), u);
    }));
    const opts = [...seen.entries()]
      .sort(([, a], [, b]) => natCmp(a.unit, b.unit) || natCmp(a.project, b.project))
      .map(([value, u]) => ({
        value,
        /* a dozen unit numbers sit in more than one project ("301" is
           in three), so with no project chosen the number alone is an
           ambiguous pick — name the project alongside it. Once a
           project is chosen that half is redundant noise. */
        label: filters.proj ? u.unit : `${u.unit} · ${u.project || 'no project'}`,
      }));
    return [{ value: '', label: 'All units' }, ...opts];
  }, [base, filters.proj]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const setSel = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));

  /* how many filters (besides free-text search) are actually narrowing
     the view right now — just enough to know whether "Clear filters"
     has anything to do. */
  const activeCount = ['seg', 'status', 'ent', 'proj', 'unit'].filter((k) => filters[k]).length;

  /* row-level actions live inside a clickable row, so both stop the
     click from also opening the customer master behind the dialog. */
  const editRow = (e, c) => {
    e.stopPropagation();
    setEditing(c);
  };

  const deleteRow = async (e, c) => {
    e.stopPropagation();
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete this owner?',
      html: `<b>${c.name}</b> (${c.id}) will be removed permanently, along with their units, ledger, complaints and documents.<br/>This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Delete owner',
      confirmButtonColor: CONFIRM_COLOR.destructive,
    });
    if (!result.isConfirmed) return;
    setDeletingId(c.id);
    try {
      await deleteCustomer(c.id);
      toast.success('Owner deleted', `${c.name} (${c.id}) removed.`);
    } catch (err) {
      toast.error('Could not delete', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* project-wise breakdown cards matching Image 1 layout */}
      <StatsCards
        cards={PROJECT_STATS.filter((p) => p.count > 0).map((p) => {
          const meta = PROJ_META[p.name] || { icon: Users, color: 'text-primary-500' };
          return {
            filterValue: p.name,
            label: p.name,
            value: p.count,
            icon: meta.icon,
            iconColor: meta.color,
            title: filters.proj === p.name ? `Clear the ${p.name} filter` : `Filter Owner Base to ${p.name}`,
            sub: (
              <>
                owners · ₹{cr(p.gain).toFixed(1)} Cr gain
                <div className="mt-1 h-4 font-semibold">
                  {!!p.blocked && <span className="text-red-600 dark:text-red-400">{p.blocked} contact blocked</span>}
                </div>
              </>
            ),
          };
        })}
        activeFilter={filters.proj}
        onCardClick={(v) => setFilters((f) => ({ ...f, proj: v, unit: '' }))}
      />


      <div className="p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-gray-900/90 border border-gray-200/80 dark:border-gray-800/80 shadow-2xs mb-4">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="relative w-full sm:flex-1 sm:min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, ID, unit or city…"
              value={filters.q}
              onChange={set('q')}
              className="w-full pl-9 pr-3 py-2 h-9 border rounded-full text-xs bg-gray-50/80 dark:bg-gray-800/80 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700/80 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-150"
            />
          </div>

          <ThemedSelect pill className="w-[calc(50%-4px)] sm:flex-1 sm:min-w-0" value={filters.proj}
            onChange={(v) => setFilters((f) => ({ ...f, proj: v, unit: '' }))}
            options={PROJ_OPTS} placeholder="All projects" />
          <ThemedSelect pill className="w-[calc(50%-4px)] sm:flex-1 sm:min-w-0" value={filters.status} onChange={setSel('status')} options={STATUS_OPTS} placeholder="All status" />
          <ThemedSelect pill className="w-[calc(50%-4px)] sm:flex-1 sm:min-w-0" value={filters.seg} onChange={setSel('seg')} options={SEG_OPTS} placeholder="All segments" />
          <ThemedSelect pill className="w-[calc(50%-4px)] sm:flex-1 sm:min-w-0" value={filters.ent} onChange={setSel('ent')} options={ENT_OPTS} placeholder="All entities" />
          <ThemedSelect pill className="w-[calc(50%-4px)] sm:flex-1 sm:min-w-0" value={filters.unit} onChange={setSel('unit')} options={UNIT_OPTS} placeholder="All units" />

          {(activeCount > 0 || !!filters.q) && (
            <button
              type="button"
              onClick={() => setFilters({ seg: '', status: '', ent: '', proj: '', unit: '', q: '' })}
              className="w-full sm:w-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0"
            >
              Clear ({activeCount + (filters.q ? 1 : 0)})
            </button>
          )}
        </div>
      </div>


      <Card pad={false} className="overflow-hidden">
        <TableWrap maxHeight="65vh" ref={tableScrollRef} onScroll={saveTableScroll}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {COLS.map(([k, l, right]) => (
                  <th key={k}
                      className={`${th(right)}${sort.k === k ? ' text-primary-600 dark:text-primary-400' : ''}`}
                      onClick={() => toggleSort(k, right ? -1 : 1)}>
                    <span className={`inline-flex items-center gap-1 ${right ? 'flex-row-reverse' : ''}`}>
                      {l}
                      {sort.k === k && (sort.dir < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                    </span>
                  </th>
                ))}
                <th className={`${th(1)} cursor-default hover:text-gray-400 dark:hover:text-gray-500`} />
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <tr>
                  <td className={`${tdBase} text-center text-gray-400 dark:text-gray-500 py-10`} colSpan={COLS.length + 1}>
                    {activeCount || filters.q ? 'No owners match the selected criteria.' : 'No owners yet.'}
                  </td>
                </tr>
              )}
              {pagedRows.map((c, i) => {
                const sd = segDisplay(c);
                return (
                  <tr
                    key={c.id}
                    className={`cursor-pointer ${c._blocked ? 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : i % 2 ? 'bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-100/70 dark:hover:bg-gray-700/40' : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/40'}`}
                    onClick={() => openCustomer(c.id)}
                  >
                    <td className={tdTop}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">{c.name}</span>
                            {c._live > 1 && <Chip cls="m">{c._live} units</Chip>}
                          </div>
                          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">{c.id} · {c.city}</div>
                        </div>
                      </div>
                    </td>
                    <td className={tdTop}>
                      <div className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span>{c._project}</span>
                        <span className="text-[10px] text-gray-400 font-normal">({c._unit})</span>
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{c.units[0]?.saleable ? `${c.units[0].saleable} sq.ft.` : c.units[0]?.type || '—'}</div>
                    </td>
                    <td className={tdMidR}>{fmtD(c._book)}</td>
                    <td className={tdMidR}>{c._held.toFixed(1)}y</td>
                    <td className={tdMidR}>
                      <div className="inline-flex items-center gap-0.5">
                        <span>{psf(c._rate)}</span>
                        <button
                          className={tableIconBtnCls('primary')}
                          title={`Edit ${c._unit}'s rate and area`}
                          onClick={(e) => { e.stopPropagation(); setEditingUnit(c); }}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className={tdMidR}>{psf(c._vrate)}</td>
                    <td className={`${tdMidR} font-bold text-green-600 dark:text-green-400`}>{inr(c._gain)}</td>
                    <td className={tdMidR}>{c._paidPct.toFixed(0)}%</td>
                    <td className={`${tdMidR} font-bold ${confColor(c._conf)}`}>{c._conf}%</td>
                    <td className={`${tdBase} align-middle text-right`}>
                      {c._blocked ? <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span> : <ScoreBar n={c._total} />}
                    </td>
                    <td className={`${tdBase} align-middle`}><Chip cls={sd.cls}>{sd.t}</Chip></td>
                    <td className={`${tdBase} align-middle text-right`}>
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          className={tableIconBtnCls('primary')}
                          title={`Edit ${c.name}'s profile`}
                          onClick={(e) => editRow(e, c)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className={tableIconBtnCls('red')}
                          title={`Delete ${c.name}`}
                          disabled={deletingId === c.id}
                          onClick={(e) => deleteRow(e, c)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {editing && <EditProfileModal customer={editing} onClose={() => setEditing(null)} />}

      {editingUnit && (
        <UnitFinancialsModal
          customer={editingUnit}
          unit={editingUnit.units[0]}
          unitIndex={0}
          onClose={() => setEditingUnit(null)}
        />
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} total={rows.length} pageSize={PAGE_SIZE} />
    </>
  );
}
