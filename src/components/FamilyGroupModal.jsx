/* Links one owner into a family group — search the existing owner
   base directly and pick who they belong with, instead of naming/
   picking an abstract "group" first. Behind the scenes this still
   creates or joins a FamilyGroup record (membership is just a
   `familyGroupId` field on the Customer, see backend/src/models/
   Customer.js's own comment) — picking a PERSON just means one fewer
   decision for staff who know who the family is but not what some
   group happens to be named. */
import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import Modal from './Modal.jsx';
import { btnGhost, BtnPrimary, formLabelCls, formInputCls, formErrorCls, Req } from './Ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { apiFetch } from '../utils/api.js';
import { displayName } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

export default function FamilyGroupModal({ customer: c, onClose, onLinked }) {
  const { base } = useApp();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState(null);
  const [pendingNew, setPendingNew] = useState(null); // the owner picked who has no group yet — need a name to create one
  const [newName, setNewName] = useState('');
  const [errors, setErrors] = useState({});
  const [linkingId, setLinkingId] = useState(null);

  useEffect(() => {
    apiFetch('/api/family-groups')
      .then((res) => (res.ok ? res.json() : []))
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  const groupName = (groupId) => groups?.find((g) => g.id === groupId)?.name;

  const needle = query.trim().toLowerCase();
  const results = useMemo(() => {
    /* when c is already in a group, its existing fellow members would
       otherwise show up in this same picker as if they still needed
       linking — exclude anyone already sharing c's own familyGroupId. */
    const others = base.filter((x) => x.id !== c.id && !(c.familyGroupId && x.familyGroupId === c.familyGroupId));
    if (!needle) {
      /* nothing typed yet — show SOMETHING rather than an empty drawer,
         same reasoning as Owner Base itself never opening to a blank
         table. Alphabetical, not base's own order (which is roughly
         import order, not useful to scan). */
      return [...others].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20);
    }
    return others
      .filter((x) => `${x.name} ${x.id} ${x.city || ''}`.toLowerCase().includes(needle))
      .slice(0, 20);
  }, [base, c.id, needle]);

  const joinExistingGroup = async (target) => {
    setLinkingId(target.id);
    try {
      const res = await apiFetch(`/api/family-groups/${target.familyGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: c.id }),
      });
      const body = await res.json();
      if (!res.ok) throw { errors: body.errors, message: body.error }; // eslint-disable-line no-throw-literal
      toast.success('Added to family group', `${displayName(c)} linked with ${displayName(target)}.`);
      onLinked(body.id);
      onClose();
    } catch (err) {
      toast.error('Could not link', err.message || 'Try again.');
    } finally {
      setLinkingId(null);
    }
  };

  /* c is already in a group — add target straight into THAT group
     rather than creating a new one or asking for a name, same as
     joinExistingGroup above but the target end of the link is fixed
     (c's own group) instead of the owner just picked. */
  const addToOwnGroup = async (target) => {
    setLinkingId(target.id);
    try {
      const res = await apiFetch(`/api/family-groups/${c.familyGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: target.id }),
      });
      const body = await res.json();
      if (!res.ok) throw { errors: body.errors, message: body.error }; // eslint-disable-line no-throw-literal
      toast.success('Added to family group', `${displayName(target)} linked with ${displayName(c)}.`);
      onLinked(body.id);
      onClose();
    } catch (err) {
      toast.error('Could not link', err.message || 'Try again.');
    } finally {
      setLinkingId(null);
    }
  };

  const createAndLink = async () => {
    if (!pendingNew) return;
    setErrors({});
    const name = newName.trim();
    if (!name) { setErrors({ name: 'Enter a name for this family group.' }); return; }
    setLinkingId(pendingNew.id);
    try {
      const res = await apiFetch('/api/family-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, customerId: c.id }),
      });
      const body = await res.json();
      if (!res.ok) throw { errors: body.errors, message: body.error }; // eslint-disable-line no-throw-literal
      /* the new group now has c as its only member — join the owner
         just picked in a second call, same as "Existing group" would. */
      const joinRes = await apiFetch(`/api/family-groups/${body.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: pendingNew.id }),
      });
      if (!joinRes.ok) {
        const joinBody = await joinRes.json().catch(() => ({}));
        toast.error('Group created, but could not add ' + displayName(pendingNew), joinBody.error || 'Add them from their own page instead.');
      } else {
        toast.success('Family group created', `${displayName(c)} and ${displayName(pendingNew)} linked as "${name}".`);
      }
      onLinked(body.id);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setLinkingId(null);
    }
  };

  const pickOwner = (target) => {
    if (c.familyGroupId) {
      /* c is already in a group — the only sensible action from here is
         pulling target into that same group. If target is already in a
         different group, the backend rejects it with a clear error
         (merging two existing groups isn't something this picker does). */
      addToOwnGroup(target);
    } else if (target.familyGroupId) {
      joinExistingGroup(target);
    } else {
      setPendingNew(target);
      setNewName(`${displayName(c)} & ${displayName(target)}`.slice(0, 80));
    }
  };

  return (
    <Modal
      drawer
      title={c.familyGroupId ? 'Add family group member' : 'Add to family group'}
      subtitle={`${displayName(c)} · ${c.id}`}
      icon={Users}
      onClose={onClose}
      footer={<button className={btnGhost} onClick={onClose}>Close</button>}
    >
      {pendingNew ? (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            {displayName(pendingNew)} isn't in a family group yet — name the group to create it and link both owners.
          </p>
          <label className={formLabelCls}>Family group name<Req /></label>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={formInputCls(!!errors.name)}
          />
          {errors.name && <div className={formErrorCls}>{errors.name}</div>}
          <div className="flex gap-2 mt-4">
            <button className={`${btnGhost} flex-1`} onClick={() => setPendingNew(null)} disabled={linkingId === pendingNew.id}>
              Back
            </button>
            <BtnPrimary className="flex-1" onClick={createAndLink} disabled={linkingId === pendingNew.id}>
              {linkingId === pendingNew.id ? 'Linking…' : 'Create & link'}
            </BtnPrimary>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search owners by name, ID or city…"
              className={`${formInputCls(false)} pl-8`}
            />
          </div>

          {!needle && (
            <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mb-2">
              Showing {results.length} of {base.length - 1} owners — search to narrow down.
            </div>
          )}
          {needle && results.length === 0 && (
            <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
              No owners match "{query}".
            </div>
          )}

          <div className="space-y-1.5">
            {results.map((x) => (
              <button
                key={x.id}
                onClick={() => pickOwner(x)}
                disabled={linkingId === x.id}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-left transition-colors disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName(x)}</div>
                  <div className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate">
                    {x.id} · {x.city}
                    {x.familyGroupId && ` · already in "${groupName(x.familyGroupId) || 'a family group'}"`}
                  </div>
                </div>
                <span className="text-[10.5px] font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0">
                  {linkingId === x.id ? 'Linking…' : c.familyGroupId ? 'Add' : x.familyGroupId ? 'Join' : 'Link'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
