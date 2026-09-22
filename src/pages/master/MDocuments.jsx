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
  const { patchCustomer, masterData } = useApp();
  const d = docsFor(c, masterData.documentTemplates);
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

  /* one section per unit, in the order units already appear on the
     owner, plus a trailing section for owner-level rows (succession/
     nominee papers, not tied to any one unit — see docsFor()'s null
     `unit`) — a flat "Type — Unit" list reads fine for a single-unit
     owner but turns into a hard-to-scan wall the moment someone holds
     two or more. */
  const groups = [];
  const byUnit = new Map();
  d.forEach((x) => {
    const groupKey = x.unit ?? '__owner__';
    if (!byUnit.has(groupKey)) {
      const group = { label: x.unit ?? 'Owner-level documents', items: [] };
      byUnit.set(groupKey, group);
      groups.push(group);
    }
    byUnit.get(groupKey).items.push(x);
  });

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

  /* an alternative to uploading a copy — attaches one or more pages
     that already live somewhere else (a shared Google Drive folder,
     typically) by URL. One link per line, same as picking several
     files at once: each becomes its own page, additively numbered
     after whatever's already on file, no file for this app to store. */
  const pasteLink = async (key, label) => {
    const { value: raw, isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Paste a link',
      html: `${label} — one or more links to files already stored elsewhere (Google Drive, etc.), instead of uploading a copy. One link per line for multiple pages.`,
      input: 'textarea',
      inputPlaceholder: 'https://drive.google.com/file/d/…/view\nhttps://drive.google.com/file/d/…/view',
      showCancelButton: true,
      confirmButtonText: 'Save link(s)',
      confirmButtonColor: CONFIRM_COLOR.approve,
      inputValidator: (v) => {
        const lines = String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
        if (!lines.length) return 'Paste at least one link.';
        const bad = lines.find((l) => !/^https?:\/\//i.test(l));
        return bad ? `"${bad}" isn't a full link — it must start with http:// or https://.` : undefined;
      },
    });
    if (!isConfirmed) return;
    const urls = String(raw || '').split('\n').map((s) => s.trim()).filter(Boolean);
    setUploadingKey(key);
    try {
      const res = await apiFetch(`/api/customers/${c.id}/documents/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, urls }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error('Could not save link', body.error || Object.values(body.errors || {})[0] || 'Try again.');
        return;
      }
      patchCustomer(body);
      toast.success(urls.length > 1 ? `${urls.length} links saved` : 'Link saved', 'On record — click View to open it.');
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
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
              {group.label}
            </div>
            <TableWrap>
              <table className="w-full border-collapse">
                <tbody>
                  {group.items.map((x) => {
                    const pages = pagesFor(x.key);
                    return (
                      <tr key={x.key}>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                          <Dot tone={x.ok ? 'g' : 'r'} />{x.type}
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
          </div>
        ))}
      </div>

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
