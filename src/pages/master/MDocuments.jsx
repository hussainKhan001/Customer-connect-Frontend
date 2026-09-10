import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Card, Banner, Dot, TableWrap, btnGhost, rowActionCls } from '../../components/Ui.jsx';
import DocumentPreviewModal from '../../components/DocumentPreviewModal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { apiFetch } from '../../utils/api.js';
import { fmtD } from '../../utils/core.js';
import { docsFor } from '../../utils/derived.js';
import { toast } from '../../utils/toast.js';

export default function MDocuments({ c }) {
  const { patchCustomer } = useApp();
  const d = docsFor(c);
  const miss = d.filter((x) => !x.ok);
  const [preview, setPreview] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);
  const fileRef = useRef(null);
  const pendingKey = useRef(null);

  const docFor = (key) => (c.documents || []).find((x) => x.key === key);

  const pickFile = (key) => {
    pendingKey.current = key;
    fileRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    const key = pendingKey.current;
    e.target.value = '';
    if (!file || !key) return;
    setUploadingKey(key);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('key', key);
      const res = await apiFetch(`/api/customers/${c.id}/documents`, { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) {
        toast.error('Upload failed', body.error || Object.values(body.errors || {})[0] || 'Try again.');
        return;
      }
      patchCustomer(body);
      toast.success('Document saved', 'The file is on record.');
    } catch {
      toast.error('Could not reach the server', 'Confirm the backend is running and reachable, then try again.');
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <Card title="Document vault" hint={`${d.length - miss.length} of ${d.length} on file`}>
      <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={onFile} />
      <TableWrap>
        <table className="w-full border-collapse">
          <tbody>
            {d.map((x) => {
              const doc = docFor(x.key);
              return (
                <tr key={x.key}>
                  <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                    <Dot tone={x.ok ? 'g' : 'r'} />{x.n}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right text-[10.5px] text-gray-400 dark:text-gray-500">
                    {x.d ? fmtD(x.d) : <span className="text-red-600 dark:text-red-400">not on file</span>}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right">
                    {doc && (
                      <button className={`${btnGhost} text-xs px-2.5 py-1.5 mr-1.5`} onClick={() => setPreview({ doc, title: x.n })}>
                        View
                      </button>
                    )}
                    <button
                      className={rowActionCls('primary')}
                      disabled={uploadingKey === x.key}
                      onClick={() => pickFile(x.key)}
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingKey === x.key ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
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

      {preview && (
        <DocumentPreviewModal doc={preview.doc} title={preview.title} onClose={() => setPreview(null)} />
      )}
    </Card>
  );
}
