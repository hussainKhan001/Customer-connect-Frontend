import { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { Upload, Link2 } from 'lucide-react';
import { Card, Banner, Dot, TableWrap, btnGhost, rowActionCls } from '../../components/Ui.jsx';
import DocumentPreviewModal from '../../components/DocumentPreviewModal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { apiFetch } from '../../utils/api.js';
import { fmtD } from '../../utils/core.js';
import { docsFor } from '../../utils/derived.js';
import { toast, CONFIRM_COLOR } from '../../utils/toast.js';

export default function MDocuments({ c }) {
  const { patchCustomer } = useApp();
  const d = docsFor(c);
  const [preview, setPreview] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const fileRef = useRef(null);
  const pendingKey = useRef(null);

  /* every page uploaded under this key, oldest first — a multi-page
     document is several rows sharing one key (see the backend's
     DocumentSchema), not one row with an array field. */
  const pagesFor = (key) => (c.documents || [])
    .filter((x) => x.key === key)
    .sort((a, b) => (a.page || 0) - (b.page || 0) || new Date(a.uploadedAt) - new Date(b.uploadedAt));
  const miss = d.filter((x) => !x.ok);

  const pickFile = (key) => {
    pendingKey.current = key;
    fileRef.current?.click();
  };

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    const key = pendingKey.current;
    e.target.value = '';
    if (!files.length || !key) return;
    setUploadingKey(key);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      form.append('key', key);
      const res = await apiFetch(`/api/customers/${c.id}/documents`, { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) {
        toast.error('Upload failed', body.error || Object.values(body.errors || {})[0] || 'Try again.');
        return;
      }
      patchCustomer(body);
      toast.success(files.length > 1 ? `${files.length} pages added` : 'Document saved', 'On record — click View to check it.');
    } catch {
      toast.error('Could not reach the server', 'Confirm the backend is running and reachable, then try again.');
    } finally {
      setUploadingKey(null);
    }
  };

  /* an alternative to uploading a copy — attaches a page that already
     lives somewhere else (a shared Google Drive folder, typically) by
     URL. Same additive page numbering as a real upload on the backend,
     just no file for this app to store. */
  const pasteLink = async (key, label) => {
    const { value: url, isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Paste a link',
      html: `${label} — a link to a file already stored elsewhere (Google Drive, etc.), instead of uploading a copy.`,
      input: 'url',
      inputPlaceholder: 'https://drive.google.com/file/d/…/view',
      showCancelButton: true,
      confirmButtonText: 'Save link',
      confirmButtonColor: CONFIRM_COLOR.approve,
      inputValidator: (v) => (!/^https?:\/\//i.test(v || '') ? 'Paste a full link starting with http:// or https://.' : undefined),
    });
    if (!isConfirmed) return;
    setUploadingKey(key);
    try {
      const res = await apiFetch(`/api/customers/${c.id}/documents/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, url }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error('Could not save link', body.error || Object.values(body.errors || {})[0] || 'Try again.');
        return;
      }
      patchCustomer(body);
      toast.success('Link saved', 'On record — click View to open it.');
    } catch {
      toast.error('Could not reach the server', 'Confirm the backend is running and reachable, then try again.');
    } finally {
      setUploadingKey(null);
    }
  };

  const deletePage = async (docId) => {
    setDeletingId(docId);
    try {
      const res = await apiFetch(`/api/customers/${c.id}/documents/${docId}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) {
        toast.error('Could not delete', body.error || 'Try again.');
        return;
      }
      patchCustomer(body);
    } catch {
      toast.error('Could not reach the server', 'Confirm the backend is running and reachable, then try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card title="Document vault" hint={`${d.length - miss.length} of ${d.length} on file`}>
      <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" multiple className="hidden" onChange={onFile} />
      <TableWrap>
        <table className="w-full border-collapse">
          <tbody>
            {d.map((x) => {
              const pages = pagesFor(x.key);
              return (
                <tr key={x.key}>
                  <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                    <Dot tone={x.ok ? 'g' : 'r'} />{x.n}
                    {pages.length > 1 && (
                      <span className="ml-1.5 text-[10.5px] text-gray-400 dark:text-gray-500">({pages.length} pages)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right text-[10.5px] text-gray-400 dark:text-gray-500">
                    {x.d ? fmtD(x.d) : <span className="text-red-600 dark:text-red-400">not on file</span>}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right">
                    {pages.length > 0 && (
                      <button className={`${btnGhost} text-xs px-2.5 py-1.5 mr-1.5`} onClick={() => setPreview({ key: x.key, title: x.n })}>
                        View
                      </button>
                    )}
                    <button
                      className={`${btnGhost} text-xs px-2 py-1.5 mr-1.5`}
                      disabled={uploadingKey === x.key}
                      onClick={() => pasteLink(x.key, x.n)}
                      title="Paste a Google Drive (or other) link instead of uploading a file"
                    >
                      <Link2 className="w-3 h-3" />
                    </button>
                    <button
                      className={rowActionCls('primary')}
                      disabled={uploadingKey === x.key}
                      onClick={() => pickFile(x.key)}
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingKey === x.key ? 'Uploading…' : pages.length ? 'Add pages' : 'Upload'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>

      {!!miss.length && (
        <Banner kind="warn" style={{ margin: '12px 0 0' }}>
          <b>{miss.length} document{miss.length > 1 ? 's' : ''} missing.</b> {miss.map((x) => x.n).join(', ')}.
        </Banner>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
        Customers want their own papers back more often than you would expect, and it is an honest reason
        for them to log in — unlike a live value dashboard, which becomes a price ticker they check weekly
        and which teaches them the market is flat in the two quarters it does not move.
      </div>

      {preview && pagesFor(preview.key).length > 0 && (
        <DocumentPreviewModal
          pages={pagesFor(preview.key)}
          title={preview.title}
          deletingId={deletingId}
          onDelete={deletePage}
          onClose={() => setPreview(null)}
        />
      )}
    </Card>
  );
}
