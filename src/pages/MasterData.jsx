/* Every dropdown option list in the app, in one place — Projects and
   Occupations (structured rows with their own financial/scoring
   fields) plus five plain string lists (Community, Relation, Property
   type, Flat configuration, Villa configuration, Call outcome). All of
   it lives on the one Settings singleton document (see
   backend/src/models/Settings.js); useApp().masterData is the live,
   already-resolved copy every dropdown in the app reads from
   (AppContext.jsx), and updateSettings() is the one write path,
   exactly like the company-letterhead fields on User Management's own
   Settings tab. Existing customer records keep whatever project/
   occupation string they were saved with even after it's edited or
   removed here — nothing here rewrites historical data, only what the
   next dropdown offers. */
import { useState } from 'react';
import Swal from 'sweetalert2';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, Banner, TableWrap, rowActionCls } from '../components/Ui.jsx';
import StringListEditor from '../components/masterdata/StringListEditor.jsx';
import ProjectEditorModal from '../components/masterdata/ProjectEditorModal.jsx';
import OccupationEditorModal from '../components/masterdata/OccupationEditorModal.jsx';
import { toast, CONFIRM_COLOR } from '../utils/toast.js';

const th = 'text-left text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400 font-bold px-5 py-4 border-b border-gray-200/80 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/60 whitespace-nowrap';
const td = 'px-5 py-4 border-b border-gray-100 dark:border-slate-800/60 align-middle text-sm whitespace-nowrap text-gray-800 dark:text-slate-200';

const STRING_LISTS = [
  ['communities', 'Community', 'Add a community…'],
  ['relations', 'Co-applicant relation', 'Add a relation…'],
  ['propertyTypes', 'Property type', 'Add a property type…'],
  ['flatConfigs', 'Flat configuration', 'Add a configuration…'],
  ['villaConfigs', 'Villa configuration', 'Add a configuration…'],
  ['callOutcomes', 'Call outcome', 'Add an outcome…'],
];

export default function MasterData() {
  const { masterData, updateSettings } = useApp();
  const [savingField, setSavingField] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingOcc, setEditingOcc] = useState(null);

  /* returns whether the save actually succeeded — the two modal save
     handlers below only close their modal on a true result, so a
     rejected save (a duplicate name, a missing field) leaves the form
     open with the error already shown instead of silently vanishing. */
  const saveField = async (field, value) => {
    setSavingField(field);
    try {
      await updateSettings({ [field]: value });
      toast.success('Saved', 'The new list applies everywhere it\'s used, right away.');
      return true;
    } catch (err) {
      toast.error('Could not save', Object.values(err.errors || {})[0] || err.message || 'Try again.');
      return false;
    } finally {
      setSavingField(null);
    }
  };

  const saveProject = async (proj, originalName) => {
    const next = originalName
      ? masterData.projects.map((p) => (p.name === originalName ? proj : p))
      : [...masterData.projects, proj];
    if (await saveField('projects', next)) setEditingProject(null);
  };

  const removeProject = async (p) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: `Remove "${p.name}"?`,
      html: 'Existing owners keep this exact project name and rates on their own records — this only removes it from new dropdowns and rate lookups going forward.',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: CONFIRM_COLOR.destructive,
    });
    if (!result.isConfirmed) return;
    saveField('projects', masterData.projects.filter((x) => x.name !== p.name));
  };

  const saveOcc = async (occ, originalK) => {
    const next = originalK
      ? masterData.occupations.map((o) => (o.k === originalK ? occ : o))
      : [...masterData.occupations, occ];
    if (await saveField('occupations', next)) setEditingOcc(null);
  };

  const removeOcc = async (o) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: `Remove "${o.k}"?`,
      html: 'Existing owners keep this occupation on their own records — this only removes it from new dropdowns.',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: CONFIRM_COLOR.destructive,
    });
    if (!result.isConfirmed) return;
    saveField('occupations', masterData.occupations.filter((x) => x.k !== o.k));
  };

  /* one property type's checklist per save (see the backend's
     validateDocumentTemplate) — never the whole documentTemplates map,
     so editing Villa's list can't race a stale copy of Flat's. */
  const saveDocTemplate = async (propertyType, documents) => {
    const savingKey = `doc:${propertyType}`;
    setSavingField(savingKey);
    try {
      await updateSettings({ documentTemplate: { propertyType, documents } });
      toast.success('Saved', 'The new checklist applies to every unit of this type, right away.');
    } catch (err) {
      toast.error('Could not save', Object.values(err.errors || {})[0] || err.message || 'Try again.');
    } finally {
      setSavingField(null);
    }
  };

  return (
    <>
      <Banner kind="info">
        <b>Changes here apply everywhere, immediately</b> — every dropdown in the app (Owner Base filters,
        Intake, Edit unit, Complete profile, Log a call…) reads these same lists. Removing an option never
        touches an owner who already has it on record; it just stops being offered on the next new entry.
      </Banner>

      <Card
        title="Projects"
        hint={
          <button className="inline-flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 transition-all duration-150 hover:scale-105" onClick={() => setEditingProject({})}>
            <Plus className="w-3.5 h-3.5" />Add project
          </button>
        }
      >
        <TableWrap>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>Project</th>
                <th className={th}>Entity</th>
                <th className={`${th} text-right`}>Launch</th>
                <th className={`${th} text-right`}>Ask ₹/sq.ft.</th>
                <th className={`${th} text-right`}>Resale ₹/sq.ft.</th>
                <th className={`${th} text-right`}>Circle ₹/sq.ft.</th>
                <th className={th}>Noted on</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {masterData.projects.map((p) => (
                <tr key={p.name} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className={td}><b className="font-bold text-gray-900 dark:text-white">{p.name}</b>{p.code && <span className="text-[11px] font-mono text-gray-400 dark:text-slate-400"> · {p.code}</span>}</td>
                  <td className={td}>{p.entity}</td>
                  <td className={`${td} text-right tabular-nums font-medium`}>{p.launch || '—'}</td>
                  <td className={`${td} text-right tabular-nums font-semibold`}>{p.ask ?? '—'}</td>
                  <td className={`${td} text-right tabular-nums font-semibold`}>{p.resale ?? '—'}</td>
                  <td className={`${td} text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400`}>{p.circle ?? '—'}</td>
                  <td className={`${td} text-[11px] text-gray-400 dark:text-slate-400`}>{p.noted || '—'}</td>
                  <td className={`${td} text-right space-x-1.5`}>
                    <button className={rowActionCls('primary')} onClick={() => setEditingProject(p)}><Pencil className="w-3 h-3" /></button>
                    <button className={rowActionCls('red')} onClick={() => removeProject(p)}><Trash2 className="w-3 h-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <Card
        title="Occupations"
        hint={
          <button className="inline-flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 transition-all duration-150 hover:scale-105" onClick={() => setEditingOcc({})}>
            <Plus className="w-3.5 h-3.5" />Add occupation
          </button>
        }
      >
        <TableWrap>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>Label</th>
                <th className={`${th} text-right`}>Capacity score</th>
                <th className={th}>Income band</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {masterData.occupations.map((o) => (
                <tr key={o.k} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className={td}><b className="font-semibold text-gray-900 dark:text-white">{o.k}</b></td>
                  <td className={`${td} text-right tabular-nums font-semibold`}>{o.b}</td>
                  <td className={`${td} text-[11px] text-gray-400 dark:text-slate-400`}>{o.band || '—'}</td>
                  <td className={`${td} text-right space-x-1.5`}>
                    <button className={rowActionCls('primary')} onClick={() => setEditingOcc(o)}><Pencil className="w-3 h-3" /></button>
                    <button className={rowActionCls('red')} onClick={() => removeOcc(o)}><Trash2 className="w-3 h-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {STRING_LISTS.map(([field, label, placeholder]) => (
          <StringListEditor
            key={field}
            title={label}
            hint={`${masterData[field].length} option${masterData[field].length === 1 ? '' : 's'}`}
            items={masterData[field]}
            placeholder={placeholder}
            saving={savingField === field}
            onSave={(next) => saveField(field, next)}
          />
        ))}
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Document checklist, by property type</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          Each unit's Document Vault offers the checklist for whichever type that unit is, plus an "Other"
          fallback. Removing a document here never deletes one already uploaded under it.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...new Set([...masterData.propertyTypes, 'Other'])].map((type) => (
          <StringListEditor
            key={type}
            title={`${type} documents`}
            hint={`${(masterData.documentTemplates[type] || []).length} document${(masterData.documentTemplates[type] || []).length === 1 ? '' : 's'}`}
            items={masterData.documentTemplates[type] || []}
            placeholder="Add a document…"
            saving={savingField === `doc:${type}`}
            onSave={(next) => saveDocTemplate(type, next)}
          />
        ))}
      </div>

      {editingProject && (
        <ProjectEditorModal
          project={editingProject}
          saving={savingField === 'projects'}
          onSave={saveProject}
          onClose={() => setEditingProject(null)}
        />
      )}
      {editingOcc && (
        <OccupationEditorModal
          occupation={editingOcc}
          saving={savingField === 'occupations'}
          onSave={saveOcc}
          onClose={() => setEditingOcc(null)}
        />
      )}
    </>
  );
}
