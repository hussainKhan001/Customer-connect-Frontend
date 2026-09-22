/* Opened from Customer Master's "Invite list" footer button — pick an
   event, the owner is added to that event's invite list (backend/src/
   models/Event.js), then WhatsApp opens with the invitation pre-filled.
   Same "real wa.me deep link, staff still hits Send" pattern as
   PortfolioStatement.jsx's shareOnWhatsApp — this app has no backend
   messaging integration to actually auto-send from the server. */
import { useState } from 'react';
import Swal from 'sweetalert2';
import { CalendarDays, Check, MapPin, Send } from 'lucide-react';
import Modal from './Modal.jsx';
import { Banner, EmptyState, btnGhost } from './Ui.jsx';
import { useEvents } from '../hooks/useEvents.js';
import { apiFetch } from '../utils/api.js';
import { useApp } from '../context/AppContext.jsx';
import { fmtD, displayName, daysTo } from '../utils/core.js';
import { toast } from '../utils/toast.js';

export default function InviteListDrawer({ customer: c, onClose }) {
  const { settings } = useApp();
  const { events, error, setEvents } = useEvents();
  const [busyId, setBusyId] = useState(null);

  const invite = async (ev) => {
    const digits = (c.mobile || '').replace(/\D/g, '');
    if (digits.length < 10) {
      Swal.fire({ icon: 'warning', title: 'No mobile on record', text: 'Add a mobile number to this owner\'s profile before inviting on WhatsApp.' });
      return;
    }

    setBusyId(ev.id);
    try {
      const res = await apiFetch(`/api/events/${ev.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: c.id, customerName: displayName(c) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not add to the invite list.');
      setEvents((prev) => prev.map((x) => (x.id === ev.id ? body : x)));

      const phone = digits.length === 10 ? `91${digits}` : digits;
      const message = [
        `Dear ${c.salutation ? c.salutation + ' ' : ''}${c.name},`,
        '',
        `You're invited to "${ev.name}" on ${fmtD(ev.date)}${ev.location ? ` at ${ev.location}` : ''}.`,
        ev.description || '',
        '',
        `— ${settings?.companyName || 'Neoteric Properties'}`,
      ].filter(Boolean).join('\n');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      toast.success('Added to invite list', `${ev.name} — WhatsApp opened to send the invite.`);
    } catch (err) {
      toast.error('Could not invite', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const upcoming = (events || []).filter((ev) => daysTo(ev.date) >= 0);

  return (
    <Modal
      title="Invite list"
      subtitle={`${displayName(c)} · ${c.id}`}
      icon={CalendarDays}
      onClose={onClose}
      drawer
      footer={<button className={btnGhost} onClick={onClose}>Close</button>}
    >
      {error && <Banner kind="block">{error}</Banner>}

      {!error && !events && <div className="text-xs text-gray-500 dark:text-gray-400">Loading events…</div>}

      {!error && events && upcoming.length === 0 && (
        <EmptyState icon={CalendarDays} title="No upcoming events" hint="Create one from the Events module first." />
      )}

      <div className="space-y-2.5">
        {upcoming.map((ev) => {
          const already = ev.invites.some((i) => i.customerId === c.id);
          return (
            <div key={ev.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{ev.name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{fmtD(ev.date)}</span>
                  {ev.location && (
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>
                  )}
                  <span>· {ev.invites.length} invited</span>
                </div>
              </div>
              {already ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 dark:text-green-400 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" /> Invited
                </span>
              ) : (
                <button
                  className={`${btnGhost} text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5 flex-shrink-0`}
                  disabled={busyId === ev.id}
                  onClick={() => invite(ev)}
                >
                  <Send className="w-3 h-3" />{busyId === ev.id ? 'Adding…' : 'Invite'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
