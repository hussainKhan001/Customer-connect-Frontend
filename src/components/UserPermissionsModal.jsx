/* Per-person exceptions to what their role opens — only capabilities
   explicitly overridden here differ; everything else keeps tracking the
   role, including any later change to the role itself or a move to a
   different role. Use this sparingly: a person carrying five overrides
   is usually a sign the role is wrong, not the person. */
import { useState } from 'react';
import { BtnPrimary, btnGhost, Chip } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { CAPABILITIES, LEVEL_OPTIONS, PERM_LABEL, NON_OVERRIDABLE } from '../constants/governance.js';
import { apiFetch } from '../utils/api.js';
import { toast } from '../utils/toast.js';

const OVERRIDE_OPTIONS = [{ value: '', label: '(use role default)' }, ...LEVEL_OPTIONS];
const CHIP_CLS = { yes: 'g', part: 'w', no: 'm' };

export default function UserPermissionsModal({ user, role, onClose, onSaved }) {
  const rows = CAPABILITIES.filter((label) => label !== NON_OVERRIDABLE);
  const [overrides, setOverrides] = useState(() => ({ ...(user.permissionOverrides || {}) }));
  const [saving, setSaving] = useState(false);

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

      <div className="space-y-2">
        {rows.map((label) => {
          /* the role's own level, read live from /api/roles — a role
             whose permissions were edited this morning must not be
             described here by yesterday's matrix */
          const roleDefault = role?.permissions?.[label] || 'N';
          const current = overrides[label] || '';
          return (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
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
    </Modal>
  );
}
