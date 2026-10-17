import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/* A bare image viewer, not a form — Modal.jsx's title/subtitle/footer
   chrome has nothing to say about a photo, so this skips it rather
   than stretching that component to fit. Closes on backdrop click,
   the X, or Escape, same conventions as every other overlay in the
   app. */
export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        onClick={onClose}
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt || 'Attached image'}
        className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
