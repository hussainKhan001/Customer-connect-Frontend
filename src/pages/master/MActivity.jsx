import { Card, Chip, Timeline } from '../../components/Ui.jsx';
import { fmtD } from '../../utils/core.js';
import { activityFor } from '../../utils/derived.js';

const tone = (w) =>
  w === 'System' ? 'k'
  : w === 'Service' || w === 'Legal' ? 'r'
  : w === 'Referral' || w === 'Event' || w === 'Statement' || w === 'Call' ? 'o'
  : 'm';

export default function MActivity({ c }) {
  return (
    <Card title="Activity log" hint="every touch, by name">
      <Timeline>
        {activityFor(c).map((a, i) => (
          <li key={i} className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
            <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{fmtD(a.d)}</span>
            <span className="flex-1">
              <Chip cls={tone(a.w)}>{a.w}</Chip> {a.t}
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500">by {a.by}</div>
            </span>
          </li>
        ))}
      </Timeline>
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
        This log is the only thing that will ever let you re-fit the four weights against real second
        purchases. Until you have two quarters of outcomes here, 40/25/20/15 is a written, testable guess
        and nothing more.
      </div>
    </Card>
  );
}
