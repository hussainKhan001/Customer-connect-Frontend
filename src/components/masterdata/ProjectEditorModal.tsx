/* Add/edit one row of the Projects master list — every field a
   valuation note or a new booking's rate lookup actually reads (see
   backend/src/lib/core.js's PROJECTS shape). `project` is `{}` for a
   brand-new row, or the existing row's data when editing one. */
import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as UiModule from '../Ui.jsx';
import ModalUntyped from '../Modal.jsx';
import ThemedDateUntyped from '../theme/ThemedDate.jsx';
import { todayInput } from '../../utils/core.js';
import type { Project } from '../../types/masterData';

/* Ui.jsx/Modal.jsx/ThemedDate.jsx are untyped legacy JS shared across the
   whole app (out of scope to type in this pilot slice) — cast once here
   at the import boundary rather than scattering `any` through the file. */
const { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } = UiModule as any;
const Modal = ModalUntyped as any;
const ThemedDate = ThemedDateUntyped as any;

const projectFormSchema = z.object({
  code: z.string(),
  name: z.string().trim().min(1, 'Enter a project name.'),
  entity: z.string().trim().min(1, 'Enter the owning entity.'),
  launch: z.string(),
  lr: z.string(),
  ask: z.string(),
  resale: z.string(),
  circle: z.string(),
  noted: z.string(),
  by: z.string(),
  basis: z.string(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectEditorModalProps {
  project: Partial<Project>;
  onSave: (project: Project, originalName: string | null) => void;
  onClose: () => void;
  saving: boolean;
}

export default function ProjectEditorModal({ project, onSave, onClose, saving }: ProjectEditorModalProps) {
  const isNew = !project.name;
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      code: project.code || '',
      name: project.name || '',
      entity: project.entity || '',
      launch: project.launch != null ? String(project.launch) : '',
      lr: project.lr != null ? String(project.lr) : '',
      ask: project.ask != null ? String(project.ask) : '',
      resale: project.resale != null ? String(project.resale) : '',
      circle: project.circle != null ? String(project.circle) : '',
      noted: project.noted || '',
      by: project.by || '',
      basis: project.basis || '',
    },
  });

  /* ask/resale/circle are exactly the numbers a real government
     notification or a fresh comparable resale moves — "Noted on"
     exists so the rest of the app (the stale-valuation gate, the
     Valuation Register) can tell how old a rate is, so changing one
     without also moving the date is how a rate quietly goes stale
     while looking freshly signed. Auto-bumps to today the moment any
     of the three actually differs from what's on file; a manual edit
     to the date afterward (a rate confirmed last week, say) still
     wins, since it's whichever one was touched last. */
  const original = useRef({ ask: project.ask ?? '', resale: project.resale ?? '', circle: project.circle ?? '' });
  const [ask, resale, circle] = watch(['ask', 'resale', 'circle']);
  useEffect(() => {
    const changed =
      (ask !== '' && Number(ask) !== Number(original.current.ask)) ||
      (resale !== '' && Number(resale) !== Number(original.current.resale)) ||
      (circle !== '' && Number(circle) !== Number(original.current.circle));
    if (changed) setValue('noted', todayInput());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask, resale, circle]);

  const onSubmit = (draft: ProjectFormValues) => {
    onSave(
      {
        code: draft.code.trim(),
        name: draft.name.trim(),
        entity: draft.entity.trim(),
        launch: Number(draft.launch) || null,
        lr: Number(draft.lr) || null,
        ask: Number(draft.ask) || null,
        resale: Number(draft.resale) || null,
        circle: Number(draft.circle) || null,
        noted: draft.noted.trim() || null,
        by: draft.by.trim() || null,
        basis: draft.basis.trim() || null,
      },
      project.name || null
    );
  };

  return (
    <Modal
      drawer
      title={isNew ? 'Add project' : 'Edit project'}
      subtitle={isNew ? undefined : project.name}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <BtnPrimary onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Saving…' : 'Save project'}
          </BtnPrimary>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={formLabelCls}>Project name</label>
          <input {...register('name')} className={formInputCls(!!errors.name)} placeholder="e.g. Garden City" />
          {errors.name && <div className={formErrorCls}>{errors.name.message}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Code</label>
          <input {...register('code')} className={formInputCls(false)} placeholder="e.g. GC — used for row keys" />
        </div>
        <div>
          <label className={formLabelCls}>Entity</label>
          <input {...register('entity')} className={formInputCls(!!errors.entity)} placeholder="e.g. Neoteric Properties" />
          {errors.entity && <div className={formErrorCls}>{errors.entity.message}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Launch year</label>
          <input type="number" {...register('launch')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Launch rate (₹/sq.ft.)</label>
          <input type="number" min="0" {...register('lr')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Ask rate today (₹/sq.ft.)</label>
          <input type="number" min="0" {...register('ask')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Resale rate (₹/sq.ft.)</label>
          <input type="number" min="0" {...register('resale')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Circle rate (₹/sq.ft.)</label>
          <input type="number" min="0" {...register('circle')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Valuation noted on</label>
          <Controller
            control={control}
            name="noted"
            render={({ field }) => <ThemedDate value={field.value} onChange={field.onChange} />}
          />
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">
            Jumps to today automatically when ask/resale/circle changes — override it if the real notification is dated
            earlier.
          </div>
        </div>
        <div>
          <label className={formLabelCls}>Signed by</label>
          <input {...register('by')} className={formInputCls(false)} placeholder="e.g. Finance — Head of Accounts" />
        </div>
        <div className="sm:col-span-2">
          <label className={formLabelCls}>Basis</label>
          <input {...register('basis')} className={formInputCls(false)} placeholder="e.g. 6 registered resales, Apr–Jun 2026" />
        </div>
      </div>
    </Modal>
  );
}
