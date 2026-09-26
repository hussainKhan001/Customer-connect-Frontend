/* What a whole role is allowed to do. Editing this changes access for
   every account holding the role at once — which is the point, and
   also why the destructive edges (the gate, user management, your own
   role) are called out on screen rather than only enforced server-side
   in backend/src/routes/roles.js.

   Grouped-cards-with-a-switch layout, not a plain list — the fifteen
   capabilities read as five functional areas (records, money, scoring,
   risk, admin) rather than one long undifferentiated column, and each
   area gets its own bulk on/off + collapse, matching how a role is
   actually reasoned about ("does this role touch money at all?") more
   than a flat alphabetical list ever could. */
import { useMemo, useState } from 'react';
import { Lock, ShieldAlert, ShieldCheck, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { BtnPrimary, btnGhost, Chip, Banner } from './Ui.jsx';
import Modal from './Modal.jsx';
import { CAPABILITIES, LEVEL_OPTIONS, NON_OVERRIDABLE, MANAGE_USERS, GRANTABLE, PERMISSION_GROUPS, openCount } from '../constants/governance.js';
import { apiFetch } from '../utils/api.js';
import { toast } from '../utils/toast.js';

const GROUPS = PERMISSION_GROUPS;

const LEVEL_DOT = { F: 'bg-green-500', S: 'bg-amber-500', O: 'bg-amber-500', N: 'bg-gray-400 dark:bg-gray-500' };
const LEVEL_TEXT = { F: 'Full access', S: 'Own scope only', O: 'Own customers only', N: 'No access' };

/* four states, not two — a plain toggle can't represent F/S/O/N, so
   this is a compact segmented control instead: same "flip a switch"
   directness, sized to fit inside a grouped card. */
const LevelSwitch = ({ value, onChange, disabled }) => (
  <div className={`inline-flex rounded-full p-0.5 bg-black/5 dark:bg-black/30 flex-shrink-0 ${disabled ? 'opacity-40' : ''}`}>
    {LEVEL_OPTIONS.map((o) => (
      <button
        key={o.value}
        type="button"
        title={o.label}
        disabled={disabled}
        onClick={() => onChange(o.value)}
        className={`w-6 h-6 rounded-full text-[10px] font-black disabled:cursor-not-allowed ${
          value === o.value
            ? 'bg-primary-500 text-white shadow-sm'
            : 'text-gray-400 dark:text-gray-500 hover:bg-white/70 dark:hover:bg-gray-700/60'
        }`}
      >
        {o.value}
      </button>
    ))}
  </div>
);

export default function RolePermissionsModal({ role, isMyRole, onClose, onSaved }) {
  const [perms, setPerms] = useState(() => {
    const base = {};
    CAPABILITIES.forEach((c) => { base[c] = role.permissions?.[c] || 'N'; });
    return base;
  });
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (label) => (level) => setPerms((p) => ({ ...p, [label]: level }));
  const open = openCount(perms);
  const needle = q.trim().toLowerCase();

  /* which group each label belongs to, and which groups still have a
     row left standing once the search filter is applied */
  const visibleGroups = useMemo(() => GROUPS
    .map((g) => ({ ...g, labels: g.labels.filter((l) => !needle || l.toLowerCase().includes(needle)) }))
    .filter((g) => g.labels.length), [needle]);

  const toggleGroup = (group) => {
    const grantable = group.labels.filter((l) => l !== NON_OVERRIDABLE);
    const allFull = grantable.length > 0 && grantable.every((l) => perms[l] === 'F');
    const next = allFull ? 'N' : 'F';
    setPerms((p) => {
      const copy = { ...p };
      grantable.forEach((l) => { copy[l] = next; });
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: perms }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || Object.values(body.errors || {})[0] || 'Could not save.');
      toast.success('Role updated', `${role.name} now opens ${openCount(body.permissions)} of ${GRANTABLE.length} capabilities.`);
      onSaved(body);
      onClose();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      drawer
      drawerWidth="sm:w-[760px]"
      icon={ShieldCheck}
      title="Manage permissions"
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save role'}</BtnPrimary>
        </>
      }
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Role permissions protocol</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Editing permissions for: <b>{role.name}</b></p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 flex-shrink-0">
          <ShieldAlert className="w-3.5 h-3.5" /> {role.name} authority matrix
        </span>
      </div>

      <Banner kind="info">
        This is the role, not one person. Saving changes access for <b>every account holding {role.name}</b>,
        immediately — nobody has to sign in again. Per-person exceptions belong on the Users tab instead.
      </Banner>

      <div className="flex items-center justify-between gap-3 mt-1 mb-3 flex-wrap">
        <div>
          <div className="text-sm font-bold text-gray-800 dark:text-gray-100">Role permission matrix</div>
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500">Assigned authorizations: {open} of {GRANTABLE.length}</div>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search matrix…"
            className="pl-8 pr-3 py-1.5 h-9 border rounded-lg shadow-sm text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 w-48"
          />
        </div>
      </div>

      <div className="space-y-3">
        {visibleGroups.map((g) => {
          const grantable = g.labels.filter((l) => l !== NON_OVERRIDABLE);
          const allFull = grantable.length > 0 && grantable.every((l) => perms[l] === 'F');
          const isCollapsed = !!collapsed[g.name];
          return (
            <div key={g.name} className="rounded-lg border border-gray-100 dark:border-gray-700/60 overflow-hidden">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/40">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
                  <g.Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-gray-900 dark:text-white">{g.name}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{g.labels.length} node{g.labels.length === 1 ? '' : 's'}</div>
                </div>
                {grantable.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(g)}
                    className={`w-9 h-5 rounded-full flex-shrink-0 relative ${allFull ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    title={allFull ? 'Turn every capability in this group off' : 'Turn every capability in this group to Full'}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${allFull ? 'left-4' : 'left-0.5'}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.name]: !c[g.name] }))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>

              {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3">
                  {g.labels.map((label) => {
                    const locked = label === NON_OVERRIDABLE;
                    const level = locked ? 'N' : perms[label];
                    const guard = label === MANAGE_USERS && isMyRole;
                    const active = level !== 'N';
                    return (
                      <div
                        key={label}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border ${
                          active
                            ? 'bg-primary-50/60 dark:bg-primary-900/10 border-primary-200/60 dark:border-primary-800/40'
                            : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-700/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className={`text-[12px] font-bold truncate flex items-center gap-1 ${active ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300'}`}>
                            {locked && <Lock className="w-3 h-3 flex-shrink-0" />}
                            {guard && <ShieldAlert className="w-3 h-3 flex-shrink-0 text-amber-500" />}
                            <span className="truncate">{label}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${LEVEL_DOT[level]}`} />
                            {locked ? 'Closed for every role, permanently' : guard ? "Your own role — can't be closed" : LEVEL_TEXT[level]}
                          </div>
                        </div>
                        {locked ? (
                          <Key className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        ) : (
                          <LevelSwitch value={level} onChange={set(label)} disabled={false} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {!visibleGroups.length && (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">No capability matches "{q}".</div>
        )}
      </div>
    </Modal>
  );
}
