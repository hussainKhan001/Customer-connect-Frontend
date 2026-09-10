import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { Plus, AlertTriangle, Pencil, Trash2, KeyRound, ShieldCheck, Search } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, BtnPrimary, btnGhost, Avatar, tableIconBtnCls, formLabelCls, formInputCls, formErrorCls } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import UserModal from '../components/UserModal.jsx';
import EditUserModal from '../components/EditUserModal.jsx';
import UserPermissionsModal from '../components/UserPermissionsModal.jsx';
import RoleModal from '../components/RoleModal.jsx';
import RolePermissionsModal from '../components/RolePermissionsModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useRoles } from '../hooks/useRoles.js';
import { CAPABILITIES, openCount } from '../constants/governance.js';
import { apiFetch } from '../utils/api.js';
import { toast, CONFIRM_COLOR } from '../utils/toast.js';

const GRANTABLE_TOTAL = CAPABILITIES.length - 1;

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-4 py-3.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';

/* the Users/Roles switch. Two views of one subsystem — who the people
   are, and what the roles they sit on can reach — so they share a
   screen rather than splitting into two sidebar entries. */
const tabCls = (on) =>
  `px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
    on
      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;

/* a colour identity per role, purely visual — so a scan down the Role
   column reads roles apart at a glance instead of everyone blending
   into the same grey text. The nine seeded roles get a fixed colour
   each; anything created later (a custom role) is hashed into the
   fallback rotation so it still gets a consistent colour instead of
   the one "unknown" grey every time. */
const ROLE_TONE = {
  'Board / CEO': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'GM Sales': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  AGM: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  Coordinator: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  RM: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  CRM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Service: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Finance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Legal: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
};
const ROLE_FALLBACK = [
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
];
const roleTone = (name) => {
  if (ROLE_TONE[name]) return ROLE_TONE[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return ROLE_FALLBACK[Math.abs(h) % ROLE_FALLBACK.length];
};

const RoleBadge = ({ name }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${roleTone(name)}`}>
    <ShieldCheck className="w-3 h-3 flex-shrink-0" /> {name}
  </span>
);

export default function UserManagement() {
  const { user: me } = useAuth();
  const { raw, deleteAllCustomers, settings, updateSettings } = useApp();
  const { roles, error: rolesError, reload: reloadRoles } = useRoles();

  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [permUser, setPermUser] = useState(null);
  const [roleEdit, setRoleEdit] = useState(null);      // { role } | { role: null } for new
  const [rolePerms, setRolePerms] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [settingsErrors, setSettingsErrors] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);

  /* the draft only ever seeds from the fetched settings once they
     arrive (and again if they're edited elsewhere) — typing shouldn't
     get stomped by AppContext re-rendering for an unrelated reason. */
  useEffect(() => { if (settings) setSettingsDraft((d) => d ?? settings); }, [settings]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings(settingsDraft);
      setSettingsErrors({});
      toast.success('Settings saved', 'The new details apply everywhere they\'re used, like the Portfolio Statement letterhead.');
    } catch (err) {
      setSettingsErrors(err.errors || {});
      toast.error('Could not save', err.message || 'Fix the highlighted field and try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const load = () => {
    apiFetch('/api/users')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(res.status === 403 ? 'Your role does not have access to user management.' : body.error || 'Could not load users.');
        }
        return res.json();
      })
      .then((data) => { setUsers(data); setLoadError(null); })
      .catch((err) => setLoadError(err.message));
  };

  useEffect(load, []);

  const roleOptions = useMemo(() => (roles || []).map((r) => ({ value: r.name, label: r.name })), [roles]);
  const roleFilterOptions = useMemo(() => [{ value: '', label: 'All roles' }, ...roleOptions], [roleOptions]);
  const roleByName = useMemo(() => Object.fromEntries((roles || []).map((r) => [r.name, r])), [roles]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (users || []).filter((u) =>
      (!roleFilter || u.role === roleFilter) &&
      (!needle || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(needle)));
  }, [users, q, roleFilter]);

  /* ── users ──────────────────────────────────────────────────────── */

  /* Deleting is offered second, and worded against itself, because
     deactivating keeps the person's history and can be undone — this
     cannot. The server blocks self-deletion independently. */
  const deleteUser = async (u) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Delete ${u.name}?`,
      html: `This removes the account permanently. To block sign-in but keep the record, <b>deactivate</b> instead.`,
      showCancelButton: true,
      confirmButtonText: 'Delete account',
      confirmButtonColor: CONFIRM_COLOR.destructive,
    });
    if (!confirm.isConfirmed) return;
    setBusyId(u.id);
    try {
      const res = await apiFetch(`/api/users/${u.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Delete failed.');
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      reloadRoles();
      toast.success('Account deleted', `${u.name} (${u.email}) removed.`);
    } catch (err) {
      toast.error('Could not delete', err.message);
    } finally {
      setBusyId(null);
    }
  };

  /* ── roles ──────────────────────────────────────────────────────── */

  const deleteRole = async (r) => {
    if (r.userCount) {
      toast.error('Role still in use', `${r.userCount} account${r.userCount === 1 ? ' is' : 's are'} on ${r.name}. Move them to another role first.`);
      return;
    }
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Delete the ${r.name} role?`,
      text: 'No accounts hold it, so nobody loses access. This cannot be undone.',
      showCancelButton: true,
      confirmButtonText: 'Delete role',
      confirmButtonColor: CONFIRM_COLOR.destructive,
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await apiFetch(`/api/roles/${r.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Delete failed.');
      reloadRoles();
      toast.success('Role deleted', `${r.name} is gone.`);
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  /* type-to-confirm, same reasoning as GitHub's own repo-delete flow —
     this wipes every customer record at once and cannot be undone.
     The server independently requires the exact same phrase in the
     request body, so this dialog isn't the only thing standing
     between a stray click and the whole owner base disappearing. */
  const deleteAllData = async () => {
    const total = raw.length;
    const { value: typed } = await Swal.fire({
      icon: 'error',
      title: `Delete all ${total} customer record${total === 1 ? '' : 's'}?`,
      html: `This permanently removes <b>every owner</b> — complete and incomplete — and cannot be undone.<br/>Type <code>DELETE ALL</code> to confirm.`,
      input: 'text',
      inputPlaceholder: 'DELETE ALL',
      showCancelButton: true,
      confirmButtonText: 'Delete everything',
      confirmButtonColor: CONFIRM_COLOR.destructive,
      inputValidator: (v) => (v !== 'DELETE ALL' ? 'Type DELETE ALL exactly to confirm' : undefined),
    });
    if (typed !== 'DELETE ALL') return;
    setDeletingAll(true);
    try {
      const body = await deleteAllCustomers();
      toast.success('All customer data deleted', `${body.deletedCount} record(s) removed.`);
    } catch (err) {
      toast.error('Could not delete', err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  if (loadError) return <Banner kind="block">{loadError}</Banner>;

  return (
    <>

      <div className="flex flex-wrap items-center gap-3 mb-1">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button className={tabCls(tab === 'users')} onClick={() => setTab('users')}>
            Users{users ? ` · ${users.length}` : ''}
          </button>
          <button className={tabCls(tab === 'roles')} onClick={() => setTab('roles')}>
            Roles{roles ? ` · ${roles.length}` : ''}
          </button>
          <button className={tabCls(tab === 'settings')} onClick={() => setTab('settings')}>
            Settings
          </button>
        </div>

        {tab === 'users' && (
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email or role"
                className="pl-8 pr-3 py-2 h-10 border rounded-md shadow-sm text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 w-60"
              />
            </div>
            <ThemedSelect className="w-44" value={roleFilter} onChange={setRoleFilter} options={roleFilterOptions} placeholder="All roles" />
            {(q || roleFilter) && (
              <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={() => { setQ(''); setRoleFilter(''); }}>Clear</button>
            )}
            <BtnPrimary className="inline-flex items-center gap-1.5 ml-auto" onClick={() => setAddUserOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add user
            </BtnPrimary>
          </>
        )}
        {tab === 'roles' && (
          <BtnPrimary className="inline-flex items-center gap-1.5 ml-auto" onClick={() => setRoleEdit({ role: null })}>
            <Plus className="w-3.5 h-3.5" /> New role
          </BtnPrimary>
        )}
      </div>

      {rolesError && <Banner kind="block">{rolesError}</Banner>}

      {tab === 'users' && (
        <Card title="Users" hint={users ? `${shown.length} of ${users.length} shown` : ''} pad={false}>
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Identity</th>
                  <th className={th}>Contact info</th>
                  <th className={th}>Department / role</th>
                  <th className={th}>Account state</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr>
                    <td className={`${td} text-center text-gray-400 dark:text-gray-500 py-10`} colSpan={5}>
                      {!users ? 'Loading…' : (q || roleFilter) ? 'No accounts match the selected criteria.' : 'No accounts yet.'}
                    </td>
                  </tr>
                )}
                {shown.map((u) => {
                  const isSelf = u.id === me?.id;
                  const overrides = Object.keys(u.permissionOverrides || {}).length;
                  const role = roleByName[u.role];
                  return (
                    <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/40 ">
                      <td className={td}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" />
                          <div className="min-w-0">
                            <div>
                              <b className="text-gray-900 dark:text-white">{u.name}</b>
                              {isSelf && <span className="text-[10.5px] text-gray-400 dark:text-gray-500"> (you)</span>}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-tight">
                              UID: {u.id.slice(-6).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`${td} text-gray-500 dark:text-gray-400`}>
                        <div>{u.email}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Primary authentication method</div>
                      </td>
                      <td className={td}>
                        <RoleBadge name={u.role} />
                        {/* mirrors the reference app's "Role: N / Direct: N" caption — how
                            many capabilities the role itself opens, and how many of those
                            this specific person has personally overridden */}
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                          Role: {role ? openCount(role.permissions) : 0}
                          {!!overrides && (
                            <span className="text-primary-600 dark:text-primary-400 font-semibold ml-2">
                              Direct: {overrides}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={td}>
                        {u.active ? <Chip cls="g">active</Chip> : <Chip cls="m">deactivated</Chip>}
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            className={tableIconBtnCls('primary')}
                            title="Edit account"
                            onClick={() => setEditUser(u)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            className={tableIconBtnCls('red')}
                            title={isSelf ? 'You cannot delete your own account' : 'Delete account'}
                            onClick={() => deleteUser(u)}
                            disabled={isSelf || busyId === u.id}
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(roles || []).map((r) => {
            const isMine = r.name === me?.role;
            const open = openCount(r.permissions);
            return (
              <Card key={r.id} className="relative overflow-hidden group">
                {/* decorative watermark — purely visual, echoes the role's own
                    icon so the card reads as "an access profile" at a glance */}
                <ShieldCheck className="absolute -top-4 -right-4 w-24 h-24 text-primary-500 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none" />
                <div className="relative flex items-start justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className={tableIconBtnCls('primary')}
                      title={r.system ? 'The built-in administrator role cannot be renamed' : 'Rename role'}
                      onClick={() => setRoleEdit({ role: r })}
                      disabled={r.system}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className={tableIconBtnCls('red')}
                      title={r.system ? 'The built-in administrator role cannot be deleted' : r.userCount ? 'Move its accounts to another role first' : 'Delete role'}
                      onClick={() => deleteRole(r)}
                      disabled={r.system || isMine}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[15px] font-bold text-gray-900 dark:text-white">{r.name}</h4>
                    {r.system && <Chip cls="w">built-in</Chip>}
                    {isMine && <Chip cls="g">your role</Chip>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 min-h-[2rem]">
                    {r.description || 'No description.'}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mt-2 mb-3 tabular-nums">
                    <span><b className="text-gray-900 dark:text-white">{open}</b> of {GRANTABLE_TOTAL} capabilities</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span><b className="text-gray-900 dark:text-white">{r.userCount}</b> account{r.userCount === 1 ? '' : 's'}</span>
                  </div>

                  <button className={`${btnGhost} w-full text-xs py-2 inline-flex items-center justify-center gap-1.5`} onClick={() => setRolePerms(r)}>
                    <KeyRound className="w-3.5 h-3.5" /> Manage permissions
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          <Card title="Company / letterhead settings" hint="Used on the Portfolio Statement">
            {!settingsDraft ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">Loading…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={formLabelCls}>Company name</label>
                  <input
                    value={settingsDraft.companyName || ''}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, companyName: e.target.value }))}
                    className={formInputCls(!!settingsErrors.companyName)}
                  />
                  {settingsErrors.companyName && <div className={formErrorCls}>{settingsErrors.companyName}</div>}
                </div>
                <div className="sm:col-span-2">
                  <label className={formLabelCls}>Group / subsidiary line</label>
                  <input
                    value={settingsDraft.groupLine || ''}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, groupLine: e.target.value }))}
                    className={formInputCls(!!settingsErrors.groupLine)}
                    placeholder="e.g. A Neoteric Group Company · Navayan Realty · Heaven Heights"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={formLabelCls}>Registered office address</label>
                  <input
                    value={settingsDraft.regdOffice || ''}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, regdOffice: e.target.value }))}
                    className={formInputCls(!!settingsErrors.regdOffice)}
                  />
                </div>
                <div>
                  <label className={formLabelCls}>CIN</label>
                  <input
                    value={settingsDraft.cin || ''}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, cin: e.target.value }))}
                    className={formInputCls(!!settingsErrors.cin)}
                  />
                </div>
                <div>
                  <label className={formLabelCls}>GSTIN</label>
                  <input
                    value={settingsDraft.gstin || ''}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, gstin: e.target.value }))}
                    className={formInputCls(!!settingsErrors.gstin)}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <BtnPrimary onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? 'Saving…' : 'Save settings'}
                  </BtnPrimary>
                </div>
              </div>
            )}
          </Card>

          <Card title="Danger zone" hint="Irreversible">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-2.5 max-w-xl">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-gray-600 dark:text-gray-400">
                  Permanently deletes every customer record — complete and incomplete — from the database.
                  This cannot be undone. Use only to clear test/import data before a fresh upload.
                </p>
              </div>
              <button
                className="shrink-0 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={deleteAllData}
                disabled={deletingAll || !raw.length}
              >
                {deletingAll ? 'Deleting…' : `Delete all customer data${raw.length ? ` (${raw.length})` : ''}`}
              </button>
            </div>
          </Card>
        </div>
      )}

      {addUserOpen && (
        <UserModal
          roles={roles || []}
          onClose={() => setAddUserOpen(false)}
          onCreated={(u) => { setUsers((prev) => [...(prev || []), u]); reloadRoles(); }}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          role={roleByName[editUser.role]}
          roleOptions={roleOptions}
          isSelf={editUser.id === me?.id}
          onClose={() => setEditUser(null)}
          onSaved={(updated) => { setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u))); reloadRoles(); }}
          onManageOverrides={(u) => { setEditUser(null); setPermUser(u); }}
        />
      )}
      {permUser && (
        <UserPermissionsModal
          user={permUser}
          role={roleByName[permUser.role]}
          onClose={() => setPermUser(null)}
          onSaved={(updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))}
        />
      )}
      {roleEdit && (
        <RoleModal
          role={roleEdit.role}
          onClose={() => setRoleEdit(null)}
          onSaved={() => { reloadRoles(); load(); }}
        />
      )}
      {rolePerms && (
        <RolePermissionsModal
          role={rolePerms}
          isMyRole={rolePerms.name === me?.role}
          onClose={() => setRolePerms(null)}
          onSaved={reloadRoles}
        />
      )}
    </>
  );
}
