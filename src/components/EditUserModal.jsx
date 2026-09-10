/* The account editor — identity header (avatar, name, email, status),
   the profile fields (role plus free-text phone/employee-id/
   designation/department), a password-reset field, and the two things
   that change what this account can do or whether it can sign in at
   all: role and active state. Everything here is one save; the
   separate per-person permission-override editor (UserPermissionsModal)
   is one click away via "Manage overrides" rather than folded in, since
   overriding a role's own grants is a rarer, more deliberate action. */
import { useState } from 'react';
import Swal from 'sweetalert2';
import { Eye, EyeOff, ShieldAlert, UserCog } from 'lucide-react';
import { BtnPrimary, btnGhost, Chip, Banner, Avatar, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { GRANTABLE, openCount } from '../constants/governance.js';
import { apiFetch } from '../utils/api.js';
import { toast, CONFIRM_COLOR } from '../utils/toast.js';

const PROFILE_FIELDS = [
  ['phone', 'Phone number', 'e.g. +91 98765 43210'],
  ['employeeId', 'Employee ID', 'e.g. EMP-001'],
  ['designation', 'Designation', 'e.g. Senior Relationship Manager'],
  ['department', 'Department', 'e.g. Sales'],
];

export default function EditUserModal({ user, role, roleOptions, isSelf, onClose, onSaved, onManageOverrides }) {
  const [draft, setDraft] = useState({
    name: user.name, role: user.role,
    phone: user.phone || '', employeeId: user.employeeId || '',
    designation: user.designation || '', department: user.department || '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyToggle, setBusyToggle] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const updated = await res.json();
      if (!res.ok) {
        setErrors(updated.errors || {});
        throw new Error(updated.error || Object.values(updated.errors || {})[0] || 'Update failed.');
      }
      /* the password field is optional and separate from the profile
         patch above — leaving it blank changes nothing about the
         account's ability to sign in */
      if (newPassword) {
        const pwRes = await apiFetch(`/api/users/${user.id}/password`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword }),
        });
        const pwBody = await pwRes.json();
        if (!pwRes.ok) throw new Error(pwBody.error || Object.values(pwBody.errors || {})[0] || 'Password update failed.');
      }
      toast.success('Account updated', `${updated.name}'s account saved${newPassword ? ', password changed' : ''}.`);
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    const next = !user.active;
    const confirm = await Swal.fire({
      icon: 'warning',
      title: next ? 'Reactivate this account?' : 'Deactivate this account?',
      text: next ? `${user.name} will be able to sign in again.` : `${user.name} will no longer be able to sign in.`,
      showCancelButton: true,
      confirmButtonText: next ? 'Reactivate' : 'Deactivate',
      confirmButtonColor: next ? CONFIRM_COLOR.approve : CONFIRM_COLOR.destructive,
    });
    if (!confirm.isConfirmed) return;
    setBusyToggle(true);
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Update failed.');
      toast.success(next ? 'Account reactivated' : 'Account deactivated', updated.name);
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusyToggle(false);
    }
  };

  const openCap = role ? openCount(role.permissions) : 0;

  return (
    <Modal
      drawer
      icon={UserCog}
      title="Edit user account"
      onClose={onClose}
      footer={
        <>
          {!isSelf && (
            <button
              className={`px-4 py-2 rounded-xl text-sm font-medium border disabled:opacity-40 disabled:cursor-not-allowed ${
                user.active
                  ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20'
                  : 'border-green-300 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20'
              }`}
              onClick={toggleActive}
              disabled={busyToggle || saving}
            >
              {busyToggle ? 'Working…' : user.active ? 'Suspend access' : 'Reactivate access'}
            </button>
          )}
          <BtnPrimary className="ml-auto" onClick={save} disabled={saving || busyToggle}>
            {saving ? 'Saving…' : 'Update user account'}
          </BtnPrimary>
        </>
      }
    >
      <div className="flex items-center gap-3 mb-5">
        <Avatar name={draft.name || user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-black text-gray-900 dark:text-white truncate">{draft.name || user.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
        </div>
        {user.active ? <Chip cls="g">active</Chip> : <Chip cls="m">deactivated</Chip>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-1">
        <div>
          <label className={formLabelCls}>Full name</label>
          <input value={draft.name} onChange={set('name')} autoComplete="off" className={formInputCls(!!errors.name)} />
          {errors.name && <div className={formErrorCls}>{errors.name}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Account role</label>
          {isSelf ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              {draft.role} <span className="text-[10.5px]">(you can't change your own role)</span>
            </div>
          ) : (
            <ThemedSelect value={draft.role} onChange={(role) => setDraft((d) => ({ ...d, role }))} options={roleOptions} />
          )}
          {errors.role && <div className={formErrorCls}>{errors.role}</div>}
        </div>

        {PROFILE_FIELDS.map(([key, label, placeholder]) => (
          <div key={key}>
            <label className={formLabelCls}>{label}</label>
            <input value={draft[key]} onChange={set(key)} autoComplete="off" className={formInputCls(false)} placeholder={placeholder} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
        <div>
          <label className={formLabelCls}>Current password</label>
          <div className="relative">
            <input value="••••••••••" disabled className={`${formInputCls(false)} pr-9 opacity-70`} />
            <ShieldAlert className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">
            Stored as a one-way hash — nobody, including an admin, can look it up. Set a new one instead.
          </div>
        </div>
        <div>
          <label className={formLabelCls}>Set new password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              /* "new-password", not "off" or nothing: this is the token
                 browsers actually honour to stop them offering this
                 person's own saved login password here — without it,
                 Chrome also treats whichever text input sits right
                 before this one as a "username" field and silently
                 fills it with the saved email, corrupting the field
                 above (e.g. Department) with unrelated data. */
              autoComplete="new-password"
              className={`${formInputCls(!!errors.password)} pr-9`}
              placeholder="Leave blank to keep the current password"
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <div className={formErrorCls}>{errors.password}</div>}
        </div>
      </div>

      <Banner kind="warn" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <b>Role-based access notice.</b> Permissions for this account come entirely from the{' '}
            <b>{draft.role}</b> role — {openCap} of {GRANTABLE.length} capabilities. To change what the role
            itself opens, edit it on the Roles tab.{' '}
            <button type="button" className="underline font-semibold" onClick={() => onManageOverrides(user)}>
              Give this person a personal exception instead →
            </button>
          </div>
        </div>
      </Banner>
    </Modal>
  );
}
