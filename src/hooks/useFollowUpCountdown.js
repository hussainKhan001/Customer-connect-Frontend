import { useEffect, useState } from 'react';

/* Live-ticking "time left" label for one target date/time — the same
   piece Nexora's own Lead Detail page uses for its "Next Follow-up"
   card (there: FollowUpCountdown, a component; here: a hook, since
   nothing else about that widget needs a component of its own).
   Ticks every second so "Due today"/"Timed out" appears the moment a
   follow-up's time actually passes, without needing an unrelated
   re-render to happen to notice first. */
export function useFollowUpCountdown(target) {
  const [label, setLabel] = useState(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const [isDueToday, setIsDueToday] = useState(false);

  useEffect(() => {
    if (!target) { setLabel(null); setIsOverdue(false); setIsDueToday(false); return; }
    const targetDate = new Date(target);
    if (Number.isNaN(targetDate.getTime())) { setLabel(null); return; }

    const tick = () => {
      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();
      const sameDay = now.toDateString() === targetDate.toDateString();

      if (diffMs <= 0) {
        setLabel(sameDay ? 'Due today' : 'Timed out');
        setIsOverdue(true);
        setIsDueToday(sameDay);
        return;
      }
      setIsOverdue(false);
      setIsDueToday(sameDay);
      const totalMinutes = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      if (days > 0) setLabel(`${days}d ${hours}h left`);
      else if (hours > 0) setLabel(`${hours}h ${minutes}m left`);
      else setLabel(`${minutes}m left`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return { label, isOverdue, isDueToday };
}
