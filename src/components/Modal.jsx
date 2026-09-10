/* Shared chrome for every form-in-a-popup (EditProfileModal and the
   operational-edit modals it preceded) — portal + backdrop + header
   with a close-X + scrollable body slot + footer slot for buttons.
   Extracted once several near-identical modals started needing it,
   rather than duplicating the portal/backdrop boilerplate per modal.

   Two shells, one set of contents: the default centred card, and
   `drawer` — a right-hand slide-over for longer forms, which get more
   usable height than the card's max-h-[65vh] scroll well. The
   slide-over shape matches DocumentPreviewModal's, which had been
   hand-rolling the same thing. */
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

/* `icon` is optional and a lucide component reference (not a rendered
   element — same convention as every other icon prop in this app, see
   Kpi/StatsCards), rendered as a theme-tinted chip next to the title.
   Existing callers that don't pass one are unaffected — the header
   layout collapses back to just title/subtitle. */
export default function Modal({ title, subtitle, icon: Icon, onClose, children, footer, maxWidth = 'max-w-2xl', drawer = false, drawerWidth = 'sm:w-[600px]' }) {
  const { getThemeColor } = useTheme();
  const head = (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${getThemeColor()}20`, color: getThemeColor() }}
          >
            <Icon className={drawer ? 'w-6 h-6' : 'w-5 h-5'} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <button onClick={onClose} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const foot = (
    <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
      {footer}
    </div>
  );

  if (drawer) {
    return createPortal(
      <div className="fixed inset-0 z-[10040]">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={`absolute inset-y-0 right-0 w-full ${drawerWidth} max-w-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-slide-in-right`}>
          {head}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">{children}</div>
          {foot}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10040] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${maxWidth} my-8 animate-fade-in-down`}>
        {head}
        <div className="p-5 max-h-[65vh] overflow-y-auto custom-scrollbar">{children}</div>
        {foot}
      </div>
    </div>,
    document.body
  );
}
