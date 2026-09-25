/* The "Users" section of the Settings hub — extracted from the old
   standalone User Management page's Users tab (see Settings.jsx for
   the hub shell). Data (users/roles) and their reload functions are
   owned by Settings.jsx and passed down, since the Overview cards need
   the same counts this table shows — one fetch each, not two. */
import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { Plus, Pencil, Trash2, Search, UserCircle, ShieldCheck } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, BtnPrimary, btnGhost, Avatar, tableIconBtnCls, EmptyState } from '../Ui.jsx';
import ThemedSelect from '../theme/ThemedSelect.jsx';
import UserModal from '../UserModal.jsx';
import EditUserModal from '../EditUserModal.jsx';
import UserPermissionsModal from '../UserPermissionsModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiFetch } from '../../utils/api.js';
import { toast, CONFIRM_COLOR } from '../../utils/toast.js';
import { openCount } from '../../constants/governance.js';

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-4 py-3.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';

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

export default function UsersSection({ users, setUsers, loadError, roles, reloadRoles }) {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [permUser, setPermUser] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const roleOptions = useMemo(() => (roles || []).map((r) => ({ value: r.name, label: r.name })), [roles]);
  const roleFilterOptions = useMemo(() => [{ value: '', label: 'All roles' }, ...roleOptions], [roleOptions]);
  const roleByName = useMemo(() => Object.fromEntries((roles || []).map((r) => [r.name, r])), [roles]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (users || []).filter((u) =>
      (!roleFilter || u.role === roleFilter) &&
      (!needle || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(needle)));
  }, [users, q, roleFilter]);

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

  if (loadError) return <Banner kind="block">{loadError}</Banner>;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-1">
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
      </div>

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
                  <td colSpan={5}>
                    {!users ? (
                      <div className={`${td} text-center text-gray-400 dark:text-gray-500 py-10`}>Loading…</div>
                    ) : (
                      <EmptyState
                        icon={UserCircle}
                        title={(q || roleFilter) ? 'No accounts match the selected criteria.' : 'No accounts yet.'}
                        hint={(q || roleFilter) ? 'Try a different search term or role filter.' : undefined}
                        action={(q || roleFilter) ? (
                          <button type="button" onClick={() => { setQ(''); setRoleFilter(''); }} className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
                            Clear filters
                          </button>
                        ) : undefined}
                      />
                    )}
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
    </>
  );
}
