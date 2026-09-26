/* Per-person exceptions to what their role opens — only capabilities
   explicitly overridden here differ; everything else keeps tracking the
   role, including any later change to the role itself or a move to a
   different role. Use this sparingly: a person carrying five overrides
   is usually a sign the role is wrong, not the person.

   Grouped-and-collapsible, same organization as RolePermissionsModal
   (see PERMISSION_GROUPS) — with ~35 capabilities including one row per
   Settings tab (Company profile, Users, Roles, Access & governance,
   Master data, Audit log), a flat alphabetical list made "which tab
   should this person get" a real search-and-scroll exercise; grouped +
   searchable makes the relevant handful of rows easy to find. */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Search } from 'lucide-react';
import { BtnPrimary, btnGhost, Chip } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { CAPABILITIES, LEVEL_OPTIONS, PERM_LABEL, NON_OVERRIDABLE, PERMISSION_GROUPS } from '../constants/governance.js';
import { apiFetch } from '../utils/api.js';
import { toast } from '../utils/toast.js';

const OVERRIDE_OPTIONS = [{ value: '', label: '(use role default)' }, ...LEVEL_OPTIONS];
const CHIP_CLS = { yes: 'g', part: 'w', no: 'm' };

export default function UserPermissionsModal({ user, role, onClose, onSaved }) {
  const rows = CAPABILITIES.filter((label) => label !== NON_OVERRIDABLE);
  const [overrides, setOverrides] = useState(() => ({ ...(user.permissionOverrides || {}) }));
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const overrideCount = rows.filter((label) => overrides[label]).length;
  const needle = q.trim().toLowerCase();

  const visibleGroups = useMemo(() => PERMISSION_GROUPS
    .map((g) => ({ ...g, labels: g.labels.filter((l) => l !== NON_OVERRIDABLE && (!needle || l.toLowerCase().includes(needle))) }))
    .filter((g) => g.labels.length), [needle]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      rows.forEach((label) => { payload[label] = overrides[label] || null; });
      const res = await apiFetch(`/api/users/${user.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: payload }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || Object.values(body.errors || {})[0] || 'Could not save.');
      toast.success('Permissions updated', `${user.name}'s overrides saved.`);
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
      title="Permission overrides"
      subtitle={`${user.name} · role: ${user.role}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save overrides'}</BtnPrimary>
        </>
      }
    >
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3.5">
        Only set an override where this specific person genuinely needs more or less than their role. Leave
        everything else on &ldquo;(use role default)&rdquo; — it then tracks their role automatically, including if the
        role is edited or they move to a different one. The contact gate can never be overridden, for anyone.
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
          {overrideCount} override{overrideCount === 1 ? '' : 's'} set
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search capabilities…"
            className="pl-8 pr-3 py-1.5 h-9 border rounded-lg shadow-sm text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 w-48"
          />
        </div>
      </div>

      <div className="space-y-3">
        {visibleGroups.map((g) => {
          const isCollapsed = !!collapsed[g.name];
          const groupOverrides = g.labels.filter((l) => overrides[l]).length;
          return (
            <div key={g.name} className="rounded-lg border border-gray-100 dark:border-gray-700/60 overflow-hidden">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/40">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
                  <g.Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-gray-900 dark:text-white">{g.name}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    {g.labels.length} node{g.labels.length === 1 ? '' : 's'}
                    {!!groupOverrides && <span className="text-primary-600 dark:text-primary-400 font-semibold"> · {groupOverrides} overridden</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.name]: !c[g.name] }))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>

              {!isCollapsed && (
                <div className="p-3 space-y-2">
                  {g.labels.map((label) => {
                    const roleDefault = role?.permissions?.[label] || 'N';
                    const current = overrides[label] || '';
                    return (
                      <div key={label} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 dark:text-gray-100">{label}</div>
                          <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                            role default: <Chip cls={CHIP_CLS[PERM_LABEL[roleDefault]?.cls] || 'm'}>{PERM_LABEL[roleDefault]?.t}</Chip>
                          </div>
                        </div>
                        <ThemedSelect
                          className={`w-40 flex-shrink-0 ${current ? '[&>button]:border-primary-400' : ''}`}
                          value={current}
                          onChange={(v) => setOverrides((o) => ({ ...o, [label]: v }))}
                          options={OVERRIDE_OPTIONS}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-2 px-1 text-[10.5px] text-gray-400 dark:text-gray-500">
          <Lock className="w-3 h-3 flex-shrink-0" /> {NON_OVERRIDABLE} can never be overridden, for anyone.
        </div>
      </div>
    </Modal>
  );
}
