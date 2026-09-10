/* Create a role, or rename one. Permissions are set separately (see
   RolePermissionsModal) — a new role starts with nothing open, so
   creating one can never accidentally hand out access. */
import { useState } from 'react';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import { apiFetch } from '../utils/api.js';
import { toast } from '../utils/toast.js';

export default function RoleModal({ role, onClose, onSaved }) {
  const editing = !!role;
  const [draft, setDraft] = useState({ name: role?.name || '', description: role?.description || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch(editing ? `/api/roles/${role.id}` : '/api/roles', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.errors || {});
        throw new Error(body.error || Object.values(body.errors || {})[0] || 'Could not save.');
      }
      toast.success(
        editing ? 'Role renamed' : 'Role created',
        editing
          ? `Every account on this role moved to ${body.name}.`
          : `${body.name} exists with nothing open yet — set its permissions next.`
      );
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
      title={editing ? `Rename ${role.name}` : 'New role'}
      subtitle={editing
        ? 'Every account on this role moves with the name'
        : 'Starts with no access at all — open it up on the next screen'}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Rename role' : 'Create role'}
          </BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Role name</label>
          <input value={draft.name} onChange={set('name')} className={formInputCls(!!errors.name)} placeholder="e.g. Telecaller" />
          {errors.name && <div className={formErrorCls}>{errors.name}</div>}
        </div>
        <div>
          <label className={formLabelCls}>
            What this role is for <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input value={draft.description} onChange={set('description')} className={formInputCls(false)} placeholder="Outbound calling only, no financial data" />
        </div>
      </div>
    </Modal>
  );
}
