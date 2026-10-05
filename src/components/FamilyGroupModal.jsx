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
import ThemedSelect from './theme/ThemedSelect.jsx';
import { btnGhost, BtnPrimary, formLabelCls, formInputCls, formErrorCls, Req } from './Ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { apiFetch } from '../utils/api.js';
import { displayName } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

/* kept short and generic on purpose — this is a free-text-adjacent
   label on the member card, not a modelled relationship graph (no
   inverse, no validation that two "Spouse" members make sense
   together). "Other" always stays last. */
const RELATION_OPTIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Sibling', 'Other'];

export default function FamilyGroupModal({ customer: c, onClose, onLinked }) {
  const { base } = useApp();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState(null);
  const [pendingTarget, setPendingTarget] = useState(null); // owner just picked — confirm relation (+ group name, if new) before linking
  const [newName, setNewName] = useState('');
  const [relation, setRelation] = useState('');
  const [errors, setErrors] = useState({});
  const [linkingId, setLinkingId] = useState(null);

  /* 'addToOwn': c already has a group, target joins it directly.
     'join': c has no group yet, target already does — c joins target's.
     'createNew': neither has a group yet — name a new one for both. */
  const mode = !pendingTarget ? null : c.familyGroupId ? 'addToOwn' : pendingTarget.familyGroupId ? 'join' : 'createNew';

  useEffect(() => {
    apiFetch('/api/family-groups')
      .then((res) => (res.ok ? res.json() : []))
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  const groupName = (groupId) => groups?.find((g) => g.id === groupId)?.name;

  const needle = query.trim().toLowerCase();
  const linkable = useMemo(() => {
    /* when c is already in a group, its existing fellow members would
       otherwise show up in this same picker as if they still needed
       linking — exclude anyone already sharing c's own familyGroupId.
       Also exclude owners with no real name on file yet (empty, or the
       "[object Object]" corruption, see displayName() in utils/core.js)
       — a sizeable chunk of shell-imported records have nothing to
       search by and nothing meaningful to show as "linked with", so
       they'd only clutter this picker; link those once their profile
       has a real name. */
    return base.filter((x) =>
      x.id !== c.id &&
      !(c.familyGroupId && x.familyGroupId === c.familyGroupId) &&
      String(x.name || '').trim() &&
      x.name !== '[object Object]'
    );
  }, [base, c.id, c.familyGroupId]);

  const results = useMemo(() => {
    if (!needle) {
      /* nothing typed yet — show SOMETHING rather than an empty drawer,
         same reasoning as Owner Base itself never opening to a blank
         table. Alphabetical, not base's own order (which is roughly
         import order, not useful to scan). */
      return [...linkable].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20);
    }
    return linkable
      .filter((x) => `${x.name} ${x.id} ${x.city || ''}`.toLowerCase().includes(needle))
      .slice(0, 20);
  }, [linkable, needle]);

  const joinExistingGroup = async (target, rel) => {
    setLinkingId(target.id);
    try {
      const res = await apiFetch(`/api/family-groups/${target.familyGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: c.id, relation: rel }),
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
  const addToOwnGroup = async (target, rel) => {
    setLinkingId(target.id);
    try {
      const res = await apiFetch(`/api/family-groups/${c.familyGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: target.id, relation: rel }),
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

  const createAndLink = async (target, rel) => {
    setErrors({});
    const name = newName.trim();
    if (!name) { setErrors({ name: 'Enter a name for this family group.' }); return; }
    setLinkingId(target.id);
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
        body: JSON.stringify({ customerId: target.id, relation: rel }),
      });
      if (!joinRes.ok) {
        const joinBody = await joinRes.json().catch(() => ({}));
        toast.error('Group created, but could not add ' + displayName(target), joinBody.error || 'Add them from their own page instead.');
      } else {
        toast.success('Family group created', `${displayName(c)} and ${displayName(target)} linked as "${name}".`);
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
    setPendingTarget(target);
    setRelation('');
    setErrors({});
    if (!c.familyGroupId && !target.familyGroupId) {
      setNewName(`${displayName(c)} & ${displayName(target)}`.slice(0, 80));
    }
  };

  const confirmLink = () => {
    if (!pendingTarget) return;
    const rel = relation.trim() || null;
    if (mode === 'addToOwn') addToOwnGroup(pendingTarget, rel);
    else if (mode === 'join') joinExistingGroup(pendingTarget, rel);
    else createAndLink(pendingTarget, rel);
  };

  return (
    <Modal
      drawer
      title={c.familyGroupId ? 'Add family group member' : 'Add to family group'}
      subtitle={`${displayName(c)} · ${c.id}`}
      icon={Users}
      onClose={onClose}
      footer={pendingTarget ? (
        <>
          <button className={`${btnGhost} flex-1`} onClick={() => setPendingTarget(null)} disabled={linkingId === pendingTarget.id}>
            Back
          </button>
          <BtnPrimary className="flex-1" onClick={confirmLink} disabled={linkingId === pendingTarget.id}>
            {linkingId === pendingTarget.id ? 'Linking…' : mode === 'createNew' ? 'Create & link' : 'Add'}
          </BtnPrimary>
        </>
      ) : (
        <button className={btnGhost} onClick={onClose}>Close</button>
      )}
    >
      {pendingTarget ? (
        <div key={pendingTarget.id} className="animate-fade-in-up">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            {mode === 'createNew' && `${displayName(pendingTarget)} isn't in a family group yet — name the group to create it and link both owners.`}
            {mode === 'join' && `Joining ${displayName(c)} into ${displayName(pendingTarget)}'s existing family group.`}
            {mode === 'addToOwn' && `Adding ${displayName(pendingTarget)} into this family group.`}
          </p>

          {mode === 'createNew' && (
            <>
              <label className={formLabelCls}>Family group name<Req /></label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={formInputCls(!!errors.name)}
              />
              {errors.name && <div className={formErrorCls}>{errors.name}</div>}
            </>
          )}

          <label className={formLabelCls}>
            {mode === 'join' ? `${displayName(c)}'s relation to the family` : `${displayName(pendingTarget)}'s relation to the family`}
          </label>
          <ThemedSelect
            value={relation}
            onChange={setRelation}
            placeholder="— Not specified —"
            options={RELATION_OPTIONS.map((r) => ({ value: r, label: r }))}
            className="w-full"
          />
        </div>
      ) : (
        <div className="animate-fade-in-up">
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
              Showing {results.length} of {linkable.length} owners — search to narrow down.
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
        </div>
      )}
    </Modal>
  );
}
