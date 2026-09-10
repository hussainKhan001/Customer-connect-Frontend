/* Slide-over panel for viewing an uploaded Document Vault file in
   place, instead of a bare new-tab link — PDFs render in an iframe,
   images inline, both with an "Open in new tab" fallback. */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';

const isPdf = (doc) => /\.pdf(\?|$)/i.test(doc.filename || doc.url);

export default function DocumentPreviewModal({ doc, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10040]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full sm:w-[640px] max-w-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{doc.filename}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-900">
          {isPdf(doc) ? (
            <iframe src={doc.url} title={title} className="w-full h-full border-0" />
          ) : (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img src={doc.url} alt={title} className="max-w-full max-h-full object-contain rounded-lg shadow" />
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
