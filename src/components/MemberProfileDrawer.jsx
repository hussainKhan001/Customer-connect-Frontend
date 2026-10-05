/* A full look at a family group member's own Customer Master — same
   tab set (CTABS/TAB_VIEWS from CustomerMaster.jsx, each tab view only
   ever needs the customer record itself as its one `c` prop, so they
   render identically here) in a drawer, instead of navigating the
   whole page there and losing whichever owner's page you came from.
   The "root owner" — the Family group card's own page — stays put
   underneath; closing this just removes the overlay. */
import { useState } from 'react';
import { Users } from 'lucide-react';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Chip, btnGhost } from './Ui.jsx';
import { initials, displayName } from '../utils/core.js';
import { segDisplay } from '../utils/derived.js';
import { STATUSLBL } from '../constants/segments.js';
import { CTABS, TAB_VIEWS } from '../pages/master/tabs.js';

export default function MemberProfileDrawer({ customer: m, onClose }) {
  const { can } = useAuth();
  const { getThemeColor } = useTheme();
  const [tab, setTab] = useState('overview');

  const sd = segDisplay(m);
  const Tab = TAB_VIEWS[tab] || TAB_VIEWS.overview;

  return (
    <Modal
      drawer
      drawerWidth="sm:w-[900px]"
      title={displayName(m)}
      subtitle={`${m.id} · ${m.city}`}
      icon={Users}
      onClose={onClose}
      footer={<button className={btnGhost} onClick={onClose}>Close</button>}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
          style={{ backgroundColor: getThemeColor() }}
        >
          {initials(m.name)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip cls={sd.cls}>{sd.t}</Chip>
          <Chip cls={m.status === 'ACTIVE' ? 'g' : 'r'}>{STATUSLBL[m.status]}</Chip>
          {m._g?.open ? <Chip cls="g">contact open</Chip> : <Chip cls="r">gate closed</Chip>}
          {m._live > 1 && <Chip cls="k">{m._live} units</Chip>}
        </div>
      </div>

      <nav className="flex overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-700 mb-4 -mt-1">
        {CTABS.filter(([, , capability]) => !capability || can(capability)).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`text-[12.5px] whitespace-nowrap px-3 py-2.5 border-b-2 ${
              tab === k ? 'font-semibold border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
          >
            {l}
          </button>
        ))}
      </nav>

      <Tab c={m} />
    </Modal>
  );
}
