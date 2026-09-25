import Swal from 'sweetalert2';
import { Check, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { Card, Chip, Banner, Timeline, TableWrap } from '../components/Ui.jsx';
import { inr, nextFest, addD, fmtDM, TODAY, initials, todayInput, displayName } from '../utils/core.js';
import { triggerList, triggerTemplateKey } from '../utils/derived.js';
import { CONFIRM_COLOR } from '../utils/toast.js';

const kindTone = (k) => (k === 'money' ? 'g' : k === 'personal' ? 'm' : 'w');

function Box({ title, list, openCustomer, ack, sendWhatsApp, messageTemplates }) {
  const { getThemeColor } = useTheme();
  return (
    <Card title={title} hint={<span className="tabular-nums">{list.length}</span>} pad={false}>
      <TableWrap maxHeight="560px">
      <Timeline>
        {list.length ? list.map((x, i) => {
          const isDueToday = x.days === 0 && !x.acked;
          const handledToday = x.days === 0 && x.acked;
          const templateKey = triggerTemplateKey(x.label);
          const template = templateKey ? messageTemplates[templateKey] : null;
          const waDigits = (x.c.mobile || '').replace(/\D/g, '');
          const waHasMobile = waDigits.length >= 10;
          const waPhone = waDigits.length === 10 ? `91${waDigits}` : waDigits;
          const waHref = template && waHasMobile
            ? `https://wa.me/${waPhone}?text=${encodeURIComponent(template.replace(/\{name\}/g, displayName(x.c)))}`
            : null;
          return (
          <li key={i}
              className={`flex items-start gap-3 px-3.5 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer ${isDueToday ? 'bg-red-50/60 dark:bg-red-500/10' : handledToday ? 'bg-green-50/50 dark:bg-green-500/10' : ''}`}
              onClick={() => openCustomer(x.c.id)}>
            <div className="w-11 flex-shrink-0 text-center pt-0.5">
              <div className="text-[13px] font-bold text-gray-800 dark:text-gray-100 tabular-nums leading-tight">
                {x.days === 0 ? 'Today' : `${x.days}d`}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
                {fmtDM(addD(TODAY, x.days))}
              </div>
            </div>
            <div className="relative w-8 h-8 flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
                style={{ backgroundColor: getThemeColor() }}
              >
                {initials(x.c.name)}
              </div>
              {isDueToday && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" title="Due today" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-[13px] text-gray-900 dark:text-white truncate">{x.c.name}</span>
                <Chip cls={kindTone(x.kind)}>{x.kind}</Chip>
                {handledToday && <Chip cls="g">done</Chip>}
              </div>
              <div className="text-[12px] text-gray-600 dark:text-gray-300 mt-0.5">{x.label}</div>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                {x.c._seg ? (
                  <>{x.c._project} · gain {inr(x.c._gain)} <Chip cls={x.c._seg}>{x.c._seg}</Chip></>
                ) : (
                  <>{x.c.units?.[0]?.project} <Chip cls="m">incomplete record</Chip></>
                )}
              </div>
              {handledToday && (
                <div className="text-[11px] text-green-700 dark:text-green-400 mt-1">
                  <Check className="w-3 h-3 inline -mt-0.5 mr-1" />
                  Done{x.ackedBy ? ` by ${x.ackedBy}` : ''}{x.remark ? ` — ${x.remark}` : ''}
                </div>
              )}
            </div>
            {isDueToday && !template && (
              /* no saved message for this trigger's category yet (Master
                 Data → WhatsApp message templates) — same manual
                 mark-handled flow this button always did, so nothing
                 regresses before someone writes the templates. */
              <button
                onClick={(e) => { e.stopPropagation(); ack(x); }}
                title="Checked — mark handled"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 "
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            {isDueToday && template && waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); sendWhatsApp(x); }}
                title={`Opens WhatsApp for ${x.c.mobile}`}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
              >
                <span className="pointer-events-none flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </span>
              </a>
            )}
            {isDueToday && template && !waHref && (
              <button
                onClick={(e) => { e.stopPropagation(); Swal.fire({ icon: 'warning', title: 'No mobile on record', text: "Add a mobile number to this owner's profile before sending a WhatsApp message." }); }}
                title="No mobile on record"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}
          </li>
          );
        }) : (
          <li className="px-3.5 py-4 text-[13px] text-gray-500 dark:text-gray-400">
            Nothing in this window.
          </li>
        )}
      </Timeline>
      </TableWrap>
    </Card>
  );
}

export default function TriggerCalendar() {
  const { base, incompleteRecords, mutateCustomer, masterData } = useApp();
  const { openCustomer } = useAppNavigation();
  const t = triggerList(base, incompleteRecords);
  const ack = async (x) => {
    const { value: remark, isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Mark as handled',
      html: `<b>${x.c.name}</b> — ${x.label}`,
      input: 'textarea',
      inputPlaceholder: 'Add a remark (e.g. wished on call, will follow up next week)…',
      showCancelButton: true,
      confirmButtonText: 'Mark done',
      confirmButtonColor: CONFIRM_COLOR.approve,
    });
    if (!isConfirmed) return;
    mutateCustomer(`/api/customers/${x.c.id}/trigger-acks`, { label: x.label, date: todayInput(), remark }, 'POST').catch(() => {});
  };
  /* the WhatsApp icon's href already does the actual navigation (a
     real <a>, not window.open() — see the same fix on the Portfolio
     Statement's own Share on WhatsApp button for why); this just
     records that it happened, no confirmation dialog in the way of
     the one-click send the icon promises. */
  const sendWhatsApp = (x) => {
    mutateCustomer(`/api/customers/${x.c.id}/trigger-acks`, { label: x.label, date: todayInput(), remark: 'Sent via WhatsApp template' }, 'POST').catch(() => {});
  };
  const nf = nextFest();
  const bk = (lo, hi) => t.filter((x) => x.days >= lo && x.days <= hi);
  const blocked = base.filter((c) => c._blocked).length;

  return (
    <>
      <Banner kind="info">
        <b>Gate applied.</b> {blocked} owners are removed from every list on this page — exited, in
        transfer, in litigation, with an open complaint, without marketing consent, or sitting on a stale
        valuation note. They receive nothing until the block clears, and they return automatically when it
        does.{nf && <> Next auspicious window: <b>{nf.n}</b>, {nf.days} days out.</>}
      </Banner>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Box title="Next 7 days" list={bk(0, 7)} openCustomer={openCustomer} ack={ack} sendWhatsApp={sendWhatsApp} messageTemplates={masterData.messageTemplates} />
        <Box title="8 – 30 days" list={bk(8, 30)} openCustomer={openCustomer} ack={ack} sendWhatsApp={sendWhatsApp} messageTemplates={masterData.messageTemplates} />
        <Box title="31 – 90 days" list={bk(31, 90)} openCustomer={openCustomer} ack={ack} sendWhatsApp={sendWhatsApp} messageTemplates={masterData.messageTemplates} />
      </div>
    </>
  );
}
