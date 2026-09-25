/* The "Roles" section of the Settings hub — extracted from the old
   standalone User Management page's Roles tab. `roles` and its reload
   live in Settings.jsx (shared with the Overview card and UsersSection's
   role badges), passed down as props rather than fetched again here. */
import { useState } from 'react';
import Swal from 'sweetalert2';
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck } from 'lucide-react';
import { Card, Chip, Banner, BtnPrimary, btnGhost, tableIconBtnCls } from '../Ui.jsx';
import RoleModal from '../RoleModal.jsx';
import RolePermissionsModal from '../RolePermissionsModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiFetch } from '../../utils/api.js';
import { toast, CONFIRM_COLOR } from '../../utils/toast.js';
import { CAPABILITIES, openCount } from '../../constants/governance.js';

const GRANTABLE_TOTAL = CAPABILITIES.length - 1;

export default function RolesSection({ roles, rolesError, reloadRoles, reloadUsers }) {
  const { user: me } = useAuth();
  const [roleEdit, setRoleEdit] = useState(null); // { role } | { role: null } for new
  const [rolePerms, setRolePerms] = useState(null);

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

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <BtnPrimary className="inline-flex items-center gap-1.5 ml-auto" onClick={() => setRoleEdit({ role: null })}>
          <Plus className="w-3.5 h-3.5" /> New role
        </BtnPrimary>
      </div>

      {rolesError && <Banner kind="block">{rolesError}</Banner>}

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

      {roleEdit && (
        <RoleModal
          role={roleEdit.role}
          onClose={() => setRoleEdit(null)}
          onSaved={() => { reloadRoles(); reloadUsers(); }}
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
