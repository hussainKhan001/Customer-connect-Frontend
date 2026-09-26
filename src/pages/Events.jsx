/* All events in one place — create them here, then invite owners from
   Customer Master's own "Invite list" button (see InviteListDrawer.jsx).
   Mirrors UserManagement.jsx's list+modal shape. */
import { useState } from 'react';
import Swal from 'sweetalert2';
import { Plus, Pencil, Trash2, CalendarDays, MapPin, Users } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, BtnPrimary, tableIconBtnCls, EmptyState } from '../components/Ui.jsx';
import EventFormModal from '../components/EventFormModal.jsx';
import EventDetailDrawer from '../components/EventDetailDrawer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useEvents } from '../hooks/useEvents.js';
import { apiFetch } from '../utils/api.js';
import { fmtD, daysTo } from '../utils/core.js';
import { toast, CONFIRM_COLOR } from '../utils/toast.js';

const MODULE = 'Module: Events';
const MANAGE = 'Manage events and invite lists';

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-4 py-3.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';

export default function Events() {
  const { can } = useAuth();
  const { events, error, setEvents } = useEvents();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const canManage = can(MANAGE);

  const remove = async (ev) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Delete ${ev.name}?`,
      html: ev.invites.length
        ? `${ev.invites.length} owner${ev.invites.length === 1 ? ' is' : 's are'} on its invite list. This cannot be undone.`
        : 'This cannot be undone.',
      showCancelButton: true,
      confirmButtonText: 'Delete event',
      confirmButtonColor: CONFIRM_COLOR.destructive,
    });
    if (!confirm.isConfirmed) return;
    setBusyId(ev.id);
    try {
      const res = await apiFetch(`/api/events/${ev.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Delete failed.');
      setEvents((prev) => prev.filter((x) => x.id !== ev.id));
      toast.success('Event deleted', ev.name);
    } catch (err) {
      toast.error('Could not delete', err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!can(MODULE)) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="You don't have access to Events"
        hint={`Ask an admin to grant the "${MODULE}" capability if you need to manage events.`}
      />
    );
  }

  if (error) return <Banner kind="block">{error}</Banner>;

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {events ? `${events.length} event${events.length === 1 ? '' : 's'}` : 'Loading…'}
        </div>
        {canManage && (
          <BtnPrimary className="inline-flex items-center gap-1.5" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> New event
          </BtnPrimary>
        )}
      </div>

      <Card pad={false}>
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Event</th>
                <th className={th}>Date</th>
                <th className={th}>Location</th>
                <th className={th}>Invite list</th>
                {canManage && <th className={`${th} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(!events || events.length === 0) && (
                <tr>
                  <td colSpan={5}>
                    {!events ? (
                      <div className={`${td} text-center text-gray-400 dark:text-gray-500 py-10`}>Loading…</div>
                    ) : (
                      <EmptyState
                        icon={CalendarDays}
                        title="No events yet."
                        hint={canManage ? 'Create one to start building an invite list.' : undefined}
                      />
                    )}
                  </td>
                </tr>
              )}
              {(events || []).map((ev) => {
                const d = daysTo(ev.date);
                return (
                  <tr key={ev.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer" onClick={() => setViewing(ev)} title="Open invite list">
                    <td className={td}>
                      <div className="font-bold text-gray-900 dark:text-white">{ev.name}</div>
                      {ev.description && <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-md">{ev.description}</div>}
                    </td>
                    <td className={td}>
                      <div className="text-gray-700 dark:text-gray-200">{fmtD(ev.date)}</div>
                      <div className="mt-1">
                        {d < 0 ? <Chip cls="m">past</Chip> : d === 0 ? <Chip cls="o">today</Chip> : <Chip cls="g">in {d}d</Chip>}
                      </div>
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>
                      {ev.location ? <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span> : '—'}
                    </td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-200">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {ev.invites.length}
                      </span>
                    </td>
                    {canManage && (
                      <td className={`${td} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <button className={tableIconBtnCls('primary')} title="Edit event" onClick={(e) => { e.stopPropagation(); setEditing(ev); setFormOpen(true); }}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button className={tableIconBtnCls('red')} title="Delete event" onClick={(e) => { e.stopPropagation(); remove(ev); }} disabled={busyId === ev.id}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {formOpen && (
        <EventFormModal
          event={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => setEvents((prev) => {
            if (!prev) return [saved];
            const idx = prev.findIndex((x) => x.id === saved.id);
            if (idx === -1) return [...prev, saved].sort((a, b) => new Date(a.date) - new Date(b.date));
            const next = [...prev];
            next[idx] = saved;
            return next;
          })}
        />
      )}

      {viewing && (
        <EventDetailDrawer
          event={viewing}
          canManage={canManage}
          onClose={() => setViewing(null)}
          onUpdated={(updated) => {
            setViewing(updated);
            setEvents((prev) => (prev || []).map((x) => (x.id === updated.id ? updated : x)));
          }}
        />
      )}
    </>
  );
}
