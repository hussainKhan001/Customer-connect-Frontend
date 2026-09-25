/* Raw pre-sale inquiries (website + app-referral buyers) and the
   unmatched-complaints review queue — both fed by the external
   webhooks at backend/src/routes/webhooks.js, both landing here for
   staff to work rather than being silently created/updated with no
   visibility. Two tabs, one screen, same shape as Settings.jsx's own
   Users/Roles/... tab switch. */
import { useState } from 'react';
import Swal from 'sweetalert2';
import { UserPlus, Link2, AlertTriangle } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, tableIconBtnCls, EmptyState } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLeads } from '../hooks/useLeads.js';
import { apiFetch } from '../utils/api.js';
import { fmtDT } from '../utils/core.js';
import { toast } from '../utils/toast.js';

const MODULE = 'Module: Leads';
const MANAGE = 'Manage leads and external complaints';

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const td = 'px-4 py-3.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';

const tabCls = (on) =>
  `px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
    on
      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;

const LEAD_STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Converted', label: 'Converted' },
  { value: 'Lost', label: 'Lost' },
];
const LEAD_STATUS_TONE = { New: 'k', Contacted: 'o', Converted: 'g', Lost: 'm' };

export default function Leads() {
  const { can } = useAuth();
  const { leads, complaints, error, setLeads, setComplaints } = useLeads();
  const [tab, setTab] = useState('leads');
  const [busyId, setBusyId] = useState(null);

  const canManage = can(MANAGE);

  const setLeadStatus = async (lead, status) => {
    if (status === 'Converted') {
      const { value: customerId } = await Swal.fire({
        icon: 'question',
        title: 'Which owner did this become?',
        text: `Enter the Customer ID ${lead.name} was booked under (e.g. NEO-C-108).`,
        input: 'text',
        inputPlaceholder: 'NEO-C-108',
        showCancelButton: true,
        confirmButtonText: 'Mark converted',
      });
      if (!customerId) return;
      setBusyId(lead.id);
      try {
        const res = await apiFetch(`/api/leads/${lead.id}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || Object.values(body.errors || {})[0] || 'Could not convert.');
        setLeads((prev) => prev.map((x) => (x.id === lead.id ? body : x)));
        toast.success('Lead converted', `${lead.name} → ${customerId}`);
      } catch (err) {
        toast.error('Could not convert', err.message);
      } finally {
        setBusyId(null);
      }
      return;
    }

    setBusyId(lead.id);
    try {
      const res = await apiFetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update.');
      setLeads((prev) => prev.map((x) => (x.id === lead.id ? body : x)));
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const linkComplaint = async (complaint) => {
    const { value: customerId } = await Swal.fire({
      icon: 'question',
      title: 'Link this complaint to an owner',
      text: `Enter the Customer ID this complaint from ${complaint.name || 'this contact'} is actually about.`,
      input: 'text',
      inputPlaceholder: 'NEO-C-108',
      showCancelButton: true,
      confirmButtonText: 'Link',
    });
    if (!customerId) return;
    setBusyId(complaint.id);
    try {
      const res = await apiFetch(`/api/leads/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || Object.values(body.errors || {})[0] || 'Could not link.');
      setComplaints((prev) => prev.map((x) => (x.id === complaint.id ? body : x)));
      toast.success('Linked', `Now attached to ${customerId}.`);
    } catch (err) {
      toast.error('Could not link', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const setComplaintStatus = async (complaint) => {
    const { value: status } = await Swal.fire({
      icon: 'question',
      title: 'Update status',
      input: 'text',
      inputValue: complaint.status || '',
      inputPlaceholder: 'e.g. In Progress, Resolved',
      showCancelButton: true,
      confirmButtonText: 'Save',
    });
    if (status == null || status === '') return;
    setBusyId(complaint.id);
    try {
      const res = await apiFetch(`/api/leads/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update.');
      setComplaints((prev) => prev.map((x) => (x.id === complaint.id ? body : x)));
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!can(MODULE)) {
    return (
      <EmptyState
        icon={UserPlus}
        title="You don't have access to Leads"
        hint={`Ask an admin to grant the "${MODULE}" capability if you need to manage leads and external complaints.`}
      />
    );
  }

  if (error) return <Banner kind="block">{error}</Banner>;

  const unmatched = (complaints || []).filter((c) => !c.matched);

  return (
    <>
      <div className="flex items-center gap-3 mb-1">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button className={tabCls(tab === 'leads')} onClick={() => setTab('leads')}>
            Leads{leads ? ` · ${leads.length}` : ''}
          </button>
          <button className={tabCls(tab === 'complaints')} onClick={() => setTab('complaints')}>
            Unmatched complaints{complaints ? ` · ${unmatched.length}` : ''}
          </button>
        </div>
      </div>

      {tab === 'leads' && (
        <Card pad={false}>
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Contact</th>
                  <th className={th}>Source</th>
                  <th className={th}>Interest</th>
                  <th className={th}>Received</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(!leads || leads.length === 0) && (
                  <tr>
                    <td colSpan={6}>
                      {!leads ? (
                        <div className={`${td} text-center text-gray-400 dark:text-gray-500 py-10`}>Loading…</div>
                      ) : (
                        <EmptyState icon={UserPlus} title="No leads yet." hint="Website inquiries and app-referred buyers will appear here." />
                      )}
                    </td>
                  </tr>
                )}
                {(leads || []).map((lead) => (
                  <tr key={lead.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className={td}>
                      <div className="font-bold text-gray-900 dark:text-white">{lead.name}</div>
                      {lead.source === 'Referral' && lead.referredBy?.name && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          Referred by {lead.referredBy.name}{lead.referredBy.customerId ? ` (${lead.referredBy.customerId})` : ' (unmatched)'}
                        </div>
                      )}
                      {lead.status === 'Converted' && lead.convertedCustomerId && (
                        <div className="text-[11px] text-green-600 dark:text-green-400 mt-0.5">→ {lead.convertedCustomerId}</div>
                      )}
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>
                      <div>{lead.mobile || '—'}</div>
                      {lead.email && <div className="text-[11px] text-gray-400 dark:text-gray-500">{lead.email}</div>}
                    </td>
                    <td className={td}>
                      <Chip cls={lead.source === 'Referral' ? 'o' : 'k'}>{lead.source}</Chip>
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>
                      {lead.propertyType || lead.sourceDetail || '—'}
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400 text-[11px]`}>
                      {fmtDT(lead.createdAt)}
                    </td>
                    <td className={td}>
                      {canManage ? (
                        <ThemedSelect
                          className="w-36"
                          value={lead.status}
                          onChange={(v) => setLeadStatus(lead, v)}
                          options={LEAD_STATUS_OPTIONS}
                        />
                      ) : (
                        <Chip cls={LEAD_STATUS_TONE[lead.status] || 'k'}>{lead.status}</Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      {tab === 'complaints' && (
        <Card pad={false}>
          {!!unmatched.length && (
            <Banner kind="warn" style={{ margin: '0 0 -1px' }}>
              <b>{unmatched.length} complaint{unmatched.length === 1 ? '' : 's'} couldn't be matched to an owner automatically.</b>{' '}
              Link each one to the right Customer ID, or leave it here for reference.
            </Banner>
          )}
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Contact</th>
                  <th className={th}>Project / apartment</th>
                  <th className={th}>Category</th>
                  <th className={th}>Narration</th>
                  <th className={th}>Status</th>
                  {canManage && <th className={`${th} text-right`}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(!complaints || unmatched.length === 0) && (
                  <tr>
                    <td colSpan={6}>
                      {!complaints ? (
                        <div className={`${td} text-center text-gray-400 dark:text-gray-500 py-10`}>Loading…</div>
                      ) : (
                        <EmptyState icon={AlertTriangle} title="Nothing unmatched." hint="Every external complaint so far matched an existing owner automatically." />
                      )}
                    </td>
                  </tr>
                )}
                {unmatched.map((c) => (
                  <tr key={c.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className={td}>
                      <div className="font-bold text-gray-900 dark:text-white">{c.name || '—'}</div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500">{c.contactNo || '—'}</div>
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>
                      <div>{c.projectName || '—'}</div>
                      {c.unit && <div className="text-[11px] text-gray-400 dark:text-gray-500">Apt {c.unit}</div>}
                    </td>
                    <td className={`${td} text-gray-500 dark:text-gray-400`}>
                      <div>{c.requestCategory || c.requestType || '—'}</div>
                      {c.requestAbout && <div className="text-[11px] text-gray-400 dark:text-gray-500">{c.requestAbout}</div>}
                    </td>
                    <td className={`${td} text-gray-600 dark:text-gray-300 max-w-xs`}>
                      <div className="line-clamp-2">{c.narration || '—'}</div>
                      {c.imageUrl && (
                        <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 mt-0.5">
                          <Link2 className="w-3 h-3" /> Attached image
                        </a>
                      )}
                    </td>
                    <td className={td}>
                      <Chip cls="o">{c.status}</Chip>
                    </td>
                    {canManage && (
                      <td className={`${td} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <button className={tableIconBtnCls('primary')} title="Link to an owner" onClick={() => linkComplaint(c)} disabled={busyId === c.id}>
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button className={`${tableIconBtnCls('primary')} text-[10px] px-2 w-auto`} title="Change status" onClick={() => setComplaintStatus(c)} disabled={busyId === c.id}>
                            Status
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
