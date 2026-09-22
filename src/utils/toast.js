/* Small wrapper around sweetalert2 (already a dependency) enforcing one
   rule across the whole app: success is a corner toast that fades on
   its own, a failure is a real modal the person has to dismiss.
   A save that silently failed and only got a 3-second corner note is
   exactly the kind of thing that goes unnoticed until someone asks
   "wait, did that actually save?" — errors get to interrupt. */
import Swal from 'sweetalert2';
import { showToast } from './toastRenderer.js';

const isDark = () => document.documentElement.classList.contains('dark');

/* colour-codes a confirm dialog's action by severity — shared so
   "delete" always reads as more dangerous than "reactivate" the same
   way everywhere it's used, rather than each call site picking its
   own shade of red. */
export const CONFIRM_COLOR = {
  destructive: '#ef4444',
  approve: '#16a34a',
  neutral: '#3b82f6',
};

export const toast = {
  /* Nexora-style corner toast (src/utils/toastRenderer.js) — not
     sweetalert2, whose default toast reads as a marketing-site popup
     rather than the calm/compact Nexora feel. */
  success: (title, text) => showToast({ kind: 'success', title, text }),
  info: (title, text) => showToast({ kind: 'info', title, text }),
  /* deliberately still a blocking sweetalert2 modal, confirmed with
     OK, so a failed save can't fade away unread */
  error: (title, text) => Swal.fire({
    icon: 'error', title, text,
    background: isDark() ? '#1f2937' : '#ffffff',
    color: isDark() ? '#f3f4f6' : '#111827',
  }),
};

/* Every write-modal's catch block around mutateCustomer() needs the
   same three-way split, so this is the one place that gets it right:
   - field-level errors (400 with an `errors` map) → highlight the
     fields and say so.
   - any OTHER error the server actually returned (403 permission
     denied, a business-rule 400 with no field to blame, a 500) →
     mutateCustomer always sets err.errors to {} in this case (never
     undefined, since it comes from a real HTTP response), so show
     err.message itself instead of guessing. A permission error like
     "Your role (CRM) does not have access to: Complaints and NCR
     references" was being swallowed and reported as a dead backend
     before this, which sent people chasing a server that was up the
     whole time.
   - a genuine network failure (fetch() itself threw, so err.errors
     was never set at all) → this is the only case that actually
     means "could not reach the server". */
export function mutationErrorToast(err, setErrors) {
  const fieldErrors = err?.errors;
  if (fieldErrors && Object.keys(fieldErrors).length) {
    setErrors(fieldErrors);
    toast.error('Could not save', 'Fix the highlighted field and try again.');
  } else if (fieldErrors) {
    setErrors({});
    toast.error('Could not save', err.message || 'Try again.');
  } else {
    setErrors({});
    /* the browser's own fetch() failure text (e.g. "Failed to fetch",
       "NetworkError when attempting to fetch resource") — appended
       rather than shown alone, since the canned line by itself gives
       no way to tell a dead backend apart from a CORS block or a
       proxy pointed at the wrong port. */
    const detail = err?.message ? `${err.message}. ` : '';
    toast.error('Could not reach the server', `${detail}Confirm the backend is running and reachable, then try again.`);
  }
}
