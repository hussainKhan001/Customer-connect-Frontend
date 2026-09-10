import Swal from 'sweetalert2';
import { Card, Chip, Banner, Row, KV, Timeline, btnGhost } from '../../components/Ui.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmtD } from '../../utils/core.js';
import { GATE_ORDER } from '../../utils/derived.js';
import { toast, CONFIRM_COLOR } from '../../utils/toast.js';

const YN = ({ on }) => (on ? <Chip cls="g">yes</Chip> : <Chip cls="m">no</Chip>);

export default function MGovernance({ c }) {
  const { mutateCustomer } = useApp();
  const g = c._g;
  const cs = c.consent;

  const toggleLitigation = async () => {
    const turningOn = !c.litigation;
    const result = await Swal.fire({
      icon: 'warning',
      title: turningOn ? 'Flag litigation?' : 'Clear litigation flag?',
      text: turningOn
        ? 'This immediately closes the contact gate — no marketing, no statements, no outbound of any kind until Legal clears it.'
        : 'This reopens contact for this owner — confirm the litigation is actually resolved before clearing it.',
      showCancelButton: true,
      confirmButtonText: turningOn ? 'Flag it' : 'Clear it',
      confirmButtonColor: turningOn ? CONFIRM_COLOR.destructive : CONFIRM_COLOR.approve,
    });
    if (!result.isConfirmed) return;
    try {
      await mutateCustomer(`/api/customers/${c.id}/litigation`, { litigation: turningOn });
      toast.success('Litigation flag updated', turningOn ? 'Contact gate closed.' : 'Contact gate re-evaluated.');
    } catch {
      toast.error('Could not save', 'Try again.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Legal">
        <KV>
          <Row k="Litigation flag" v={c.litigation ? <Chip cls="r">flagged — hard block</Chip> : <Chip cls="g">clear</Chip>} />
        </KV>
        <button className={`${btnGhost} w-full mt-2.5`} onClick={toggleLitigation}>
          {c.litigation ? 'Clear litigation flag' : 'Flag litigation'}
        </button>
      </Card>

      <Card title="Consent — DPDP">
        <KV>
          <Row k="WhatsApp" v={<YN on={cs.whatsapp} />} />
          <Row k="SMS" v={<YN on={cs.sms} />} />
          <Row k="Email" v={<YN on={cs.email} />} />
          <Row k="Marketing" v={cs.marketing ? <Chip cls="g">yes</Chip> : <Chip cls="r">declined</Chip>} />
          <Row k="Recorded on" v={fmtD(cs.date)} miss={!cs.date} />
          <Row k="Children's data held" v={cs.children ? <Chip cls="w">yes</Chip> : <Chip cls="m">no</Chip>} />
        </KV>

        {cs.purpose && (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2.5"><b>Purpose stated:</b> {cs.purpose}</div>
        )}

        {!cs.marketing && (
          <Banner kind="block" style={{ margin: '12px 0 0' }}>
            <b>No marketing consent.</b> Service and transactional messages only. A legal block, not a
            preference — it overrides any score and is enforced at send time.
          </Banner>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
          Marketing consent is captured separately from service consent, with the purpose stated and a
          withdrawal path on every message. Children's dates of birth need verifiable parental consent —
          worth asking whether that field earns its regulatory weight at all.
        </div>
      </Card>

      <Card title="Contact gate">
        <Banner kind={g.open ? 'ok' : 'block'} style={{ margin: 0 }}>
          <b>{g.open ? 'OPEN' : 'CLOSED'}</b> · <code className="bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded font-mono text-[11px]">{g.code}</code><br />{g.why}
        </Banner>

        <div className="mt-3.5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Evaluation order — first match wins</div>
          <Timeline>
            {GATE_ORDER.map(([code, label, test]) => (
              <li key={code} className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
                <span className="w-20 flex-shrink-0">{test(c) ? <Chip cls="r">blocks</Chip> : <Chip cls="g">clear</Chip>}</span>
                <span className="flex-1">{label}<div className="text-[10.5px] text-gray-400 dark:text-gray-500"><code>{code}</code></div></span>
              </li>
            ))}
          </Timeline>
        </div>
      </Card>
    </div>
  );
}
