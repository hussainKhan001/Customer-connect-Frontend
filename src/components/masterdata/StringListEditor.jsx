/* One reusable editor for every plain string master list (communities,
   relations, property types, flat/villa configs, call outcomes) — a
   chip per option with a remove button, an input to add one more, and
   a Save button that only appears once the draft actually differs
   from what's saved. Each section on the Master Data page owns its
   own draft/save cycle independently, so editing one list never risks
   losing an in-progress edit on another. */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Card, BtnPrimary, btnGhost, formInputCls } from '../Ui.jsx';

export default function StringListEditor({ title, hint, items, onSave, saving, placeholder = 'Add an option…' }) {
  const [draft, setDraft] = useState(items);
  const [input, setInput] = useState('');

  /* the saved list changing under us (another admin's edit landing via
     the settings:changed socket event) replaces an untouched draft —
     but never one mid-edit, so a save-in-flight elsewhere can't wipe
     out what this tab is part-way through typing. */
  useEffect(() => { if (!dirtyRef(draft, items)) setDraft(items); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = dirtyRef(draft, items);

  const add = () => {
    const v = input.trim();
    if (!v || draft.includes(v)) { setInput(''); return; }
    setDraft((d) => [...d, v]);
    setInput('');
  };
  const remove = (v) => setDraft((d) => d.filter((x) => x !== v));

  return (
    <Card title={title} hint={hint}>
      <div className="flex flex-wrap gap-2 mb-3.5 min-h-[38px] items-center">
        {draft.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100/80 dark:bg-slate-800/90 text-gray-700 dark:text-slate-200 border border-gray-200/70 dark:border-slate-700/60 shadow-2xs hover:shadow-xs transition-all duration-150"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="w-4 h-4 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors duration-150"
              title={`Remove ${v}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!draft.length && <span className="text-xs text-gray-400 dark:text-slate-500 italic">Nothing here yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className={formInputCls(false)}
        />
        <button type="button" className={`${btnGhost} px-4`} onClick={add}>Add</button>
      </div>
      {dirty && (
        <div className="flex items-center justify-end gap-2 mt-3.5 pt-3 border-t border-gray-100 dark:border-slate-800/80">
          <button type="button" className={`${btnGhost} text-xs py-1.5 px-3`} onClick={() => setDraft(items)} disabled={saving}>Discard</button>
          <BtnPrimary className="text-xs px-3.5 py-1.5" disabled={saving} onClick={() => onSave(draft)}>
            {saving ? 'Saving…' : 'Save changes'}
          </BtnPrimary>
        </div>
      )}
    </Card>
  );
}

function dirtyRef(a, b) {
  return a.length !== b.length || a.some((v, i) => v !== b[i]);
}
