/* Slide-over panel for viewing an uploaded Document Vault file in
   place, instead of a bare new-tab link — PDFs render in an iframe,
   images inline, both with an "Open in new tab" fallback. `pages` is
   every file uploaded under this checklist key (see MDocuments.jsx's
   pagesFor()) — a multi-page paper document scanned as several photos
   is several entries here, browsed with Prev/Next rather than shown
   all at once, since a full-size PDF/image per page is already a lot
   of content for this panel.

   A `source: 'link'` page (see MDocuments.jsx's pasteLink()) points at
   a file this app never stored — a Google Drive share link, typically
   — so it can't be assumed to be a PDF or image. A Drive link embeds
   fine in an iframe once converted to its own /preview form; anything
   else is very likely to refuse embedding via its own X-Frame-Options,
   so that case gets a plain "open it elsewhere" card instead of an
   iframe that would just render a blank/broken box. */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, ChevronLeft, ChevronRight, Trash2, Link2 } from 'lucide-react';

const isPdf = (doc) => /\.pdf(\?|$)/i.test(doc.filename || doc.url);

function driveEmbedUrl(url) {
  const m = /drive\.google\.com\/file\/d\/([^/]+)/.exec(url) || /[?&]id=([^&]+)/.exec(url);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}

export default function DocumentPreviewModal({ pages, title, deletingId, onDelete, onClose }) {
  const [i, setI] = useState(0);
  const safeI = Math.min(i, pages.length - 1);
  const doc = pages[safeI];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
      if (e.key === 'ArrowRight') setI((n) => Math.min(pages.length - 1, n + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, pages.length]);

  if (!doc) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10040]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full sm:w-[640px] max-w-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {title}{pages.length > 1 && <span className="font-normal text-gray-400 dark:text-gray-500"> · page {safeI + 1} of {pages.length}</span>}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{doc.source === 'link' ? doc.url : doc.filename}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ">
            <X className="w-4 h-4" />
          </button>
        </div>

        {pages.length > 1 && (
          <div className="flex items-center justify-center gap-3 px-5 py-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => setI((n) => Math.max(0, n - 1))}
              disabled={safeI === 0}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  className={`w-2 h-2 rounded-full ${idx === safeI ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                  title={`Page ${idx + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setI((n) => Math.min(pages.length - 1, n + 1))}
              disabled={safeI === pages.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-900">
          {doc.source === 'link' ? (
            driveEmbedUrl(doc.url) ? (
              <iframe src={driveEmbedUrl(doc.url)} title={title} className="w-full h-full border-0" allow="autoplay" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Link2 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  This is a link to a file stored elsewhere. Open it in a new tab to view it.
                </p>
              </div>
            )
          ) : isPdf(doc) ? (
            <iframe src={doc.url} title={title} className="w-full h-full border-0" />
          ) : (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img src={doc.url} alt={title} className="max-w-full max-h-full object-contain rounded-lg shadow" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          {onDelete ? (
            <button
              onClick={() => onDelete(doc._id)}
              disabled={deletingId === doc._id}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> {deletingId === doc._id ? 'Deleting…' : pages.length > 1 ? 'Delete this page' : 'Delete'}
            </button>
          ) : <span />}
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
