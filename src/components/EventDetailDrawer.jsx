/* Opened from a row on the Events page — the invite list for one
   event, with who invited each owner and (now) whether they actually
   attended, plus a per-inviter filter so "how many did this person
   invite, and which ones" is a dropdown away instead of a manual scan. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { MapPin, Trash2, Check, ExternalLink } from 'lucide-react';
import Modal from './Modal.jsx';
import { TableWrap, EmptyState, btnGhost, tableIconBtnCls } from './Ui.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { apiFetch } from '../utils/api.js';
import { fmtD } from '../utils/core.js';
import { toast, CONFIRM_COLOR } from '../utils/toast.js';

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';

export default function EventDetailDrawer({ event, canManage, onClose, onUpdated }) {
  const navigate = useNavigate();
  const [filterUser, setFilterUser] = useState('');
  const [busyId, setBusyId] = useState(null);

  /* how many owners each staff member invited to THIS event — the
     dropdown's own label carries the count, so picking "Prabal Agrawal"
     and reading "12" are the same click, not a filter then a manual
     count of what's left. */
  const inviterCounts = useMemo(() => {
    const counts = {};
    (event.invites || []).forEach((i) => {
      const by = i.invitedBy || 'Unknown';
      counts[by] = (counts[by] || 0) + 1;
    });
    return counts;
  }, [event.invites]);

  const inviterOptions = useMemo(() => [
    { value: '', label: `Everyone (${event.invites.length})` },
    ...Object.entries(inviterCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => ({ value: name, label: `${name} (${n})` })),
  ], [inviterCounts, event.invites.length]);

  const shown = useMemo(
    () => (filterUser ? event.invites.filter((i) => (i.invitedBy || 'Unknown') === filterUser) : event.invites),
    [event.invites, filterUser]
  );

  const attendedCount = event.invites.filter((i) => i.attended).length;

  const openOwner = (customerId) => {
    onClose();
    navigate(`/master/${customerId}`);
  };

  const toggleAttended = async (invite) => {
    setBusyId(invite.customerId);
    try {
      const res = await apiFetch(`/api/events/${event.id}/invite/${invite.customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended: !invite.attended }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update.');
      onUpdated(body);
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const removeInvite = async (invite) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Remove ${invite.customerName || 'this owner'}?`,
      text: "They will no longer be on this event's invite list.",
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: CONFIRM_COLOR.destructive,
    });
    if (!confirm.isConfirmed) return;
    setBusyId(invite.customerId);
    try {
      const res = await apiFetch(`/api/events/${event.id}/invite/${invite.customerId}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not remove.');
      onUpdated(body);
      toast.success('Removed', `${invite.customerName || 'Owner'} taken off the invite list.`);
    } catch (err) {
      toast.error('Could not remove', err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      drawer
      drawerWidth="sm:w-[760px]"
      title={event.name}
      subtitle={`${fmtD(event.date)}${event.location ? ` · ${event.location}` : ''}`}
      onClose={onClose}
      footer={<button className={btnGhost} onClick={onClose}>Close</button>}
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <b className="text-gray-900 dark:text-white">{event.invites.length}</b> invited ·{' '}
          <b className="text-gray-900 dark:text-white">{attendedCount}</b> attended
        </div>
        <ThemedSelect
          className="w-56 ml-auto"
          value={filterUser}
          onChange={setFilterUser}
          options={inviterOptions}
          placeholder="Filter by who invited"
        />
      </div>

      {event.location && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <MapPin className="w-3.5 h-3.5" /> {event.location}
        </div>
      )}

      <TableWrap>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Owner</th>
              <th className={th}>Invited by</th>
              <th className={th}>Invited on</th>
              <th className={`${th} text-center`}>Attended</th>
              {canManage && <th className={`${th} text-right`}>Remove</th>}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4}>
                  <EmptyState title="No one matches this filter." />
                </td>
              </tr>
            )}
            {shown.map((i) => (
              <tr key={i.customerId} className="group hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <td className={td}>
                  <button
                    className="inline-flex items-center gap-1 font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                    onClick={() => openOwner(i.customerId)}
                    title="Open this owner's profile"
                  >
                    {i.customerName || i.customerId}
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </button>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{i.customerId}</div>
                </td>
                <td className={`${td} text-gray-600 dark:text-gray-300`}>{i.invitedBy || '—'}</td>
                <td className={`${td} text-gray-500 dark:text-gray-400`}>{fmtD(i.invitedAt)}</td>
                <td className={`${td} text-center`}>
                  {canManage ? (
                    <button
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all mx-auto disabled:opacity-50 disabled:cursor-not-allowed ${
                        i.attended
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-transparent hover:border-emerald-400 dark:hover:border-emerald-500'
                      }`}
                      disabled={busyId === i.customerId}
                      onClick={() => toggleAttended(i)}
                      title={i.attended ? 'Mark as not attended' : 'Mark as attended'}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </button>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto ${
                        i.attended
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </div>
                  )}
                </td>
                {canManage && (
                  <td className={`${td} text-right`}>
                    <button className={tableIconBtnCls('red')} title="Remove from invite list" onClick={() => removeInvite(i)} disabled={busyId === i.customerId}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Modal>
  );
}
