import { psf } from '../utils/core.js';
import { useTheme } from '../context/ThemeContext.jsx';

/* The three-band rate ladder: what was paid, the government circle rate,
   and the recent registered resale. Used on the customer master and on
   the customer-facing statement, with different label wording. */
export default function RateLadder({ u, labels = ['paid', 'circle', 'resale'], style }) {
  const { getThemeColor } = useTheme();
  const w1 = Math.max(8, (u.rate / u.valueRate) * 100);
  const w2 = Math.max(0, ((Math.min(u.val.circle, u.valueRate) - u.rate) / u.valueRate) * 100);
  const w3 = Math.max(0, 100 - w1 - w2);

  return (
    <div style={style} className="w-full">
      <div className="flex h-3.5 sm:h-4 border border-gray-200 dark:border-gray-700/80 rounded-lg overflow-hidden shadow-2xs">
        <div className="bg-gray-800 dark:bg-gray-200 transition-all duration-300" style={{ width: `${w1}%` }} title={`${labels[0]}: ${psf(u.rate)}`} />
        <div className="bg-gray-300 dark:bg-gray-600 transition-all duration-300" style={{ width: `${w2}%` }} title={`${labels[1]}: ${psf(u.val.circle)}`} />
        <div className="transition-all duration-300" style={{ width: `${w3}%`, backgroundColor: getThemeColor() }} title={`${labels[2]}: ${psf(u.val.resale)}`} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10.5px] mt-2">
        <div className="flex flex-col text-left">
          <span className="text-gray-400 dark:text-gray-500 text-[10px] font-medium">{labels[0]}</span>
          <b className="tabular-nums text-gray-900 dark:text-white font-bold text-xs sm:text-sm mt-0.5">{psf(u.rate)}</b>
        </div>
        <div className="flex flex-col text-center">
          <span className="text-gray-400 dark:text-gray-500 text-[10px] font-medium">{labels[1]}</span>
          <b className="tabular-nums text-gray-900 dark:text-white font-bold text-xs sm:text-sm mt-0.5">{psf(u.val.circle)}</b>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-gray-400 dark:text-gray-500 text-[10px] font-medium">{labels[2]}</span>
          <b className="tabular-nums text-gray-900 dark:text-white font-bold text-xs sm:text-sm mt-0.5">{psf(u.val.resale)}</b>
        </div>
      </div>
    </div>
  );
}
