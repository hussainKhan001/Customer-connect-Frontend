/* One WhatsApp message template per Trigger Calendar category — a
   free-text textarea (unlike StringListEditor's chip list, since this
   is one long string, not a set of short options) with the same
   draft/dirty/Save-appears-only-when-changed shape every other Master
   Data section already uses. `touched` (not "does draft still equal
   whatever `value` used to be") is what decides whether an external
   update (another admin's save landing via the settings:changed socket
   event) is safe to adopt — simpler and correct where StringListEditor's
   own comparison-against-stale-value trick would misfire on a plain
   string. */
import { useEffect, useState } from 'react';
import { Card, BtnPrimary, btnGhost, formInputCls } from '../Ui.jsx';

export default function MessageTemplateEditor({ title, value, onSave, saving }) {
  const [draft, setDraft] = useState(value);
  const [touched, setTouched] = useState(false);

  useEffect(() => { if (!touched) setDraft(value); }, [value, touched]);

  const dirty = draft !== value;

  return (
    <Card title={title}>
      <textarea
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setTouched(true); }}
        rows={3}
        className={formInputCls(false)}
        placeholder="Include {name} so the owner's name is filled in automatically…"
      />
      <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1.5">
        Use <code className="font-mono">{'{name}'}</code> anywhere you want the owner's own name inserted.
      </div>
      {dirty && (
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-800/80">
          <button type="button" className={`${btnGhost} text-xs py-1.5 px-3`} onClick={() => { setDraft(value); setTouched(false); }} disabled={saving}>
            Discard
          </button>
          <BtnPrimary className="text-xs px-3.5 py-1.5" disabled={saving} onClick={() => { onSave(draft); setTouched(false); }}>
            {saving ? 'Saving…' : 'Save changes'}
          </BtnPrimary>
        </div>
      )}
    </Card>
  );
}
