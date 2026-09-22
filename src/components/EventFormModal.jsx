/* Create/edit one row in the shared Events module (backend/src/models/
   Event.js) — the "which events exist" side of the Invite list feature.
   Adding/removing owners from an event's invite list happens from
   InviteListDrawer.jsx instead, not here. */
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls, Req } from './Ui.jsx';
import { apiFetch } from '../utils/api.js';
import { toDateInput } from '../utils/core.js';
import { mutationErrorToast, toast } from '../utils/toast.js';

export default function EventFormModal({ event, onClose, onSaved }) {
  const editing = !!event;
  const [draft, setDraft] = useState({
    name: event?.name || '',
    date: event ? toDateInput(event.date) : '',
    location: event?.location || '',
    description: event?.description || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(editing ? `/api/events/${event.id}` : '/api/events', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) {
        const err = new Error(body.error || 'Save failed');
        err.errors = body.errors || {};
        throw err;
      }
      toast.success(editing ? 'Event updated' : 'Event created', draft.name);
      onSaved(body);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      drawer
      title={editing ? 'Edit event' : 'New event'}
      icon={CalendarDays}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Event name<Req /></label>
          <input value={draft.name} onChange={set('name')} className={formInputCls(!!errors.name)} placeholder="e.g. Owners' meet — Gwalior" />
          {errors.name && <div className={formErrorCls}>{errors.name}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Date<Req /></label>
          <ThemedDate value={draft.date} onChange={setVal('date')} invalid={!!errors.date} />
          {errors.date && <div className={formErrorCls}>{errors.date}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Location</label>
          <input value={draft.location} onChange={set('location')} className={formInputCls(false)} placeholder="e.g. Clubhouse, Neo Heights" />
        </div>
        <div>
          <label className={formLabelCls}>Description</label>
          <textarea value={draft.description} onChange={set('description')} rows={3} className={formInputCls(false)} placeholder="What's this event about?" />
        </div>
      </div>
    </Modal>
  );
}
