/* Links one owner into a family group — either starting a brand new
   one (the normal case: nobody in this family has been grouped yet) or
   joining a group another family member is already in. Membership
   itself is just a `familyGroupId` field on the Customer (see
   backend/src/models/Customer.js's own comment); this modal is the
   only place that field is ever set from the UI. */
import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls, Req } from './Ui.jsx';
import { apiFetch } from '../utils/api.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

export default function FamilyGroupModal({ customer: c, onClose, onLinked }) {
  const [mode, setMode] = useState('new');
  const [name, setName] = useState('');
  const [groups, setGroups] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/family-groups')
      .then((res) => (res.ok ? res.json() : []))
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      let linkedGroupId;
      if (mode === 'new') {
        const res = await apiFetch('/api/family-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, customerId: c.id }),
        });
        const body = await res.json();
        if (!res.ok) throw { errors: body.errors, message: body.error }; // eslint-disable-line no-throw-literal
        toast.success('Family group created', `${c.name} added to "${name}".`);
        linkedGroupId = body.id;
      } else {
        if (!groupId) { setErrors({ group: 'Choose a group.' }); setSaving(false); return; }
        const res = await apiFetch(`/api/family-groups/${groupId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: c.id }),
        });
        const body = await res.json();
        if (!res.ok) throw { errors: body.errors, message: body.error }; // eslint-disable-line no-throw-literal
        toast.success('Added to family group', `${c.name} added to "${body.name}".`);
        linkedGroupId = body.id;
      }
      onLinked(linkedGroupId);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  const groupOptions = (groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.memberCount} member${g.memberCount === 1 ? '' : 's'})` }));

  return (
    <Modal
      title="Add to family group"
      subtitle={`${c.name} · ${c.id}`}
      icon={Users}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add'}</BtnPrimary>
        </>
      }
    >
      <div className="flex rounded-full border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800/80 mb-4 w-fit">
        {[['new', 'New group'], ['existing', 'Existing group']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              mode === k ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {mode === 'new' ? (
        <div>
          <label className={formLabelCls}>Family group name<Req /></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formInputCls(!!errors.name)}
            placeholder="e.g. Shukla Family"
          />
          {errors.name && <div className={formErrorCls}>{errors.name}</div>}
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
            Creates a new group with {c.name} as its first member — add the rest of the family from their own Customer Master pages afterward (choose "Existing group" there).
          </p>
        </div>
      ) : (
        <div>
          <label className={formLabelCls}>Choose a group<Req /></label>
          <ThemedSelect
            value={groupId}
            onChange={setGroupId}
            options={groupOptions}
            placeholder={!groups ? 'Loading…' : groupOptions.length ? 'Select a group' : 'No existing groups yet'}
          />
          {errors.group && <div className={formErrorCls}>{errors.group}</div>}
        </div>
      )}
      {errors.customerId && <div className={formErrorCls}>{errors.customerId}</div>}
    </Modal>
  );
}
