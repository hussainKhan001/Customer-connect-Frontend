/* Small wrapper around sweetalert2 (already a dependency) enforcing one
   rule across the whole app: success is a corner toast that fades on
   its own, a failure is a real modal the person has to dismiss.
   A save that silently failed and only got a 3-second corner note is
   exactly the kind of thing that goes unnoticed until someone asks
   "wait, did that actually save?" — errors get to interrupt. */
import Swal from 'sweetalert2';

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

const mixin = () =>
  Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
    background: isDark() ? '#1f2937' : '#ffffff',
    color: isDark() ? '#f3f4f6' : '#111827',
    didOpen: (el) => {
      el.addEventListener('mouseenter', Swal.stopTimer);
      el.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

export const toast = {
  success: (title, text) => mixin().fire({ icon: 'success', title, text }),
  /* deliberately NOT the toast mixin — a blocking modal, confirmed
     with OK, so a failed save can't fade away unread */
  error: (title, text) => Swal.fire({
    icon: 'error', title, text,
    background: isDark() ? '#1f2937' : '#ffffff',
    color: isDark() ? '#f3f4f6' : '#111827',
  }),
  info: (title, text) => mixin().fire({ icon: 'info', title, text }),
};
